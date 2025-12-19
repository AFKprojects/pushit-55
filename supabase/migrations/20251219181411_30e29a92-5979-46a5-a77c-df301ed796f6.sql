
-- ============================================
-- STAGE 1B: New Architecture Tables + Dual-Write
-- Backward compatible - UI uses old tables
-- ============================================

-- 1) Extend profiles with future columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_button_action_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false;

-- ============================================
-- 2) Create new tables
-- ============================================

-- 2.1 poll_responses
CREATE TABLE IF NOT EXISTS public.poll_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  country text NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'legacy_user_votes',
  CONSTRAINT poll_responses_poll_user_unique UNIQUE (poll_id, user_id)
);

-- Enable RLS
ALTER TABLE public.poll_responses ENABLE ROW LEVEL SECURITY;

-- RLS policies for poll_responses
CREATE POLICY "Users can view all responses for statistics" ON public.poll_responses
FOR SELECT USING (true);

CREATE POLICY "Users can manage own responses" ON public.poll_responses
FOR ALL USING (auth.uid() = user_id);

-- Indexes for poll_responses
CREATE INDEX IF NOT EXISTS idx_poll_responses_poll_submitted ON public.poll_responses(poll_id, submitted_at);
CREATE INDEX IF NOT EXISTS idx_poll_responses_poll_country ON public.poll_responses(poll_id, country);
CREATE INDEX IF NOT EXISTS idx_poll_responses_user_submitted ON public.poll_responses(user_id, submitted_at);

-- 2.2 poll_response_options
CREATE TABLE IF NOT EXISTS public.poll_response_options (
  response_id uuid NOT NULL REFERENCES public.poll_responses(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  PRIMARY KEY (response_id, option_id)
);

-- Enable RLS
ALTER TABLE public.poll_response_options ENABLE ROW LEVEL SECURITY;

-- RLS policies for poll_response_options
CREATE POLICY "Users can view all response options" ON public.poll_response_options
FOR SELECT USING (true);

CREATE POLICY "Users can manage own response options" ON public.poll_response_options
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.poll_responses pr 
    WHERE pr.id = response_id AND pr.user_id = auth.uid()
  )
);

-- Index for poll_response_options
CREATE INDEX IF NOT EXISTS idx_poll_response_options_option ON public.poll_response_options(option_id);

-- 2.3 activity_events
CREATE TABLE IF NOT EXISTS public.activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  country text NOT NULL,
  timestamp_utc timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL,
  poll_id uuid NULL REFERENCES public.polls(id) ON DELETE SET NULL,
  metadata jsonb NULL
);

-- Enable RLS
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for activity_events
CREATE POLICY "Users can view all activity events for analytics" ON public.activity_events
FOR SELECT USING (true);

CREATE POLICY "Users can manage own activity events" ON public.activity_events
FOR ALL USING (auth.uid() = user_id);

-- Indexes for activity_events
CREATE INDEX IF NOT EXISTS idx_activity_events_source_timestamp ON public.activity_events(source, timestamp_utc);
CREATE INDEX IF NOT EXISTS idx_activity_events_country_timestamp ON public.activity_events(country, timestamp_utc);
CREATE INDEX IF NOT EXISTS idx_activity_events_user_timestamp ON public.activity_events(user_id, timestamp_utc);
CREATE INDEX IF NOT EXISTS idx_activity_events_poll_timestamp ON public.activity_events(poll_id, timestamp_utc);

-- ============================================
-- 3) Dual-write triggers
-- ============================================

-- 3.1 Trigger function for user_votes INSERT/UPDATE
CREATE OR REPLACE FUNCTION public.sync_vote_to_new_tables()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_country text;
  v_response_id uuid;
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

-- 3.2 Trigger function for user_votes DELETE
CREATE OR REPLACE FUNCTION public.sync_vote_delete_to_new_tables()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_country text;
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

-- 3.3 Trigger function for user_boosts INSERT
CREATE OR REPLACE FUNCTION public.sync_boost_to_activity_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_country text;
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

-- Create triggers (drop first if exist to ensure clean state)
DROP TRIGGER IF EXISTS sync_vote_to_new_tables_trigger ON public.user_votes;
CREATE TRIGGER sync_vote_to_new_tables_trigger
AFTER INSERT OR UPDATE ON public.user_votes
FOR EACH ROW
EXECUTE FUNCTION public.sync_vote_to_new_tables();

DROP TRIGGER IF EXISTS sync_vote_delete_trigger ON public.user_votes;
CREATE TRIGGER sync_vote_delete_trigger
AFTER DELETE ON public.user_votes
FOR EACH ROW
EXECUTE FUNCTION public.sync_vote_delete_to_new_tables();

DROP TRIGGER IF EXISTS sync_boost_to_activity_trigger ON public.user_boosts;
CREATE TRIGGER sync_boost_to_activity_trigger
AFTER INSERT ON public.user_boosts
FOR EACH ROW
EXECUTE FUNCTION public.sync_boost_to_activity_events();

-- ============================================
-- 4) Backfill existing data (idempotent)
-- ============================================

-- Backfill poll_responses from user_votes
INSERT INTO public.poll_responses (poll_id, user_id, country, submitted_at, source)
SELECT 
  uv.poll_id,
  uv.user_id,
  COALESCE(p.country, 'unknown'),
  COALESCE(uv.voted_at, uv.created_at, now()),
  'legacy_backfill'
FROM public.user_votes uv
LEFT JOIN public.profiles p ON p.id = uv.user_id
ON CONFLICT (poll_id, user_id) DO NOTHING;

-- Backfill poll_response_options
INSERT INTO public.poll_response_options (response_id, option_id)
SELECT 
  pr.id,
  uv.option_id
FROM public.user_votes uv
JOIN public.poll_responses pr ON pr.poll_id = uv.poll_id AND pr.user_id = uv.user_id
ON CONFLICT (response_id, option_id) DO NOTHING;

-- Backfill activity_events for votes (one per user_vote)
INSERT INTO public.activity_events (user_id, country, timestamp_utc, source, poll_id, metadata)
SELECT 
  uv.user_id,
  COALESCE(p.country, 'unknown'),
  COALESCE(uv.voted_at, uv.created_at, now()),
  'poll_vote',
  uv.poll_id,
  jsonb_build_object('legacy', true, 'op', 'backfill')
FROM public.user_votes uv
LEFT JOIN public.profiles p ON p.id = uv.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.activity_events ae 
  WHERE ae.user_id = uv.user_id 
    AND ae.poll_id = uv.poll_id 
    AND ae.source = 'poll_vote'
    AND ae.metadata->>'op' = 'backfill'
);

-- Backfill activity_events for boosts
INSERT INTO public.activity_events (user_id, country, timestamp_utc, source, poll_id, metadata)
SELECT 
  ub.user_id,
  COALESCE(p.country, 'unknown'),
  COALESCE(ub.boosted_at, now()),
  'poll_boost',
  ub.poll_id,
  jsonb_build_object('legacy', true, 'op', 'backfill')
FROM public.user_boosts ub
LEFT JOIN public.profiles p ON p.id = ub.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.activity_events ae 
  WHERE ae.user_id = ub.user_id 
    AND ae.poll_id = ub.poll_id 
    AND ae.source = 'poll_boost'
    AND ae.metadata->>'op' = 'backfill'
);
