# QA Test Script - Competitor Analyzer Freemium Flow

## Pre-Test Setup

### Required Test Accounts
1. **Normal User Account** - For standard flow testing
2. **Fresh User Account** - For profile missing scenario
3. **Admin Access** - To manually manipulate database records

### Test Domains
Use these real domains for consistent testing:
- **Your Domain:** `mountainwarehouse.com`
- **Competitor Domain:** `cotswoldoutdoor.com`

Alternative pairs:
- `nike.com` vs `adidas.com`
- `amazon.com` vs `walmart.com`

---

## Test Case 1: Successful Analysis Flow (First 3 Reports)

**Objective:** Verify normal user can complete 3 analyses successfully

### Steps:
1. ✅ Start the app in development mode
   ```bash
   npm run dev
   ```

2. ✅ Navigate to sign-in page
   - URL: `/sign-in`
   - Verify sign-in form loads correctly

3. ✅ Sign in as a normal user
   - Enter email and password
   - Click "Sign In"
   - Verify redirect to home page
   - Check: No error messages

4. ✅ Navigate to `/competitor-analyzer`
   - Check: Page loads with input form
   - Check: Badge shows "Free reports left: 3"

5. ✅ **First Analysis**
   - Your Domain: `mountainwarehouse.com`
   - Competitor Domain: `cotswoldoutdoor.com`
   - Click "Compare"
   - **Expected Results:**
     - ✅ Loading spinner appears
     - ✅ No red error toast
     - ✅ Success toast: "Analysis complete"
     - ✅ Results display with:
       - Keyword gap count
       - Backlink comparison chart
       - Technical score comparison
       - Keyword gap table
     - ✅ Badge updates to "Free reports left: 2"
     - ✅ AI Insights section appears and generates

6. ✅ **Second Analysis**
   - Clear inputs
   - Your Domain: `nike.com`
   - Competitor Domain: `adidas.com`
   - Click "Compare"
   - **Expected Results:**
     - ✅ Same success flow as first analysis
     - ✅ Badge updates to "Free reports left: 1"

7. ✅ **Third Analysis**
   - Clear inputs
   - Your Domain: `amazon.com`
   - Competitor Domain: `walmart.com`
   - Click "Compare"
   - **Expected Results:**
     - ✅ Same success flow
     - ✅ Badge updates to "Free reports left: 0"

### Console Checks:
Open browser DevTools → Console:
- ✅ No errors in console
- ✅ No network failures (check Network tab)
- ✅ All API calls return 200 status

### Database Checks:
Run in Supabase SQL Editor:
```sql
-- Check profile usage
SELECT user_id, free_reports_used, free_reports_renewal_at 
FROM profiles 
WHERE user_id = '<your-user-id>';
-- Expected: free_reports_used = 3

-- Check cached analyses
SELECT your_domain, competitor_domain, created_at 
FROM competitor_analysis 
WHERE user_id = '<your-user-id>' 
ORDER BY created_at DESC 
LIMIT 3;
-- Expected: 3 rows
```

---

## Test Case 2: Limit Exceeded (4th Analysis)

**Objective:** Verify limit modal appears and no error toast shows

### Steps:
1. ✅ Continue from Test Case 1 (badge shows "0 reports left")

2. ✅ **Fourth Analysis Attempt**
   - Your Domain: `target.com`
   - Competitor Domain: `bestbuy.com`
   - Click "Compare"

3. ✅ **Expected Results:**
   - ✅ Modal appears with title: "Upgrade Required"
   - ✅ Modal message mentions "free limit reached"
   - ✅ "View Pricing" button appears
   - ✅ "Cancel" button appears
   - ✅ **NO red error toast** (critical!)
   - ✅ Badge still shows "Free reports left: 0"

4. ✅ Click "Cancel" in modal
   - Modal closes
   - No analysis results appear
   - Badge unchanged

5. ✅ Try analysis again
   - Same modal should appear (limit still enforced)

