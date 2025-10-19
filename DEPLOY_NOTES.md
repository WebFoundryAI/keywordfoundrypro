# Deployment Notes - Keyword Foundry Pro

## Environment Verification ✅

All required secrets are configured in Supabase:
- ✅ SUPABASE_URL
- ✅ SUPABASE_ANON_KEY
- ✅ DATAFORSEO_LOGIN
- ✅ DATAFORSEO_PASSWORD
- ✅ OPENAI_API_KEY

## CORS Headers ✅

All edge functions have proper CORS headers configured:
- ✅ competitor-analyze
- ✅ competitor-analyze-demo
- ✅ generate-ai-insights

## Deployment Commands

### Deploy All Edge Functions

```bash
# Deploy the main competitor analysis function
supabase functions deploy competitor-analyze

# Deploy the demo version (no auth, limited results)
supabase functions deploy competitor-analyze-demo

# Deploy the AI insights generator
supabase functions deploy generate-ai-insights

# Deploy all other functions
supabase functions deploy keyword-research
supabase functions deploy keyword-suggestions
supabase functions deploy related-keywords
supabase functions deploy serp-analysis
supabase functions deploy create-checkout-session
supabase functions deploy create-portal-session
supabase functions deploy stripe-webhook
```

### Deploy All at Once

```bash
supabase functions deploy --all
```

## Verify Deployment

### 1. Check Function Logs in Supabase Dashboard

Navigate to:
```
https://supabase.com/dashboard/project/vhjffdzroebdkbmvcpgv/functions/<function-name>/logs
```

Replace `<function-name>` with:
- `competitor-analyze`
- `competitor-analyze-demo`
- `generate-ai-insights`

### 2. Test Endpoints

**Demo Endpoint (Public):**
```bash
curl -X POST https://vhjffdzroebdkbmvcpgv.supabase.co/functions/v1/competitor-analyze-demo \
  -H "Content-Type: application/json" \
  -d '{"yourDomain":"example.com","competitorDomain":"competitor.com"}'
```

**Authenticated Endpoint:**
```bash
curl -X POST https://vhjffdzroebdkbmvcpgv.supabase.co/functions/v1/competitor-analyze \
  -H "Authorization: Bearer YOUR_USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{"yourDomain":"example.com","competitorDomain":"competitor.com"}'
```

### 3. Monitor Edge Function Logs

Go to: **Supabase Dashboard → Functions → Select Function → Logs**

Look for:
- ✅ User authentication success
- ✅ Profile loaded successfully
- ✅ Quota checks passing
- ✅ Usage updated successfully
- ❌ Any error messages

### 4. Check Database Records

Verify competitor analysis cache:
```sql
SELECT * FROM competitor_analysis 
ORDER BY created_at DESC 
LIMIT 10;
```

Verify profile updates:
```sql
SELECT user_id, free_reports_used, free_reports_renewal_at 
FROM profiles 
WHERE free_reports_used > 0;
```

## Expected Behavior

### Success Path (200 OK)
- Returns full analysis data with `{ ok: true, keyword_gap_list: [...], ... }`
- Updates `free_reports_used` in profiles table
- Caches result in `competitor_analysis` table

### Limit Exceeded (200 OK + code)
- Returns `{ ok: false, code: 'LIMIT_EXCEEDED', message: '...' }`
- Shows upgrade modal on frontend
- Does NOT increment usage counter

### Profile Missing (200 OK + code)
- Returns `{ ok: false, code: 'PROFILE_MISSING', message: '...' }`
- Shows sign-out/sign-in prompt on frontend

### Unauthorized (401)
- Returns `{ error: 'Unauthorized' }` with 401 status
- Redirects to sign-in page

## Frontend Build Verification

Before deploying frontend, ensure:

1. **TypeScript Build Passes:**
   ```bash
   npm run build
   ```

2. **No Console Errors in Preview:**
   - Check browser dev console
   - Verify no React warnings
   - Test both authenticated and demo flows

3. **Domain Normalization Works:**
   - Test with: `https://example.com`
   - Test with: `www.example.com`
   - Test with: `example.com/path`
   - All should normalize to: `example.com`

## Rollback Plan

If issues occur after deployment:

1. **Revert Edge Function:**
   ```bash
   supabase functions delete competitor-analyze --version <previous-version>
   supabase functions deploy competitor-analyze --version <previous-version>
   ```

2. **Check Git History:**
   - Find last working commit
   - Revert changes if needed

3. **Monitor Logs:**
   - Check for specific error patterns
   - Look for DataForSEO API failures
   - Verify Supabase connection issues

## Post-Deployment Checklist

- [ ] All edge functions deployed successfully
- [ ] Test demo flow (no auth)
- [ ] Test authenticated flow
- [ ] Verify quota system works
- [ ] Check freemium badge updates correctly
- [ ] Test CSV/JSON export
- [ ] Verify AI insights generation
- [ ] Check cache behavior (24-hour window)
- [ ] Monitor error rates in first hour
- [ ] Test with multiple users

## Support & Monitoring

**Supabase Dashboard:**
- Functions: https://supabase.com/dashboard/project/vhjffdzroebdkbmvcpgv/functions
- Database: https://supabase.com/dashboard/project/vhjffdzroebdkbmvcpgv/editor
- Auth: https://supabase.com/dashboard/project/vhjffdzroebdkbmvcpgv/auth/users

**Key Metrics to Monitor:**
- Edge function invocation count
- Average response time
- Error rate (target: < 1%)
- Cache hit rate
- Database query performance

## Notes

- Domain normalization happens on BOTH frontend and backend for consistency
- All business logic errors return 200 with error codes (not 4xx/5xx)
- Demo function has no auth and returns limited results (top 5)
- Regular function increments quota and caches results
- Cache expires after 24 hours
- Freemium limit: 3 reports per 30 days
