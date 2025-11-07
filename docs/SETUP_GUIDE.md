# New User Setup Guide

## Current Status ✅

### Working Features
- ✅ **Trial Assignment**: New users automatically get `free_trial` tier (5-day trial)
- ✅ **Database Triggers**: Both critical triggers are active and working
- ✅ **Admin Protection**: Admins bypass all limits and have unlimited access
- ✅ **Usage Tracking**: Edge functions properly track usage via `user_subscriptions` table
- ✅ **Email Redirect**: Sign-up includes proper redirect URL for email confirmation

### Issues Found 🔧

## 1. Email Verification Not Sending (CRITICAL)

**Problem**: Users signing up via email don't receive verification emails.

**Solution**: Configure Supabase SMTP settings

### Steps:
1. Go to [Supabase Auth Settings](https://supabase.com/dashboard/project/vhjffdzroebdkbmvcpgv/auth/providers)
2. Navigate to **Email Templates** → **SMTP Settings**
3. Use your existing **Resend** configuration:
   - SMTP Host: `smtp.resend.com`
   - Port: `587` (or `465`)
   - Username: `resend`
   - Password: Your `RESEND_API_KEY`
   - Sender email: `noreply@yourdomain.com`
   - Sender name: `Keyword Foundry Pro`

### Temporary Testing Solution:
For immediate testing, you can temporarily disable email confirmation:
1. Go to [Auth Settings](https://supabase.com/dashboard/project/vhjffdzroebdkbmvcpgv/settings/auth)
2. Find **Email Auth** section
3. **Uncheck** "Confirm email"
4. ⚠️ **Re-enable this for production!**

---

## 2. Missing Stripe Price IDs (BLOCKS UPGRADES)

**Problem**: All subscription plans have `null` for `stripe_price_id_monthly` and `stripe_price_id_yearly`.

**Impact**: Users cannot upgrade from free trial to paid plans.

### Steps to Fix:

#### A. Create Stripe Products & Prices
1. Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/test/products)
2. Create 3 products:
   - **Starter** ($19/month, $190/year)
   - **Professional** ($49/month, $490/year)  
   - **Enterprise** ($149/month, $1490/year)
3. For each product:
   - Create a **monthly** recurring price
   - Create a **yearly** recurring price
   - Copy both Price IDs (format: `price_xxxxx`)

#### B. Update Database
Run this SQL in [Supabase SQL Editor](https://supabase.com/dashboard/project/vhjffdzroebdkbmvcpgv/sql/new):

```sql
-- Update Starter plan
UPDATE subscription_plans 
SET 
  stripe_price_id_monthly = 'price_MONTHLY_STARTER_ID_HERE',
  stripe_price_id_yearly = 'price_YEARLY_STARTER_ID_HERE'
WHERE tier = 'starter';

-- Update Professional plan
UPDATE subscription_plans 
SET 
  stripe_price_id_monthly = 'price_MONTHLY_PROFESSIONAL_ID_HERE',
  stripe_price_id_yearly = 'price_YEARLY_PROFESSIONAL_ID_HERE'
WHERE tier = 'professional';

-- Update Enterprise plan
UPDATE subscription_plans 
SET 
  stripe_price_id_monthly = 'price_MONTHLY_ENTERPRISE_ID_HERE',
  stripe_price_id_yearly = 'price_YEARLY_ENTERPRISE_ID_HERE'
WHERE tier = 'enterprise';
```

#### C. Verify Setup
```sql
-- Check that all plans have price IDs
SELECT tier, name, stripe_price_id_monthly, stripe_price_id_yearly 
FROM subscription_plans 
WHERE tier NOT IN ('free_trial', 'admin');
```

---

## 3. How The System Works

### For Regular Users:
1. **Sign Up** → User created in `auth.users`
2. **Profile Created** → Trigger creates profile in `profiles` table
3. **Trial Assigned** → Trigger creates `user_subscriptions` record with:
   - `tier = 'free_trial'`
   - `status = 'active'`
   - `trial_ends_at = now() + 5 days`
4. **Usage Tracked** → Edge functions call:
   - `can_user_perform_action(user_id, 'keyword')` - checks limits
   - `increment_usage(user_id, 'keyword', 1)` - tracks usage

### For Admin Users:
- Admins are identified via `user_roles` table
- All limit checks bypass admins (see `can_user_perform_action` function)
- Admins get unlimited usage automatically
- Admins are shown as 'pro' tier in UI (see `resolveUserPlan`)

### Edge Functions That Check Limits:
- `keyword-research` - checks keyword limits
- `serp-analysis` - checks SERP analysis limits
- `related-keywords` - checks related keyword limits
- `competitor-analyze` - checks analysis limits

---

## 4. Email Notifications for Usage Limits

The system includes automated email alerts when users reach 80% of their usage limits.

### Setup Cron Job (Recommended)

To automatically check usage and send alerts, set up a cron job:

1. **Enable Extensions** (if not already enabled):
```sql
-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
```

2. **Create the Cron Job**:
```sql
-- Run usage alerts check every hour
SELECT cron.schedule(
  'send-usage-alerts-hourly',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT net.http_post(
    url:='https://vhjffdzroebdkbmvcpgv.supabase.co/functions/v1/send-usage-alerts',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoamZmZHpyb2ViZGtibXZjcGd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxMzA0MDgsImV4cCI6MjA3NDcwNjQwOH0.jxNm1b-5oJJTzFFHpmZ1BNYZGb2lJuphDlmY3Si4tHc"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);
```

### Manual Testing

You can manually trigger the alerts edge function from Supabase dashboard:
- Go to [Edge Functions](https://supabase.com/dashboard/project/vhjffdzroebdkbmvcpgv/functions/send-usage-alerts)
- Click "Run function"

Or using curl:
```bash
curl -X POST https://vhjffdzroebdkbmvcpgv.supabase.co/functions/v1/send-usage-alerts \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

### How It Works

1. **Monitoring**: The `get_users_near_limits()` function checks all active subscriptions
2. **Threshold**: Alerts trigger when usage reaches 80% of any limit (keywords, SERP, or related)
3. **Deduplication**: The `usage_notifications` table prevents duplicate emails in the same period
4. **Admin Exclusion**: Admin users are automatically excluded from alerts
5. **Email Content**: Users receive clear info about which limit they're approaching and next steps

### View Notification History
```sql
-- See all sent notifications
SELECT 
  un.sent_at,
  p.email,
  un.notification_type,
  us.tier
FROM usage_notifications un
JOIN profiles p ON p.user_id = un.user_id
JOIN user_subscriptions us ON us.user_id = un.user_id
ORDER BY un.sent_at DESC
LIMIT 50;
```

---

## Testing Checklist

### Test New User Flow:
- [ ] Create new account via email
- [ ] Receive verification email (or bypass if testing)
- [ ] See `free_trial` tier in profile
- [ ] Can perform keyword searches
- [ ] Usage increments properly
- [ ] See trial expiration date

### Test Trial Expiration:
```sql
-- Manually expire a test user's trial
UPDATE user_subscriptions 
SET trial_ends_at = now() - interval '1 day',
    current_period_end = now() - interval '1 day'
WHERE user_id = 'TEST_USER_ID_HERE';
```
- [ ] User should see "trial expired" message
- [ ] Searches should be blocked
- [ ] Upgrade prompts should appear

### Test Admin User:
- [ ] Admin can perform unlimited searches
- [ ] Admin bypasses all limit checks
- [ ] Admin sees 'Pro' tier in UI
- [ ] Admin cannot accidentally downgrade

---

## Architecture Notes

### Single Source of Truth:
- **Limits Table**: `subscription_plans` (defines limits per tier)
- **User Tier**: `user_subscriptions` (user's current plan)
- **Usage Tracking**: `user_usage` (current billing period usage)

### Database Functions:
- `can_user_perform_action(user_id, action_type)` - **Main limit checker**
- `increment_usage(user_id, action_type, amount)` - **Usage tracker**
- `is_admin(user_id)` - **Admin check** (always returns true for unlimited)

### Redundant Code Removed:
- ❌ `src/lib/limits/enforceCredits.ts` - Was using wrong table (`user_limits`)
- ✅ Edge functions use correct system (database functions)

---

## Quick Reference

| Tier | Keywords/Month | SERP Analyses | Related Keywords | Cost |
|------|----------------|---------------|------------------|------|
| Free Trial | 100 | 10 | 25 | $0 (5 days) |
| Starter | 1,000 | 100 | 250 | $19/mo |
| Professional | 5,000 | 500 | 1,250 | $49/mo |
| Enterprise | 25,000 | 2,500 | 6,250 | $149/mo |
| Admin | Unlimited | Unlimited | Unlimited | N/A |

---

## Support Links

- [Supabase Auth Settings](https://supabase.com/dashboard/project/vhjffdzroebdkbmvcpgv/auth/providers)
- [Supabase SQL Editor](https://supabase.com/dashboard/project/vhjffdzroebdkbmvcpgv/sql/new)
- [Stripe Dashboard](https://dashboard.stripe.com/test/products)
- [Edge Function Logs](https://supabase.com/dashboard/project/vhjffdzroebdkbmvcpgv/functions)
