# Debug AI Insights Error - Quick Guide

## Step 1: Get Error Details from Browser Console

1. Open browser DevTools (F12)
2. Go to Console tab
3. Clear console
4. Click "Regenerate AI Insights" button
5. Look for these logs:

### What to look for:

```
[AI-INSIGHTS-DIAGNOSTICS] Request initiated
  ✅ payload_size_kb: "XX.XX"  <- Should be < 50KB
  ✅ ai_insights_limit_used: 30  <- Should match your setting

[AI-INSIGHTS-DIAGNOSTICS] Response received
  ❌ has_error: true  <- This is the problem

[AI-INSIGHTS-DIAGNOSTICS] Edge function error
  ⚠️ error_message: "..."  <- The actual error
  ⚠️ error_body: "..."  <- More details
```

## Step 2: Check Error Alert on Page

After AI insights fails, you should see a red error alert with:
- **Status Code** (e.g., 500, 413, 429, 504)
- **Status Text** (e.g., CONFIG_MISSING, PAYLOAD_TOO_LARGE)
- **Request ID** (e.g., abc-123-def)
- **Response body** (first 256 chars)

## Step 3: Identify Error Type

### Error Type 1: Missing OpenAI API Key
**Status:** 500
**Code:** CONFIG_MISSING
**Message:** "Server configuration error - missing required environment variables"

**Solution:**
1. Go to Supabase Dashboard
2. Navigate to: Edge Functions → Secrets
3. Add secret: `OPENAI_API_KEY` = `sk-...` (your OpenAI key)
4. Redeploy Edge Functions via Loveable.dev

**Get OpenAI Key:** https://platform.openai.com/api-keys

---

### Error Type 2: Payload Too Large
**Status:** 413
**Code:** PAYLOAD_TOO_LARGE
**Message:** "Payload size XXkB exceeds maximum 256KB"

**Solution:**
- Lower "AI Insights Keyword Limit" to 20-30
- Check console log for `payload_size_kb`
- Should be under 50KB for best results

---

### Error Type 3: OpenAI Rate Limit
**Status:** 429
**Code:** RATE_LIMIT
**Message:** "AI model rate limit exceeded"

**Solution:**
- Wait 60 seconds and retry
- Check OpenAI usage: https://platform.openai.com/usage
- Verify billing is set up on OpenAI account
- May need to upgrade OpenAI tier

---

### Error Type 4: Timeout
**Status:** 504
**Code:** UPSTREAM_TIMEOUT
**Message:** "AI model request timed out after 25s"

**Solution:**
- Lower "AI Insights Keyword Limit" to 20
- Retry (sometimes OpenAI is slow)
- Check OpenAI status: https://status.openai.com/

---

### Error Type 5: Authentication Failed
**Status:** 401
**Code:** UNAUTHORIZED
**Message:** "Invalid or expired authorization token"

**Solution:**
- Sign out and sign back in
- Clear browser cache/cookies
- Try in incognito mode

---

### Error Type 6: OpenAI Auth Invalid
**Status:** 500
**Code:** CONFIG_MISSING
**Message:** "AI model authentication failed"

**Solution:**
1. Check if OPENAI_API_KEY is valid
2. Go to https://platform.openai.com/api-keys
3. Verify key hasn't been revoked
4. Generate new key if needed
5. Update Supabase secret
6. Redeploy Edge Function

---

## Step 4: Run Test Script

Copy and paste this into browser console (on your site):

