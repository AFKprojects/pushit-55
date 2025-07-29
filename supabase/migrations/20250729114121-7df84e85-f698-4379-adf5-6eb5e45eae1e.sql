-- Add missing foreign key constraints
ALTER TABLE IF EXISTS public.poll_options 
ADD CONSTRAINT IF NOT EXISTS poll_options_poll_id_fkey 
FOREIGN KEY (poll_id) REFERENCES public.polls(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.user_votes 
ADD CONSTRAINT IF NOT EXISTS user_votes_option_id_fkey 
FOREIGN KEY (option_id) REFERENCES public.poll_options(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.user_votes 
ADD CONSTRAINT IF NOT EXISTS user_votes_poll_id_fkey 
FOREIGN KEY (poll_id) REFERENCES public.polls(id) ON DELETE CASCADE;