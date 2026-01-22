-- ============================================
-- A) COUNTRY STATISTICS - Backend Implementation
-- ============================================

-- A4. Add indexes to activity_events for country ranking queries
CREATE INDEX IF NOT EXISTS idx_activity_events_user_source_timestamp 
ON public.activity_events (user_id, source, timestamp_utc DESC);

CREATE INDEX IF NOT EXISTS idx_activity_events_country_timestamp 
ON public.activity_events (country, timestamp_utc DESC);

CREATE INDEX IF NOT EXISTS idx_activity_events_source_timestamp 
ON public.activity_events (source, timestamp_utc DESC);

-- A4. Backend function to record country button event with 3-min cooldown
-- This function checks cooldown and records event if allowed
CREATE OR REPLACE FUNCTION public.record_country_button_event(user_uuid UUID)
RETURNS TABLE(recorded BOOLEAN, cooldown_remaining_seconds INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_country TEXT;
  last_event_time TIMESTAMPTZ;
  cooldown_seconds INTEGER := 180; -- 3 minutes
  seconds_since_last INTEGER;
BEGIN
  -- Get user's country from profiles
  SELECT country INTO user_country
  FROM public.profiles
  WHERE id = user_uuid;
  
  -- If no country set, use 'Unknown'
  IF user_country IS NULL THEN
    user_country := 'Unknown';
  END IF;
  
  -- Check last country_button_counted event for this user
  SELECT timestamp_utc INTO last_event_time
  FROM public.activity_events
  WHERE user_id = user_uuid 
    AND source = 'country_button_counted'
  ORDER BY timestamp_utc DESC
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
      jsonb_build_object('cooldown_enforced', true)
    );
    
    -- Also update profiles.last_country_action_at for compatibility
    UPDATE public.profiles 
    SET last_country_action_at = NOW()
    WHERE id = user_uuid;
    
    RETURN QUERY SELECT TRUE, 0;
  ELSE
    -- Cooldown not passed, return remaining time
    RETURN QUERY SELECT FALSE, (cooldown_seconds - seconds_since_last);
  END IF;
END;
$$;

-- A5. RPC: Get country ranking for last 24 hours (daily)
CREATE OR REPLACE FUNCTION public.get_country_rank_daily()
RETURNS TABLE(country TEXT, count BIGINT, rank BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    ae.country,
    COUNT(*) as count,
    RANK() OVER (ORDER BY COUNT(*) DESC) as rank
  FROM public.activity_events ae
  WHERE ae.source = 'country_button_counted'
    AND ae.timestamp_utc > NOW() - INTERVAL '24 hours'
    AND ae.country IS NOT NULL
    AND ae.country != 'Unknown'
  GROUP BY ae.country
  ORDER BY count DESC
  LIMIT 20;
$$;

-- A5. RPC: Get country ranking for current calendar month (UTC)
CREATE OR REPLACE FUNCTION public.get_country_rank_monthly()
RETURNS TABLE(country TEXT, count BIGINT, rank BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    ae.country,
    COUNT(*) as count,
    RANK() OVER (ORDER BY COUNT(*) DESC) as rank
  FROM public.activity_events ae
  WHERE ae.source = 'country_button_counted'
    AND ae.timestamp_utc >= DATE_TRUNC('month', NOW())
    AND ae.country IS NOT NULL
    AND ae.country != 'Unknown'
  GROUP BY ae.country
  ORDER BY count DESC
  LIMIT 20;
$$;

-- A5. RPC: Get country ranking all-time
CREATE OR REPLACE FUNCTION public.get_country_rank_all_time()
RETURNS TABLE(country TEXT, count BIGINT, rank BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    ae.country,
    COUNT(*) as count,
    RANK() OVER (ORDER BY COUNT(*) DESC) as rank
  FROM public.activity_events ae
  WHERE ae.source = 'country_button_counted'
    AND ae.country IS NOT NULL
    AND ae.country != 'Unknown'
  GROUP BY ae.country
  ORDER BY count DESC
  LIMIT 20;
$$;

-- ============================================
-- B) GUEST PREVIEW SYSTEM - Backend Implementation
-- ============================================

-- B2. Create guest_previews table for tracking daily preview limits
CREATE TABLE IF NOT EXISTS public.guest_previews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  preview_date DATE NOT NULL DEFAULT CURRENT_DATE,
  preview_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_device_date UNIQUE (device_id, preview_date)
);

-- Enable RLS on guest_previews
ALTER TABLE public.guest_previews ENABLE ROW LEVEL SECURITY;

-- RLS policy: Allow anonymous access for guest tracking
CREATE POLICY "Allow anonymous guest preview tracking" 
ON public.guest_previews 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_guest_previews_device_date 
ON public.guest_previews (device_id, preview_date);

-- B2. RPC: Check if guest can preview (returns remaining previews)
CREATE OR REPLACE FUNCTION public.guest_can_preview(p_device_id TEXT)
RETURNS TABLE(can_preview BOOLEAN, remaining INTEGER, used INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  max_previews INTEGER := 10;
  current_count INTEGER := 0;
BEGIN
  -- Get current preview count for today
  SELECT COALESCE(preview_count, 0) INTO current_count
  FROM public.guest_previews
  WHERE device_id = p_device_id 
    AND preview_date = CURRENT_DATE;
  
  -- Return status
  RETURN QUERY SELECT 
    current_count < max_previews,
    GREATEST(0, max_previews - current_count),
    current_count;
END;
$$;

-- B2. RPC: Register a guest preview (increments counter)
CREATE OR REPLACE FUNCTION public.guest_register_preview(p_device_id TEXT)
RETURNS TABLE(success BOOLEAN, remaining INTEGER, used INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  max_previews INTEGER := 10;
  current_count INTEGER := 0;
  new_count INTEGER;
BEGIN
  -- Upsert preview record for today
  INSERT INTO public.guest_previews (device_id, preview_date, preview_count, updated_at)
  VALUES (p_device_id, CURRENT_DATE, 1, NOW())
  ON CONFLICT (device_id, preview_date) 
  DO UPDATE SET 
    preview_count = guest_previews.preview_count + 1,
    updated_at = NOW()
  RETURNING preview_count INTO new_count;
  
  current_count := new_count;
  
  -- Return updated status
  RETURN QUERY SELECT 
    current_count <= max_previews,
    GREATEST(0, max_previews - current_count),
    current_count;
END;
$$;