```javascript
// Test AI Insights Edge Function
(async () => {
  console.log('🔍 Testing AI Insights Edge Function...');

  // Get auth token
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    console.error('❌ Not authenticated. Please sign in first.');
    return;
  }

  const requestId = crypto.randomUUID();
  console.log('📤 Request ID:', requestId);

  // Test with minimal payload
  const testPayload = {
    analysisData: {
      keyword_gap_list: [
        { keyword: 'test keyword 1', competitor_rank: 5, search_volume: 1000 },
        { keyword: 'test keyword 2', competitor_rank: 10, search_volume: 500 }
      ],
      your_keywords: [
        { keyword: 'my keyword 1', rank_absolute: 3, search_volume: 2000 }
      ],
      competitor_keywords: [
        { keyword: 'comp keyword 1', rank_absolute: 7, search_volume: 1500 }
      ],
      backlink_summary: {
        your_domain: { backlinks: 100, referring_domains: 50, referring_ips: 30 },
        competitor_domain: { backlinks: 200, referring_domains: 100, referring_ips: 60 }
      },
      onpage_summary: {
        your_domain: { pages_crawled: 50, tech_score: 75 },
        competitor_domain: { pages_crawled: 100, tech_score: 85 }
      }
    },
    competitorDomain: 'example.com',
    requestId
  };

  const payloadSize = JSON.stringify(testPayload).length;
  console.log('📦 Payload size:', (payloadSize / 1024).toFixed(2), 'KB');

  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-ai-insights`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'x-kfp-request-id': requestId
        },
        body: JSON.stringify(testPayload)
      }
    );

    console.log('📥 Response status:', response.status, response.statusText);

    const data = await response.json();

    if (response.ok) {
      console.log('✅ SUCCESS! AI Insights is working.');
      console.log('Report preview:', data.report?.substring(0, 200) + '...');
    } else {
      console.error('❌ FAILED!');
      console.error('Status:', response.status);
      console.error('Error:', data);

      // Decode the error
      if (data.code === 'CONFIG_MISSING') {
        console.error('🔧 FIX: Add OPENAI_API_KEY to Supabase Edge Function secrets');
        console.error('Missing:', data.missing);
      } else if (data.code === 'PAYLOAD_TOO_LARGE') {
        console.error('🔧 FIX: Reduce keyword limit');
        console.error('Limits:', data.limits);
      } else if (data.code === 'RATE_LIMIT') {
        console.error('🔧 FIX: Wait 60s or check OpenAI billing');
      } else if (data.code === 'UPSTREAM_TIMEOUT') {
        console.error('🔧 FIX: Reduce keyword limit or retry');
      } else if (data.code === 'UNAUTHORIZED') {
        console.error('🔧 FIX: Sign out and back in');
      }
    }

    return data;
  } catch (error) {
    console.error('💥 Network error:', error.message);
    console.error('🔧 FIX: Check if Edge Function is deployed');
  }
})();
```

---

## Step 5: Check Supabase Edge Function Deployment

1. Go to Loveable.dev
2. Check if `generate-ai-insights` Edge Function is deployed
3. If not deployed, publish your changes

---

## Step 6: Check Supabase Logs

1. Go to Supabase Dashboard
2. Navigate to: Edge Functions → generate-ai-insights → Logs
3. Filter by your request_id (from browser console or error alert)
4. Look for error messages

---

## Quick Checklist

- [ ] OPENAI_API_KEY exists in Supabase Edge Function secrets
- [ ] OPENAI_API_KEY is valid (test at https://platform.openai.com/playground)
- [ ] OpenAI billing is set up (check https://platform.openai.com/account/billing)
- [ ] Edge Function `generate-ai-insights` is deployed
- [ ] AI Insights Keyword Limit is 30 or less
- [ ] Payload size is under 50KB (check console logs)
- [ ] Not getting rate limited (status 429)

---

## Most Likely Issue: Missing OPENAI_API_KEY

**90% of "non-2xx status" errors are caused by missing or invalid OpenAI API key.**

**How to fix:**
1. Get key: https://platform.openai.com/api-keys
2. Add to Supabase: Dashboard → Edge Functions → Secrets
3. Name: `OPENAI_API_KEY`
4. Value: `sk-proj-...` (your actual key)
5. Redeploy via Loveable.dev

---

## Need More Help?

Send me:
1. **Status code** from error alert (e.g., 500, 413, 429)
2. **Error code** from console logs (e.g., CONFIG_MISSING, RATE_LIMIT)
3. **Request ID** from error alert or console
4. **Console logs** (copy/paste `[AI-INSIGHTS-DIAGNOSTICS]` logs)
5. Screenshot of error alert

Then I can provide exact solution!
