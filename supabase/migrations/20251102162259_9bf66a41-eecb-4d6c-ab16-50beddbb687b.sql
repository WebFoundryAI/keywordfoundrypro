-- Sync profiles.is_admin with user_roles table
UPDATE profiles
SET is_admin = true
WHERE user_id IN (
  SELECT user_id 
  FROM user_roles 
  WHERE role = 'admin'
);

-- Update admin subscription to use internal-admin marker and enterprise tier
UPDATE user_subscriptions
SET 
  stripe_customer_id = 'internal-admin',
  tier = 'enterprise',
  status = 'active',
  current_period_start = now(),
  current_period_end = now() + interval '100 years',
  trial_ends_at = null
WHERE user_id IN (
  SELECT user_id 
  FROM user_roles 
  WHERE role = 'admin'
);

-- Create function to sync is_admin flag
CREATE OR REPLACE FUNCTION public.sync_profile_admin_flag()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- When a role is inserted or updated
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    IF NEW.role = 'admin' THEN
      UPDATE profiles SET is_admin = true WHERE user_id = NEW.user_id;
    END IF;
  END IF;
  
  -- When a role is deleted, check if user still has admin role
  IF (TG_OP = 'DELETE') THEN
    IF OLD.role = 'admin' THEN
      UPDATE profiles 
      SET is_admin = EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = OLD.user_id AND role = 'admin'
      )
      WHERE user_id = OLD.user_id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger to auto-sync is_admin flag
DROP TRIGGER IF EXISTS sync_admin_flag_on_role_change ON user_roles;
CREATE TRIGGER sync_admin_flag_on_role_change
  AFTER INSERT OR UPDATE OR DELETE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_admin_flag();