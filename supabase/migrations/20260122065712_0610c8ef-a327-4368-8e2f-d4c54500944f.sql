
-- ============================================================
-- MIGRATION: Fixes for UTC, RLS security, 3s threshold validation
-- ============================================================

-- A) UTC FIXES
-- ============================================================

-- A1. Fix guest_can_preview() to use UTC date
CREATE OR REPLACE FUNCTION public.guest_can_preview(p_device_id text)
RETURNS TABLE(can_preview boolean, remaining integer, used integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  max_previews INTEGER := 10;
  current_count INTEGER := 0;
  utc_today DATE;
BEGIN
  -- Validate input
  IF p_device_id IS NULL OR length(trim(p_device_id)) < 16 OR length(p_device_id) > 128 THEN
    RETURN QUERY SELECT FALSE, 0, 0;
    RETURN;
  END IF;
  
  -- Always use UTC date
  utc_today := (NOW() AT TIME ZONE 'UTC')::date;
  
  -- Get current preview count for today (UTC)
  SELECT COALESCE(gp.preview_count, 0) INTO current_count
  FROM public.guest_previews gp
  WHERE gp.device_id = p_device_id 
    AND gp.preview_date = utc_today;
  
  -- Return status
  RETURN QUERY SELECT 
    current_count < max_previews,
    GREATEST(0, max_previews - current_count),
    current_count;
END;
$function$;

-- A1. Fix guest_register_preview() to use UTC date
CREATE OR REPLACE FUNCTION public.guest_register_preview(p_device_id text)
RETURNS TABLE(success boolean, remaining integer, used integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  max_previews INTEGER := 10;
  current_count INTEGER := 0;
  new_count INTEGER;
  utc_today DATE;
BEGIN
  -- Validate input
  IF p_device_id IS NULL OR length(trim(p_device_id)) < 16 OR length(p_device_id) > 128 THEN
    RETURN QUERY SELECT FALSE, 0, 0;
    RETURN;
  END IF;
  
  -- Always use UTC date
  utc_today := (NOW() AT TIME ZONE 'UTC')::date;
  
  -- Check current count first
  SELECT COALESCE(gp.preview_count, 0) INTO current_count
  FROM public.guest_previews gp
  WHERE gp.device_id = p_device_id 
    AND gp.preview_date = utc_today;
  
  -- If already at limit, don't increment
  IF current_count >= max_previews THEN
    RETURN QUERY SELECT FALSE, 0, current_count;
    RETURN;
  END IF;
  
  -- Upsert preview record for today (UTC)
  INSERT INTO public.guest_previews (device_id, preview_date, preview_count, updated_at)
  VALUES (p_device_id, utc_today, 1, NOW())
  ON CONFLICT (device_id, preview_date) 
  DO UPDATE SET 
    preview_count = guest_previews.preview_count + 1,
    updated_at = NOW()
  RETURNING preview_count INTO new_count;
  
  -- Return updated status
  RETURN QUERY SELECT 
    new_count <= max_previews,
    GREATEST(0, max_previews - new_count),
    new_count;
END;
$function$;

-- A2. Fix get_country_rank_monthly() to use UTC month start
CREATE OR REPLACE FUNCTION public.get_country_rank_monthly()
RETURNS TABLE(country text, count bigint, rank bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    ae.country,
    COUNT(*) as count,
    RANK() OVER (ORDER BY COUNT(*) DESC) as rank
  FROM public.activity_events ae
  WHERE ae.source = 'country_button_counted'
    AND ae.timestamp_utc >= date_trunc('month', NOW() AT TIME ZONE 'UTC')
    AND ae.country IS NOT NULL
    AND ae.country != 'Unknown'
  GROUP BY ae.country
  ORDER BY count DESC
  LIMIT 20;
$function$;

-- ============================================================
-- B) RLS SECURITY - Lock down guest_previews table
-- ============================================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Guest previews managed via RPC only" ON public.guest_previews;
DROP POLICY IF EXISTS "Guest previews insert via RPC" ON public.guest_previews;
DROP POLICY IF EXISTS "Guest previews update via RPC" ON public.guest_previews;
DROP POLICY IF EXISTS "Guest previews delete via RPC" ON public.guest_previews;

-- Create restrictive policies - block ALL direct access
-- RPC functions run as SECURITY DEFINER so they bypass RLS
CREATE POLICY "Guest previews managed via RPC only" 
ON public.guest_previews 
FOR SELECT 
USING (false);  -- Block all direct SELECT

CREATE POLICY "Guest previews insert via RPC" 
ON public.guest_previews 
FOR INSERT 
WITH CHECK (false);  -- Block all direct INSERT

CREATE POLICY "Guest previews update via RPC" 
ON public.guest_previews 
FOR UPDATE 
USING (false);  -- Block all direct UPDATE

CREATE POLICY "Guest previews delete via RPC" 
ON public.guest_previews 
FOR DELETE 
USING (false);  -- Block all direct DELETE

-- ============================================================
-- C) COUNTRY COOLDOWN - Verify 3s threshold before recording
-- ============================================================

-- C1. Update record_country_button_event to require session_id and validate 3s threshold
CREATE OR REPLACE FUNCTION public.record_country_button_event(user_uuid uuid, session_uuid uuid DEFAULT NULL)
RETURNS TABLE(recorded boolean, cooldown_remaining_seconds integer, reason text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_country TEXT;
  last_event_time TIMESTAMPTZ;
  cooldown_seconds INTEGER := 180; -- 3 minutes
  seconds_since_last INTEGER;
  session_duration INTERVAL;
  session_valid BOOLEAN := FALSE;
BEGIN
  -- If session_uuid provided, validate it meets 3s threshold
  IF session_uuid IS NOT NULL THEN
    SELECT 
      (bh.ended_at IS NOT NULL 
       AND bh.context_type = 'main_button' 
       AND (bh.ended_at - bh.started_at) >= INTERVAL '3 seconds')
    INTO session_valid
    FROM public.button_holds bh
    WHERE bh.id = session_uuid
      AND bh.user_id = user_uuid;
    
    IF NOT session_valid THEN
      RETURN QUERY SELECT FALSE, 0, 'below_threshold'::text;
      RETURN;
    END IF;
  ELSE
    -- Legacy: no session provided, check if user has any valid completed session in last minute
    SELECT EXISTS(
      SELECT 1 FROM public.button_holds bh
      WHERE bh.user_id = user_uuid
        AND bh.context_type = 'main_button'
        AND bh.ended_at IS NOT NULL
        AND bh.ended_at > NOW() - INTERVAL '1 minute'
        AND (bh.ended_at - bh.started_at) >= INTERVAL '3 seconds'
    ) INTO session_valid;
    
    IF NOT session_valid THEN
      RETURN QUERY SELECT FALSE, 0, 'below_threshold'::text;
      RETURN;
    END IF;
  END IF;
  
  -- Get user's country from profiles
  SELECT p.country INTO user_country
  FROM public.profiles p
  WHERE p.id = user_uuid;
  
  -- If no country set, use 'Unknown'
  IF user_country IS NULL THEN
    user_country := 'Unknown';
  END IF;
  
  -- Check last country_button_counted event for this user (UTC)
  SELECT ae.timestamp_utc INTO last_event_time
  FROM public.activity_events ae
  WHERE ae.user_id = user_uuid 
    AND ae.source = 'country_button_counted'
  ORDER BY ae.timestamp_utc DESC
  LIMIT 1;
  
  -- Calculate seconds since last event
  IF last_event_time IS NOT NULL THEN
    seconds_since_last := EXTRACT(EPOCH FROM (NOW() - last_event_time))::INTEGER;
  ELSE
    seconds_since_last := cooldown_seconds + 1; -- Allow first event
  END IF;
  
  -- If cooldown has passed, record new event
  IF seconds_since_last >= cooldown_seconds THEN
    INSERT INTO public.activity_events (
      user_id,
      country,
      source,
      timestamp_utc,
      metadata
    ) VALUES (
      user_uuid,
      user_country,
      'country_button_counted',
      NOW(),
      jsonb_build_object('cooldown_enforced', true, 'session_id', session_uuid)
    );
    
    -- Also update profiles.last_country_action_at for compatibility
    UPDATE public.profiles 
    SET last_country_action_at = NOW()
    WHERE id = user_uuid;
    
    RETURN QUERY SELECT TRUE, 0, 'recorded'::text;
  ELSE
    -- Cooldown not passed, return remaining time
    RETURN QUERY SELECT FALSE, (cooldown_seconds - seconds_since_last), 'cooldown_active'::text;
  END IF;
END;
$function$;

-- ============================================================
-- D) Ensure indexes for activity_events queries
-- ============================================================

-- Drop old indexes if they exist (to recreate with correct names)
DROP INDEX IF EXISTS idx_activity_events_user_source_time;
DROP INDEX IF EXISTS idx_activity_events_country_time;

-- Create optimized indexes for country ranking queries
CREATE INDEX IF NOT EXISTS idx_activity_events_country_ranking 
ON public.activity_events (source, timestamp_utc DESC, country) 
WHERE source = 'country_button_counted';

CREATE INDEX IF NOT EXISTS idx_activity_events_user_cooldown 
ON public.activity_events (user_id, source, timestamp_utc DESC) 
WHERE source = 'country_button_counted';

-- ============================================================
-- Add comments for schema documentation
-- ============================================================

COMMENT ON TABLE public.activity_events IS 'Core event log for analytics and rankings. Source of truth for country rankings via country_button_counted events.';
COMMENT ON TABLE public.guest_previews IS 'Tracks guest (unauthenticated) preview usage. Max 10 previews per device per day (UTC). Access only via RPC.';
COMMENT ON TABLE public.button_holds IS 'Real-time button hold sessions. Used for live counter and historical statistics.';

COMMENT ON COLUMN public.activity_events.source IS 'Event type: country_button_counted, poll_vote, poll_boost, etc.';
COMMENT ON COLUMN public.activity_events.timestamp_utc IS 'Event timestamp in UTC (timestamptz).';
COMMENT ON COLUMN public.guest_previews.preview_date IS 'Date in UTC for daily limit tracking.';
