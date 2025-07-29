-- Unified Hold System with Social Features and Badges
-- This migration implements the 3-second hold mechanic for both main button and poll voting

-- First, let's rename push-related columns to boost to avoid confusion
ALTER TABLE user_pushes RENAME TO user_boosts;
ALTER TABLE daily_push_limits RENAME TO daily_boost_limits;
ALTER TABLE daily_boost_limits RENAME COLUMN push_date TO boost_date;
ALTER TABLE daily_boost_limits RENAME COLUMN push_count TO boost_count;
ALTER TABLE daily_boost_limits RENAME COLUMN max_pushes TO max_boosts;
ALTER TABLE user_boosts RENAME COLUMN pushed_at TO boosted_at;
ALTER TABLE polls RENAME COLUMN push_count TO boost_count;
ALTER TABLE polls RENAME COLUMN push_count_cache TO boost_count_cache;

-- Update button_holds table to support unified hold system
ALTER TABLE button_holds ADD COLUMN context_type TEXT;
ALTER TABLE button_holds ADD COLUMN context_id UUID;

-- Update all existing button_holds to be main_button context
UPDATE button_holds SET context_type = 'main_button' WHERE context_type IS NULL;

-- Add poll enhancements
ALTER TABLE polls ADD COLUMN is_anonymous BOOLEAN DEFAULT false;
ALTER TABLE poll_options ADD COLUMN order_index INTEGER DEFAULT 0;

-- Create user_follows table for social features
CREATE TABLE user_follows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  followed_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, followed_id)
);

-- Create badges table for gamification
CREATE TABLE badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  badge_name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  criteria_type TEXT NOT NULL,
  criteria_value INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_badges table for badge assignments
CREATE TABLE user_badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- Create indexes for performance
CREATE INDEX idx_button_holds_context ON button_holds(context_type, context_id);
CREATE INDEX idx_button_holds_active ON button_holds(is_active, last_heartbeat);
CREATE INDEX idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX idx_user_follows_followed ON user_follows(followed_id);
CREATE INDEX idx_user_badges_user ON user_badges(user_id);
CREATE INDEX idx_user_badges_badge ON user_badges(badge_id);

-- Enable RLS on new tables
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_follows
CREATE POLICY "Users can manage their own follows" ON user_follows
FOR ALL USING (auth.uid() = follower_id);

CREATE POLICY "Users can view follow relationships for counts" ON user_follows
FOR SELECT USING (true);

-- RLS policies for badges
CREATE POLICY "Everyone can view badges" ON badges
FOR SELECT USING (true);

-- RLS policies for user_badges
CREATE POLICY "Users can view their own badges" ON user_badges
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view all earned badges for leaderboards" ON user_badges
FOR SELECT USING (true);

-- Update RLS policies for renamed tables
DROP POLICY IF EXISTS "Users can insert their own pushes" ON user_pushes;
DROP POLICY IF EXISTS "Users can view their own pushes" ON user_pushes;
DROP POLICY IF EXISTS "Users can insert their own push limits" ON daily_push_limits;
DROP POLICY IF EXISTS "Users can update their own push limits" ON daily_push_limits;
DROP POLICY IF EXISTS "Users can view their own push limits" ON daily_push_limits;

CREATE POLICY "Users can insert their own boosts" ON user_boosts
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own boosts" ON user_boosts
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own boost limits" ON daily_boost_limits
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own boost limits" ON daily_boost_limits
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own boost limits" ON daily_boost_limits
FOR SELECT USING (auth.uid() = user_id);

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
CREATE TRIGGER update_boost_cache_trigger
AFTER INSERT ON user_boosts
FOR EACH ROW EXECUTE FUNCTION update_boost_cache();

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
ALTER PUBLICATION supabase_realtime ADD TABLE user_follows;
ALTER PUBLICATION supabase_realtime ADD TABLE user_badges;

-- Set replica identity for realtime
ALTER TABLE user_follows REPLICA IDENTITY FULL;
ALTER TABLE user_badges REPLICA IDENTITY FULL;

-- Insert sample badges
INSERT INTO badges (badge_name, description, criteria_type, criteria_value) VALUES
('First Poll', 'Created your first poll', 'polls_created', 1),
('Poll Master', 'Created 10 polls', 'polls_created', 10),
('Super Voter', 'Cast 50 votes', 'votes_cast', 50),
('Popular Creator', 'Received 100 votes on your polls', 'votes_received', 100),
('Social Butterfly', 'Have 10 followers', 'followers_count', 10),
('Boost Champion', 'Received 25 boosts on your polls', 'boosts_received', 25);