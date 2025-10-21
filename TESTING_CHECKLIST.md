# ✅ POST-IMPLEMENTATION TESTING CHECKLIST

**Purpose:** Use this checklist after implementing each Loveable.dev prompt to verify everything works correctly.

---

## 🔴 PROMPT 1: ESLint & Console Logs - Testing Checklist

### ✅ Immediate Verification (5 minutes)

- [ ] **Run linter:** `npm run lint`
  - ✅ Should complete with NO errors
  - ✅ Should show 0 console-related warnings

- [ ] **Check logger utility created:**
  ```bash
  ls -la src/lib/logger.ts
  ```
  - ✅ File exists and exports logger object

- [ ] **Verify imports in key files:**
  ```bash
  grep -r "import.*logger" src/ | head -10
  ```
  - ✅ At least 10+ files importing logger

- [ ] **Check Edge Functions untouched:**
  ```bash
  grep "console.log" supabase/functions/**/*.ts | head -5
  ```
  - ✅ Console statements still exist (needed for Deno)
  - ✅ Should have "// Deno logging" comments

### ✅ Dev Testing (2 minutes)

- [ ] **Start dev server:** `npm run dev`
  - ✅ No console errors on startup

- [ ] **Open browser console**
  - ✅ In DEV mode: Should see logger outputs in console

- [ ] **Build for production:** `npm run build`
  - ✅ Build completes successfully
  - ✅ No console-related warnings

### ✅ Production Verification (3 minutes)

- [ ] **Preview production build:** `npm run preview`
  - ✅ Navigate to a few pages
  - ✅ Open browser console
  - ✅ Should see ZERO console.log statements from app code
  - ✅ Only browser/system messages visible

### 🐛 Troubleshooting

**If linting still fails:**
```bash
rm -rf node_modules package-lock.json
npm install
npm run lint
```

**If console logs still appear in prod:**
- Check `.env` has `NODE_ENV=production`
- Verify logger.ts uses `import.meta.env.DEV` correctly

---

## 🔴 PROMPT 2: Error Boundaries - Testing Checklist

### ✅ Immediate Verification (3 minutes)

- [ ] **Check package installed:**
  ```bash
  npm list react-error-boundary
  ```
  - ✅ Shows version (e.g., react-error-boundary@4.x.x)

- [ ] **Verify component exists:**
  ```bash
  ls -la src/components/ErrorBoundary.tsx
  ```
  - ✅ File created with ErrorFallback and ErrorBoundary components

- [ ] **Check App.tsx wrapped:**
  ```bash
  grep -A 3 "ErrorBoundary" src/App.tsx
  ```
  - ✅ Shows <ErrorBoundary> wrapping QueryClientProvider

### ✅ Dev Testing - Trigger Test Error (5 minutes)

- [ ] **Create temporary test error:**
  - Open `src/pages/Index.tsx`
  - Add this line inside the component: `throw new Error('Test error boundary');`

- [ ] **Start dev server:** `npm run dev`

- [ ] **Navigate to homepage:**
  - ✅ Should see friendly error boundary UI
  - ✅ Should show AlertTriangle icon
  - ✅ Should have "Try again" button
  - ✅ Should have "Go to homepage" button

- [ ] **In DEV mode only:**
  - ✅ Should see "Error details" dropdown
  - ✅ Expanding shows "Test error boundary" message

- [ ] **Click "Try again" button:**
  - ✅ Page reloads and error reappears (expected)

- [ ] **Remove test error from Index.tsx**

### ✅ Route-Level Boundaries (3 minutes)

- [ ] **Check critical pages wrapped:**
  ```bash
  grep -l "ErrorBoundary" src/pages/KeywordResults.tsx src/pages/CompetitorAnalyzer.tsx src/pages/SerpAnalysis.tsx
  ```
  - ✅ All 3 files contain ErrorBoundary imports

- [ ] **Navigate to each page:**
  - Visit `/keyword-results` (may need auth)
  - Visit `/competitor-analyzer`
  - Visit `/serp-analysis`
  - ✅ All load without errors

### ✅ Production Testing (2 minutes)

- [ ] **Build:** `npm run build`
  - ✅ No build errors

- [ ] **In production mode:**
  - ✅ Error boundary should NOT show error details dropdown
  - ✅ Only shows user-friendly message

### 🐛 Troubleshooting

**If error boundary doesn't catch errors:**
- Errors in event handlers won't be caught (expected behavior)
- Only rendering errors are caught
- Check console for "ErrorBoundary caught:" logs

**If you see white screen instead of error UI:**
- Error is happening outside ErrorBoundary wrapper
- Check browser console for uncaught errors

