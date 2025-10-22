# 🚨 EDGE FUNCTION DEPLOYMENT REQUIRED

## The Issue

You're getting **"failed to send a request to the edge function"** because the **Edge Function code isn't deployed** to Supabase yet.

All our fixes are in GitHub, but Edge Functions need **separate deployment** to Supabase's runtime.

---

## How to Deploy Edge Functions

### Option 1: Via Loveable.dev (Recommended for you)

Since you're using Loveable.dev, create this prompt:

```
Deploy the latest Edge Function code for competitor-analyze to Supabase.

The Edge Function is located at: supabase/functions/competitor-analyze/index.ts

It requires the shared dependencies:
- supabase/functions/_shared/dataforseo/client.ts
- supabase/functions/_shared/retry.ts

Make sure the Edge Function is deployed with:
- verify_jwt = true
- DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD environment variables set

Test that the function is accessible after deployment.
```

### Option 2: Manual Deployment via Supabase CLI

If you have the Supabase CLI installed:

```bash
# Login to Supabase
supabase login

# Link your project
supabase link --project-ref vhjffdzroebdkbmvcpgv

# Deploy the specific function
supabase functions deploy competitor-analyze

# Verify it's deployed
supabase functions list
```

### Option 3: Via Supabase Dashboard

1. Go to https://supabase.com/dashboard/project/vhjffdzroebdkbmvcpgv
2. Click "Edge Functions" in the left sidebar
3. Look for `competitor-analyze` function
4. If it exists but is outdated:
   - Click the function
   - Click "Deploy new version"
   - Upload the code or connect to GitHub
5. If it doesn't exist:
   - Click "New Edge Function"
   - Name: `competitor-analyze`
   - Upload the code from `supabase/functions/competitor-analyze/index.ts`

---

## Environment Variables Required

Make sure these are set in Supabase Edge Functions secrets:

```
DATAFORSEO_LOGIN=your_dataforseo_login
DATAFORSEO_PASSWORD=your_dataforseo_password
SUPABASE_URL=https://vhjffdzroebdkbmvcpgv.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

To set them:

**Via CLI:**
```bash
supabase secrets set DATAFORSEO_LOGIN=your_login
supabase secrets set DATAFORSEO_PASSWORD=your_password
```

**Via Dashboard:**
1. Go to Project Settings → Edge Functions
2. Scroll to "Function Secrets"
3. Add the secrets

---

## How to Verify Deployment

After deploying, test the function:

1. Go to https://keywordfoundrypro.com/competitor-analyzer
2. Enter two domains (e.g., `example.com` vs `competitor.com`)
3. Click "Compare"

**Expected behavior:**
- ✅ Analysis starts (loading spinner)
- ✅ After 60-90 seconds, results appear
- ❌ Should NOT show "failed to send request to edge function"

If you still see the error after deployment, check:
- Edge Function logs in Supabase Dashboard
- That DataForSEO credentials are valid
- That the function name matches exactly: `competitor-analyze`

---

## Current Code Status

✅ All code fixes are committed to GitHub branch: `claude/analyze-loveable-project-011CULFteLQCNig6JKdAK7dM`

The fixes include:
- Removed duplicate code
- Better error handling
- Improved timeout logic
- Better logging
- Enhanced frontend error messages

**But none of this code is live until you deploy the Edge Function!**

---

## Quick Test

To check if the Edge Function is deployed, open browser console and run:

```javascript
const { data, error } = await supabase.functions.invoke('competitor-analyze', {
  body: { op: 'health' }
});
console.log('Health check:', data, error);
```

If you get **"failed to send request"**, the function isn't deployed.
If you get **`{ ok: true, d4s_creds_present: true }`**, it's deployed and working!
