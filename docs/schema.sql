-- ============================================================================
-- PUSH IT! - Complete Database Schema
-- Generated from live database: 2025-01-25
-- Source: Direct queries to information_schema, pg_proc, pg_policies, pg_indexes
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE public.poll_status AS ENUM ('active', 'archived', 'expired');

-- ============================================================================
-- TABLES
-- ============================================================================

-- -----------------------------------------------------------------------------
-- profiles - User profile data (linked to auth.users)
-- -----------------------------------------------------------------------------
CREATE TABLE public.profiles (
    id UUID NOT NULL PRIMARY KEY,
    username TEXT,
    email TEXT,
    country TEXT,
    is_premium BOOLEAN NOT NULL DEFAULT false,
    last_button_action_at TIMESTAMP WITH TIME ZONE,
    last_country_action_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT profiles_username_key UNIQUE (username)
);

-- -----------------------------------------------------------------------------
-- polls - User-created polls
-- -----------------------------------------------------------------------------
CREATE TABLE public.polls (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    question TEXT NOT NULL,
    creator_username TEXT NOT NULL,
    created_by UUID NOT NULL,
    status public.poll_status DEFAULT 'active'::public.poll_status,
    is_anonymous BOOLEAN DEFAULT false,
    total_votes INTEGER DEFAULT 0,
    total_votes_cache INTEGER DEFAULT 0,
    boost_count NUMERIC,
    boost_count_cache INTEGER DEFAULT 0,
    push_count INTEGER NOT NULL DEFAULT 0,
    votes_received_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + '24:00:00'::interval),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT polls_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- -----------------------------------------------------------------------------
-- poll_options - Answer options for polls
-- -----------------------------------------------------------------------------
CREATE TABLE public.poll_options (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    poll_id UUID NOT NULL,
    option_text TEXT NOT NULL,
    order_index INTEGER DEFAULT 0,
    votes INTEGER DEFAULT 0,
    votes_cache INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT poll_options_poll_id_fkey FOREIGN KEY (poll_id) REFERENCES public.polls(id) ON DELETE CASCADE
);

-- -----------------------------------------------------------------------------
-- user_votes - User votes on poll options
-- -----------------------------------------------------------------------------
CREATE TABLE public.user_votes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    poll_id UUID NOT NULL,
    option_id UUID NOT NULL,
    vote_edit_count INTEGER NOT NULL DEFAULT 0,
    voted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT user_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT user_votes_poll_id_fkey FOREIGN KEY (poll_id) REFERENCES public.polls(id) ON DELETE CASCADE,
    CONSTRAINT user_votes_option_id_fkey FOREIGN KEY (option_id) REFERENCES public.poll_options(id) ON DELETE CASCADE,
    CONSTRAINT user_votes_poll_id_user_id_key UNIQUE (poll_id, user_id)
);

-- -----------------------------------------------------------------------------
-- user_boosts - User boosts for polls
-- -----------------------------------------------------------------------------
CREATE TABLE public.user_boosts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    poll_id UUID NOT NULL,
    boosted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT user_pushes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT user_pushes_poll_id_fkey FOREIGN KEY (poll_id) REFERENCES public.polls(id) ON DELETE CASCADE,
    CONSTRAINT user_pushes_user_id_poll_id_key UNIQUE (user_id, poll_id)
);

-- -----------------------------------------------------------------------------
-- daily_boost_limits - Daily boost limits per user
-- -----------------------------------------------------------------------------
CREATE TABLE public.daily_boost_limits (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    boost_date DATE NOT NULL DEFAULT CURRENT_DATE,
    boost_count INTEGER NOT NULL DEFAULT 0,
    max_boosts INTEGER NOT NULL DEFAULT 3,
    CONSTRAINT daily_push_limits_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT daily_push_limits_user_id_push_date_key UNIQUE (user_id, boost_date)
);

