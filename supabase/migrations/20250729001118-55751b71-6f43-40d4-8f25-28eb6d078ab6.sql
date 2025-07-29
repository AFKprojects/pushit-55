-- Fix database structure and security issues

-- 1. Create generate_poll_id function (missing from current structure)
CREATE OR REPLACE FUNCTION public.generate_poll_id()
RETURNS TEXT AS $$
BEGIN
  RETURN lower(substr(encode(gen_random_bytes(4), 'hex'), 1, 8));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 2. Fix search_path security issues in existing functions
CREATE OR REPLACE FUNCTION public.update_push_cache()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
    -- Aktualizacja cache w polls
    UPDATE polls 
    SET push_count_cache = (
        SELECT COUNT(*) 
        FROM user_pushes 
        WHERE poll_id = NEW.poll_id
    )
    WHERE id = NEW.poll_id;
    
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_votes_cache()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
    -- Aktualizacja cache w poll_options
    UPDATE poll_options 
    SET votes_cache = (
        SELECT COUNT(*) 
        FROM user_votes 
        WHERE option_id = NEW.option_id
    )
    WHERE id = NEW.option_id;
    
    -- Aktualizacja cache w polls
    UPDATE polls 
    SET total_votes_cache = (
        SELECT COUNT(*) 
        FROM user_votes 
        WHERE poll_id = NEW.poll_id
    )
    WHERE id = NEW.poll_id;
    
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_poll_vote_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  -- Update option vote count
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

-- 3. Add missing archive function for expired polls
CREATE OR REPLACE FUNCTION public.archive_expired_polls()
RETURNS void AS $$
BEGIN
  UPDATE polls 
  SET status = 'archived'::poll_status
  WHERE expires_at < NOW() AND status = 'active'::poll_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 4. Create triggers for automatic cache updates
DROP TRIGGER IF EXISTS update_votes_cache_trigger ON user_votes;
CREATE TRIGGER update_votes_cache_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.user_votes
    FOR EACH ROW EXECUTE FUNCTION public.update_votes_cache();

DROP TRIGGER IF EXISTS update_push_cache_trigger ON user_pushes;
CREATE TRIGGER update_push_cache_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.user_pushes
    FOR EACH ROW EXECUTE FUNCTION public.update_push_cache();

-- 5. Create trigger for poll vote counting
DROP TRIGGER IF EXISTS poll_vote_count_trigger ON user_votes;
CREATE TRIGGER poll_vote_count_trigger
    AFTER INSERT OR DELETE ON public.user_votes
    FOR EACH ROW EXECUTE FUNCTION public.update_poll_vote_counts();

-- 6. Enable realtime for critical tables
ALTER TABLE public.polls REPLICA IDENTITY FULL;
ALTER TABLE public.button_holds REPLICA IDENTITY FULL;
ALTER TABLE public.user_votes REPLICA IDENTITY FULL;