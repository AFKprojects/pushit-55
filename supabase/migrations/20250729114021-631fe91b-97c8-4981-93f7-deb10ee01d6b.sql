-- Enable realtime for tables that need it
ALTER TABLE IF EXISTS public.poll_options REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.polls REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.user_votes REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.button_holds REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_options;
ALTER PUBLICATION supabase_realtime ADD TABLE public.polls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.button_holds;