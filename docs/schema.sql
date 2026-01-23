-- ============================================================
-- PUSH IT! DATABASE SCHEMA - FULL DDL EXPORT
-- Generated: 2026-01-23
-- Source of Truth for Mobile Team
-- ============================================================

-- ============================================================
-- 1. ENUMS
-- ============================================================

CREATE TYPE public.poll_status AS ENUM ('active', 'archived', 'expired');

-- ============================================================
-- 2. TABLES
-- ============================================================

CREATE TABLE public.profiles (
    id UUID NOT NULL,
    username TEXT,
    email TEXT,
    country TEXT,
    is_premium BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    last_button_action_at TIMESTAMPTZ,
    last_country_action_at TIMESTAMPTZ,
    CONSTRAINT profiles_pkey PRIMARY KEY (id)
);

CREATE TABLE public.polls (
    id TEXT NOT NULL DEFAULT public.generate_poll_id(),
    question TEXT NOT NULL,
    created_by UUID NOT NULL,
    creator_username TEXT NOT NULL,
    status public.poll_status DEFAULT 'active',
    is_anonymous BOOLEAN DEFAULT false,
    total_votes INTEGER DEFAULT 0,
    total_votes_cache INTEGER DEFAULT 0,
    boost_count INTEGER DEFAULT 0,
    boost_count_cache INTEGER DEFAULT 0,
    push_count INTEGER NOT NULL DEFAULT 0,
    votes_received_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,
    CONSTRAINT polls_pkey PRIMARY KEY (id)
);

CREATE TABLE public.poll_options (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    poll_id TEXT NOT NULL,
    option_text TEXT NOT NULL,
    order_index INTEGER DEFAULT 0,
    votes INTEGER DEFAULT 0,
    votes_cache INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT poll_options_pkey PRIMARY KEY (id),
    CONSTRAINT poll_options_poll_id_fkey FOREIGN KEY (poll_id) REFERENCES public.polls(id) ON DELETE CASCADE
);

CREATE TABLE public.user_votes (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    poll_id TEXT NOT NULL,
    option_id UUID NOT NULL,
    vote_edit_count INTEGER NOT NULL DEFAULT 0,
    voted_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT user_votes_pkey PRIMARY KEY (id),
    CONSTRAINT user_votes_poll_id_fkey FOREIGN KEY (poll_id) REFERENCES public.polls(id) ON DELETE CASCADE,
    CONSTRAINT user_votes_option_id_fkey FOREIGN KEY (option_id) REFERENCES public.poll_options(id) ON DELETE CASCADE
);

CREATE TABLE public.user_boosts (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    poll_id TEXT NOT NULL,
    boosted_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT user_boosts_pkey PRIMARY KEY (id),
    CONSTRAINT user_pushes_poll_id_fkey FOREIGN KEY (poll_id) REFERENCES public.polls(id) ON DELETE CASCADE
);

