# Database Schema Documentation

## Overview
This document describes the complete database schema for the Push It! application using Supabase PostgreSQL.

## Core Tables

### profiles
User profile information and settings.

```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  country TEXT,
  is_public BOOLEAN DEFAULT true
);
```

**Key Features**:
- Links to Supabase auth.users
- Unique username constraint
- Country tracking for geographic stats
- Privacy controls with is_public flag

### button_holds
Real-time button press sessions with geographic tracking.

```sql
CREATE TABLE button_holds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  device_id TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  is_active BOOLEAN DEFAULT true,
  country TEXT,
  last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Key Features**:
- Real-time session tracking
- Geographic data collection
- Heartbeat system for active sessions
- Device fingerprinting for session management
- Duration calculation for analytics

### polls
Main polls table with metadata and cached statistics.

```sql
CREATE TABLE polls (
  id TEXT DEFAULT generate_poll_id() PRIMARY KEY,
  question TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  total_votes INTEGER DEFAULT 0,
  push_count INTEGER DEFAULT 0,
  category TEXT,
  is_anonymous BOOLEAN DEFAULT false
);
```

**Key Features**:
- Custom ID generation function
- Automatic expiration handling
- Cached vote counts for performance
- Boost/push system integration
- Category support for organization

### poll_options
Multiple choice options for polls with cached vote counts.

```sql
CREATE TABLE poll_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id TEXT REFERENCES polls(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  votes INTEGER DEFAULT 0,
  UNIQUE(poll_id, option_text)
);
```

**Key Features**:
- Cached vote counts
- Unique constraint prevents duplicate options
- Automatic cleanup with poll deletion

### user_votes
Voting records with change tracking capabilities.

```sql
CREATE TABLE user_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  poll_id TEXT REFERENCES polls(id) ON DELETE CASCADE,
  option_id UUID REFERENCES poll_options(id) ON DELETE CASCADE,
  voted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, poll_id)
);
```

**Key Features**:
- One vote per user per poll constraint
- Vote change tracking with updated_at
- Complete audit trail for votes

### saved_polls
User bookmarks for polls to view later.

```sql
CREATE TABLE saved_polls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  poll_id TEXT REFERENCES polls(id) ON DELETE CASCADE,
  saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, poll_id)
);
```

**Key Features**:
- Simple bookmark system
- Prevents duplicate saves
- Automatic cleanup when polls are deleted

### daily_push_limits
Rate limiting system for poll boosting.

```sql
CREATE TABLE daily_push_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE DEFAULT CURRENT_DATE,
  pushes_used INTEGER DEFAULT 0,
  max_pushes INTEGER DEFAULT 3,
  UNIQUE(user_id, date)
);
```

**Key Features**:
- Daily rate limiting (3 pushes per day)
- Automatic daily reset
- Configurable limits per user

### user_pushes
Tracking individual poll boost actions.

```sql
CREATE TABLE user_pushes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  poll_id TEXT REFERENCES polls(id) ON DELETE CASCADE,
  pushed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, poll_id)
);
```

**Key Features**:
- One push per user per poll
- Complete push history tracking
- Links to rate limiting system

## Database Functions

### generate_poll_id()
Generates short, readable poll IDs.

```sql
CREATE OR REPLACE FUNCTION generate_poll_id()
RETURNS TEXT AS $$
BEGIN
  RETURN lower(substr(encode(gen_random_bytes(4), 'hex'), 1, 8));
END;
$$ LANGUAGE plpgsql;
```

### get_user_stats(user_uuid UUID)
Optimized function to calculate user statistics.

```sql
CREATE OR REPLACE FUNCTION get_user_stats(user_uuid UUID)
RETURNS TABLE(
  created_polls BIGINT,
  votes_cast BIGINT,
  votes_received BIGINT,
  boosts_received BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM polls WHERE created_by = user_uuid),
    (SELECT COUNT(*) FROM user_votes WHERE user_id = user_uuid),
    (SELECT COALESCE(SUM(total_votes), 0) FROM polls WHERE created_by = user_uuid),
    (SELECT COALESCE(SUM(push_count), 0) FROM polls WHERE created_by = user_uuid);
