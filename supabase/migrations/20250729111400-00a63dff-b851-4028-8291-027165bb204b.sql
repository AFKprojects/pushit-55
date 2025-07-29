-- Unified Hold System with Social Features and Badges (Safe Migration)
-- This migration implements the 3-second hold mechanic for both main button and poll voting

-- Safely rename push-related columns to boost to avoid confusion
DO $$
BEGIN
  -- Rename user_pushes to user_boosts if it exists and user_boosts doesn't
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_pushes') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_boosts') THEN
    ALTER TABLE user_pushes RENAME TO user_boosts;
    ALTER TABLE user_boosts RENAME COLUMN pushed_at TO boosted_at;
  END IF;

  -- Rename daily_push_limits to daily_boost_limits if it exists and daily_boost_limits doesn't
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'daily_push_limits') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'daily_boost_limits') THEN
    ALTER TABLE daily_push_limits RENAME TO daily_boost_limits;
    ALTER TABLE daily_boost_limits RENAME COLUMN push_date TO boost_date;
    ALTER TABLE daily_boost_limits RENAME COLUMN push_count TO boost_count;
    ALTER TABLE daily_boost_limits RENAME COLUMN max_pushes TO max_boosts;
  END IF;

  -- Rename poll columns if they exist
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'polls' AND column_name = 'push_count') THEN
    ALTER TABLE polls RENAME COLUMN push_count TO boost_count;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'polls' AND column_name = 'push_count_cache') THEN
    ALTER TABLE polls RENAME COLUMN push_count_cache TO boost_count_cache;
  END IF;
END $$;

-- Update button_holds table to support unified hold system
DO $$
BEGIN
  -- Add context columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'button_holds' AND column_name = 'context_type') THEN
    ALTER TABLE button_holds ADD COLUMN context_type TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'button_holds' AND column_name = 'context_id') THEN
    ALTER TABLE button_holds ADD COLUMN context_id UUID;
  END IF;
END $$;

-- Update all existing button_holds to be main_button context
UPDATE button_holds SET context_type = 'main_button' WHERE context_type IS NULL;

-- Add poll enhancements
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'polls' AND column_name = 'is_anonymous') THEN
    ALTER TABLE polls ADD COLUMN is_anonymous BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'poll_options' AND column_name = 'order_index') THEN
    ALTER TABLE poll_options ADD COLUMN order_index INTEGER DEFAULT 0;
  END IF;
END $$;

-- Create user_follows table for social features if it doesn't exist
CREATE TABLE IF NOT EXISTS user_follows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  followed_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, followed_id)
);

-- Create badges table for gamification if it doesn't exist
CREATE TABLE IF NOT EXISTS badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  badge_name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  criteria_type TEXT NOT NULL,
  criteria_value INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_badges table for badge assignments if it doesn't exist
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- Create indexes for performance (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_button_holds_context ON button_holds(context_type, context_id);
CREATE INDEX IF NOT EXISTS idx_button_holds_active ON button_holds(is_active, last_heartbeat);
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_followed ON user_follows(followed_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge ON user_badges(badge_id);

-- Enable RLS on new tables
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_follows
DROP POLICY IF EXISTS "Users can manage their own follows" ON user_follows;
CREATE POLICY "Users can manage their own follows" ON user_follows
FOR ALL USING (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users can view follow relationships for counts" ON user_follows;
CREATE POLICY "Users can view follow relationships for counts" ON user_follows
FOR SELECT USING (true);

-- RLS policies for badges
DROP POLICY IF EXISTS "Everyone can view badges" ON badges;
CREATE POLICY "Everyone can view badges" ON badges
FOR SELECT USING (true);

-- RLS policies for user_badges
DROP POLICY IF EXISTS "Users can view their own badges" ON user_badges;
CREATE POLICY "Users can view their own badges" ON user_badges
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view all earned badges for leaderboards" ON user_badges;
CREATE POLICY "Users can view all earned badges for leaderboards" ON user_badges
FOR SELECT USING (true);

-- Update RLS policies for renamed boost tables
DO $$
BEGIN
  -- Only update if table exists
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

-- Update function that handles boost caching
CREATE OR REPLACE FUNCTION update_boost_cache()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Update cache in polls
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

-- Create trigger for boost cache updates
DROP TRIGGER IF EXISTS update_push_cache_trigger ON user_pushes;
DROP TRIGGER IF EXISTS update_boost_cache_trigger ON user_boosts;
DROP TRIGGER IF EXISTS update_boost_cache_trigger ON user_boosts;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_boosts') THEN
    CREATE TRIGGER update_boost_cache_trigger
    AFTER INSERT ON user_boosts
    FOR EACH ROW EXECUTE FUNCTION update_boost_cache();
  END IF;
END $$;

-- Create function for cleaning up button hold sessions (unified)
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

-- Update user stats function to include new social features
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

-- Enable realtime for new tables
DO $$
BEGIN
  -- Check if tables exist before adding to publication
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_follows') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_follows;
    ALTER TABLE user_follows REPLICA IDENTITY FULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_badges') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_badges;
    ALTER TABLE user_badges REPLICA IDENTITY FULL;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- Ignore if already added
END $$;

-- Insert sample badges (only if table is empty)
INSERT INTO badges (badge_name, description, criteria_type, criteria_value) 
SELECT * FROM (VALUES
  ('First Poll', 'Created your first poll', 'polls_created', 1),
  ('Poll Master', 'Created 10 polls', 'polls_created', 10),
  ('Super Voter', 'Cast 50 votes', 'votes_cast', 50),
  ('Popular Creator', 'Received 100 votes on your polls', 'votes_received', 100),
  ('Social Butterfly', 'Have 10 followers', 'followers_count', 10),
  ('Boost Champion', 'Received 25 boosts on your polls', 'boosts_received', 25)
) AS v(badge_name, description, criteria_type, criteria_value)
WHERE NOT EXISTS (SELECT 1 FROM badges LIMIT 1);