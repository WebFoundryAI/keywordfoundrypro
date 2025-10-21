# 🚀 LOVEABLE.DEV PROMPTS - Keyword Foundry Pro Critical Fixes

**Instructions:** Copy ONE prompt at a time and paste into Loveable.dev. Wait for completion before moving to the next.

**Recommended Order:** 1 → 2 → 3 → 4 → 5

---

## 🔴 PROMPT 1: Fix ESLint Error & Remove Console Statements

```
Fix the ESLint configuration error and remove all console statements from production code.

CONTEXT:
- ESLint is failing with "Cannot find package '@eslint/js'" error
- There are 227 console.log/error/warn statements across 37 files in production code
- Current config is in eslint.config.js using typescript-eslint

TASKS:
1. Run `npm install` to ensure all ESLint dependencies are properly installed
2. If that doesn't work, verify package.json has these exact versions:
   - "@eslint/js": "^9.32.0"
   - "eslint": "^9.32.0"
   - "typescript-eslint": "^8.38.0"

3. Create a new utility file at src/lib/logger.ts with this code:
   ```typescript
   const isDev = import.meta.env.DEV;

   export const logger = {
     log: (...args: any[]) => isDev && console.log(...args),
     error: (...args: any[]) => isDev && console.error(...args),
     warn: (...args: any[]) => isDev && console.warn(...args),
   };
   ```

4. Find and replace ALL instances of console.log, console.error, console.warn in these directories:
   - src/**/*.{ts,tsx}
   - Replace with logger.log, logger.error, logger.warn
   - Import the logger utility: import { logger } from '@/lib/logger'

5. For Supabase Edge Functions (supabase/functions/**/*.ts), keep console statements as they're needed for Deno logging, but add a comment: // Deno logging - keep for production debugging

6. Update eslint.config.js to add this rule:
   ```javascript
   rules: {
     ...reactHooks.configs.recommended.rules,
     "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
     "@typescript-eslint/no-unused-vars": "off",
     "no-console": ["error", { allow: ["warn", "error"] }], // Add this line
   }
   ```

7. Run `npm run lint` to verify no errors remain

FILES TO MODIFY:
- src/lib/logger.ts (create new)
- All 37 files containing console statements (found via grep)
- eslint.config.js (update rules)

PRIORITY: Critical - affects code quality and production performance
```

---

## 🔴 PROMPT 2: Add React Error Boundaries

```
Implement React Error Boundaries throughout the application to prevent white screen crashes.

CONTEXT:
- Currently no ErrorBoundary components exist in the codebase
- Using React 18.3.1, TypeScript 5.8.3, Vite 5.4.19
- Need to catch rendering errors and show user-friendly fallback UI
- Official React docs: https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary

TASKS:
1. Install the react-error-boundary package:
   ```bash
   npm install react-error-boundary
   ```

2. Create a new component at src/components/ErrorBoundary.tsx:
   ```typescript
   import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
   import { AlertTriangle } from 'lucide-react';
   import { Button } from '@/components/ui/button';

   function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
     return (
       <div className="min-h-screen flex items-center justify-center p-6 bg-background">
         <div className="max-w-md w-full text-center space-y-4">
           <AlertTriangle className="w-16 h-16 text-destructive mx-auto" />
           <h1 className="text-2xl font-bold">Something went wrong</h1>
           <p className="text-muted-foreground">
             We encountered an unexpected error. Our team has been notified.
           </p>
           <div className="space-y-2">
             <Button onClick={resetErrorBoundary} size="lg">
               Try again
             </Button>
             <Button variant="outline" onClick={() => window.location.href = '/'}>
               Go to homepage
             </Button>
           </div>
           {import.meta.env.DEV && (
             <details className="mt-4 text-left">
               <summary className="cursor-pointer text-sm text-muted-foreground">Error details</summary>
               <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                 {error.message}
               </pre>
             </details>
           )}
         </div>
       </div>
     );
   }

   export function ErrorBoundary({ children }: { children: React.ReactNode }) {
     return (
       <ReactErrorBoundary
         FallbackComponent={ErrorFallback}
         onError={(error, errorInfo) => {
           // Log to error tracking service (add Sentry later)
           console.error('ErrorBoundary caught:', error, errorInfo);
         }}
       >
         {children}
       </ReactErrorBoundary>
     );
   }
   ```

3. Wrap the entire App in src/App.tsx:
   - Add import: import { ErrorBoundary } from '@/components/ErrorBoundary';
   - Wrap the return statement on line 48:
   ```typescript
   const App = () => (
     <ErrorBoundary>
       <QueryClientProvider client={queryClient}>
         {/* rest of the app */}
       </QueryClientProvider>
     </ErrorBoundary>
   );
   ```

4. Add route-level error boundaries to critical pages:
   - src/pages/KeywordResults.tsx
   - src/pages/CompetitorAnalyzer.tsx
   - src/pages/SerpAnalysis.tsx
   Wrap the main return JSX in each with <ErrorBoundary>{/* content */}</ErrorBoundary>

FILES TO MODIFY:
- src/components/ErrorBoundary.tsx (create new)
- src/App.tsx (wrap app)
- src/pages/KeywordResults.tsx (add route-level boundary)
- src/pages/CompetitorAnalyzer.tsx (add route-level boundary)
- src/pages/SerpAnalysis.tsx (add route-level boundary)
- package.json (add react-error-boundary dependency)

REFERENCE: https://www.npmjs.com/package/react-error-boundary
PRIORITY: Critical - prevents user-facing crashes
```

