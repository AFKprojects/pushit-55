-- Unified Hold System Migration - Final version

-- Add context fields to button_holds if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'button_holds' AND column_name = 'context_type') THEN
    ALTER TABLE button_holds ADD COLUMN context_type TEXT DEFAULT 'main_button';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'button_holds' AND column_name = 'context_id') THEN
    ALTER TABLE button_holds ADD COLUMN context_id UUID;
  END IF;
END $$;

-- Update existing records to have context_type
UPDATE button_holds SET context_type = 'main_button' WHERE context_type IS NULL;

-- Add poll enhancements if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'polls' AND column_name = 'is_anonymous') THEN
    ALTER TABLE polls ADD COLUMN is_anonymous BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'poll_options' AND column_name = 'order_index') THEN
    ALTER TABLE poll_options ADD COLUMN order_index INTEGER DEFAULT 0;
  END IF;
END $$;

-- Rename push to boost columns
DO $$
BEGIN
  -- Rename user_pushes columns
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_pushes' AND column_name = 'pushed_at') THEN
    ALTER TABLE user_pushes RENAME COLUMN pushed_at TO boosted_at;
  END IF;

  -- Rename daily_push_limits columns  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_push_limits' AND column_name = 'push_date') THEN
    ALTER TABLE daily_push_limits RENAME COLUMN push_date TO boost_date;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_push_limits' AND column_name = 'push_count') THEN
    ALTER TABLE daily_push_limits RENAME COLUMN push_count TO boost_count;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_push_limits' AND column_name = 'max_pushes') THEN
    ALTER TABLE daily_push_limits RENAME COLUMN max_pushes TO max_boosts;
  END IF;

  -- Rename polls columns
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'polls' AND column_name = 'push_count') THEN
    ALTER TABLE polls RENAME COLUMN push_count TO boost_count;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'polls' AND column_name = 'push_count_cache') THEN
    ALTER TABLE polls RENAME COLUMN push_count_cache TO boost_count_cache;
  END IF;
END $$;

-- Rename the tables themselves
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_pushes') THEN
    ALTER TABLE user_pushes RENAME TO user_boosts;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'daily_push_limits') THEN
    ALTER TABLE daily_push_limits RENAME TO daily_boost_limits;
  END IF;
END $$;

-- Create new indexes
CREATE INDEX IF NOT EXISTS idx_button_holds_context ON button_holds(context_type, context_id);
CREATE INDEX IF NOT EXISTS idx_button_holds_active ON button_holds(is_active, last_heartbeat);

-- Update RLS policies for renamed tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_boosts') THEN
    DROP POLICY IF EXISTS "Users can insert their own pushes" ON user_boosts;
    DROP POLICY IF EXISTS "Users can view their own pushes" ON user_boosts;
    DROP POLICY IF EXISTS "Users can insert their own boosts" ON user_boosts;
    DROP POLICY IF EXISTS "Users can view their own boosts" ON user_boosts;

    CREATE POLICY "Users can insert their own boosts" ON user_boosts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can view their own boosts" ON user_boosts
    FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'daily_boost_limits') THEN
    DROP POLICY IF EXISTS "Users can insert their own push limits" ON daily_boost_limits;
    DROP POLICY IF EXISTS "Users can update their own push limits" ON daily_boost_limits;
    DROP POLICY IF EXISTS "Users can view their own push limits" ON daily_boost_limits;
    DROP POLICY IF EXISTS "Users can insert their own boost limits" ON daily_boost_limits;
    DROP POLICY IF EXISTS "Users can update their own boost limits" ON daily_boost_limits;
    DROP POLICY IF EXISTS "Users can view their own boost limits" ON daily_boost_limits;

    CREATE POLICY "Users can insert their own boost limits" ON daily_boost_limits
    FOR INSERT WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update their own boost limits" ON daily_boost_limits
    FOR UPDATE USING (auth.uid() = user_id);

    CREATE POLICY "Users can view their own boost limits" ON daily_boost_limits
    FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- Update boost cache function
CREATE OR REPLACE FUNCTION update_boost_cache()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    UPDATE polls 
    SET boost_count_cache = (
        SELECT COUNT(*) 
        FROM user_boosts 
        WHERE poll_id = NEW.poll_id
    )
    WHERE id = NEW.poll_id;
    
    RETURN NEW;
END;
$$;

-- Update trigger
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_boosts') THEN
    DROP TRIGGER IF EXISTS update_push_cache_trigger ON user_boosts;
    DROP TRIGGER IF EXISTS update_boost_cache_trigger ON user_boosts;

    CREATE TRIGGER update_boost_cache_trigger
    AFTER INSERT ON user_boosts
    FOR EACH ROW EXECUTE FUNCTION update_boost_cache();
  END IF;
END $$;

-- Create unified cleanup function
CREATE OR REPLACE FUNCTION cleanup_button_hold_sessions()
RETURNS void AS $$
BEGIN
  UPDATE button_holds
  SET is_active = false,
      ended_at = NOW(),
      duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER
  WHERE is_active = true
    AND last_heartbeat < (NOW() - INTERVAL '15 seconds');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate user stats function with new return signature
DROP FUNCTION IF EXISTS get_user_stats(uuid);

CREATE OR REPLACE FUNCTION get_user_stats(user_uuid uuid)
RETURNS TABLE(
  created_polls bigint, 
  votes_cast bigint, 
  votes_received bigint, 
  boosts_received bigint,
  followers_count bigint,
  following_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE((SELECT COUNT(*) FROM polls WHERE created_by = user_uuid), 0) as created_polls,
        COALESCE((SELECT COUNT(*) FROM user_votes WHERE user_id = user_uuid), 0) as votes_cast,
        COALESCE((SELECT SUM(p.total_votes_cache) FROM polls p WHERE p.created_by = user_uuid), 0) as votes_received,
        COALESCE((SELECT SUM(p.boost_count_cache) FROM polls p WHERE p.created_by = user_uuid), 0) as boosts_received,
        COALESCE((SELECT COUNT(*) FROM user_follows WHERE followed_id = user_uuid), 0) as followers_count,
        COALESCE((SELECT COUNT(*) FROM user_follows WHERE follower_id = user_uuid), 0) as following_count;
END;
$$;