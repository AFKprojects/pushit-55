-- Fix search path vulnerability in database functions
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

CREATE OR REPLACE FUNCTION public.update_push_cache()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
    UPDATE public.polls 
    SET push_count_cache = (
        SELECT COUNT(*) 
        FROM public.user_pushes 
        WHERE poll_id = NEW.poll_id
    )
    WHERE id = NEW.poll_id;
    
    RETURN NEW;
END;
$function$;

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

-- Add server-side input validation function
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