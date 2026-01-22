-- ========================================
-- MIGRATION: Align Implementation with Documentation
-- ========================================

-- 1. ADD vote_edit_count TO user_votes FOR TRACKING VOTE EDITS
-- This enforces the one-time vote edit rule at the database level
ALTER TABLE public.user_votes 
ADD COLUMN IF NOT EXISTS vote_edit_count INTEGER NOT NULL DEFAULT 0;

-- 2. ADD expired STATUS TO poll_status ENUM
-- Documentation specifies: active → expired → archived
ALTER TYPE public.poll_status ADD VALUE IF NOT EXISTS 'expired';

-- 3. CREATE FUNCTION TO ENFORCE VOTE EDITING LIMIT (max 1 edit)
CREATE OR REPLACE FUNCTION public.enforce_vote_edit_limit()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- 4. CREATE TRIGGER FOR VOTE EDIT LIMIT
DROP TRIGGER IF EXISTS enforce_vote_edit_limit_trigger ON public.user_votes;
CREATE TRIGGER enforce_vote_edit_limit_trigger
  BEFORE UPDATE ON public.user_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_vote_edit_limit();

-- 5. CREATE FUNCTION TO BLOCK CREATOR FROM VOTING ON OWN POLL
CREATE OR REPLACE FUNCTION public.block_creator_vote()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- 6. CREATE TRIGGER TO BLOCK CREATOR VOTING
DROP TRIGGER IF EXISTS block_creator_vote_trigger ON public.user_votes;
CREATE TRIGGER block_creator_vote_trigger
  BEFORE INSERT ON public.user_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.block_creator_vote();

-- 7. ADD last_country_action_at TO profiles FOR COUNTRY COOLDOWN
-- This tracks the last time a user's action counted toward country stats
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_country_action_at TIMESTAMP WITH TIME ZONE;

-- 8. CREATE FUNCTION FOR HOT FEED BASED ON EVENTS (24h window)
-- This replaces the cache-based sorting with event-based calculation
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
STABLE SECURITY DEFINER
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
    p.status::text,
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

-- 9. CREATE FUNCTION TO CHECK COUNTRY COOLDOWN (3 minutes)
CREATE OR REPLACE FUNCTION public.can_count_country_action(user_uuid UUID)
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- 10. UPDATE archive_expired_polls TO USE expired STATUS FIRST
CREATE OR REPLACE FUNCTION public.archive_expired_polls()
RETURNS void
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

-- 11. ADD STANDARD INDEXES FOR HOT FEED PERFORMANCE (without partial predicates using NOW())
CREATE INDEX IF NOT EXISTS idx_user_votes_voted_at ON public.user_votes(voted_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_boosts_boosted_at ON public.user_boosts(boosted_at DESC);

-- 12. COMMENT FOUNDATION TABLES
COMMENT ON TABLE public.activity_events IS 'Foundation table for event-based analytics and Hot feed calculation. Status: Foundation/Future';
COMMENT ON TABLE public.poll_responses IS 'Foundation table for extended response tracking. Status: Foundation/Future - synced from user_votes';
COMMENT ON TABLE public.poll_response_options IS 'Foundation table for multi-select support. Status: Foundation/Future';
COMMENT ON TABLE public.user_follows IS 'Foundation table for social features. Status: Foundation/Future';
COMMENT ON TABLE public.badges IS 'Foundation table for gamification badges. Status: Foundation/Future';
COMMENT ON TABLE public.user_badges IS 'Foundation table for user badge assignments. Status: Foundation/Future';