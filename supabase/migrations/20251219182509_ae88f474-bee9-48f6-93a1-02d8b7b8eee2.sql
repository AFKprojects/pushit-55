-- Update cleanup_button_hold_sessions to use 10 second timeout
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
    AND last_heartbeat < (NOW() - INTERVAL '10 seconds');
END;
$function$;

-- Also update cleanup_poll_vote_sessions for consistency
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
    AND last_heartbeat < (NOW() - INTERVAL '10 seconds');
END;
$function$;