---

## 🔴 PROMPT 3: Add Privacy-First Analytics with Plausible

```
Implement Plausible Analytics for privacy-friendly, GDPR-compliant usage tracking.

CONTEXT:
- No analytics currently implemented (cannot measure conversions or user behavior)
- Using Vite + React 18 + React Router 6.30.1
- Need privacy-first solution (no cookies, GDPR compliant)
- Plausible is 75x lighter than Google Analytics and doesn't require cookie consent
- Official docs: https://plausible.io/docs/proxy/guides/vite

TASKS:
1. Install Plausible analytics package:
   ```bash
   npm install plausible-tracker
   ```

2. Add Plausible domain to .env and .env.example:
   ```
   VITE_PLAUSIBLE_DOMAIN=your-domain.com
   VITE_PLAUSIBLE_ENABLED=true
   ```

3. Create src/lib/analytics.ts:
   ```typescript
   import Plausible from 'plausible-tracker';

   const isEnabled = import.meta.env.VITE_PLAUSIBLE_ENABLED === 'true';
   const domain = import.meta.env.VITE_PLAUSIBLE_DOMAIN || '';

   const plausible = Plausible({
     domain,
     trackLocalhost: false,
     apiHost: 'https://plausible.io',
   });

   export const analytics = {
     pageview: () => {
       if (isEnabled) plausible.trackPageview();
     },

     event: (eventName: string, props?: Record<string, string | number>) => {
       if (isEnabled) plausible.trackEvent(eventName, { props });
     },
   };

   // Common events
   export const trackKeywordResearch = (keywords: number) =>
     analytics.event('Keyword Research', { keywords });

   export const trackCompetitorAnalysis = () =>
     analytics.event('Competitor Analysis');

   export const trackSerpAnalysis = () =>
     analytics.event('SERP Analysis');

   export const trackSubscriptionUpgrade = (tier: string) =>
     analytics.event('Subscription Upgrade', { tier });

   export const trackExport = (format: string) =>
     analytics.event('Export Data', { format });
   ```

4. Add analytics tracking to src/App.tsx:
   ```typescript
   import { useEffect } from 'react';
   import { useLocation } from 'react-router-dom';
   import { analytics } from '@/lib/analytics';

   const App = () => {
     const location = useLocation();

     useEffect(() => {
       analytics.pageview();
     }, [location]);

     return (/* existing JSX */);
   };
   ```

5. Add event tracking to key actions:
   - In src/pages/Research.tsx: Call trackKeywordResearch(resultsCount) after successful API response
   - In src/pages/CompetitorAnalyzer.tsx: Call trackCompetitorAnalysis() on form submit
   - In src/pages/SerpAnalysis.tsx: Call trackSerpAnalysis() after results load
   - In src/pages/Pricing.tsx: Call trackSubscriptionUpgrade(tier) when user clicks upgrade
   - In src/components/KeywordResultsTable.tsx: Call trackExport(format) on export button click

6. Add Plausible script to index.html (between lines 8-9):
   ```html
   <script defer data-domain="your-domain.com" src="https://plausible.io/js/script.js"></script>
   ```

FILES TO MODIFY:
- src/lib/analytics.ts (create new)
- src/App.tsx (add pageview tracking)
- src/pages/Research.tsx (add event tracking)
- src/pages/CompetitorAnalyzer.tsx (add event tracking)
- src/pages/SerpAnalysis.tsx (add event tracking)
- src/pages/Pricing.tsx (add event tracking)
- src/components/KeywordResultsTable.tsx (add export tracking)
- index.html (add Plausible script tag)
- .env.example (add Plausible config)
- package.json (add plausible-tracker)

REFERENCE: https://github.com/plausible/plausible-tracker
NOTE: After deployment, sign up at https://plausible.io (10k pageviews/month on free trial) and add your domain
PRIORITY: Critical - needed to measure product success and conversions
```

