-- Create optimized index for Hot feed sorting
-- Uses: status='active', expires_at > now(), ORDER BY boost_count_cache DESC, total_votes_cache DESC, created_at DESC

-- Composite index for Hot feed query
CREATE INDEX IF NOT EXISTS idx_polls_hot_feed 
ON public.polls(status, expires_at, boost_count_cache DESC, total_votes_cache DESC, created_at DESC)
WHERE status = 'active';

-- Create a database function for Hot feed query (optional - for future RPC use)
CREATE OR REPLACE FUNCTION public.get_hot_polls(limit_count integer DEFAULT 50)
RETURNS TABLE (
  id uuid,
  question text,
  creator_username text,
  status text,
  total_votes integer,
  total_votes_cache integer,
  boost_count_cache integer,
  expires_at timestamptz,
  created_at timestamptz
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
    p.status::text,
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