# Push It! Database State Backup
## Pre-Stage 1b - Date: 2025-12-19

---

## TABLE ROW COUNTS

| Table | Row Count |
|-------|-----------|
| badges | 6 |
| button_holds | 8 |
| daily_boost_limits | 1 |
| hidden_polls | 1 |
| poll_options | 4 |
| poll_vote_holds | 0 |
| polls | 2 |
| profiles | 4 |
| saved_polls | 0 |
| user_badges | 0 |
| user_boosts | 1 |
| user_follows | 0 |
| user_votes | 1 |

---

## ENUMS

```sql
-- poll_status enum
CREATE TYPE public.poll_status AS ENUM ('active', 'archived');
```

---

## TABLE SCHEMAS (DDL)

### badges
```sql
CREATE TABLE public.badges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  badge_name text NOT NULL,
  description text,
  icon_url text,
  criteria_type text NOT NULL,
  criteria_value integer NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);
```

### button_holds
```sql
CREATE TABLE public.button_holds (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  started_at timestamp with time zone DEFAULT now(),
  ended_at timestamp with time zone,
  duration_seconds integer,
  is_active boolean DEFAULT true,
  country text,
  last_heartbeat timestamp with time zone NOT NULL DEFAULT now(),
  device_id text,
  context_type text DEFAULT 'main_button'::text,
  context_id uuid
);
```

### daily_boost_limits
```sql
CREATE TABLE public.daily_boost_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  boost_date date NOT NULL DEFAULT CURRENT_DATE,
  boost_count integer NOT NULL DEFAULT 0,
  max_boosts integer NOT NULL DEFAULT 3,
  UNIQUE (user_id, boost_date)
);
```

### hidden_polls
```sql
CREATE TABLE public.hidden_polls (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id uuid NOT NULL,
  user_id uuid NOT NULL,
  hidden_at timestamp with time zone DEFAULT now(),
  UNIQUE (poll_id, user_id)
);
```

### poll_options
```sql
CREATE TABLE public.poll_options (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id uuid NOT NULL,
  option_text text NOT NULL,
  votes integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  votes_cache integer DEFAULT 0,
  order_index integer DEFAULT 0
);
```

### poll_vote_holds
```sql
CREATE TABLE public.poll_vote_holds (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  poll_id uuid,
  option_id uuid,
  started_at timestamp with time zone DEFAULT now(),
  ended_at timestamp with time zone,
  duration_seconds integer,
  is_active boolean DEFAULT true,
  last_heartbeat timestamp with time zone DEFAULT now(),
  device_id text
);
```

### polls
```sql
CREATE TABLE public.polls (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by uuid NOT NULL,
  question text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + '24:00:00'::interval),
  status poll_status DEFAULT 'active'::poll_status,
  total_votes integer DEFAULT 0,
  total_votes_cache integer DEFAULT 0,
  is_anonymous boolean DEFAULT false,
  creator_username text NOT NULL,
  push_count integer NOT NULL DEFAULT 0,
  boost_count numeric,
  boost_count_cache integer DEFAULT 0,
  votes_received_count integer DEFAULT 0
);
```

