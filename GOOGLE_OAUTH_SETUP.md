# Google OAuth Configuration Guide

This guide will help you configure Google OAuth authentication for Keyword Foundry Pro.

## Prerequisites
- A Supabase project (already set up: vhjffdzroebdkbmvcpgv)
- A Google Cloud Platform account

## Step 1: Configure Google Cloud Platform

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create or select a project**
3. **Enable Google+ API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google+ API"
   - Click "Enable"

4. **Configure OAuth Consent Screen**:
   - Go to "APIs & Services" > "OAuth consent screen"
   - Choose "External" user type
   - Fill in required fields:
     - App name: Keyword Foundry Pro
     - User support email: your email
     - Developer contact: your email
   - Under "Authorized domains", add:
     - `supabase.co`
     - Your custom domain (if you have one)
   - Configure scopes (add these):
     - `.../auth/userinfo.email`
     - `.../auth/userinfo.profile`
     - `openid`

5. **Create OAuth 2.0 Credentials**:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Application type: "Web application"
   - Name: Keyword Foundry Pro
   - **Authorized JavaScript origins**:
     - `https://vhjffdzroebdkbmvcpgv.supabase.co`
     - Your production domain (if deployed)
     - `http://localhost` (for local testing)
   - **Authorized redirect URIs**:
     - `https://vhjffdzroebdkbmvcpgv.supabase.co/auth/v1/callback`
     - Your production domain with `/auth/v1/callback` path
   - Click "Create"
   - **Save your Client ID and Client Secret**

## Step 2: Configure Supabase

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard/project/vhjffdzroebdkbmvcpgv

2. **Configure Google Provider**:
   - Navigate to "Authentication" > "Providers"
   - Find "Google" in the list
   - Enable the Google provider
   - Enter your:
     - Client ID (from Google Cloud Console)
     - Client Secret (from Google Cloud Console)
   - Click "Save"

3. **Configure Redirect URLs**:
   - Go to "Authentication" > "URL Configuration"
   - **Site URL**: Set to your production URL (e.g., `https://yourdomain.com`) or preview URL
   - **Redirect URLs**: Add all allowed redirect URLs:
     - `https://vhjffdzroebdkbmvcpgv.supabase.co/**`
     - Your production domain (e.g., `https://yourdomain.com/**`)
     - Your Lovable preview URL (if using Lovable)
   - Click "Save"

## Step 3: Test Authentication

1. **Clear browser cache and cookies** (optional but recommended)
2. **Navigate to your app's auth page**: `/auth`
3. **Click "Continue with Google"**
4. **Authorize the application** when prompted by Google
5. **Verify successful redirect** to your app

## Common Issues and Solutions

### Issue: "Provider is not enabled"
**Solution**: Ensure Google provider is enabled in Supabase Authentication > Providers

### Issue: "Invalid redirect URL"
**Solution**: 
- Verify redirect URLs are correctly configured in both Google Cloud Console and Supabase
- Make sure URLs include the correct protocol (https://)
- Ensure `/auth/v1/callback` is appended to redirect URLs in Google Console

### Issue: "Requested path is invalid"
**Solution**: 
- Check Site URL in Supabase Authentication > URL Configuration
- Verify it matches your actual domain

### Issue: Authentication works locally but not in production
**Solution**:
- Add production domain to Google Cloud Console authorized origins
- Add production domain to Supabase redirect URLs
- Update Site URL in Supabase to production domain

## Security Best Practices

1. **Never commit credentials**: Keep Client ID and Secret secure
2. **Use HTTPS only**: Ensure all redirect URLs use HTTPS (except localhost)
3. **Limit authorized domains**: Only add domains you control
4. **Regular audits**: Review authorized domains and redirect URLs periodically
5. **Monitor logs**: Check Supabase auth logs for suspicious activity

## Support Resources

- **Supabase Auth Docs**: https://supabase.com/docs/guides/auth/social-login/auth-google
- **Google OAuth 2.0 Guide**: https://developers.google.com/identity/protocols/oauth2
- **Supabase Discord**: https://discord.supabase.com/

## Quick Links for Your Project

- **Supabase Auth Settings**: https://supabase.com/dashboard/project/vhjffdzroebdkbmvcpgv/auth/providers
- **Supabase URL Config**: https://supabase.com/dashboard/project/vhjffdzroebdkbmvcpgv/auth/url-configuration
- **Edge Function Logs**: https://supabase.com/dashboard/project/vhjffdzroebdkbmvcpgv/functions