-- -----------------------------------------------------------------------------
-- button_holds - Main button hold sessions
-- -----------------------------------------------------------------------------
CREATE TABLE public.button_holds (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    device_id TEXT,
    country TEXT,
    context_type TEXT DEFAULT 'main_button'::text,
    context_id UUID,
    is_active BOOLEAN DEFAULT true,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    last_heartbeat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT button_holds_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- -----------------------------------------------------------------------------
-- activity_events - All activity events (votes, boosts, country button)
-- -----------------------------------------------------------------------------
CREATE TABLE public.activity_events (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    country TEXT NOT NULL,
    source TEXT NOT NULL,
    poll_id UUID,
    metadata JSONB,
    timestamp_utc TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT activity_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT activity_events_poll_id_fkey FOREIGN KEY (poll_id) REFERENCES public.polls(id) ON DELETE SET NULL
);

-- -----------------------------------------------------------------------------
-- guest_previews - Guest preview limits
-- -----------------------------------------------------------------------------
CREATE TABLE public.guest_previews (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    device_id TEXT NOT NULL,
    preview_date DATE NOT NULL DEFAULT CURRENT_DATE,
    preview_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT unique_device_date UNIQUE (device_id, preview_date)
);

-- -----------------------------------------------------------------------------
-- badges - Badge definitions
-- -----------------------------------------------------------------------------
CREATE TABLE public.badges (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    badge_name TEXT NOT NULL,
    description TEXT,
    icon_url TEXT,
    criteria_type TEXT NOT NULL,
    criteria_value INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- user_badges - Badges earned by users
-- -----------------------------------------------------------------------------
CREATE TABLE public.user_badges (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    badge_id UUID,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT user_badges_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT user_badges_badge_id_fkey FOREIGN KEY (badge_id) REFERENCES public.badges(id) ON DELETE CASCADE,
    CONSTRAINT user_badges_user_id_badge_id_key UNIQUE (user_id, badge_id)
);

-- -----------------------------------------------------------------------------
-- user_follows - Follow relationships
-- -----------------------------------------------------------------------------
CREATE TABLE public.user_follows (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    follower_id UUID,
    followed_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT user_follows_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT user_follows_followed_id_fkey FOREIGN KEY (followed_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT user_follows_follower_id_followed_id_key UNIQUE (follower_id, followed_id)
);

-- -----------------------------------------------------------------------------
-- saved_polls - User saved polls
-- -----------------------------------------------------------------------------
CREATE TABLE public.saved_polls (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    poll_id UUID NOT NULL,
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT saved_polls_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT saved_polls_poll_id_fkey FOREIGN KEY (poll_id) REFERENCES public.polls(id) ON DELETE CASCADE,
    CONSTRAINT saved_polls_poll_id_user_id_key UNIQUE (poll_id, user_id)
);

-- -----------------------------------------------------------------------------
-- hidden_polls - User hidden polls
-- -----------------------------------------------------------------------------
CREATE TABLE public.hidden_polls (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    poll_id UUID NOT NULL,
    hidden_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT hidden_polls_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT hidden_polls_poll_id_fkey FOREIGN KEY (poll_id) REFERENCES public.polls(id) ON DELETE CASCADE,
    CONSTRAINT hidden_polls_poll_id_user_id_key UNIQUE (poll_id, user_id)
);

-- -----------------------------------------------------------------------------
-- poll_responses - New response system (multi-choice ready)
-- -----------------------------------------------------------------------------
CREATE TABLE public.poll_responses (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    poll_id UUID NOT NULL,
    user_id UUID NOT NULL,
    country TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'legacy_user_votes'::text,
    submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT poll_responses_poll_id_fkey FOREIGN KEY (poll_id) REFERENCES public.polls(id) ON DELETE CASCADE,
    CONSTRAINT poll_responses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT poll_responses_poll_user_unique UNIQUE (poll_id, user_id)
);

-- -----------------------------------------------------------------------------
-- poll_response_options - Selected options in responses
-- -----------------------------------------------------------------------------
CREATE TABLE public.poll_response_options (
    response_id UUID NOT NULL,
    option_id UUID NOT NULL,
    PRIMARY KEY (response_id, option_id),
    CONSTRAINT poll_response_options_response_id_fkey FOREIGN KEY (response_id) REFERENCES public.poll_responses(id) ON DELETE CASCADE,
    CONSTRAINT poll_response_options_option_id_fkey FOREIGN KEY (option_id) REFERENCES public.poll_options(id) ON DELETE CASCADE
);

-- -----------------------------------------------------------------------------
-- poll_vote_holds - Vote hold sessions
-- -----------------------------------------------------------------------------
CREATE TABLE public.poll_vote_holds (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    poll_id UUID,
    option_id UUID,
    device_id TEXT,
    is_active BOOLEAN DEFAULT true,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT poll_vote_holds_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT poll_vote_holds_poll_id_fkey FOREIGN KEY (poll_id) REFERENCES public.polls(id) ON DELETE CASCADE,
    CONSTRAINT poll_vote_holds_option_id_fkey FOREIGN KEY (option_id) REFERENCES public.poll_options(id) ON DELETE CASCADE
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- polls
CREATE INDEX idx_polls_status ON public.polls(status);
CREATE INDEX idx_polls_created_by ON public.polls(created_by);
CREATE INDEX idx_polls_expires_at ON public.polls(expires_at);
CREATE INDEX idx_polls_created_at ON public.polls(created_at);
CREATE INDEX idx_polls_active_expires ON public.polls(status, expires_at) WHERE status = 'active'::public.poll_status;

-- poll_options
CREATE INDEX idx_poll_options_poll_id ON public.poll_options(poll_id);

-- user_votes
CREATE INDEX idx_user_votes_user_id ON public.user_votes(user_id);
CREATE INDEX idx_user_votes_poll_id ON public.user_votes(poll_id);
CREATE INDEX idx_user_votes_option_id ON public.user_votes(option_id);
CREATE INDEX idx_user_votes_voted_at ON public.user_votes(voted_at);

-- user_boosts
CREATE INDEX idx_user_boosts_user_id ON public.user_boosts(user_id);
CREATE INDEX idx_user_boosts_poll_id ON public.user_boosts(poll_id);
CREATE INDEX idx_user_boosts_boosted_at ON public.user_boosts(boosted_at);

-- button_holds
CREATE INDEX idx_button_holds_user_id ON public.button_holds(user_id);
CREATE INDEX idx_button_holds_is_active ON public.button_holds(is_active);
CREATE INDEX idx_button_holds_last_heartbeat ON public.button_holds(last_heartbeat);
CREATE INDEX idx_button_holds_context ON public.button_holds(context_type, context_id);

-- activity_events
CREATE INDEX idx_activity_events_user_id ON public.activity_events(user_id);
CREATE INDEX idx_activity_events_country ON public.activity_events(country);
CREATE INDEX idx_activity_events_source ON public.activity_events(source);
CREATE INDEX idx_activity_events_timestamp ON public.activity_events(timestamp_utc);
CREATE INDEX idx_activity_events_poll_id ON public.activity_events(poll_id);

-- poll_vote_holds
CREATE INDEX idx_poll_vote_holds_poll_id ON public.poll_vote_holds(poll_id);
CREATE INDEX idx_poll_vote_holds_is_active ON public.poll_vote_holds(is_active);

-- profiles
CREATE INDEX idx_profiles_country ON public.profiles(country);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- -----------------------------------------------------------------------------
-- Utility: Generate 8-char hex poll ID (legacy, not used with UUID)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_poll_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  RETURN lower(substr(encode(gen_random_bytes(4), 'hex'), 1, 8));
END;
$$;

-- -----------------------------------------------------------------------------
-- Validation: Poll input validation
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_poll_input(question_text TEXT, option_texts TEXT[])
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Validate question length and content
  IF question_text IS NULL OR length(trim(question_text)) < 10 OR length(question_text) > 200 THEN
    RAISE EXCEPTION 'Question must be between 10 and 200 characters';
  END IF;
  
  -- Check for potentially harmful content patterns
  IF question_text ~* '(<script|javascript:|on\w+\s*=|<iframe|<object|<embed)' THEN
    RAISE EXCEPTION 'Invalid content detected in question';
  END IF;
  
  -- Validate options
  IF array_length(option_texts, 1) < 2 OR array_length(option_texts, 1) > 10 THEN
    RAISE EXCEPTION 'Must have between 2 and 10 options';
  END IF;
  
  -- Validate each option
  FOR i IN 1..array_length(option_texts, 1) LOOP
    IF option_texts[i] IS NULL OR length(trim(option_texts[i])) < 1 OR length(option_texts[i]) > 100 THEN
      RAISE EXCEPTION 'Each option must be between 1 and 100 characters';
    END IF;
    
    IF option_texts[i] ~* '(<script|javascript:|on\w+\s*=|<iframe|<object|<embed)' THEN
      RAISE EXCEPTION 'Invalid content detected in option';
    END IF;
  END LOOP;
  
  RETURN true;
END;
$$;

-- -----------------------------------------------------------------------------
-- Maintenance: Archive expired polls (active → expired → archived)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.archive_expired_polls()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- First, mark recently expired polls as 'expired'
  UPDATE public.polls 
  SET status = 'expired'::public.poll_status
  WHERE expires_at < NOW() 
    AND expires_at > NOW() - INTERVAL '1 hour'
    AND status = 'active'::public.poll_status;
  
  -- Then, archive polls that have been expired for more than 1 hour
  UPDATE public.polls 
  SET status = 'archived'::public.poll_status
  WHERE expires_at < NOW() - INTERVAL '1 hour'
    AND status IN ('active'::public.poll_status, 'expired'::public.poll_status);
END;
$$;

-- -----------------------------------------------------------------------------
-- Maintenance: Cleanup inactive button hold sessions (10s timeout)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cleanup_button_hold_sessions()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  UPDATE public.button_holds
  SET is_active = false,
      ended_at = NOW(),
      duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER
  WHERE is_active = true
    AND last_heartbeat < (NOW() - INTERVAL '10 seconds');
END;
$$;

-- -----------------------------------------------------------------------------
-- Maintenance: Cleanup inactive poll vote hold sessions (10s timeout)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cleanup_poll_vote_sessions()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  UPDATE public.poll_vote_holds
  SET is_active = false,
      ended_at = NOW(),
      duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER
  WHERE is_active = true
    AND last_heartbeat < (NOW() - INTERVAL '10 seconds');
END;
$$;

-- -----------------------------------------------------------------------------
-- RPC: Get user statistics
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_stats(user_uuid UUID)
RETURNS TABLE(
  created_polls BIGINT,
  votes_cast BIGINT,
  votes_received BIGINT,
  boosts_received BIGINT,
  followers_count BIGINT,
  following_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE((SELECT COUNT(*) FROM public.polls WHERE created_by = user_uuid), 0) as created_polls,
    COALESCE((SELECT COUNT(*) FROM public.user_votes WHERE user_id = user_uuid), 0) as votes_cast,
    COALESCE((SELECT SUM(p.total_votes_cache) FROM public.polls p WHERE p.created_by = user_uuid), 0) as votes_received,
    COALESCE((SELECT SUM(p.boost_count_cache) FROM public.polls p WHERE p.created_by = user_uuid), 0) as boosts_received,
    COALESCE((SELECT COUNT(*) FROM public.user_follows WHERE followed_id = user_uuid), 0) as followers_count,
    COALESCE((SELECT COUNT(*) FROM public.user_follows WHERE follower_id = user_uuid), 0) as following_count;
END;
$$;

-- -----------------------------------------------------------------------------
-- RPC: Guest preview check
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guest_can_preview(p_device_id TEXT)
RETURNS TABLE(can_preview BOOLEAN, remaining INTEGER, used INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

-- -----------------------------------------------------------------------------
-- RPC: Guest preview registration
-- -----------------------------------------------------------------------------
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
$$;

-- -----------------------------------------------------------------------------
-- RPC: Check country action cooldown (legacy)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_count_country_action(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  last_action TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT last_country_action_at INTO last_action
  FROM public.profiles
  WHERE id = user_uuid;
  
  -- If no previous action or more than 3 minutes ago, allow
  IF last_action IS NULL OR last_action < NOW() - INTERVAL '3 minutes' THEN
    -- Update the timestamp
    UPDATE public.profiles 
    SET last_country_action_at = NOW()
    WHERE id = user_uuid;
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- -----------------------------------------------------------------------------
-- RPC: Record country button event (legacy overload)
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- RPC: Record country button event (with session validation)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_country_button_event(user_uuid UUID, session_uuid UUID DEFAULT NULL)
RETURNS TABLE(recorded BOOLEAN, cooldown_remaining_seconds INTEGER, reason TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
      RETURN QUERY SELECT FALSE, 0, 'below_threshold'::TEXT;
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
      RETURN QUERY SELECT FALSE, 0, 'below_threshold'::TEXT;
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
    
    RETURN QUERY SELECT TRUE, 0, 'recorded'::TEXT;
  ELSE
    -- Cooldown not passed, return remaining time
    RETURN QUERY SELECT FALSE, (cooldown_seconds - seconds_since_last), 'cooldown_active'::TEXT;
  END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- RPC: Get country rankings - daily
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- RPC: Get country rankings - monthly
-- -----------------------------------------------------------------------------
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
    AND ae.timestamp_utc >= date_trunc('month', NOW() AT TIME ZONE 'UTC')
    AND ae.country IS NOT NULL
    AND ae.country != 'Unknown'
  GROUP BY ae.country
  ORDER BY count DESC
  LIMIT 20;
$$;

-- -----------------------------------------------------------------------------
-- RPC: Get country rankings - all time
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- RPC: Get hot polls (cache-based)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_hot_polls(limit_count INTEGER DEFAULT 50)
RETURNS TABLE(
  id UUID,
  question TEXT,
  creator_username TEXT,
  status TEXT,
  total_votes INTEGER,
  total_votes_cache INTEGER,
  boost_count_cache INTEGER,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    p.id,
    p.question,
    p.creator_username,
    p.status::TEXT,
    p.total_votes,
    p.total_votes_cache,
    p.boost_count_cache,
    p.expires_at,
    p.created_at
  FROM public.polls p
  WHERE p.status = 'active'
    AND p.expires_at > NOW()
  ORDER BY 
    p.boost_count_cache DESC,
    p.total_votes_cache DESC,
    p.created_at DESC
  LIMIT limit_count;
$$;

-- -----------------------------------------------------------------------------
-- RPC: Get hot polls from events (24h activity-based)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_hot_polls_from_events(limit_count INTEGER DEFAULT 50)
RETURNS TABLE(
  id UUID,
  question TEXT,
  creator_username TEXT,
  created_by UUID,
  status TEXT,
  total_votes INTEGER,
  total_votes_cache INTEGER,
  boost_count_cache INTEGER,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  hot_points_24h BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH votes_24h AS (
    SELECT 
      poll_id,
      COUNT(*) as vote_count
    FROM public.user_votes
    WHERE voted_at > NOW() - INTERVAL '24 hours'
    GROUP BY poll_id
  ),
  boosts_24h AS (
    SELECT 
      poll_id,
      COUNT(*) as boost_count
    FROM public.user_boosts
    WHERE boosted_at > NOW() - INTERVAL '24 hours'
    GROUP BY poll_id
  )
  SELECT 
    p.id,
    p.question,
    p.creator_username,
    p.created_by,
    p.status::TEXT,
    p.total_votes,
    p.total_votes_cache,
    p.boost_count_cache,
    p.expires_at,
    p.created_at,
    COALESCE(v.vote_count, 0) + (COALESCE(b.boost_count, 0) * 3) as hot_points_24h
  FROM public.polls p
  LEFT JOIN votes_24h v ON v.poll_id = p.id
  LEFT JOIN boosts_24h b ON b.poll_id = p.id
  WHERE p.status = 'active'
    AND p.expires_at > NOW()
  ORDER BY 
    COALESCE(v.vote_count, 0) + (COALESCE(b.boost_count, 0) * 3) DESC,
    p.created_at DESC
  LIMIT limit_count;
$$;

-- -----------------------------------------------------------------------------
-- Trigger: Block poll creator from voting
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.block_creator_vote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  poll_creator_id UUID;
BEGIN
  -- Get the creator of the poll
  SELECT created_by INTO poll_creator_id
  FROM public.polls
  WHERE id = NEW.poll_id;
  
  -- If user is the creator, block the vote
  IF NEW.user_id = poll_creator_id THEN
    RAISE EXCEPTION 'Poll creator cannot vote on their own poll';
  END IF;
  
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- Trigger: Enforce vote edit limit (max 1 change)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_vote_edit_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if this is an update (vote change)
  IF TG_OP = 'UPDATE' THEN
    -- If already edited once, block further edits
    IF OLD.vote_edit_count >= 1 THEN
      RAISE EXCEPTION 'Vote can only be changed once per poll';
    END IF;
    -- Increment edit count
    NEW.vote_edit_count := OLD.vote_edit_count + 1;
  END IF;
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- Trigger: Set updated_at on user_votes
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_user_votes_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.updated_at IS NULL THEN
    NEW.updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- Trigger: Update poll vote counts (votes column)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_poll_vote_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.poll_options 
    SET votes = votes + 1 
    WHERE id = NEW.option_id;
    
    UPDATE public.polls 
    SET total_votes = total_votes + 1 
    WHERE id = NEW.poll_id;
    
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.poll_options 
    SET votes = votes - 1 
    WHERE id = OLD.option_id;
    
    UPDATE public.polls 
    SET total_votes = total_votes - 1 
    WHERE id = OLD.poll_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- -----------------------------------------------------------------------------
-- Trigger: Update votes cache
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_votes_cache()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  UPDATE public.poll_options 
  SET votes_cache = (
    SELECT COUNT(*) 
    FROM public.user_votes 
    WHERE option_id = NEW.option_id
  )
  WHERE id = NEW.option_id;
  
  UPDATE public.polls 
  SET total_votes_cache = (
    SELECT COUNT(*) 
    FROM public.user_votes 
    WHERE poll_id = NEW.poll_id
  )
  WHERE id = NEW.poll_id;
  
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- Trigger: Sync boost counts
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_boost_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO new_count
  FROM public.user_boosts
  WHERE poll_id = NEW.poll_id;

  UPDATE public.polls
  SET 
    boost_count = new_count,
    boost_count_cache = new_count
  WHERE id = NEW.poll_id;

  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- Trigger: Update boost cache
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_boost_cache()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  UPDATE public.polls 
  SET boost_count_cache = (
    SELECT COUNT(*) 
    FROM public.user_boosts 
    WHERE poll_id = NEW.poll_id
  )
  WHERE id = NEW.poll_id;
  
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- Trigger: Sync vote to new tables (poll_responses)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_vote_to_new_tables()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_country TEXT;
  v_response_id UUID;
BEGIN
  -- Get country from profiles
  SELECT COALESCE(country, 'unknown') INTO v_country
  FROM public.profiles
  WHERE id = NEW.user_id;
  
  IF v_country IS NULL THEN
    v_country := 'unknown';
  END IF;

  -- Upsert poll_responses
  INSERT INTO public.poll_responses (poll_id, user_id, country, submitted_at, source)
  VALUES (NEW.poll_id, NEW.user_id, v_country, now(), 'legacy_user_votes')
  ON CONFLICT (poll_id, user_id) 
  DO UPDATE SET 
    submitted_at = now(),
    country = EXCLUDED.country
  RETURNING id INTO v_response_id;

  -- Clear old options and insert new one (single-choice legacy)
  DELETE FROM public.poll_response_options WHERE response_id = v_response_id;
  INSERT INTO public.poll_response_options (response_id, option_id)
  VALUES (v_response_id, NEW.option_id);

  -- Log activity event
  INSERT INTO public.activity_events (user_id, country, source, poll_id, metadata)
  VALUES (
    NEW.user_id,
    v_country,
    'poll_vote',
    NEW.poll_id,
    jsonb_build_object('legacy', true, 'op', TG_OP)
  );

  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- Trigger: Sync vote delete to new tables
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_vote_delete_to_new_tables()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_country TEXT;
BEGIN
  -- Get country from profiles
  SELECT COALESCE(country, 'unknown') INTO v_country
  FROM public.profiles
  WHERE id = OLD.user_id;
  
  IF v_country IS NULL THEN
    v_country := 'unknown';
  END IF;

  -- Log activity event (don't delete poll_responses - UI may do DELETE+INSERT)
  INSERT INTO public.activity_events (user_id, country, source, poll_id, metadata)
  VALUES (
    OLD.user_id,
    v_country,
    'poll_vote',
    OLD.poll_id,
    jsonb_build_object('legacy', true, 'op', 'DELETE')
  );

  RETURN OLD;
END;
$$;

-- -----------------------------------------------------------------------------
-- Trigger: Sync boost to activity events
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_boost_to_activity_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_country TEXT;
BEGIN
  -- Get country from profiles
  SELECT COALESCE(country, 'unknown') INTO v_country
  FROM public.profiles
  WHERE id = NEW.user_id;
  
  IF v_country IS NULL THEN
    v_country := 'unknown';
  END IF;

  -- Log activity event
  INSERT INTO public.activity_events (user_id, country, source, poll_id, metadata)
  VALUES (
    NEW.user_id,
    v_country,
    'poll_boost',
    NEW.poll_id,
    jsonb_build_object('legacy', true)
  );

  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- Trigger: Handle new user (create profile)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email, country)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'country'
  );
  RETURN new;
END;
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- user_votes triggers
CREATE TRIGGER block_creator_vote_trigger
  BEFORE INSERT ON public.user_votes
  FOR EACH ROW EXECUTE FUNCTION public.block_creator_vote();

CREATE TRIGGER enforce_vote_edit_limit_trigger
  BEFORE UPDATE ON public.user_votes
  FOR EACH ROW EXECUTE FUNCTION public.enforce_vote_edit_limit();

CREATE TRIGGER set_user_votes_updated_at_trigger
  BEFORE INSERT OR UPDATE ON public.user_votes
  FOR EACH ROW EXECUTE FUNCTION public.set_user_votes_updated_at();

CREATE TRIGGER sync_vote_to_new_tables_trigger
  AFTER INSERT OR UPDATE ON public.user_votes
  FOR EACH ROW EXECUTE FUNCTION public.sync_vote_to_new_tables();

CREATE TRIGGER sync_vote_delete_trigger
  AFTER DELETE ON public.user_votes
  FOR EACH ROW EXECUTE FUNCTION public.sync_vote_delete_to_new_tables();

-- NOTE: The following triggers are DUPLICATES and should be removed:
-- poll_vote_count_trigger (duplicate of update_vote_counts_trigger)
-- trigger_update_votes_cache (duplicate of update_votes_cache_trigger)

CREATE TRIGGER update_vote_counts_trigger
  AFTER INSERT OR DELETE ON public.user_votes
  FOR EACH ROW EXECUTE FUNCTION public.update_poll_vote_counts();

CREATE TRIGGER update_votes_cache_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.user_votes
  FOR EACH ROW EXECUTE FUNCTION public.update_votes_cache();

-- user_boosts triggers
CREATE TRIGGER sync_boost_counts_trigger
  AFTER INSERT ON public.user_boosts
  FOR EACH ROW EXECUTE FUNCTION public.sync_boost_counts();

CREATE TRIGGER sync_boost_to_activity_trigger
  AFTER INSERT ON public.user_boosts
  FOR EACH ROW EXECUTE FUNCTION public.sync_boost_to_activity_events();

-- auth.users trigger (in auth schema)
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_boosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_boost_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.button_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_previews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hidden_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_response_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_vote_holds ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- profiles policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR ALL
  USING (auth.uid() = id);

-- -----------------------------------------------------------------------------
-- polls policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Anyone can view active polls"
  ON public.polls FOR SELECT
  USING (status = 'active'::public.poll_status);

CREATE POLICY "Users can create polls"
  ON public.polls FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own polls"
  ON public.polls FOR UPDATE
  USING (auth.uid() = created_by);

-- -----------------------------------------------------------------------------
-- poll_options policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Anyone can view poll options"
  ON public.poll_options FOR SELECT
  USING (true);

CREATE POLICY "Poll creators can manage options"
  ON public.poll_options FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.polls
    WHERE polls.id = poll_options.poll_id
    AND polls.created_by = auth.uid()
  ));

-- -----------------------------------------------------------------------------
-- user_votes policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view all votes"
  ON public.user_votes FOR SELECT
  USING (true);

CREATE POLICY "Users can create own votes"
  ON public.user_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own votes"
  ON public.user_votes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own votes"
  ON public.user_votes FOR DELETE
  USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- user_boosts policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view their own boosts"
  ON public.user_boosts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own boosts"
  ON public.user_boosts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- daily_boost_limits policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view their own boost limits"
  ON public.daily_boost_limits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own boost limits"
  ON public.daily_boost_limits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own boost limits"
  ON public.daily_boost_limits FOR UPDATE
  USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- button_holds policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view all holds for statistics"
  ON public.button_holds FOR SELECT
  USING (true);

CREATE POLICY "Users can manage own holds"
  ON public.button_holds FOR ALL
  USING ((auth.uid() = user_id) OR (user_id IS NULL));

-- -----------------------------------------------------------------------------
-- activity_events policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view all activity events for analytics"
  ON public.activity_events FOR SELECT
  USING (true);

CREATE POLICY "Users can manage own activity events"
  ON public.activity_events FOR ALL
  USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- guest_previews policies (RPC-only access)
-- -----------------------------------------------------------------------------
CREATE POLICY "Guest previews managed via RPC only"
  ON public.guest_previews FOR SELECT
  USING (false);

CREATE POLICY "Guest previews insert via RPC"
  ON public.guest_previews FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Guest previews update via RPC"
  ON public.guest_previews FOR UPDATE
  USING (false);

CREATE POLICY "Guest previews delete via RPC"
  ON public.guest_previews FOR DELETE
  USING (false);

-- -----------------------------------------------------------------------------
-- badges policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Everyone can view badges"
  ON public.badges FOR SELECT
  USING (true);

-- -----------------------------------------------------------------------------
-- user_badges policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view their own badges"
  ON public.user_badges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view all earned badges for leaderboards"
  ON public.user_badges FOR SELECT
  USING (true);

-- -----------------------------------------------------------------------------
-- user_follows policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view follow relationships for counts"
  ON public.user_follows FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their own follows"
  ON public.user_follows FOR ALL
  USING (auth.uid() = follower_id);

-- -----------------------------------------------------------------------------
-- saved_polls policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view their own saved polls"
  ON public.saved_polls FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can save polls"
  ON public.saved_polls FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave polls"
  ON public.saved_polls FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own saved polls"
  ON public.saved_polls FOR ALL
  USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- hidden_polls policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view their own hidden polls"
  ON public.hidden_polls FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can hide polls"
  ON public.hidden_polls FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unhide polls"
  ON public.hidden_polls FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own hidden polls"
  ON public.hidden_polls FOR ALL
  USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- poll_responses policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view all responses for statistics"
  ON public.poll_responses FOR SELECT
  USING (true);

CREATE POLICY "Users can manage own responses"
  ON public.poll_responses FOR ALL
  USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- poll_response_options policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view all response options"
  ON public.poll_response_options FOR SELECT
  USING (true);

CREATE POLICY "Users can manage own response options"
  ON public.poll_response_options FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.poll_responses pr
    WHERE pr.id = poll_response_options.response_id
    AND pr.user_id = auth.uid()
  ));

-- -----------------------------------------------------------------------------
-- poll_vote_holds policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view active vote holds for counting"
  ON public.poll_vote_holds FOR SELECT
  USING (is_active = true);

CREATE POLICY "Users can manage own vote holds"
  ON public.poll_vote_holds FOR ALL
  USING ((auth.uid() = user_id) OR (user_id IS NULL));

-- ============================================================================
-- SCHEMA CHECKSUM / OBJECT LISTING
-- Generated: 2025-01-25
-- ============================================================================
/*
TABLES (17):
  1. profiles
  2. polls
  3. poll_options
  4. user_votes
  5. user_boosts
  6. daily_boost_limits
  7. button_holds
  8. activity_events
  9. guest_previews
  10. badges
  11. user_badges
  12. user_follows
  13. saved_polls
  14. hidden_polls
  15. poll_responses
  16. poll_response_options
  17. poll_vote_holds

ENUMS (1):
  1. poll_status (active, archived, expired)

FUNCTIONS (21):
  1. generate_poll_id()
  2. validate_poll_input(text, text[])
  3. archive_expired_polls()
  4. cleanup_button_hold_sessions()
  5. cleanup_poll_vote_sessions()
  6. get_user_stats(uuid)
  7. guest_can_preview(text)
  8. guest_register_preview(text)
  9. can_count_country_action(uuid)
  10. record_country_button_event(uuid) [legacy]
  11. record_country_button_event(uuid, uuid)
  12. get_country_rank_daily()
  13. get_country_rank_monthly()
  14. get_country_rank_all_time()
  15. get_hot_polls(int)
  16. get_hot_polls_from_events(int)
  17. block_creator_vote()
  18. enforce_vote_edit_limit()
  19. set_user_votes_updated_at()
  20. update_poll_vote_counts()
  21. update_votes_cache()
  22. sync_boost_counts()
  23. update_boost_cache()
  24. sync_vote_to_new_tables()
  25. sync_vote_delete_to_new_tables()
  26. sync_boost_to_activity_events()
  27. handle_new_user()

TRIGGERS (12 unique, 4 duplicates to remove):
  user_votes:
    - block_creator_vote_trigger
    - enforce_vote_edit_limit_trigger
    - set_user_votes_updated_at_trigger
    - sync_vote_to_new_tables_trigger
    - sync_vote_delete_trigger
    - update_vote_counts_trigger
    - update_votes_cache_trigger
    DUPLICATES (to remove):
    - poll_vote_count_trigger (= update_vote_counts_trigger)
    - trigger_update_votes_cache (= update_votes_cache_trigger)
  user_boosts:
    - sync_boost_counts_trigger
    - sync_boost_to_activity_trigger

RLS POLICIES (43):
  profiles: 2
  polls: 3
  poll_options: 2
  user_votes: 4
  user_boosts: 2
  daily_boost_limits: 3
  button_holds: 2
  activity_events: 2
  guest_previews: 4
  badges: 1
  user_badges: 2
  user_follows: 2
  saved_polls: 4
  hidden_polls: 4
  poll_responses: 2
  poll_response_options: 2
  poll_vote_holds: 2

FOREIGN KEYS (27):
  See ALTER TABLE statements above for full list.

UNIQUE CONSTRAINTS (10):
  - profiles.username
  - user_votes (poll_id, user_id)
  - user_boosts (user_id, poll_id)
  - daily_boost_limits (user_id, boost_date)
  - guest_previews (device_id, preview_date)
  - user_badges (user_id, badge_id)
  - user_follows (follower_id, followed_id)
  - saved_polls (poll_id, user_id)
  - hidden_polls (poll_id, user_id)
  - poll_responses (poll_id, user_id)
*/