### profiles
```sql
CREATE TABLE public.profiles (
  id uuid NOT NULL PRIMARY KEY,
  username text UNIQUE,
  email text,
  country text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

### saved_polls
```sql
CREATE TABLE public.saved_polls (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  poll_id uuid NOT NULL,
  saved_at timestamp with time zone DEFAULT now(),
  UNIQUE (poll_id, user_id)
);
```

### user_badges
```sql
CREATE TABLE public.user_badges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  badge_id uuid,
  earned_at timestamp with time zone DEFAULT now(),
  UNIQUE (user_id, badge_id)
);
```

### user_boosts
```sql
CREATE TABLE public.user_boosts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  poll_id uuid NOT NULL,
  boosted_at timestamp with time zone DEFAULT now()
);
```

### user_follows
```sql
CREATE TABLE public.user_follows (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id uuid,
  followed_id uuid,
  created_at timestamp with time zone DEFAULT now()
);
```

### user_votes
```sql
CREATE TABLE public.user_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  poll_id uuid NOT NULL,
  option_id uuid NOT NULL,
  voted_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone
);
```

---

## TRIGGERS

| Trigger Name | Table | Timing | Event | Function |
|--------------|-------|--------|-------|----------|
| sync_boost_counts_trigger | user_boosts | AFTER | INSERT | sync_boost_counts |
| update_boost_cache_trigger | user_boosts | AFTER | INSERT | update_boost_cache |
| poll_vote_count_trigger | user_votes | AFTER | INSERT | update_poll_vote_counts |
| set_user_votes_updated_at_trigger | user_votes | BEFORE | INSERT | set_user_votes_updated_at |
| trigger_update_votes_cache | user_votes | AFTER | INSERT | update_votes_cache |
| update_vote_counts_trigger | user_votes | AFTER | INSERT | update_poll_vote_counts |
| update_votes_cache_trigger | user_votes | AFTER | INSERT | update_votes_cache |

---

## FUNCTIONS

### archive_expired_polls
```sql
CREATE OR REPLACE FUNCTION public.archive_expired_polls()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  UPDATE public.polls 
  SET status = 'archived'::public.poll_status
  WHERE expires_at < NOW() AND status = 'active'::public.poll_status;
END;
$function$;
```

### cleanup_button_hold_sessions
```sql
CREATE OR REPLACE FUNCTION public.cleanup_button_hold_sessions()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  UPDATE public.button_holds
  SET is_active = false,
      ended_at = NOW(),
      duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER
  WHERE is_active = true
    AND last_heartbeat < (NOW() - INTERVAL '15 seconds');
END;
$function$;
```

### cleanup_poll_vote_sessions
```sql
CREATE OR REPLACE FUNCTION public.cleanup_poll_vote_sessions()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  UPDATE public.poll_vote_holds
  SET is_active = false,
      ended_at = NOW(),
      duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER
  WHERE is_active = true
    AND last_heartbeat < (NOW() - INTERVAL '15 seconds');
