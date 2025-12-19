-- =============================================
-- DB HOTFIX: Naprawienie breaking points z audytu
-- =============================================

-- 1️⃣ BRAKUJĄCE KOLUMNY
-- =============================================

-- 1.1 polls.push_count (dla kompatybilności wstecznej z UI)
ALTER TABLE public.polls 
ADD COLUMN IF NOT EXISTS push_count integer NOT NULL DEFAULT 0;

-- 1.2 user_votes.updated_at
ALTER TABLE public.user_votes 
ADD COLUMN IF NOT EXISTS updated_at timestamptz NULL;

-- Trigger dla user_votes.updated_at
CREATE OR REPLACE FUNCTION public.set_user_votes_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.updated_at IS NULL THEN
    NEW.updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_user_votes_updated_at_trigger ON public.user_votes;
CREATE TRIGGER set_user_votes_updated_at_trigger
  BEFORE INSERT OR UPDATE ON public.user_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_user_votes_updated_at();

-- =============================================
-- 2️⃣ RLS – naprawienie brakujących polityk
-- =============================================

-- 2.1 user_votes - brakuje UPDATE i DELETE
-- Usuwam istniejące i tworzę kompletny zestaw
DROP POLICY IF EXISTS "Users can view all votes" ON public.user_votes;
DROP POLICY IF EXISTS "Users can create own votes" ON public.user_votes;
DROP POLICY IF EXISTS "Users can update own votes" ON public.user_votes;
DROP POLICY IF EXISTS "Users can delete own votes" ON public.user_votes;

-- SELECT - każdy może widzieć głosy (dla statystyk)
CREATE POLICY "Users can view all votes"
ON public.user_votes
FOR SELECT
USING (true);

-- INSERT - tylko własne
CREATE POLICY "Users can create own votes"
ON public.user_votes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- UPDATE - tylko własne (dla change vote)
CREATE POLICY "Users can update own votes"
ON public.user_votes
FOR UPDATE
USING (auth.uid() = user_id);

-- DELETE - tylko własne (dla re-vote pattern)
CREATE POLICY "Users can delete own votes"
ON public.user_votes
FOR DELETE
USING (auth.uid() = user_id);

-- =============================================
-- 3️⃣ UJEDNOLICENIE boost_count vs boost_count_cache
-- =============================================

-- Trigger synchronizujący obie kolumny
CREATE OR REPLACE FUNCTION public.sync_boost_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count integer;
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

DROP TRIGGER IF EXISTS sync_boost_counts_trigger ON public.user_boosts;
CREATE TRIGGER sync_boost_counts_trigger
  AFTER INSERT OR DELETE ON public.user_boosts
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_boost_counts();

-- =============================================
-- 4️⃣ INDEKSY POD AKTUALNY UI
-- =============================================

-- Polls
CREATE INDEX IF NOT EXISTS idx_polls_status_created 
ON public.polls(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_polls_expires_status 
ON public.polls(expires_at, status) 
WHERE status = 'active';

-- Poll options
CREATE INDEX IF NOT EXISTS idx_poll_options_poll 
ON public.poll_options(poll_id);

-- User votes
CREATE INDEX IF NOT EXISTS idx_user_votes_user_poll 
ON public.user_votes(user_id, poll_id);

CREATE INDEX IF NOT EXISTS idx_user_votes_voted_at 
ON public.user_votes(voted_at DESC);

-- Hidden polls
CREATE INDEX IF NOT EXISTS idx_hidden_polls_user 
ON public.hidden_polls(user_id, poll_id);

-- Saved polls
CREATE INDEX IF NOT EXISTS idx_saved_polls_user 
ON public.saved_polls(user_id, poll_id);

-- Daily boost limits
CREATE INDEX IF NOT EXISTS idx_daily_boost_user_date 
ON public.daily_boost_limits(user_id, boost_date);

-- User boosts
CREATE INDEX IF NOT EXISTS idx_user_boosts_user_poll 
ON public.user_boosts(user_id, poll_id);

-- Button holds
CREATE INDEX IF NOT EXISTS idx_button_holds_active_heartbeat 
ON public.button_holds(is_active, last_heartbeat DESC) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_button_holds_context 
ON public.button_holds(context_type, context_id);