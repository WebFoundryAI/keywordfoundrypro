-- Add show_onboarding column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN show_onboarding BOOLEAN NOT NULL DEFAULT true;

-- Update the handle_new_user function to set show_onboarding for new profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name, show_onboarding)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    true
  );
  RETURN NEW;
END;
$$;