END;
$$ LANGUAGE plpgsql;
```

## Row Level Security (RLS)

### profiles
- Users can view public profiles
- Users can update their own profile
- Users can insert their own profile

### button_holds  
- Users can insert their own sessions
- Users can update their own sessions
- All users can view session counts (for global counter)

### polls
- All users can view active polls
- Users can create polls
- Users can update their own polls

### user_votes
- Users can vote on polls
- Users can view their own votes
- Users can update their own votes

### saved_polls
- Users can save/unsave polls
- Users can view their own saved polls

## Triggers and Automation

### Update Vote Counts
Automatically updates cached vote counts when votes change.

```sql
-- Trigger function to update poll and option vote counts
CREATE OR REPLACE FUNCTION update_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Update logic for maintaining cached counts
  -- Handles INSERT, UPDATE, DELETE operations
END;
$$ LANGUAGE plpgsql;
```

### Archive Expired Polls
Automatically archives polls past their expiration date.

```sql
-- Scheduled function to archive expired polls
CREATE OR REPLACE FUNCTION archive_expired_polls()
RETURNS void AS $$
BEGIN
  UPDATE polls 
  SET status = 'archived' 
  WHERE expires_at < NOW() AND status = 'active';
END;
$$ LANGUAGE plpgsql;
```

## Indexes

### Performance Indexes
```sql
-- Optimize poll queries
CREATE INDEX idx_polls_status_created ON polls(status, created_at DESC);
CREATE INDEX idx_polls_expires_at ON polls(expires_at) WHERE status = 'active';

-- Optimize vote queries  
CREATE INDEX idx_user_votes_user_poll ON user_votes(user_id, poll_id);
CREATE INDEX idx_user_votes_poll ON user_votes(poll_id);

-- Optimize session queries
CREATE INDEX idx_button_holds_active ON button_holds(is_active, last_heartbeat);
CREATE INDEX idx_button_holds_country_time ON button_holds(country, started_at);

-- Optimize user queries
CREATE INDEX idx_profiles_username ON profiles(username) WHERE username IS NOT NULL;
CREATE INDEX idx_profiles_public ON profiles(is_public) WHERE is_public = true;
```

## Data Relationships

### Entity Relationship Diagram
```
profiles (users)
├── button_holds (1:many) - Real-time sessions
├── polls (1:many) - Created polls  
├── user_votes (1:many) - Voting history
├── saved_polls (1:many) - Bookmarks
├── daily_push_limits (1:many) - Rate limiting
└── user_pushes (1:many) - Boost actions

polls
├── poll_options (1:many) - Multiple choice options
├── user_votes (1:many) - All votes on poll
├── saved_polls (1:many) - Users who saved
└── user_pushes (1:many) - Boost history

poll_options
└── user_votes (1:many) - Votes for this option
```

## Real-time Subscriptions

The application uses Supabase real-time features for:

### Button Sessions
- Live session count updates
- Geographic activity tracking
- Session start/end notifications

### Poll Updates
- New vote notifications
- Poll creation broadcasts
- Results updates in real-time

### Statistics Updates
- Live counter updates
- Geographic statistics refresh
- Leaderboard changes

## Backup and Migration Strategy

### Automated Backups
- Daily full database backups
- Point-in-time recovery capability
- Cross-region backup replication

### Migration Management
- Version-controlled schema changes
- Safe rollback procedures
- Data migration scripts for major changes

## Security Considerations

### Data Protection
- Row Level Security on all tables
- Encrypted sensitive data
- Audit logging for critical operations

### Privacy Controls
- User profile visibility settings
- Anonymous voting options
- Data retention policies

### Rate Limiting
- Poll creation limits
- Vote change restrictions
- Boost/push daily limits

## Performance Optimization

### Query Optimization
- Cached vote counts to avoid expensive JOINs
- Proper indexing for common queries
- Database function for complex calculations

### Real-time Efficiency
- Filtered subscriptions to reduce bandwidth
- Optimized session cleanup routines
- Efficient geographic data queries

### Scalability Considerations
- Horizontal scaling preparation
- Archive strategies for old data
- Connection pooling optimization