END;
$function$;
```

### generate_poll_id
```sql
CREATE OR REPLACE FUNCTION public.generate_poll_id()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  RETURN lower(substr(encode(gen_random_bytes(4), 'hex'), 1, 8));
END;
$function$;
```

### get_user_stats
```sql
CREATE OR REPLACE FUNCTION public.get_user_stats(user_uuid uuid)
 RETURNS TABLE(created_polls bigint, votes_cast bigint, votes_received bigint, boosts_received bigint, followers_count bigint, following_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;
```

### handle_new_user
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;
```

### set_user_votes_updated_at
```sql
CREATE OR REPLACE FUNCTION public.set_user_votes_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.updated_at IS NULL THEN
    NEW.updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$function$;
```

### sync_boost_counts
```sql
CREATE OR REPLACE FUNCTION public.sync_boost_counts()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;
```

### update_boost_cache
```sql
CREATE OR REPLACE FUNCTION public.update_boost_cache()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;
```

### update_poll_vote_counts
```sql
CREATE OR REPLACE FUNCTION public.update_poll_vote_counts()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;
```

### update_votes_cache
```sql
CREATE OR REPLACE FUNCTION public.update_votes_cache()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;
```

### validate_poll_input
```sql
CREATE OR REPLACE FUNCTION public.validate_poll_input(question_text text, option_texts text[])
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;
```

---

## INDEXES

| Index Name | Table | Definition |
|------------|-------|------------|
| badges_pkey | badges | CREATE UNIQUE INDEX badges_pkey ON public.badges USING btree (id) |
| button_holds_pkey | button_holds | CREATE UNIQUE INDEX button_holds_pkey ON public.button_holds USING btree (id) |
| idx_button_holds_active | button_holds | CREATE INDEX idx_button_holds_active ON public.button_holds USING btree (is_active, last_heartbeat) |
| idx_button_holds_active_heartbeat | button_holds | CREATE INDEX idx_button_holds_active_heartbeat ON public.button_holds USING btree (is_active, last_heartbeat DESC) WHERE (is_active = true) |
| idx_button_holds_context | button_holds | CREATE INDEX idx_button_holds_context ON public.button_holds USING btree (context_type, context_id) |
| daily_push_limits_pkey | daily_boost_limits | CREATE UNIQUE INDEX daily_push_limits_pkey ON public.daily_boost_limits USING btree (id) |
| daily_push_limits_user_id_push_date_key | daily_boost_limits | CREATE UNIQUE INDEX daily_push_limits_user_id_push_date_key ON public.daily_boost_limits USING btree (user_id, boost_date) |
| idx_daily_boost_user_date | daily_boost_limits | CREATE INDEX idx_daily_boost_user_date ON public.daily_boost_limits USING btree (user_id, boost_date) |
| idx_daily_push_limits_user_date | daily_boost_limits | CREATE INDEX idx_daily_push_limits_user_date ON public.daily_boost_limits USING btree (user_id, boost_date) |
| hidden_polls_pkey | hidden_polls | CREATE UNIQUE INDEX hidden_polls_pkey ON public.hidden_polls USING btree (id) |
| hidden_polls_poll_id_user_id_key | hidden_polls | CREATE UNIQUE INDEX hidden_polls_poll_id_user_id_key ON public.hidden_polls USING btree (poll_id, user_id) |
| idx_hidden_polls_user | hidden_polls | CREATE INDEX idx_hidden_polls_user ON public.hidden_polls USING btree (user_id, poll_id) |
| idx_poll_options_poll | poll_options | CREATE INDEX idx_poll_options_poll ON public.poll_options USING btree (poll_id) |
| poll_options_pkey | poll_options | CREATE UNIQUE INDEX poll_options_pkey ON public.poll_options USING btree (id) |
| idx_poll_vote_holds_active | poll_vote_holds | CREATE INDEX idx_poll_vote_holds_active ON public.poll_vote_holds USING btree (is_active, last_heartbeat) |
| idx_poll_vote_holds_poll_option | poll_vote_holds | CREATE INDEX idx_poll_vote_holds_poll_option ON public.poll_vote_holds USING btree (poll_id, option_id) |
| idx_poll_vote_holds_user | poll_vote_holds | CREATE INDEX idx_poll_vote_holds_user ON public.poll_vote_holds USING btree (user_id) |
| poll_vote_holds_pkey | poll_vote_holds | CREATE UNIQUE INDEX poll_vote_holds_pkey ON public.poll_vote_holds USING btree (id) |
| idx_polls_expires_status | polls | CREATE INDEX idx_polls_expires_status ON public.polls USING btree (expires_at, status) WHERE (status = 'active'::poll_status) |
| idx_polls_status_created | polls | CREATE INDEX idx_polls_status_created ON public.polls USING btree (status, created_at DESC) |
| polls_pkey | polls | CREATE UNIQUE INDEX polls_pkey ON public.polls USING btree (id) |
| profiles_pkey | profiles | CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id) |
| profiles_username_key | profiles | CREATE UNIQUE INDEX profiles_username_key ON public.profiles USING btree (username) |
| idx_saved_polls_user | saved_polls | CREATE INDEX idx_saved_polls_user ON public.saved_polls USING btree (user_id, poll_id) |
| saved_polls_pkey | saved_polls | CREATE UNIQUE INDEX saved_polls_pkey ON public.saved_polls USING btree (id) |
| saved_polls_poll_id_user_id_key | saved_polls | CREATE UNIQUE INDEX saved_polls_poll_id_user_id_key ON public.saved_polls USING btree (poll_id, user_id) |
| idx_user_badges_badge | user_badges | CREATE INDEX idx_user_badges_badge ON public.user_badges USING btree (badge_id) |
| idx_user_badges_user | user_badges | CREATE INDEX idx_user_badges_user ON public.user_badges USING btree (user_id) |
| user_badges_pkey | user_badges | CREATE UNIQUE INDEX user_badges_pkey ON public.user_badges USING btree (id) |
| user_badges_user_id_badge_id_key | user_badges | CREATE UNIQUE INDEX user_badges_user_id_badge_id_key ON public.user_badges USING btree (user_id, badge_id) |
| idx_user_boosts_user_poll | user_boosts | CREATE INDEX idx_user_boosts_user_poll ON public.user_boosts USING btree (user_id, poll_id) |
| user_boosts_pkey | user_boosts | CREATE UNIQUE INDEX user_boosts_pkey ON public.user_boosts USING btree (id) |
| idx_user_follows_followed | user_follows | CREATE INDEX idx_user_follows_followed ON public.user_follows USING btree (followed_id) |
| idx_user_follows_follower | user_follows | CREATE INDEX idx_user_follows_follower ON public.user_follows USING btree (follower_id) |
| user_follows_follower_followed_key | user_follows | CREATE UNIQUE INDEX user_follows_follower_followed_key ON public.user_follows USING btree (follower_id, followed_id) |
| user_follows_pkey | user_follows | CREATE UNIQUE INDEX user_follows_pkey ON public.user_follows USING btree (id) |
| idx_user_votes_user_poll | user_votes | CREATE INDEX idx_user_votes_user_poll ON public.user_votes USING btree (user_id, poll_id) |
| idx_user_votes_voted_at | user_votes | CREATE INDEX idx_user_votes_voted_at ON public.user_votes USING btree (voted_at DESC) |
| user_votes_pkey | user_votes | CREATE UNIQUE INDEX user_votes_pkey ON public.user_votes USING btree (id) |
| user_votes_user_id_poll_id_key | user_votes | CREATE UNIQUE INDEX user_votes_user_id_poll_id_key ON public.user_votes USING btree (user_id, poll_id) |

