-- Phase 1: Fix RLS policy to allow trigger inserts
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users and triggers can insert profiles"
ON public.profiles
FOR INSERT
TO public
WITH CHECK (
  auth.uid() = user_id     -- Normal user insert
  OR auth.uid() IS NULL    -- Trigger/service role context
);

-- Phase 2: Backfill missing profiles for broken Google OAuth users
INSERT INTO public.profiles (user_id, email, display_name)
SELECT 
  u.id,
  u.email,
  COALESCE(
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name',
    split_part(u.email, '@', 1)
  )
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.user_id
WHERE p.id IS NULL;

-- Phase 3: Create free_trial subscriptions for users without them
-- The ensure_user_usage_record trigger will automatically create usage records
INSERT INTO public.user_subscriptions (
  user_id,
  tier,
  status,
  trial_ends_at,
  current_period_start,
  current_period_end
)
SELECT 
  u.id,
  'free_trial'::subscription_tier,
  'active',
  now() + interval '7 days',
  now(),
  now() + interval '30 days'
FROM auth.users u
LEFT JOIN user_subscriptions s ON u.id = s.user_id
WHERE s.id IS NULL;