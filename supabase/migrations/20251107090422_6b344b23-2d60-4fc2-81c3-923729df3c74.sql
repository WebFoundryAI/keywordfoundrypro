-- Recreate missing trigger on auth.users to create profiles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Recreate missing trigger on profiles to create trial subscriptions
DROP TRIGGER IF EXISTS on_profile_created_create_trial ON public.profiles;

CREATE TRIGGER on_profile_created_create_trial
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_trial_subscription();

-- Backfill profiles for users without them
INSERT INTO public.profiles (user_id, email, display_name, show_onboarding)
SELECT 
  au.id,
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name',
    split_part(au.email, '@', 1)
  ),
  true
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM profiles p WHERE p.user_id = au.id
);

-- Backfill trial subscriptions for users without them (5-day trial)
INSERT INTO public.user_subscriptions (
  user_id,
  tier,
  status,
  trial_ends_at,
  current_period_start,
  current_period_end
)
SELECT 
  p.user_id,
  'free_trial'::subscription_tier,
  'active',
  now() + interval '5 days',
  now(),
  now() + interval '5 days'
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM user_subscriptions us WHERE us.user_id = p.user_id
);