CREATE TABLE public.daily_boost_limits (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    boost_date DATE NOT NULL DEFAULT CURRENT_DATE,
    boost_count INTEGER NOT NULL DEFAULT 0,
    max_boosts INTEGER NOT NULL DEFAULT 3,
    CONSTRAINT daily_boost_limits_pkey PRIMARY KEY (id),
    CONSTRAINT daily_push_limits_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

CREATE TABLE public.button_holds (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID,
    device_id TEXT,
    context_type TEXT DEFAULT 'main_button',
    context_id TEXT,
    country TEXT,
    started_at TIMESTAMPTZ DEFAULT now(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    is_active BOOLEAN DEFAULT true,
    last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT button_holds_pkey PRIMARY KEY (id)
);

CREATE TABLE public.activity_events (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    poll_id TEXT,
    source TEXT NOT NULL,
    country TEXT NOT NULL,
    metadata JSONB,
    timestamp_utc TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT activity_events_pkey PRIMARY KEY (id),
    CONSTRAINT activity_events_poll_id_fkey FOREIGN KEY (poll_id) REFERENCES public.polls(id) ON DELETE SET NULL,
    CONSTRAINT activity_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

CREATE TABLE public.guest_previews (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    device_id TEXT NOT NULL,
    preview_date DATE NOT NULL DEFAULT ((now() AT TIME ZONE 'utc'::text))::date,
    preview_count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT guest_previews_pkey PRIMARY KEY (id)
);

CREATE TABLE public.saved_polls (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    poll_id TEXT NOT NULL,
    saved_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT saved_polls_pkey PRIMARY KEY (id),
    CONSTRAINT saved_polls_poll_id_fkey FOREIGN KEY (poll_id) REFERENCES public.polls(id) ON DELETE CASCADE
);

CREATE TABLE public.hidden_polls (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    poll_id TEXT NOT NULL,
    hidden_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT hidden_polls_pkey PRIMARY KEY (id),
    CONSTRAINT hidden_polls_poll_id_fkey FOREIGN KEY (poll_id) REFERENCES public.polls(id) ON DELETE CASCADE
);

CREATE TABLE public.poll_responses (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    poll_id TEXT NOT NULL,
    user_id UUID NOT NULL,
    country TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'app',
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT poll_responses_pkey PRIMARY KEY (id),
    CONSTRAINT poll_responses_poll_id_fkey FOREIGN KEY (poll_id) REFERENCES public.polls(id) ON DELETE CASCADE,
    CONSTRAINT poll_responses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

CREATE TABLE public.poll_response_options (
    response_id UUID NOT NULL,
    option_id UUID NOT NULL,
    CONSTRAINT poll_response_options_pkey PRIMARY KEY (response_id, option_id),
    CONSTRAINT poll_response_options_response_id_fkey FOREIGN KEY (response_id) REFERENCES public.poll_responses(id) ON DELETE CASCADE,
    CONSTRAINT poll_response_options_option_id_fkey FOREIGN KEY (option_id) REFERENCES public.poll_options(id) ON DELETE CASCADE
);

CREATE TABLE public.poll_vote_holds (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    poll_id TEXT,
    option_id UUID,
    user_id UUID,
    device_id TEXT,
    started_at TIMESTAMPTZ DEFAULT now(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    is_active BOOLEAN DEFAULT true,
    last_heartbeat TIMESTAMPTZ,
    CONSTRAINT poll_vote_holds_pkey PRIMARY KEY (id),
    CONSTRAINT poll_vote_holds_poll_id_fkey FOREIGN KEY (poll_id) REFERENCES public.polls(id) ON DELETE CASCADE,
    CONSTRAINT poll_vote_holds_option_id_fkey FOREIGN KEY (option_id) REFERENCES public.poll_options(id) ON DELETE CASCADE,
    CONSTRAINT poll_vote_holds_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE TABLE public.badges (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    badge_name TEXT NOT NULL,
    description TEXT,
    criteria_type TEXT NOT NULL,
    criteria_value INTEGER NOT NULL,
    icon_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT badges_pkey PRIMARY KEY (id)
);

CREATE TABLE public.user_badges (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID,
    badge_id UUID,
    earned_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT user_badges_pkey PRIMARY KEY (id),
    CONSTRAINT user_badges_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT user_badges_badge_id_fkey FOREIGN KEY (badge_id) REFERENCES public.badges(id) ON DELETE CASCADE
);

CREATE TABLE public.user_follows (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    follower_id UUID,
    followed_id UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT user_follows_pkey PRIMARY KEY (id),
    CONSTRAINT user_follows_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT user_follows_followed_id_fkey FOREIGN KEY (followed_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- ============================================================
-- 3. INDEXES
-- ============================================================

-- Polls indexes
CREATE INDEX idx_polls_status ON public.polls(status);
CREATE INDEX idx_polls_created_by ON public.polls(created_by);
CREATE INDEX idx_polls_expires_at ON public.polls(expires_at);
CREATE INDEX idx_polls_created_at ON public.polls(created_at DESC);

-- Poll options indexes
CREATE INDEX idx_poll_options_poll_id ON public.poll_options(poll_id);

-- User votes indexes
CREATE INDEX idx_user_votes_user_id ON public.user_votes(user_id);
CREATE INDEX idx_user_votes_poll_id ON public.user_votes(poll_id);
CREATE INDEX idx_user_votes_option_id ON public.user_votes(option_id);
CREATE UNIQUE INDEX idx_user_votes_user_poll ON public.user_votes(user_id, poll_id);

-- User boosts indexes
CREATE INDEX idx_user_boosts_user_id ON public.user_boosts(user_id);
CREATE INDEX idx_user_boosts_poll_id ON public.user_boosts(poll_id);
CREATE UNIQUE INDEX idx_user_boosts_user_poll ON public.user_boosts(user_id, poll_id);

-- Daily boost limits indexes
CREATE UNIQUE INDEX idx_daily_boost_limits_user_date ON public.daily_boost_limits(user_id, boost_date);

-- Button holds indexes
CREATE INDEX idx_button_holds_user_id ON public.button_holds(user_id);
CREATE INDEX idx_button_holds_is_active ON public.button_holds(is_active) WHERE is_active = true;
CREATE INDEX idx_button_holds_last_heartbeat ON public.button_holds(last_heartbeat);

-- Activity events indexes
CREATE INDEX idx_activity_events_user_id ON public.activity_events(user_id);
CREATE INDEX idx_activity_events_poll_id ON public.activity_events(poll_id);
CREATE INDEX idx_activity_events_timestamp ON public.activity_events(timestamp_utc DESC);
CREATE INDEX idx_activity_events_source ON public.activity_events(source);
CREATE INDEX idx_activity_events_country_ranking ON public.activity_events(country, timestamp_utc) 
    WHERE source = 'country_button_counted';
CREATE INDEX idx_activity_events_user_cooldown ON public.activity_events(user_id, timestamp_utc DESC) 
    WHERE source = 'country_button_counted';

-- Guest previews indexes
CREATE UNIQUE INDEX idx_guest_previews_device_date ON public.guest_previews(device_id, preview_date);

-- Saved polls indexes
CREATE INDEX idx_saved_polls_user_id ON public.saved_polls(user_id);
CREATE UNIQUE INDEX idx_saved_polls_user_poll ON public.saved_polls(user_id, poll_id);

-- Hidden polls indexes
CREATE INDEX idx_hidden_polls_user_id ON public.hidden_polls(user_id);
CREATE UNIQUE INDEX idx_hidden_polls_user_poll ON public.hidden_polls(user_id, poll_id);

-- Poll vote holds indexes
CREATE INDEX idx_poll_vote_holds_poll_id ON public.poll_vote_holds(poll_id);
CREATE INDEX idx_poll_vote_holds_is_active ON public.poll_vote_holds(is_active) WHERE is_active = true;

-- User follows indexes
CREATE INDEX idx_user_follows_follower ON public.user_follows(follower_id);
CREATE INDEX idx_user_follows_followed ON public.user_follows(followed_id);
CREATE UNIQUE INDEX idx_user_follows_pair ON public.user_follows(follower_id, followed_id);

-- ============================================================
-- 4. FUNCTIONS
-- ============================================================

-- Generate poll ID (6 chars alphanumeric)
CREATE OR REPLACE FUNCTION public.generate_poll_id()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path TO ''
AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..6 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$;

-- Validate poll input
CREATE OR REPLACE FUNCTION public.validate_poll_input(question_text TEXT, option_texts TEXT[])
RETURNS BOOLEAN
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
    IF question_text IS NULL OR length(trim(question_text)) < 5 THEN
        RETURN false;
    END IF;
    IF length(question_text) > 200 THEN
        RETURN false;
    END IF;
    IF option_texts IS NULL OR array_length(option_texts, 1) < 2 THEN
        RETURN false;
    END IF;
    IF array_length(option_texts, 1) > 6 THEN
        RETURN false;
    END IF;
    RETURN true;
END;
$$;

-- Archive expired polls
CREATE OR REPLACE FUNCTION public.archive_expired_polls()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    UPDATE public.polls
    SET status = 'archived', updated_at = now()
    WHERE status = 'active'
      AND expires_at IS NOT NULL
      AND expires_at < now();
END;
$$;

-- Cleanup button hold sessions (stale > 30s)
CREATE OR REPLACE FUNCTION public.cleanup_button_hold_sessions()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    UPDATE public.button_holds
    SET is_active = false,
        ended_at = last_heartbeat,
        duration_seconds = EXTRACT(EPOCH FROM (last_heartbeat - started_at))::INTEGER
    WHERE is_active = true
      AND last_heartbeat < now() - interval '30 seconds';
END;
$$;

-- Cleanup poll vote sessions
CREATE OR REPLACE FUNCTION public.cleanup_poll_vote_sessions()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    UPDATE public.poll_vote_holds
    SET is_active = false,
        ended_at = COALESCE(last_heartbeat, started_at),
        duration_seconds = EXTRACT(EPOCH FROM (COALESCE(last_heartbeat, started_at) - started_at))::INTEGER
    WHERE is_active = true
      AND (last_heartbeat IS NULL OR last_heartbeat < now() - interval '30 seconds');
END;
$$;

-- Get user stats
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
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM public.polls WHERE created_by = user_uuid)::BIGINT,
        (SELECT COUNT(*) FROM public.user_votes WHERE user_id = user_uuid)::BIGINT,
        (SELECT COALESCE(SUM(total_votes), 0) FROM public.polls WHERE created_by = user_uuid)::BIGINT,
        (SELECT COALESCE(SUM(boost_count), 0) FROM public.polls WHERE created_by = user_uuid)::BIGINT,
        (SELECT COUNT(*) FROM public.user_follows WHERE followed_id = user_uuid)::BIGINT,
        (SELECT COUNT(*) FROM public.user_follows WHERE follower_id = user_uuid)::BIGINT;
END;
$$;

-- Guest can preview (check limit)
CREATE OR REPLACE FUNCTION public.guest_can_preview(p_device_id TEXT)
RETURNS TABLE(can_preview BOOLEAN, remaining INTEGER, used INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_used INTEGER;
    v_limit INTEGER := 10;
    v_utc_today DATE;
BEGIN
    -- Validate device_id
    IF p_device_id IS NULL OR length(p_device_id) < 16 OR length(p_device_id) > 128 THEN
        RETURN QUERY SELECT false, 0, 0;
        RETURN;
    END IF;
    
    v_utc_today := (now() AT TIME ZONE 'utc')::date;
    
    SELECT COALESCE(preview_count, 0) INTO v_used
    FROM public.guest_previews
    WHERE device_id = p_device_id AND preview_date = v_utc_today;
    
    IF v_used IS NULL THEN
        v_used := 0;
    END IF;
    
    RETURN QUERY SELECT (v_used < v_limit), (v_limit - v_used), v_used;
END;
$$;

-- Guest register preview (consume one)
CREATE OR REPLACE FUNCTION public.guest_register_preview(p_device_id TEXT)
RETURNS TABLE(success BOOLEAN, remaining INTEGER, used INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_used INTEGER;
    v_limit INTEGER := 10;
    v_utc_today DATE;
BEGIN
    -- Validate device_id
    IF p_device_id IS NULL OR length(p_device_id) < 16 OR length(p_device_id) > 128 THEN
        RETURN QUERY SELECT false, 0, 0;
        RETURN;
    END IF;
    
    v_utc_today := (now() AT TIME ZONE 'utc')::date;
    
    SELECT COALESCE(preview_count, 0) INTO v_used
    FROM public.guest_previews
    WHERE device_id = p_device_id AND preview_date = v_utc_today;
    
    IF v_used IS NULL THEN
        v_used := 0;
    END IF;
    
    IF v_used >= v_limit THEN
        RETURN QUERY SELECT false, 0, v_limit;
        RETURN;
    END IF;
    
    INSERT INTO public.guest_previews (device_id, preview_date, preview_count)
    VALUES (p_device_id, v_utc_today, 1)
    ON CONFLICT (device_id, preview_date)
    DO UPDATE SET preview_count = guest_previews.preview_count + 1, updated_at = now();
    
    v_used := v_used + 1;
    RETURN QUERY SELECT true, (v_limit - v_used), v_used;
END;
$$;

-- Record country button event (with 3s threshold + 3min cooldown)
CREATE OR REPLACE FUNCTION public.record_country_button_event(user_uuid UUID, session_uuid UUID DEFAULT NULL)
RETURNS TABLE(recorded BOOLEAN, cooldown_remaining_seconds INTEGER, reason TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_last_event TIMESTAMPTZ;
    v_cooldown_interval INTERVAL := interval '3 minutes';
    v_user_country TEXT;
    v_seconds_remaining INTEGER;
    v_session_valid BOOLEAN := false;
    v_session_duration INTERVAL;
BEGIN
    -- Check session validity if provided
    IF session_uuid IS NOT NULL THEN
        SELECT 
            (ended_at IS NOT NULL AND (ended_at - started_at) >= interval '3 seconds'),
            (ended_at - started_at)
        INTO v_session_valid, v_session_duration
        FROM public.button_holds
        WHERE id = session_uuid
          AND user_id = user_uuid
          AND context_type = 'main_button';
        
        IF NOT v_session_valid THEN
            RETURN QUERY SELECT false, 0, 'below_threshold'::TEXT;
            RETURN;
        END IF;
    END IF;
    
    -- Get user country
    SELECT country INTO v_user_country
    FROM public.profiles
    WHERE id = user_uuid;
    
    IF v_user_country IS NULL THEN
        RETURN QUERY SELECT false, 0, 'no_country'::TEXT;
        RETURN;
    END IF;
    
    -- Check cooldown
    SELECT MAX(timestamp_utc) INTO v_last_event
    FROM public.activity_events
    WHERE user_id = user_uuid AND source = 'country_button_counted';
    
    IF v_last_event IS NOT NULL AND (now() - v_last_event) < v_cooldown_interval THEN
        v_seconds_remaining := EXTRACT(EPOCH FROM (v_cooldown_interval - (now() - v_last_event)))::INTEGER;
        RETURN QUERY SELECT false, v_seconds_remaining, 'cooldown'::TEXT;
        RETURN;
    END IF;
    
    -- Record event
    INSERT INTO public.activity_events (user_id, source, country, timestamp_utc, metadata)
    VALUES (user_uuid, 'country_button_counted', v_user_country, now(), 
            jsonb_build_object('session_id', session_uuid));
    
    -- Update profile timestamp
    UPDATE public.profiles
    SET last_country_action_at = now()
    WHERE id = user_uuid;
    
    RETURN QUERY SELECT true, 0, 'recorded'::TEXT;
END;
$$;

-- Can count country action (legacy compatibility)
CREATE OR REPLACE FUNCTION public.can_count_country_action(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
    v_last_event TIMESTAMPTZ;
BEGIN
    SELECT MAX(timestamp_utc) INTO v_last_event
    FROM public.activity_events
    WHERE user_id = user_uuid AND source = 'country_button_counted';
    
    RETURN (v_last_event IS NULL OR (now() - v_last_event) >= interval '3 minutes');
END;
$$;

-- Get country rank daily
CREATE OR REPLACE FUNCTION public.get_country_rank_daily()
RETURNS TABLE(country TEXT, count BIGINT, rank BIGINT)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
    v_utc_today DATE;
BEGIN
    v_utc_today := (now() AT TIME ZONE 'utc')::date;
    
    RETURN QUERY
    SELECT 
        ae.country,
        COUNT(*)::BIGINT as count,
        RANK() OVER (ORDER BY COUNT(*) DESC)::BIGINT as rank
    FROM public.activity_events ae
    WHERE ae.source = 'country_button_counted'
      AND (ae.timestamp_utc AT TIME ZONE 'utc')::date = v_utc_today
    GROUP BY ae.country
    ORDER BY count DESC;
END;
$$;

-- Get country rank monthly
CREATE OR REPLACE FUNCTION public.get_country_rank_monthly()
RETURNS TABLE(country TEXT, count BIGINT, rank BIGINT)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
    v_month_start TIMESTAMPTZ;
BEGIN
    v_month_start := date_trunc('month', now() AT TIME ZONE 'utc');
    
    RETURN QUERY
    SELECT 
        ae.country,
        COUNT(*)::BIGINT as count,
        RANK() OVER (ORDER BY COUNT(*) DESC)::BIGINT as rank
    FROM public.activity_events ae
    WHERE ae.source = 'country_button_counted'
      AND ae.timestamp_utc >= v_month_start
    GROUP BY ae.country
    ORDER BY count DESC;
END;
$$;

-- Get country rank all time
CREATE OR REPLACE FUNCTION public.get_country_rank_all_time()
RETURNS TABLE(country TEXT, count BIGINT, rank BIGINT)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ae.country,
        COUNT(*)::BIGINT as count,
        RANK() OVER (ORDER BY COUNT(*) DESC)::BIGINT as rank
    FROM public.activity_events ae
    WHERE ae.source = 'country_button_counted'
    GROUP BY ae.country
    ORDER BY count DESC;
END;
$$;

-- Get hot polls from events (point-based: vote=1, boost=3)
CREATE OR REPLACE FUNCTION public.get_hot_polls_from_events(limit_count INTEGER DEFAULT 20)
RETURNS TABLE(
    id TEXT,
    question TEXT,
    created_by UUID,
    creator_username TEXT,
    status TEXT,
    total_votes INTEGER,
    total_votes_cache INTEGER,
    boost_count_cache INTEGER,
    created_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    hot_points_24h BIGINT
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.question,
        p.created_by,
        p.creator_username,
        p.status::TEXT,
        p.total_votes,
        p.total_votes_cache,
        p.boost_count_cache,
        p.created_at,
        p.expires_at,
        COALESCE(hot.points, 0)::BIGINT as hot_points_24h
    FROM public.polls p
    LEFT JOIN (
        SELECT 
            ae.poll_id,
            SUM(CASE 
                WHEN ae.source = 'vote' THEN 1
                WHEN ae.source = 'boost' THEN 3
                ELSE 0
            END) as points
        FROM public.activity_events ae
        WHERE ae.poll_id IS NOT NULL
          AND ae.timestamp_utc >= now() - interval '24 hours'
        GROUP BY ae.poll_id
    ) hot ON hot.poll_id = p.id
    WHERE p.status = 'active'
    ORDER BY COALESCE(hot.points, 0) DESC, p.created_at DESC
    LIMIT limit_count;
END;
$$;

-- Get hot polls (legacy)
CREATE OR REPLACE FUNCTION public.get_hot_polls(limit_count INTEGER DEFAULT 20)
RETURNS TABLE(
    id TEXT,
    question TEXT,
    creator_username TEXT,
    status TEXT,
    total_votes INTEGER,
    total_votes_cache INTEGER,
    boost_count_cache INTEGER,
    created_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.question,
        p.creator_username,
        p.status::TEXT,
        p.total_votes,
        p.total_votes_cache,
        p.boost_count_cache,
        p.created_at,
        p.expires_at
    FROM public.polls p
    WHERE p.status = 'active'
    ORDER BY p.boost_count_cache DESC, p.total_votes_cache DESC, p.created_at DESC
    LIMIT limit_count;
END;
$$;

-- ============================================================
-- 5. TRIGGER FUNCTIONS
-- ============================================================

-- Enforce vote edit limit (max 1 edit)
CREATE OR REPLACE FUNCTION public.enforce_vote_edit_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
    IF OLD.vote_edit_count >= 1 THEN
        RAISE EXCEPTION 'Vote edit limit reached. You can only change your vote once.';
    END IF;
    NEW.vote_edit_count := OLD.vote_edit_count + 1;
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

-- Block creator from voting on own poll
CREATE OR REPLACE FUNCTION public.block_creator_vote()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO ''
AS $$
DECLARE
    v_creator_id UUID;
BEGIN
    SELECT created_by INTO v_creator_id
    FROM public.polls
    WHERE id = NEW.poll_id;
    
    IF NEW.user_id = v_creator_id THEN
        RAISE EXCEPTION 'Poll creators cannot vote on their own polls.';
    END IF;
    
    RETURN NEW;
END;
$$;

-- Update vote counts on poll_options
CREATE OR REPLACE FUNCTION public.update_option_vote_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.poll_options
        SET votes = votes + 1, votes_cache = votes_cache + 1
        WHERE id = NEW.option_id;
        
        UPDATE public.polls
        SET total_votes = total_votes + 1, total_votes_cache = total_votes_cache + 1
        WHERE id = NEW.poll_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.option_id != NEW.option_id THEN
        UPDATE public.poll_options
        SET votes = votes - 1, votes_cache = votes_cache - 1
        WHERE id = OLD.option_id;
        
        UPDATE public.poll_options
        SET votes = votes + 1, votes_cache = votes_cache + 1
        WHERE id = NEW.option_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.poll_options
        SET votes = votes - 1, votes_cache = votes_cache - 1
        WHERE id = OLD.option_id;
        
        UPDATE public.polls
        SET total_votes = total_votes - 1, total_votes_cache = total_votes_cache - 1
        WHERE id = OLD.poll_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Update boost counts
CREATE OR REPLACE FUNCTION public.update_boost_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.polls
        SET boost_count = boost_count + 1, boost_count_cache = boost_count_cache + 1
        WHERE id = NEW.poll_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.polls
        SET boost_count = boost_count - 1, boost_count_cache = boost_count_cache - 1
        WHERE id = OLD.poll_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, username, created_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        now()
    );
    RETURN NEW;
END;
$$;

-- ============================================================
-- 6. TRIGGERS
-- ============================================================

-- Vote edit limit trigger
CREATE TRIGGER enforce_vote_edit_limit_trigger
    BEFORE UPDATE ON public.user_votes
    FOR EACH ROW
    WHEN (OLD.option_id IS DISTINCT FROM NEW.option_id)
    EXECUTE FUNCTION public.enforce_vote_edit_limit();

-- Block creator vote trigger
CREATE TRIGGER block_creator_vote_trigger
    BEFORE INSERT ON public.user_votes
    FOR EACH ROW
    EXECUTE FUNCTION public.block_creator_vote();

-- Update vote counts trigger
CREATE TRIGGER update_vote_counts_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.user_votes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_option_vote_count();

-- Update boost counts trigger
CREATE TRIGGER update_boost_counts_trigger
    AFTER INSERT OR DELETE ON public.user_boosts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_boost_count();

-- ============================================================
-- 7. ROW LEVEL SECURITY
-- ============================================================

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
ALTER TABLE public.saved_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hidden_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_response_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_vote_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

-- PROFILES policies
CREATE POLICY "Profiles are viewable by everyone"
    ON public.profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- POLLS policies
CREATE POLICY "Active polls are viewable by everyone"
    ON public.polls FOR SELECT
    USING (status = 'active' OR created_by = auth.uid());

CREATE POLICY "Authenticated users can create polls"
    ON public.polls FOR INSERT
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Poll owners can update their polls"
    ON public.polls FOR UPDATE
    USING (auth.uid() = created_by);

-- POLL_OPTIONS policies
CREATE POLICY "Poll options are viewable by everyone"
    ON public.poll_options FOR SELECT
    USING (true);

CREATE POLICY "Poll creators can insert options"
    ON public.poll_options FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.polls WHERE id = poll_id AND created_by = auth.uid()
    ));

-- USER_VOTES policies
CREATE POLICY "Users can view own votes"
    ON public.user_votes FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own votes"
    ON public.user_votes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own votes"
    ON public.user_votes FOR UPDATE
    USING (auth.uid() = user_id);

-- USER_BOOSTS policies
CREATE POLICY "Users can view own boosts"
    ON public.user_boosts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own boosts"
    ON public.user_boosts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- DAILY_BOOST_LIMITS policies
CREATE POLICY "Users can view own boost limits"
    ON public.daily_boost_limits FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own boost limits"
    ON public.daily_boost_limits FOR ALL
    USING (auth.uid() = user_id);

-- BUTTON_HOLDS policies
CREATE POLICY "Users can view own holds"
    ON public.button_holds FOR SELECT
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Anyone can insert holds"
    ON public.button_holds FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can update own holds"
    ON public.button_holds FOR UPDATE
    USING (auth.uid() = user_id OR user_id IS NULL);

-- ACTIVITY_EVENTS policies
CREATE POLICY "Users can view own events"
    ON public.activity_events FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own events"
    ON public.activity_events FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- GUEST_PREVIEWS policies (locked - access via RPC only)
CREATE POLICY "No direct select on guest_previews"
    ON public.guest_previews FOR SELECT
    USING (false);

CREATE POLICY "No direct insert on guest_previews"
    ON public.guest_previews FOR INSERT
    WITH CHECK (false);

CREATE POLICY "No direct update on guest_previews"
    ON public.guest_previews FOR UPDATE
    USING (false);

CREATE POLICY "No direct delete on guest_previews"
    ON public.guest_previews FOR DELETE
    USING (false);

-- SAVED_POLLS policies
CREATE POLICY "Users can view own saved polls"
    ON public.saved_polls FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can save polls"
    ON public.saved_polls FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave polls"
    ON public.saved_polls FOR DELETE
    USING (auth.uid() = user_id);

-- HIDDEN_POLLS policies
CREATE POLICY "Users can view own hidden polls"
    ON public.hidden_polls FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can hide polls"
    ON public.hidden_polls FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unhide polls"
    ON public.hidden_polls FOR DELETE
    USING (auth.uid() = user_id);

-- POLL_RESPONSES policies
CREATE POLICY "Users can view own responses"
    ON public.poll_responses FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own responses"
    ON public.poll_responses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- POLL_RESPONSE_OPTIONS policies
CREATE POLICY "Response options viewable by response owner"
    ON public.poll_response_options FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.poll_responses WHERE id = response_id AND user_id = auth.uid()
    ));

-- POLL_VOTE_HOLDS policies
CREATE POLICY "Users can view own vote holds"
    ON public.poll_vote_holds FOR SELECT
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Anyone can insert vote holds"
    ON public.poll_vote_holds FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can update own vote holds"
    ON public.poll_vote_holds FOR UPDATE
    USING (auth.uid() = user_id OR user_id IS NULL);

-- BADGES policies
CREATE POLICY "Badges are viewable by everyone"
    ON public.badges FOR SELECT
    USING (true);

-- USER_BADGES policies
CREATE POLICY "User badges are viewable by everyone"
    ON public.user_badges FOR SELECT
    USING (true);

CREATE POLICY "System can insert badges"
    ON public.user_badges FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- USER_FOLLOWS policies
CREATE POLICY "Follows are viewable by everyone"
    ON public.user_follows FOR SELECT
    USING (true);

CREATE POLICY "Users can follow others"
    ON public.user_follows FOR INSERT
    WITH CHECK (auth.uid() = follower_id AND follower_id != followed_id);

CREATE POLICY "Users can unfollow"
    ON public.user_follows FOR DELETE
    USING (auth.uid() = follower_id);

-- ============================================================
-- END OF SCHEMA
-- ============================================================