---

## RLS POLICIES

### badges
| Policy | Command | Using | With Check |
|--------|---------|-------|------------|
| Everyone can view badges | SELECT | true | - |

### button_holds
| Policy | Command | Using | With Check |
|--------|---------|-------|------------|
| Users can manage own holds | ALL | (auth.uid() = user_id) OR (user_id IS NULL) | - |
| Users can view all holds for statistics | SELECT | true | - |

### daily_boost_limits
| Policy | Command | Using | With Check |
|--------|---------|-------|------------|
| Users can insert their own boost limits | INSERT | - | auth.uid() = user_id |
| Users can update their own boost limits | UPDATE | auth.uid() = user_id | - |
| Users can view their own boost limits | SELECT | auth.uid() = user_id | - |

### hidden_polls
| Policy | Command | Using | With Check |
|--------|---------|-------|------------|
| Users can hide polls | INSERT | - | auth.uid() = user_id |
| Users can manage own hidden polls | ALL | auth.uid() = user_id | - |
| Users can unhide polls | DELETE | auth.uid() = user_id | - |
| Users can view their own hidden polls | SELECT | auth.uid() = user_id | - |

### poll_options
| Policy | Command | Using | With Check |
|--------|---------|-------|------------|
| Anyone can view poll options | SELECT | true | - |
| Poll creators can manage options | ALL | EXISTS (SELECT 1 FROM polls WHERE polls.id = poll_options.poll_id AND polls.created_by = auth.uid()) | - |

### poll_vote_holds
| Policy | Command | Using | With Check |
|--------|---------|-------|------------|
| Users can manage own vote holds | ALL | (auth.uid() = user_id) OR (user_id IS NULL) | - |
| Users can view active vote holds for counting | SELECT | is_active = true | - |