### Console Checks:
- ✅ No errors in console
- ✅ Check Network tab: 
  - Edge function returns 200 status
  - Response body contains: `{ ok: false, code: 'LIMIT_EXCEEDED', message: '...' }`

### Edge Function Logs:
Check Supabase Dashboard → Functions → competitor-analyze → Logs:
```
✅ Expected log entries:
- "User authenticated: <user-id>"
- "Profile loaded: { user_id: ..., free_reports_used: 3 }"
- "Quota check: { effectiveUsed: 3, limit: 3, needsRenewal: false }"
- "Limit exceeded for user: <user-id>"
```

---

## Test Case 3: Unauthorized Access (Sign Out Flow)

**Objective:** Verify proper handling when user is not authenticated

### Steps:
1. ✅ While on `/competitor-analyzer`, click user menu
2. ✅ Click "Sign Out"
3. ✅ Verify redirect to home page or sign-in page

4. ✅ Navigate back to `/competitor-analyzer`
   - Check: Can still see the form (page is accessible)

5. ✅ **Attempt Analysis While Signed Out**
   - Your Domain: `example.com`
   - Competitor Domain: `test.com`
   - Click "Compare"

6. ✅ **Expected Results:**
   - ✅ Red error toast appears
   - ✅ Toast title: "Please sign in"
   - ✅ Toast message: "Sign in to run competitor analysis."
   - ✅ No results appear
   - ✅ No modal appears

### Console Checks:
- ✅ Check Network tab:
  - Edge function returns 401 status
  - Response body: `{ error: 'Unauthorized' }`

---

## Test Case 4: Profile Missing (Database Edge Case)

**Objective:** Verify graceful handling when profile row doesn't exist

### Setup:
1. ✅ Sign in as a **fresh user** (or temporarily delete profile)
   
   **Option A - Use Fresh User:**
   - Create new account via sign-up
   - Manually delete the profile row:
     ```sql
     DELETE FROM profiles WHERE user_id = '<new-user-id>';
     ```

   **Option B - Temporarily Delete Existing:**
   - Note your current user_id
   - Delete profile:
     ```sql
     DELETE FROM profiles WHERE user_id = '<your-user-id>';
     ```

### Steps:
1. ✅ Navigate to `/competitor-analyzer`
   - Check: Badge might not show (no profile data)

2. ✅ **Attempt Analysis**
   - Your Domain: `example.com`
   - Competitor Domain: `test.com`
   - Click "Compare"

3. ✅ **Expected Results:**
   - ✅ Red error toast appears
   - ✅ Toast title: "Profile issue"
   - ✅ Toast message: "Please sign out and back in, then retry."
   - ✅ No results appear
   - ✅ No modal appears

### Console Checks:
- ✅ Check Network tab:
  - Edge function returns 200 status (not 404!)
  - Response body: `{ ok: false, code: 'PROFILE_MISSING', message: '...' }`

### Edge Function Logs:
```
✅ Expected log entries:
- "User authenticated: <user-id>"
- "Profile not found for user: <user-id>"
```

### Cleanup:
```sql
-- Restore profile if you deleted it
INSERT INTO profiles (user_id, email, display_name, free_reports_used, free_reports_renewal_at)
VALUES ('<your-user-id>', '<your-email>', '<your-name>', 0, NULL);
```

---

## Test Case 5: AI Insights Generation

**Objective:** Verify AI insights complete after successful analysis

### Pre-requisite:
- Complete Test Case 1 OR reset your usage counter:
  ```sql
  UPDATE profiles 
  SET free_reports_used = 0, free_reports_renewal_at = NULL 
  WHERE user_id = '<your-user-id>';
  ```

### Steps:
1. ✅ Sign in and navigate to `/competitor-analyzer`

2. ✅ Run a fresh analysis
   - Your Domain: `mountainwarehouse.com`
   - Competitor Domain: `cotswoldoutdoor.com`
   - Click "Compare"