---

## 🔴 PROMPT 4: Add Trial Expiration Email Reminders with Supabase + Resend

```
Implement automated email reminders for trial users approaching expiration using Supabase Edge Functions and Resend.

CONTEXT:
- Trial countdown UI exists in SubscriptionStatus.tsx but no email notifications
- Need to send emails: 3 days before expiration, 1 day before, and on expiration day
- Using Supabase Edge Functions (Deno runtime) with PostgreSQL database
- Resend is officially recommended by Supabase for transactional emails
- Official docs: https://supabase.com/docs/guides/functions/examples/send-emails

TASKS:
1. Sign up for Resend (free tier: 3,000 emails/month): https://resend.com/signup
   - Verify your domain or use onboarding@resend.dev for testing
   - Get API key from Resend dashboard

2. Add Resend API key to Supabase secrets:
   - Go to your Supabase project > Settings > Edge Functions > Secrets
   - Add: RESEND_API_KEY=re_xxxxxxxxxxxxx

3. Create new Edge Function at supabase/functions/send-trial-reminder/index.ts:
   ```typescript
   import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
   import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

   const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

   interface EmailPayload {
     to: string;
     subject: string;
     html: string;
   }

   async function sendEmail(payload: EmailPayload) {
     const res = await fetch('https://api.resend.com/emails', {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${RESEND_API_KEY}`,
       },
       body: JSON.stringify({
         from: 'Keyword Foundry Pro <onboarding@resend.dev>',
         to: [payload.to],
         subject: payload.subject,
         html: payload.html,
       }),
     });

     if (!res.ok) {
       throw new Error(`Failed to send email: ${await res.text()}`);
     }

     return res.json();
   }

   serve(async (req) => {
     try {
       const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
       const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
       const supabase = createClient(supabaseUrl, supabaseKey);

       // Find users whose trial ends in 3 days, 1 day, or today
       const threeDaysFromNow = new Date();
       threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
       threeDaysFromNow.setHours(0, 0, 0, 0);

       const oneDayFromNow = new Date();
       oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);
       oneDayFromNow.setHours(0, 0, 0, 0);

       const today = new Date();
       today.setHours(0, 0, 0, 0);

       const { data: expiringTrials } = await supabase
         .from('user_subscriptions')
         .select('user_id, trial_ends_at, profiles(email, display_name)')
         .eq('tier', 'free')
         .not('trial_ends_at', 'is', null)
         .in('trial_ends_at::date', [
           threeDaysFromNow.toISOString().split('T')[0],
           oneDayFromNow.toISOString().split('T')[0],
           today.toISOString().split('T')[0],
         ]);

       const emailsSent = [];

       for (const sub of expiringTrials || []) {
         const trialEndDate = new Date(sub.trial_ends_at);
         const daysRemaining = Math.ceil((trialEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
         const email = sub.profiles?.email;
         const name = sub.profiles?.display_name || 'there';

         if (!email) continue;

         let subject = '';
         let html = '';

         if (daysRemaining === 3) {
           subject = '3 days left in your Keyword Foundry Pro trial';
           html = `
             <h2>Hi ${name},</h2>
             <p>Your free trial of Keyword Foundry Pro ends in <strong>3 days</strong>.</p>
             <p>Upgrade now to keep access to:</p>
             <ul>
               <li>Unlimited keyword research</li>
               <li>Unlimited competitor analysis</li>
               <li>SERP tracking & related keywords</li>
               <li>Export to CSV/JSON</li>
             </ul>
             <p><a href="https://your-domain.com/pricing" style="background:#000;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">View Pricing</a></p>
           `;
         } else if (daysRemaining === 1) {
           subject = 'Last day of your trial - Upgrade now!';
           html = `
             <h2>Hi ${name},</h2>
             <p>This is your <strong>last day</strong> of Keyword Foundry Pro trial access.</p>
             <p>Don't lose your keyword research data and competitor insights.</p>
             <p><a href="https://your-domain.com/pricing" style="background:#000;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Upgrade Now</a></p>
           `;
         } else if (daysRemaining <= 0) {
           subject = 'Your trial has expired';
           html = `
             <h2>Hi ${name},</h2>
             <p>Your Keyword Foundry Pro trial has ended.</p>
             <p>Upgrade to continue using professional-grade SEO intelligence.</p>
             <p><a href="https://your-domain.com/pricing" style="background:#000;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Choose Your Plan</a></p>
           `;
         }

         if (subject) {
           await sendEmail({ to: email, subject, html });
           emailsSent.push(email);
         }
       }

       return new Response(
         JSON.stringify({ success: true, emailsSent: emailsSent.length }),
         { headers: { 'Content-Type': 'application/json' } }
       );
     } catch (error) {
       return new Response(
         JSON.stringify({ error: error.message }),
         { status: 500, headers: { 'Content-Type': 'application/json' } }
       );
     }
   });
   ```

4. Create a Supabase cron job to run this daily:
   - Create migration file: supabase/migrations/add_trial_reminder_cron.sql
   ```sql
   -- Enable pg_cron extension
   create extension if not exists pg_cron;

   -- Schedule trial reminder emails to run daily at 9 AM UTC
   select cron.schedule(
     'send-trial-reminders',
     '0 9 * * *', -- Every day at 9 AM UTC
     $$
     select net.http_post(
       url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-trial-reminder',
       headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'))
     );
     $$
   );
   ```

5. Deploy the Edge Function:
   ```bash
   supabase functions deploy send-trial-reminder --no-verify-jwt
   ```

6. Test manually by invoking:
   ```bash
   curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-trial-reminder \
     -H "Authorization: Bearer YOUR_ANON_KEY"
   ```

FILES TO CREATE:
- supabase/functions/send-trial-reminder/index.ts (new Edge Function)
- supabase/migrations/add_trial_reminder_cron.sql (new migration)

REFERENCE:
- https://supabase.com/docs/guides/functions/examples/send-emails
- https://resend.com/docs/send-with-supabase-edge-functions
- https://supabase.com/docs/guides/database/extensions/pg_cron

PRIORITY: Critical - converts trial users to paid customers
NOTE: Replace 'your-domain.com' and 'YOUR_PROJECT_REF' with actual values after deployment
```

---

## 🔴 PROMPT 5: Build Interactive Onboarding Flow with Product Tour

```
Create a guided onboarding flow for first-time users to reduce trial churn and improve activation.

CONTEXT:
- No current onboarding (users land on dashboard without guidance)
- Need to show product value immediately on first login
- Target: Complete first keyword research within 2 minutes
- Using React 18.3.1 + TypeScript with Vite
- Best practice: Use react-joyride (26k+ GitHub stars, actively maintained)

TASKS:
1. Install react-joyride package:
   ```bash
   npm install react-joyride
   ```

2. Create onboarding state management at src/lib/onboardingStorage.ts:
   ```typescript
   const ONBOARDING_KEY = 'kfp_onboarding_completed';

   export const onboardingStorage = {
     isCompleted: (): boolean => {
       return localStorage.getItem(ONBOARDING_KEY) === 'true';
     },

     markCompleted: (): void => {
       localStorage.setItem(ONBOARDING_KEY, 'true');
     },

     reset: (): void => {
       localStorage.removeItem(ONBOARDING_KEY);
     },
   };
   ```

3. Create onboarding tour component at src/components/OnboardingTour.tsx:
   ```typescript
   import { useState, useEffect } from 'react';
   import Joyride, { Step, CallBackProps, STATUS } from 'react-joyride';
   import { onboardingStorage } from '@/lib/onboardingStorage';
   import { useNavigate, useLocation } from 'react-router-dom';

   const steps: Step[] = [
     {
       target: 'body',
       content: (
         <div>
           <h3 className="text-lg font-bold mb-2">Welcome to Keyword Foundry Pro!</h3>
           <p>Let's take a quick 60-second tour to show you how to conduct professional keyword research.</p>
         </div>
       ),
       placement: 'center',
       disableBeacon: true,
     },
     {
       target: '[data-tour="research-tab"]',
       content: 'Start here to research keywords. Enter any seed keyword to discover search volume, difficulty, and intent data.',
       disableBeacon: true,
     },
     {
       target: '[data-tour="keyword-input"]',
       content: 'Enter your seed keyword here. Try "best running shoes" to see how it works.',
       disableBeacon: true,
     },
     {
       target: '[data-tour="language-select"]',
       content: 'Choose from 10+ languages and global locations for localized keyword data.',
       disableBeacon: true,
     },
     {
       target: '[data-tour="submit-button"]',
       content: 'Click here to get real-time keyword metrics powered by DataForSEO.',
       disableBeacon: true,
     },
     {
       target: '[data-tour="competitor-tab"]',
       content: 'After your first research, try Competitor Analysis to discover keyword gaps between you and competitors.',
       disableBeacon: true,
     },
   ];

   export function OnboardingTour() {
     const [run, setRun] = useState(false);
     const navigate = useNavigate();
     const location = useLocation();

     useEffect(() => {
       // Only show on /app/keyword-research and if not completed
       if (location.pathname === '/app/keyword-research' && !onboardingStorage.isCompleted()) {
         // Delay to let page render
         setTimeout(() => setRun(true), 500);
       }
     }, [location]);

     const handleJoyrideCallback = (data: CallBackProps) => {
       const { status, index, type } = data;

       if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
         onboardingStorage.markCompleted();
         setRun(false);
       }
     };

     return (
       <Joyride
         steps={steps}
         run={run}
         continuous
         showProgress
         showSkipButton
         callback={handleJoyrideCallback}
         styles={{
           options: {
             primaryColor: 'hsl(var(--primary))',
             zIndex: 10000,
           },
         }}
       />
     );
   }
   ```

4. Add data-tour attributes to key elements in src/pages/AppKeywordResearch.tsx or Research.tsx:
   - Add `data-tour="research-tab"` to the research navigation link in Header/MainLayout
   - Add `data-tour="keyword-input"` to the keyword input field (line with <Input name="keyword" />)
   - Add `data-tour="language-select"` to language dropdown
   - Add `data-tour="submit-button"` to the submit button
   - Add `data-tour="competitor-tab"` to competitor analyzer link

5. Add OnboardingTour to src/pages/AppKeywordResearch.tsx or Research.tsx:
   ```typescript
   import { OnboardingTour } from '@/components/OnboardingTour';

   // Inside the component return:
   return (
     <div>
       <OnboardingTour />
       {/* existing JSX */}
     </div>
   );
   ```

6. Add onboarding reset option to src/pages/Profile.tsx for testing:
   ```typescript
   import { onboardingStorage } from '@/lib/onboardingStorage';

   // Add button in the profile settings section:
   <Button
     variant="outline"
     onClick={() => {
       onboardingStorage.reset();
       toast({ title: 'Onboarding reset', description: 'Refresh to see the tour again' });
     }}
   >
     Reset Product Tour
   </Button>
   ```

7. Track onboarding completion with analytics (if Prompt 3 completed):
   ```typescript
   import { analytics } from '@/lib/analytics';

   // In handleJoyrideCallback when STATUS.FINISHED:
   analytics.event('Onboarding Completed');
   ```

FILES TO MODIFY:
- src/lib/onboardingStorage.ts (create new)
- src/components/OnboardingTour.tsx (create new)
- src/pages/AppKeywordResearch.tsx or Research.tsx (add tour and data attributes)
- src/components/Header.tsx or MainLayout.tsx (add data-tour to nav)
- src/pages/Profile.tsx (add reset button)
- package.json (add react-joyride)

REFERENCE:
- https://docs.react-joyride.com/
- https://github.com/gilbarbara/react-joyride

PRIORITY: Critical - improves trial-to-paid conversion by showing product value immediately
NOTE: Customize step content and styling to match your brand voice
```

---

## 📊 ESTIMATED CREDIT USAGE

- Prompt 1: ~150-200 credits (many file modifications)
- Prompt 2: ~100-120 credits (new component + wrapping)
- Prompt 3: ~120-150 credits (analytics integration)
- Prompt 4: ~180-220 credits (Edge Function + migration)
- Prompt 5: ~120-140 credits (onboarding tour)

**Total: ~670-830 credits**

---

## ⚠️ POST-IMPLEMENTATION ACTIONS

### After Prompt 3 (Analytics):
1. Sign up: https://plausible.io/register
2. Add your domain in Plausible dashboard
3. Update `VITE_PLAUSIBLE_DOMAIN` in .env

### After Prompt 4 (Email Reminders):
1. Sign up: https://resend.com/signup
2. Get API key from dashboard
3. Add to Supabase: Project Settings > Edge Functions > Secrets
4. Deploy: `supabase functions deploy send-trial-reminder`
5. Update domain in email HTML templates

---

## 📚 DOCUMENTATION REFERENCES

- **Supabase Edge Functions:** https://supabase.com/docs/guides/functions
- **Resend Email API:** https://resend.com/docs
- **Plausible Analytics:** https://plausible.io/docs
- **React Error Boundary:** https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
- **React Joyride:** https://docs.react-joyride.com/

---

**Created:** 2025-10-21
**Project:** Keyword Foundry Pro
**Author:** Claude Code Analysis