---

## 🔴 PROMPT 3: Plausible Analytics - Testing Checklist

### ✅ Immediate Verification (3 minutes)

- [ ] **Check package installed:**
  ```bash
  npm list plausible-tracker
  ```
  - ✅ Shows version

- [ ] **Verify analytics.ts created:**
  ```bash
  ls -la src/lib/analytics.ts
  ```
  - ✅ File exists with analytics object and tracking functions

- [ ] **Check .env updated:**
  ```bash
  grep PLAUSIBLE .env
  ```
  - ✅ Shows `VITE_PLAUSIBLE_DOMAIN`
  - ✅ Shows `VITE_PLAUSIBLE_ENABLED=true`

- [ ] **Check index.html script tag:**
  ```bash
  grep "plausible.io" index.html
  ```
  - ✅ Shows Plausible script tag with data-domain attribute

### ✅ Dev Testing - Pageview Tracking (5 minutes)

- [ ] **Open browser DevTools → Network tab**
  - Filter for "plausible" or "api/event"

- [ ] **Start dev:** `npm run dev`

- [ ] **Navigate to homepage:**
  - ✅ Should see POST request to plausible.io/api/event
  - ✅ Request payload includes: `{"n":"pageview","u":"http://localhost:5173/"}`

- [ ] **Navigate to different pages:**
  - Click /pricing
  - Click /about
  - ✅ Each navigation triggers new pageview event

### ✅ Dev Testing - Event Tracking (10 minutes)

- [ ] **Test Keyword Research tracking:**
  - Sign in to your app
  - Go to /app/keyword-research
  - Submit a keyword search
  - ✅ After results load, check Network tab
  - ✅ Should see event with name "Keyword Research"

- [ ] **Test Competitor Analysis tracking:**
  - Go to /competitor-analyzer
  - Submit competitor analysis form
  - ✅ Should see event "Competitor Analysis"

- [ ] **Test SERP Analysis tracking:**
  - Go to /serp-analysis
  - Submit SERP form
  - ✅ Should see event "SERP Analysis"

- [ ] **Test Export tracking (if implemented):**
  - Go to keyword results
  - Click export button (CSV or JSON)
  - ✅ Should see event "Export Data" with format property

- [ ] **Test Upgrade tracking:**
  - Go to /pricing
  - Click any "Get Started" or "Upgrade" button
  - ✅ Should see event "Subscription Upgrade" with tier property

### ✅ Production Setup (5 minutes)

- [ ] **Sign up for Plausible:**
  - Go to https://plausible.io/register
  - Choose plan (free trial: 10k pageviews/month)

- [ ] **Add your site:**
  - Click "Add website"
  - Enter your domain (e.g., keywordfoundrypro.lovable.app)
  - ✅ Copy the integration snippet (already done if script tag added)

- [ ] **Update .env with real domain:**
  ```
  VITE_PLAUSIBLE_DOMAIN=keywordfoundrypro.lovable.app
  ```

- [ ] **Deploy to production**

- [ ] **Verify in Plausible dashboard:**
  - Visit your deployed site
  - Wait 1-2 minutes
  - ✅ Check Plausible dashboard shows real-time visitor

### ✅ Privacy Compliance (2 minutes)

- [ ] **Verify no cookies set:**
  - Open DevTools → Application → Cookies
  - ✅ Plausible should NOT set any cookies

- [ ] **Verify GDPR compliance:**
  - ✅ No personal data collected
  - ✅ No cookie consent banner needed
  - ✅ All tracking anonymous

### 🐛 Troubleshooting

**If events not showing in Network tab:**
- Check `VITE_PLAUSIBLE_ENABLED=true` in .env
- Restart dev server after .env changes
- Check browser console for errors

**If Plausible dashboard shows 0 visitors:**
- Wait 2-3 minutes (slight delay)
- Verify domain matches exactly in .env and Plausible dashboard
- Check script tag domain matches your Plausible account domain
- Disable ad blockers (they block Plausible script)

---

## 🔴 PROMPT 4: Email Reminders - Testing Checklist

### ✅ Immediate Verification (3 minutes)

- [ ] **Check Edge Function created:**
  ```bash
  ls -la supabase/functions/send-trial-reminder/
  ```
  - ✅ index.ts exists

- [ ] **Check migration created:**
  ```bash
  ls -la supabase/migrations/*trial_reminder*.sql
  ```
  - ✅ Migration file exists with cron job

### ✅ Resend Account Setup (5 minutes)

- [ ] **Sign up for Resend:**
  - Go to https://resend.com/signup
  - Verify email
  - ✅ Account created

