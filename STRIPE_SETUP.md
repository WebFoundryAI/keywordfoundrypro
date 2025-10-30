# Stripe Integration Setup Guide

This guide walks through setting up Stripe payments for Keyword Foundry Pro.

## Prerequisites

- Stripe account (https://dashboard.stripe.com)
- Supabase project with CLI access
- Deployed Supabase Edge Functions

## Step 1: Stripe Dashboard Configuration

### 1.1 Create Products and Prices

1. Navigate to **Products** in Stripe Dashboard
2. Create products for each subscription tier:

#### Starter Plan
- **Name**: Keyword Foundry Pro - Starter
- **Description**: 1,000 keyword searches/month
- **Monthly Price**: $49/month (recurring)
- **Yearly Price**: $470/year (recurring)
- Copy the **Price IDs** (e.g., `price_xxx_monthly`, `price_xxx_yearly`)

#### Professional Plan
- **Name**: Keyword Foundry Pro - Professional
- **Description**: 5,000 keyword searches/month
- **Monthly Price**: $99/month (recurring)
- **Yearly Price**: $950/year (recurring)
- Copy the **Price IDs**

#### Enterprise Plan
- **Name**: Keyword Foundry Pro - Enterprise
- **Description**: 25,000 keyword searches/month
- **Monthly Price**: $249/month (recurring)
- **Yearly Price**: $2,390/year (recurring)
- Copy the **Price IDs**

### 1.2 Update Subscription Plans in Database

Run this SQL in your Supabase SQL Editor to add Stripe Price IDs:

```sql
-- Update Starter plan with Stripe Price IDs
UPDATE subscription_plans
SET
  stripe_price_id_monthly = 'price_xxx_starter_monthly',
  stripe_price_id_yearly = 'price_xxx_starter_yearly'
WHERE tier = 'starter';

-- Update Professional plan with Stripe Price IDs
UPDATE subscription_plans
SET
  stripe_price_id_monthly = 'price_xxx_professional_monthly',
  stripe_price_id_yearly = 'price_xxx_professional_yearly'
WHERE tier = 'professional';

-- Update Enterprise plan with Stripe Price IDs
UPDATE subscription_plans
SET
  stripe_price_id_monthly = 'price_xxx_enterprise_monthly',
  stripe_price_id_yearly = 'price_xxx_enterprise_yearly'
WHERE tier = 'enterprise';
```

### 1.3 Enable Billing Portal

1. Navigate to **Settings → Billing → Customer portal**
2. Click **Activate test link** (or **Activate** for live mode)
3. Configure portal settings:
   - **Return URL**: `https://your-domain.com/billing`
   - Enable: Update subscription, Cancel subscription, Update payment method
4. Save settings

## Step 2: Supabase Edge Functions Setup

### 2.1 Get Stripe API Keys

1. Go to **Developers → API keys** in Stripe Dashboard
2. Copy:
   - **Publishable key** (starts with `pk_test_` or `pk_live_`)
   - **Secret key** (starts with `sk_test_` or `sk_live_`)

### 2.2 Set Supabase Secrets

```bash
# Set Stripe Secret Key for Edge Functions
supabase secrets set STRIPE_SECRET_KEY=sk_test_your_secret_key_here

# These will be set after webhook creation (Step 3)
# supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your_signing_secret_here
```

### 2.3 Verify Function Environment Variables

Edge Functions automatically have access to:
- `SUPABASE_URL` (from Supabase)
- `SUPABASE_SERVICE_ROLE_KEY` (from Supabase)
- `SUPABASE_ANON_KEY` (from Supabase)
- `STRIPE_SECRET_KEY` (set above)
- `STRIPE_WEBHOOK_SECRET` (set after webhook creation)

### 2.4 Deploy Edge Functions

```bash
# Deploy all Stripe-related functions
supabase functions deploy create-checkout-session
supabase functions deploy create-portal-session
supabase functions deploy stripe-webhook

# Note the function URLs:
# - https://[project-ref].supabase.co/functions/v1/create-checkout-session
# - https://[project-ref].supabase.co/functions/v1/create-portal-session
# - https://[project-ref].supabase.co/functions/v1/stripe-webhook
```

## Step 3: Stripe Webhook Configuration

### 3.1 Create Webhook Endpoint

1. Go to **Developers → Webhooks** in Stripe Dashboard
2. Click **Add endpoint**
3. **Endpoint URL**: `https://[project-ref].supabase.co/functions/v1/stripe-webhook`
4. **Select events to listen to**:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. **Add endpoint**

### 3.2 Get Webhook Signing Secret

1. Click on your newly created webhook
2. Click **Reveal** under **Signing secret**
3. Copy the signing secret (starts with `whsec_`)

### 3.3 Set Webhook Secret in Supabase

```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your_signing_secret_here
```

### 3.4 Redeploy Webhook Function

```bash
# Redeploy to pick up new secret
supabase functions deploy stripe-webhook
```

## Step 4: Application Environment Variables

### 4.1 Update .env (Local Development)

```bash
# Enable Stripe in app
VITE_STRIPE_ENABLED=true

# Add your Stripe Publishable Key
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

### 4.2 Update Production Environment

Set these in your hosting platform (Lovable, Vercel, etc.):

```bash
VITE_STRIPE_ENABLED=true
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_publishable_key_here  # Use live key for production
```

## Step 5: Testing the Integration

### 5.1 Test Checkout Flow

1. Navigate to `/pricing` page
2. Click "Get Started" on a paid plan
3. Should redirect to Stripe Checkout
4. Use test card: `4242 4242 4242 4242` (any future date, any CVC)
5. Complete checkout
6. Should redirect back to `/billing?success=true`
7. Verify subscription status updated in database

### 5.2 Test Billing Portal

1. Navigate to `/billing` page
2. Click "Manage Billing" button
3. Should redirect to Stripe Billing Portal
4. Test cancellation (will be immediate in test mode)
5. Return to app
6. Verify subscription downgraded to free

### 5.3 Verify Database Updates

Check `user_subscriptions` table:

```sql
SELECT
  user_id,
  tier,
  status,
  stripe_customer_id,
  stripe_subscription_id,
  current_period_end
FROM user_subscriptions
WHERE stripe_customer_id IS NOT NULL;
```

### 5.4 Check Webhook Deliveries

1. Go to **Developers → Webhooks** in Stripe Dashboard
2. Click on your webhook endpoint
3. View **Recent deliveries**
4. Verify all events succeeded (200 status)

## Step 6: Going Live

### 6.1 Switch to Live Mode

1. In Stripe Dashboard, toggle from **Test mode** to **Live mode** (top right)
2. Create live versions of products/prices
3. Update database with live Price IDs
4. Create live webhook endpoint
5. Get live API keys and webhook secret

### 6.2 Update Production Secrets

```bash
# Use live keys in production
supabase secrets set STRIPE_SECRET_KEY=sk_live_your_live_secret_key --project-ref your-project
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your_live_webhook_secret --project-ref your-project
```

### 6.3 Update Production Environment Variables

```bash
VITE_STRIPE_ENABLED=true
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_live_publishable_key
```

### 6.4 Deploy Functions to Production

```bash
supabase functions deploy create-checkout-session --project-ref your-project
supabase functions deploy create-portal-session --project-ref your-project
supabase functions deploy stripe-webhook --project-ref your-project
```

## Troubleshooting

### Checkout Not Working

1. Check `VITE_STRIPE_ENABLED=true` in environment
2. Verify `STRIPE_SECRET_KEY` set in Supabase secrets
3. Check browser console for errors
4. Verify Price IDs in database match Stripe Dashboard

### Webhook Not Processing

1. Check webhook deliveries in Stripe Dashboard
2. Verify `STRIPE_WEBHOOK_SECRET` set correctly
3. Check Supabase Edge Function logs:
   ```bash
   supabase functions logs stripe-webhook
   ```
4. Verify webhook URL is correct

### Subscription Not Updating

1. Check `webhook_events` table for processed events
2. Verify user email matches between Stripe and Supabase
3. Check `user_subscriptions` table for updates
4. Review Edge Function logs

## Security Checklist

- [ ] Never commit `STRIPE_SECRET_KEY` to repository
- [ ] Never commit `STRIPE_WEBHOOK_SECRET` to repository
- [ ] Use test keys for development/staging
- [ ] Use live keys only in production
- [ ] Verify webhook signature in webhook handler (already implemented)
- [ ] Enable HTTPS for webhook endpoints (Supabase provides this)
- [ ] Restrict API key permissions in Stripe Dashboard
- [ ] Monitor webhook delivery failures
- [ ] Set up Stripe email notifications for payment failures

## Support

For issues:
1. Check Stripe Dashboard → Developers → Logs
2. Check Supabase Edge Function logs
3. Check browser console for frontend errors
4. Review this documentation thoroughly

## Additional Resources

- [Stripe Checkout Docs](https://stripe.com/docs/payments/checkout)
- [Stripe Billing Portal Docs](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)
- [Stripe Webhooks Docs](https://stripe.com/docs/webhooks)
- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
