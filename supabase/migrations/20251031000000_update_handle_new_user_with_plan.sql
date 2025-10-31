-- Update handle_new_user() to persist plan selection and admin role during signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_selected_plan TEXT;
  v_plan_id TEXT;
  v_is_admin BOOLEAN;
BEGIN
  -- Insert user profile
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1))
  );

  -- Extract plan information from user metadata
  v_selected_plan := NEW.raw_user_meta_data ->> 'selected_plan';
  v_is_admin := COALESCE((NEW.raw_user_meta_data ->> 'is_admin')::boolean, false);

  -- Map selected_plan to plan_id in the plans table
  -- Default to 'trial' if no plan selected
  v_plan_id := CASE
    WHEN v_selected_plan = 'professional' OR v_selected_plan = 'pro' THEN 'pro'
    WHEN v_selected_plan = 'enterprise' THEN 'enterprise'
    WHEN v_selected_plan = 'free' THEN 'free'
    WHEN v_selected_plan = 'free_trial' OR v_selected_plan = 'trial' THEN 'trial'
    ELSE 'trial' -- Default to trial plan
  END;

  -- Insert user limits with selected plan
  INSERT INTO public.user_limits (user_id, plan_id)
  VALUES (NEW.id, v_plan_id)
  ON CONFLICT (user_id) DO UPDATE
  SET plan_id = EXCLUDED.plan_id,
      updated_at = now();

  -- If marked as admin, grant admin role
  IF v_is_admin THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Verify the trigger still exists and is connected
-- (The trigger was created in earlier migration, this just updates the function)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    RAISE EXCEPTION 'Trigger on_auth_user_created does not exist. Please check migrations.';
  END IF;
END $$;
