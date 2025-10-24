# AI Insights Troubleshooting Guide

## Common Failure Reasons and Solutions

### 1. Missing OPENAI_API_KEY
**Error:** `Server configuration error - missing required environment variables`
**Code:** `CONFIG_MISSING`
**Status:** 500

**Solution:**
1. Go to Supabase Dashboard → Edge Functions → Secrets
2. Add secret: `OPENAI_API_KEY` with your OpenAI API key
3. Redeploy the `generate-ai-insights` Edge Function

**How to get an OpenAI API key:**
1. Visit https://platform.openai.com/api-keys
2. Create a new secret key
3. Copy it immediately (you won't see it again)
4. Add it to Supabase secrets

---

### 2. Payload Too Large
**Error:** `Payload size XXkB exceeds maximum 256KB`
**Code:** `PAYLOAD_TOO_LARGE`
**Status:** 413

**Solution:**
- Reduce the "AI Insights Keyword Limit" field (default: 30, max: 100)
- Lower values = faster processing and lower cost
- Recommended: 20-50 keywords for best results

**Current payload limits:**
- Max body size: 256KB
- Max keywords per category: 1000
- Recommended: 30-50 keywords per category

---

### 3. OpenAI API Rate Limit
**Error:** `AI model rate limit exceeded`
**Code:** `RATE_LIMIT`
**Status:** 429

**Solution:**
- Wait 60 seconds and retry
- Check your OpenAI usage limits at https://platform.openai.com/usage
- Upgrade your OpenAI plan if needed
- Check if you have billing set up on OpenAI

---

### 4. OpenAI API Authentication Failed
**Error:** `AI model authentication failed`
**Code:** `CONFIG_MISSING`
**Status:** 500

**Solution:**
1. Verify your OPENAI_API_KEY is valid
2. Check if the key has been revoked at https://platform.openai.com/api-keys
3. Generate a new key and update Supabase secrets
4. Redeploy the Edge Function

---

### 5. Timeout Error
**Error:** `AI model request timed out after 25s`
**Code:** `UPSTREAM_TIMEOUT`
**Status:** 504

**Solution:**
- Reduce the "AI Insights Keyword Limit" to speed up processing
- Retry the request (sometimes OpenAI is slow)
- Check OpenAI status: https://status.openai.com/

---

### 6. Invalid Response Format
**Error:** `AI model returned invalid response format`
**Code:** `UPSTREAM_ERROR`
**Status:** 502

**Solution:**
- This is usually a temporary OpenAI issue
- Retry the request
- Check OpenAI status page
- If persistent, contact support with the request_id

---

## Debugging Steps

### 1. Check Browser Console
1. Open DevTools (F12)
2. Go to Console tab
3. Look for `[AI-INSIGHTS-DIAGNOSTICS]` logs
4. Check for:
   - Request payload size (should be < 256KB)
   - Keyword counts sent to AI
   - Error messages with request_id

### 2. Check Supabase Logs
1. Go to Supabase Dashboard
2. Navigate to Edge Functions → generate-ai-insights → Logs
3. Filter by request_id (from browser console or error alert)
4. Look for error messages

### 3. Test Edge Function Directly
Use the browser console to test the Edge Function:

```javascript
// Get your auth token
const { data: { session } } = await supabase.auth.getSession();
const token = session.access_token;

// Test with minimal payload
fetch('https://YOUR_PROJECT.supabase.co/functions/v1/generate-ai-insights', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'x-kfp-request-id': crypto.randomUUID()
  },
  body: JSON.stringify({
    analysisData: {
      keyword_gap_list: [
        { keyword: 'test keyword', competitor_rank: 5, search_volume: 1000 }
      ],
      backlink_summary: { your_domain: {}, competitor_domain: {} },
      onpage_summary: { your_domain: {}, competitor_domain: {} }
    },
    competitorDomain: 'example.com'
  })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

---

## Edge Function Configuration Checklist

### Required Supabase Secrets:
- ✅ `OPENAI_API_KEY` - Your OpenAI API key
- ✅ `SUPABASE_URL` - Auto-configured
- ✅ `SUPABASE_ANON_KEY` - Auto-configured

### Edge Function Limits (see index.ts):
- `MAX_BODY_SIZE_KB`: 256
- `MAX_KEYWORDS`: 1000
- `UPSTREAM_TIMEOUT_MS`: 25000 (25 seconds)

---

## Monitoring AI Insights Performance

### Browser Console Logs
Look for these diagnostic logs:

```
[AI-INSIGHTS-DIAGNOSTICS] Using keyword limit
  user_specified: "30"
  parsed: 30
  safe_limit: 30

[AI-INSIGHTS-DIAGNOSTICS] Request initiated
  payload_size_kb: "18.45"
  keyword_gaps_count: 30
  your_keywords_count: 30
  competitor_keywords_count: 30
  ai_insights_limit_used: 30

[AI-INSIGHTS-DIAGNOSTICS] Response received
  has_error: false
  has_data: true

[AI-INSIGHTS-DIAGNOSTICS] Success
  request_id: "abc-123"
```

### Expected Response Times:
- Small payloads (10-20 keywords): 5-10 seconds
- Medium payloads (30-50 keywords): 10-15 seconds
- Large payloads (50-100 keywords): 15-25 seconds

---

## Getting Help

If you've tried all troubleshooting steps and AI insights still fails:

1. **Gather Information:**
   - Request ID from error alert or console
   - Browser console logs (search for request_id)
   - Supabase Edge Function logs
   - Screenshot of error

2. **Check Common Issues:**
   - Is your OpenAI API key valid?
   - Do you have billing set up on OpenAI?
   - Is the Edge Function deployed?
   - Are secrets configured correctly?

3. **Contact Support:**
   - Include the request_id
   - Include error messages
   - Include payload size from console logs
   - Include Supabase logs (redact sensitive data)

---

## Quick Reference: Error Codes

| Code | Status | Meaning | Quick Fix |
|------|--------|---------|-----------|
| `CONFIG_MISSING` | 500 | Missing env vars | Add OPENAI_API_KEY to Supabase secrets |
| `PAYLOAD_TOO_LARGE` | 413 | Request too big | Lower AI Insights Keyword Limit |
| `INVALID_INPUT` | 422 | Bad request data | Run new competitor analysis |
| `UNAUTHORIZED` | 401 | Auth failed | Sign out and back in |
| `RATE_LIMIT` | 429 | Too many requests | Wait 60s and retry |
| `UPSTREAM_TIMEOUT` | 504 | OpenAI timeout | Lower keyword limit, retry |
| `UPSTREAM_ERROR` | 502 | OpenAI error | Retry, check OpenAI status |
| `INTERNAL_ERROR` | 500 | Unexpected error | Contact support with request_id |

---

## Performance Optimization Tips

1. **Use appropriate keyword limits:**
   - Small competitors: 10-20 keywords
   - Medium competitors: 30-50 keywords
   - Large competitors: 50-100 keywords

2. **Monitor payload sizes:**
   - Check console logs for `payload_size_kb`
   - Keep under 50KB for best performance
   - 30 keywords typically = 15-25KB

3. **Understand costs:**
   - Each AI insights request costs ~$0.02-0.05 (OpenAI GPT-4)
   - Larger payloads = higher cost
   - Balance detail vs. cost

---

## Testing After Fixes

After making configuration changes:

1. **Test with minimal data:**
   - Use the test script above
   - Verify 200 response with `report` field

2. **Test with real data:**
   - Run competitor analysis with low keyword limits
   - Verify AI insights generates successfully
   - Check console logs for diagnostics

3. **Test with maximum data:**
   - Set AI Insights Keyword Limit to 100
   - Run analysis
   - Verify no timeout or payload errors