- [ ] **Get API key:**
  - Go to Resend dashboard → API Keys
  - Click "Create API Key"
  - Give it a name: "Keyword Foundry Pro - Trial Reminders"
  - ✅ Copy key (starts with `re_...`)

- [ ] **Add to Supabase secrets:**
  - Go to Supabase dashboard
  - Project Settings → Edge Functions → Secrets
  - Click "Add secret"
  - Name: `RESEND_API_KEY`
  - Value: Your Resend API key
  - ✅ Secret saved

- [ ] **Verify domain (optional for production):**
  - In Resend dashboard → Domains
  - Add your domain
  - Follow DNS verification steps
  - ✅ For testing: Use `onboarding@resend.dev` (no verification needed)

### ✅ Deploy Edge Function (5 minutes)

- [ ] **Install Supabase CLI (if not installed):**
  ```bash
  npm install -g supabase
  ```

- [ ] **Login to Supabase:**
  ```bash
  supabase login
  ```

- [ ] **Link to your project:**
  ```bash
  supabase link --project-ref vhjffdzroebdkbmvcpgv
  ```

- [ ] **Deploy function:**
  ```bash
  supabase functions deploy send-trial-reminder --no-verify-jwt
  ```
  - ✅ Should show "Deployed successfully"

### ✅ Manual Testing - Send Test Email (10 minutes)

**Option 1: Using curl**

