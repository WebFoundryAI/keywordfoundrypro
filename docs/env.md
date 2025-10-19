# Environment Variables Reference

**Last Updated:** 2025-10-19

This document lists all required and optional environment variables for the Keyword Foundry Pro application.

## Required Variables

### Supabase Configuration
These are automatically configured when using Lovable's Supabase integration:

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `SUPABASE_URL` | Supabase project URL | `https://vhjffdzroebdkbmvcpgv.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anonymous/publishable key | `eyJhbGc...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (backend only) | `eyJhbGc...` |

### DataForSEO API Configuration
Required for keyword research, SERP analysis, and competitor features:

| Variable | Description | Example Value | Where to Get |
|----------|-------------|---------------|--------------|
| `DATAFORSEO_LOGIN` | DataForSEO account login/email | `user@example.com` | [DataForSEO Dashboard](https://app.dataforseo.com/api-dashboard) |
| `DATAFORSEO_PASSWORD` | DataForSEO API password | `your_api_password` | [DataForSEO Dashboard](https://app.dataforseo.com/api-dashboard) |

### Application Configuration

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `APP_BASE_URL` | Base URL of deployed application | `https://yourdomain.com` or `https://your-project.lovable.app` |

## Optional Variables

### Stripe (Payment Processing)
Only required if using paid subscription features:

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `STRIPE_SECRET_KEY` | Stripe secret API key | `sk_live_...` or `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | `whsec_...` |

### OpenAI (AI Features)
Only required if using AI insights generation:

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `OPENAI_API_KEY` | OpenAI API key for GPT models | `sk-proj-...` |

## Environment-Specific Notes

### Development
- Use test credentials for DataForSEO and Stripe
- Set `APP_BASE_URL` to `http://localhost:5173` or Lovable preview URL

### Staging
- Use production Supabase project
- Use test mode for payment processors
- Set `APP_BASE_URL` to staging domain

### Production
- **Never commit secrets to git**
- All secrets stored in Supabase Edge Function secrets
- Use production API keys
- Set `APP_BASE_URL` to your custom domain

## Checking Configuration

To verify your environment variables are properly configured:

1. **Admin Users**: Visit `/api/env-check` endpoint (admin-only)
2. **Via Dashboard**: Check Supabase project settings > Edge Functions > Secrets

## Security Best Practices

1. **Never hardcode secrets** in application code
2. **Use Supabase secrets** for all sensitive configuration
3. **Rotate credentials** regularly
4. **Use different credentials** for dev/staging/prod
5. **Monitor usage** via DataForSEO and Stripe dashboards

## Troubleshooting

### "DATAFORSEO_LOGIN is not configured"
- Add the secret via Supabase Dashboard → Settings → Edge Functions → Add New Secret
- Restart edge function after adding secrets

### "Invalid API credentials" from DataForSEO
- Verify credentials at https://app.dataforseo.com/api-dashboard
- Ensure no trailing spaces in login/password
- Check if API access is enabled for your account

### "Supabase client error"
- Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` match your project
- Check project is not paused in Supabase dashboard

## Related Documentation

- [Supabase Edge Functions Secrets](https://supabase.com/docs/guides/functions/secrets)
- [DataForSEO API Documentation](https://docs.dataforseo.com/)
- [Stripe API Keys](https://stripe.com/docs/keys)
