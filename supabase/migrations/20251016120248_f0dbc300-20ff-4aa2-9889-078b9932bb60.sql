-- Create function to ensure user has a subscription (creates trial if missing)
create or replace function public.ensure_user_subscription(user_id_param uuid)
returns table (user_id uuid, tier subscription_tier, status text, trial_ends_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Insert trial subscription if none exists
  insert into public.user_subscriptions (user_id, tier, status, trial_ends_at, current_period_start, current_period_end)
  values (
    user_id_param, 
    'free_trial'::subscription_tier, 
    'active', 
    now() + interval '14 days',
    now(),
    now() + interval '14 days'
  )
  on conflict (user_id) do nothing;

  -- Return the subscription
  return query
  select us.user_id, us.tier, us.status, us.trial_ends_at
  from public.user_subscriptions us
  where us.user_id = user_id_param;
end $$;