```bash
curl -X POST https://vhjffdzroebdkbmvcpgv.supabase.co/functions/v1/send-trial-reminder \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

- ✅ Should return: `{"success":true,"emailsSent":0}` (if no trials expiring today)

**Option 2: Create test user with expiring trial**

- [ ] **Create test trial in Supabase:**
  - Go to Supabase dashboard → Table Editor
  - Open `user_subscriptions` table
  - Find a test user or create one
  - Set `tier = 'free'`
  - Set `trial_ends_at` to 3 days from now:
    ```sql
    UPDATE user_subscriptions
    SET trial_ends_at = NOW() + INTERVAL '3 days'
    WHERE user_id = 'YOUR_TEST_USER_ID';
    ```

- [ ] **Run function again:**
  ```bash
  curl -X POST https://vhjffdzroebdkbmvcpgv.supabase.co/functions/v1/send-trial-reminder \
    -H "Authorization: Bearer YOUR_ANON_KEY"
  ```
  - ✅ Should return: `{"success":true,"emailsSent":1}`

- [ ] **Check email received:**
  - Check inbox for test user's email
  - ✅ Should receive "3 days left in your Keyword Foundry Pro trial"
  - ✅ Email has proper formatting (H2, bullet points, CTA button)
  - ✅ CTA button links to /pricing page

### ✅ Test All Email Variations (5 minutes)

- [ ] **Test 1-day reminder:**
  - Update trial_ends_at to tomorrow:
    ```sql
    UPDATE user_subscriptions
    SET trial_ends_at = NOW() + INTERVAL '1 day'
    WHERE user_id = 'YOUR_TEST_USER_ID';
    ```
  - Run function
  - ✅ Receive "Last day of your trial" email

- [ ] **Test expiration email:**
  - Update trial_ends_at to today:
    ```sql
    UPDATE user_subscriptions
    SET trial_ends_at = NOW()
    WHERE user_id = 'YOUR_TEST_USER_ID';
    ```
  - Run function
  - ✅ Receive "Your trial has expired" email

### ✅ Verify Cron Job Setup (3 minutes)

- [ ] **Run migration:**
  ```bash
  supabase db push
  ```
  - ✅ Migration applies successfully

- [ ] **Verify cron job created:**
  - Go to Supabase dashboard → Database → Extensions
  - ✅ pg_cron extension enabled

- [ ] **Check cron schedule:**
  ```sql
  SELECT * FROM cron.job WHERE jobname = 'send-trial-reminders';
  ```
  - ✅ Should show 1 row with schedule '0 9 * * *'

### ✅ Production Monitoring (ongoing)

- [ ] **Monitor Edge Function logs:**
  - Supabase dashboard → Edge Functions → send-trial-reminder → Logs
  - ✅ Check daily for errors

- [ ] **Check email delivery rate:**
  - Resend dashboard → Emails
  - ✅ Monitor delivery success rate (should be >95%)

- [ ] **Monitor Resend quota:**
  - Resend dashboard → Usage
  - ✅ Free tier: 3,000 emails/month
  - ✅ Set up alert when approaching limit

### 🐛 Troubleshooting

**If function returns 500 error:**
- Check Edge Function logs in Supabase dashboard
- Verify RESEND_API_KEY is set correctly
- Check Resend API key is active

**If emails not sending:**
- Verify Resend account is verified
- Check Resend dashboard for bounces/complaints
- Verify user email addresses are valid
- Check spam folder

**If cron job not running:**
- Verify pg_cron extension is enabled
- Check cron job exists: `SELECT * FROM cron.job;`
- Check Supabase project is on paid plan (free tier may limit cron)

**If wrong users receiving emails:**
- Check query logic in Edge Function
- Verify trial_ends_at dates are correct
- Check user_subscriptions.tier = 'free'

---

## 🔴 PROMPT 5: Onboarding Tour - Testing Checklist

### ✅ Immediate Verification (3 minutes)

- [ ] **Check package installed:**
  ```bash
  npm list react-joyride
  ```
  - ✅ Shows version (e.g., react-joyride@2.x.x)

- [ ] **Verify files created:**
  ```bash
  ls -la src/lib/onboardingStorage.ts
  ls -la src/components/OnboardingTour.tsx
  ```
  - ✅ Both files exist

- [ ] **Check tour added to page:**
  ```bash
  grep -l "OnboardingTour" src/pages/*.tsx
  ```
  - ✅ Shows Research.tsx or AppKeywordResearch.tsx

### ✅ Dev Testing - First-Time User Experience (10 minutes)

- [ ] **Clear localStorage:**
  - Open DevTools → Application → Local Storage
  - Delete `kfp_onboarding_completed` key
  - Or run in console: `localStorage.removeItem('kfp_onboarding_completed')`

- [ ] **Sign in to app**

- [ ] **Navigate to /app/keyword-research:**
  - ✅ After 500ms delay, tour should auto-start
  - ✅ Shows welcome modal centered on screen
  - ✅ Title: "Welcome to Keyword Foundry Pro!"
  - ✅ Shows progress indicators (e.g., "1/6")

- [ ] **Test tour navigation:**
  - Click "Next" button
  - ✅ Highlights `[data-tour="research-tab"]` element
  - ✅ Shows tooltip with explanation
  - Continue clicking "Next"
  - ✅ All 6 steps show in sequence:
    1. Welcome (center)
    2. Research tab
    3. Keyword input
    4. Language select
    5. Submit button
    6. Competitor tab

- [ ] **Test "Skip" button:**
  - Clear localStorage again
  - Reload page
  - Wait for tour to start
  - Click "Skip" button
  - ✅ Tour closes immediately
  - ✅ localStorage shows `kfp_onboarding_completed: true`

- [ ] **Test tour completion:**
  - Clear localStorage
  - Reload page
  - Click "Next" through all steps
  - ✅ Tour closes after final step
  - ✅ localStorage shows `kfp_onboarding_completed: true`

### ✅ Verify Data Attributes Added (5 minutes)

- [ ] **Check keyword input:**
  ```bash
  grep 'data-tour="keyword-input"' src/pages/Research.tsx
  ```
  - ✅ Attribute exists on input field

- [ ] **Check language select:**
  ```bash
  grep 'data-tour="language-select"' src/pages/Research.tsx
  ```
  - ✅ Attribute exists on dropdown

- [ ] **Check submit button:**
  ```bash
  grep 'data-tour="submit-button"' src/pages/Research.tsx
  ```
  - ✅ Attribute exists on button

- [ ] **Check navigation links:**
  ```bash
  grep 'data-tour="research-tab"' src/components/*.tsx
  grep 'data-tour="competitor-tab"' src/components/*.tsx
  ```
  - ✅ Both attributes exist in Header or MainLayout

### ✅ Test Reset Functionality (3 minutes)

- [ ] **Navigate to /profile**

- [ ] **Look for "Reset Product Tour" button:**
  - ✅ Button exists in profile settings

- [ ] **Click reset button:**
  - ✅ Shows toast: "Onboarding reset"
  - ✅ localStorage `kfp_onboarding_completed` deleted

- [ ] **Navigate back to /app/keyword-research:**
  - ✅ Tour auto-starts again

### ✅ Test Tour Only Shows Once (2 minutes)

- [ ] **Complete tour fully**

- [ ] **Navigate away and back:**
  - Go to /pricing
  - Return to /app/keyword-research
  - ✅ Tour does NOT auto-start
  - ✅ localStorage still has `kfp_onboarding_completed: true`

- [ ] **Refresh page:**
  - ✅ Tour does NOT auto-start

### ✅ Analytics Integration (if Prompt 3 completed) (2 minutes)

- [ ] **Check analytics tracking:**
  ```bash
  grep "analytics.event.*Onboarding Completed" src/components/OnboardingTour.tsx
  ```
  - ✅ Event tracked when tour finishes

- [ ] **Test in browser:**
  - Open DevTools → Network
  - Clear localStorage
  - Complete tour
  - ✅ See Plausible event: "Onboarding Completed"

### ✅ Styling & UX Polish (5 minutes)

- [ ] **Check primary color:**
  - ✅ Tour highlights use your theme's primary color
  - ✅ Matches brand (check `hsl(var(--primary))`)

- [ ] **Check z-index:**
  - ✅ Tour overlay appears above all other elements
  - ✅ zIndex: 10000 in Joyride config

- [ ] **Test on mobile:**
  - Open DevTools → Toggle device toolbar
  - Set to iPhone/Android view
  - ✅ Tour tooltips adjust to screen size
  - ✅ All buttons visible and clickable

- [ ] **Check tooltip positioning:**
  - ✅ Tooltips appear next to highlighted elements
  - ✅ Don't overlap with target elements
  - ✅ Arrows point to correct elements

### ✅ Edge Cases (5 minutes)

- [ ] **Test if element doesn't exist:**
  - Temporarily remove one data-tour attribute
  - Start tour
  - ✅ Tour should skip missing step or show warning

- [ ] **Test rapid navigation:**
  - Start tour
  - Click browser back button
  - ✅ Tour closes gracefully
  - ✅ No console errors

- [ ] **Test with route change mid-tour:**
  - Start tour
  - Manually navigate to different page
  - ✅ Tour closes
  - Navigate back to /app/keyword-research
  - ✅ Tour does not auto-restart (still completed)

### ✅ Production Verification (3 minutes)

- [ ] **Build for production:** `npm run build`
  - ✅ No build errors

- [ ] **Test in production mode:**
  - `npm run preview`
  - Clear localStorage
  - Sign in and navigate to research page
  - ✅ Tour works identically to dev mode

### 🐛 Troubleshooting

**If tour doesn't start:**
- Check localStorage is actually cleared
- Verify route pathname matches condition in useEffect
- Check 500ms timeout (may need to increase)
- Inspect console for Joyride errors

**If elements not highlighting:**
- Verify data-tour attributes actually exist in DOM (inspect element)
- Check for typos in attribute names
- Ensure elements are visible (not display:none)
- Try increasing delay to 1000ms

**If tour styling looks wrong:**
- Check primary color is set in theme
- Verify Joyride styles aren't being overridden by global CSS
- Inspect Joyride elements in DevTools

**If tour keeps restarting:**
- Check localStorage is actually being set
- Verify onboardingStorage.markCompleted() is called
- Check STATUS.FINISHED is triggered in callback

---

## 📊 OVERALL TESTING SUMMARY

After completing all 5 prompts, do a full integration test:

### ✅ Complete User Journey Test (15 minutes)

1. **Fresh user signup:**
   - [ ] Clear all localStorage/cookies
   - [ ] Sign up for new account
   - [ ] ✅ Redirected to research page
   - [ ] ✅ Onboarding tour auto-starts (Prompt 5)
   - [ ] ✅ No console errors (Prompt 1)
   - [ ] ✅ Analytics pageview tracked (Prompt 3)

2. **Complete first research:**
   - [ ] Follow tour guidance
   - [ ] Submit keyword research
   - [ ] ✅ Results load without errors
   - [ ] ✅ If error occurs, error boundary catches it (Prompt 2)
   - [ ] ✅ Analytics tracks "Keyword Research" event (Prompt 3)

3. **Test trial countdown:**
   - [ ] Check subscription status component
   - [ ] ✅ Shows days remaining
   - [ ] ✅ (In 3 days) Should receive email reminder (Prompt 4)

4. **Test error handling:**
   - [ ] Disconnect internet
   - [ ] Try to submit research
   - [ ] ✅ Error boundary catches network failures
   - [ ] ✅ User sees friendly error message

5. **Monitor production:**
   - [ ] ✅ Plausible shows real-time visitors
   - [ ] ✅ ESLint runs clean
   - [ ] ✅ No console logs in production
   - [ ] ✅ Email cron job running daily

---

## 🎯 SUCCESS CRITERIA

All 5 prompts successfully implemented when:

✅ **Prompt 1:** `npm run lint` returns 0 errors, production has 0 console logs
✅ **Prompt 2:** Throwing test errors shows error boundary UI
✅ **Prompt 3:** Plausible dashboard shows pageviews and events
✅ **Prompt 4:** Test users receive trial reminder emails
✅ **Prompt 5:** New users see onboarding tour, completes and doesn't restart

---

**Last Updated:** 2025-10-21
**Project:** Keyword Foundry Pro
