-- Remove hardcoded Poland assignments and fix the handle_new_user function
UPDATE public.profiles SET country = NULL WHERE country = 'Poland';

-- Update the handle_new_user function to properly use detected country from user metadata
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
    new.raw_user_meta_data->>'country'
  );
  RETURN new;
END;
$$;