-- Create site_settings table for application-wide configuration
-- This allows admin users to control features like cookie banner visibility

create table if not exists public.site_settings (
  key text primary key,
  bool_value boolean,
  json_value jsonb,
  updated_at timestamptz default now()
);

-- Add RLS policy to allow public reads, admin-only writes
alter table public.site_settings enable row level security;

create policy "Allow public read access to site_settings"
  on public.site_settings
  for select
  using (true);

create policy "Allow admin write access to site_settings"
  on public.site_settings
  for all
  using (
    exists (
      select 1 from auth.users
      where auth.uid() = id
      and (raw_user_meta_data->>'role' = 'admin' or raw_user_meta_data->>'is_admin' = 'true')
    )
  );

-- Insert default value for cookie_banner_enabled (default: false / hidden)
insert into public.site_settings (key, bool_value)
values ('cookie_banner_enabled', false)
on conflict (key) do nothing;

-- Add updated_at trigger
create or replace function public.update_site_settings_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_site_settings_updated_at
  before update on public.site_settings
  for each row
  execute function public.update_site_settings_updated_at();

-- Add comment
comment on table public.site_settings is 'Application-wide settings controllable by admin users';