### polls
| Policy | Command | Using | With Check |
|--------|---------|-------|------------|
| Anyone can view active polls | SELECT | status = 'active'::poll_status | - |
| Users can create polls | INSERT | - | auth.uid() = created_by |
| Users can update own polls | UPDATE | auth.uid() = created_by | - |

### profiles
| Policy | Command | Using | With Check |
|--------|---------|-------|------------|
| Users can update own profile | ALL | auth.uid() = id | - |
| Users can view all profiles | SELECT | true | - |

### saved_polls
| Policy | Command | Using | With Check |
|--------|---------|-------|------------|
| Users can manage own saved polls | ALL | auth.uid() = user_id | - |
| Users can save polls | INSERT | - | auth.uid() = user_id |
| Users can unsave polls | DELETE | auth.uid() = user_id | - |
| Users can view their own saved polls | SELECT | auth.uid() = user_id | - |

### user_badges
| Policy | Command | Using | With Check |
|--------|---------|-------|------------|
| Users can view all earned badges for leaderboards | SELECT | true | - |
| Users can view their own badges | SELECT | auth.uid() = user_id | - |

### user_boosts
| Policy | Command | Using | With Check |
|--------|---------|-------|------------|
| Users can insert their own boosts | INSERT | - | auth.uid() = user_id |
| Users can view their own boosts | SELECT | auth.uid() = user_id | - |

### user_follows
| Policy | Command | Using | With Check |
|--------|---------|-------|------------|
| Users can manage their own follows | ALL | auth.uid() = follower_id | - |
| Users can view follow relationships for counts | SELECT | true | - |

### user_votes
| Policy | Command | Using | With Check |
|--------|---------|-------|------------|
| Users can create own votes | INSERT | - | auth.uid() = user_id |
| Users can delete own votes | DELETE | auth.uid() = user_id | - |
| Users can update own votes | UPDATE | auth.uid() = user_id | - |
| Users can view all votes | SELECT | true | - |

---

## FOREIGN KEY CONSTRAINTS

| Table | Constraint | References |
|-------|------------|------------|
| daily_boost_limits | daily_push_limits_user_id_fkey | profiles(id) |
| hidden_polls | hidden_polls_poll_id_fkey | polls(id) |
| poll_options | poll_options_poll_id_fkey | polls(id) |
| poll_vote_holds | poll_vote_holds_option_id_fkey | poll_options(id) |
| poll_vote_holds | poll_vote_holds_poll_id_fkey | polls(id) |
| poll_vote_holds | poll_vote_holds_user_id_fkey | profiles(id) |
| saved_polls | saved_polls_poll_id_fkey | polls(id) |
| user_badges | user_badges_badge_id_fkey | badges(id) |
| user_badges | user_badges_user_id_fkey | profiles(id) |
| user_boosts | user_pushes_poll_id_fkey | polls(id) |
| user_boosts | user_pushes_user_id_fkey | profiles(id) |
| user_follows | user_follows_followed_id_fkey | profiles(id) |
| user_follows | user_follows_follower_id_fkey | profiles(id) |
| user_votes | user_votes_option_id_fkey | poll_options(id) |
| user_votes | user_votes_poll_id_fkey | polls(id) |

---

## NOTES

- **Trigger Duplicates**: There are duplicate triggers on `user_votes` for the same functions (`update_poll_vote_counts` and `update_votes_cache`)
- **Trigger Duplicates**: There are two boost triggers on `user_boosts` (`sync_boost_counts` and `update_boost_cache`)
- **polls.boost_count**: Uses `numeric` type while `boost_count_cache` uses `integer`
- **RLS Coverage**: All tables have RLS enabled
- **Auth Trigger**: `handle_new_user` is attached to `auth.users` (not listed in pg_trigger for public schema)

---

## RESTORATION NOTES

To restore from this backup, run the DDL statements in order:
1. Create enums
2. Create tables
3. Create functions
4. Create triggers
5. Create indexes
6. Create RLS policies

For data restoration, export/import using `pg_dump` or Supabase dashboard.
