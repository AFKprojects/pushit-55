
-- Add country column to profiles table
ALTER TABLE public.profiles ADD COLUMN country TEXT;

-- Update the handle_new_user function to detect and store country
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email, country)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email,
    COALESCE(new.raw_user_meta_data->>'country', 'Unknown')
  );
  RETURN new;
END;
$$;