3. ✅ **Watch AI Insights Section:**
   - After main analysis completes, AI insights section should appear
   - Loading spinner shows in AI insights card
   - Message: "Generating AI insights..."

4. ✅ **Expected Results:**
   - ✅ AI insights complete within 10-20 seconds
   - ✅ Success toast: "AI Insights Generated"
   - ✅ Report text appears with:
     - Executive Summary
     - Key Findings
     - Strategic Recommendations
     - Quick Wins
   - ✅ "Refresh Insights" button appears

5. ✅ **Test Refresh Button:**
   - Click "Refresh Insights"
   - New insights generate
   - Success toast appears again

### Console Checks:
- ✅ No errors during AI generation
- ✅ Check Network tab for `generate-ai-insights` call:
  - Returns 200 status
  - Response contains `{ report: "..." }`

### Edge Function Logs:
Check Supabase Dashboard → Functions → generate-ai-insights → Logs:
```
✅ Expected: No errors, successful completion
```

---

## Test Case 6: Regression - Other Pages Still Work

**Objective:** Ensure other features weren't broken by changes

### Keyword Research (`/research`)
1. ✅ Navigate to `/research`
2. ✅ Enter seed keyword: `hiking boots`
3. ✅ Click "Research"
4. ✅ Expected: Results table appears with keywords
5. ✅ Check: Export CSV/JSON buttons work

### SERP Analysis (`/serp-analysis`)
1. ✅ Navigate to `/serp-analysis`
2. ✅ Enter keyword: `best hiking boots`
3. ✅ Select country: United States
4. ✅ Click "Analyze"
5. ✅ Expected: SERP results appear with rankings

### Related Keywords (`/related-keywords`)
1. ✅ Navigate to `/related-keywords`
2. ✅ Enter keyword: `hiking`
3. ✅ Click "Get Related Keywords"
4. ✅ Expected: Related keywords list appears

### Demo Competitor Analyzer (`/demo-competitor-analyzer`)
1. ✅ **Sign out first** (demo should work without auth)
2. ✅ Navigate to `/demo-competitor-analyzer`
3. ✅ Enter domains:
   - Your Domain: `example.com`
   - Competitor Domain: `test.com`
4. ✅ Click "Analyze"
5. ✅ Expected:
   - Results appear with limited data (top 5 keywords)
   - No quota checking
   - Works without authentication
   - Banner indicates it's a demo

---

## Test Case 7: Domain Normalization

**Objective:** Verify domains are normalized correctly

### Test Various Domain Formats:
1. ✅ Test with protocol:
   - Input: `https://mountainwarehouse.com`
   - Expected normalized: `mountainwarehouse.com`

2. ✅ Test with www:
   - Input: `www.mountainwarehouse.com`
   - Expected normalized: `mountainwarehouse.com`

3. ✅ Test with path:
   - Input: `mountainwarehouse.com/products`
   - Expected normalized: `mountainwarehouse.com`

4. ✅ Test with protocol + www + path:
   - Input: `https://www.mountainwarehouse.com/products/boots`
   - Expected normalized: `mountainwarehouse.com`

### Verification:
- Check browser DevTools → Network → competitor-analyze payload
- Verify `yourDomain` and `competitorDomain` are bare hosts

---

## Test Case 8: Cache Behavior (24-Hour Window)

**Objective:** Verify caching works and respects 24-hour window

### Steps:
1. ✅ Reset usage: `UPDATE profiles SET free_reports_used = 0 WHERE user_id = '<your-user-id>';`

2. ✅ Run first analysis:
   - Domains: `mountainwarehouse.com` vs `cotswoldoutdoor.com`
   - Note the results

3. ✅ **Immediately run same analysis again:**
   - Same domains
   - Click "Compare"
   - **Expected:**
     - ✅ Results appear quickly (from cache)
     - ✅ Toast: "Loaded from cache"
     - ✅ Badge DOES NOT decrement (no new usage)

