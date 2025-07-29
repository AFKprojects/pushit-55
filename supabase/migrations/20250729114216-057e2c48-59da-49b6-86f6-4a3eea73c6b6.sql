-- Check and add foreign key constraints if they don't exist
DO $$ 
BEGIN
    -- Add poll_options -> polls foreign key if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'poll_options_poll_id_fkey' 
        AND table_name = 'poll_options'
    ) THEN
        ALTER TABLE public.poll_options 
        ADD CONSTRAINT poll_options_poll_id_fkey 
        FOREIGN KEY (poll_id) REFERENCES public.polls(id) ON DELETE CASCADE;
    END IF;

    -- Add user_votes -> poll_options foreign key if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_votes_option_id_fkey' 
        AND table_name = 'user_votes'
    ) THEN
        ALTER TABLE public.user_votes 
        ADD CONSTRAINT user_votes_option_id_fkey 
        FOREIGN KEY (option_id) REFERENCES public.poll_options(id) ON DELETE CASCADE;
    END IF;

    -- Add user_votes -> polls foreign key if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_votes_poll_id_fkey' 
        AND table_name = 'user_votes'
    ) THEN
        ALTER TABLE public.user_votes 
        ADD CONSTRAINT user_votes_poll_id_fkey 
        FOREIGN KEY (poll_id) REFERENCES public.polls(id) ON DELETE CASCADE;
    END IF;
END $$;