4. ✅ Check database:
   ```sql
   SELECT created_at, expires_at, your_domain, competitor_domain 
   FROM competitor_analysis 
   WHERE user_id = '<your-user-id>' 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```
   - Verify only 1 row exists for these domains
   - Check `expires_at` is 24 hours after `created_at`

5. ✅ **Test cache with different domains:**
   - Change to `nike.com` vs `adidas.com`
   - Click "Compare"
   - **Expected:**
     - ✅ New analysis runs (not from cache)
     - ✅ Toast: "Analysis complete" (not "Loaded from cache")
     - ✅ Badge decrements

---

## Post-Test Cleanup

### Reset Test User:
```sql
-- Reset usage counter
UPDATE profiles 
SET free_reports_used = 0, 
    free_reports_renewal_at = NULL 
WHERE user_id = '<your-user-id>';

-- Clear cache (optional)
DELETE FROM competitor_analysis 
WHERE user_id = '<your-user-id>';
```

### Sign Out:
- Click user menu → Sign Out

---

## Success Criteria Summary

### ✅ Must Pass All:
- [ ] 3 successful analyses complete without errors
- [ ] 4th analysis shows limit modal (no error toast)
- [ ] Signed-out user sees auth error
- [ ] Missing profile shows helpful error
- [ ] AI insights generate successfully
- [ ] Other pages (research, SERP, related) still work
- [ ] Demo page works without auth
- [ ] Domains normalize correctly
- [ ] Cache prevents duplicate analyses
- [ ] No console errors during any flow
- [ ] Badge updates correctly throughout
- [ ] All edge function logs show expected messages

### ❌ Failure Indicators:
- Red error toast on successful analysis
- "Edge Function returned a non-2xx status code" message
- Console errors during normal operations
- Badge doesn't update after analysis
- Modal doesn't appear at limit
- Cache doesn't work (usage increments on repeat)
- Demo page requires authentication
- Other pages break after changes

---

## Troubleshooting Common Issues

### Issue: "Profile not found" on existing user
**Solution:** Trigger profile creation:
```sql
-- Check if profile exists
SELECT * FROM profiles WHERE user_id = '<user-id>';

-- If missing, sign out and back in to trigger create_trial_subscription()
-- OR manually insert:
INSERT INTO profiles (user_id, email, display_name)
VALUES ('<user-id>', '<email>', '<name>');
```

### Issue: Usage counter doesn't reset after 30 days
**Solution:** Manually trigger renewal:
```sql
UPDATE profiles 
SET free_reports_used = 0, 
    free_reports_renewal_at = NOW() + INTERVAL '30 days' 
WHERE user_id = '<user-id>';
```

### Issue: AI insights fail with API error
**Solution:** Check OpenAI API key:
- Verify OPENAI_API_KEY is set in Supabase secrets
- Check OpenAI account has credits
- Review edge function logs for specific error

### Issue: DataForSEO returns no data
**Solution:** 
- Check DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD
- Verify DataForSEO account has credits
- Try different domain pairs

---

## Edge Function Log Reference

**What to Look For:**

✅ **Good Logs (competitor-analyze):**
```
User authenticated: abc123
Profile loaded: { user_id: abc123, free_reports_used: 2, free_reports_renewal_at: null }
Quota check: { effectiveUsed: 2, limit: 3, needsRenewal: false }
Usage updated successfully: { free_reports_used: 3 }
```

❌ **Problem Logs:**
```
No user found in auth header
Profile query error: { code: '...' }
Failed to update usage: { message: '...' }
Error in competitor-analyze: { message: '...' }
```

---

## Final Notes

- Run this test suite before any production deployment
- Re-run after any changes to competitor-analyze edge function
- Keep test domains consistent for reproducible results
- Document any failures with screenshots and edge function logs
- Reset test data between test runs for clean results
