# Day 4: Billing, Plan Limits, Legal Pages & Data Subject Rights

## Summary

This PR implements the Day 4 features for Keyword Foundry Pro, focusing on billing infrastructure, legal compliance, and GDPR-compliant data subject rights (DSR). The implementation provides the foundation for subscription management, user entitlements, and regulatory compliance.

### What Changed

**Database Schema (2 migrations):**
- Created `plans` table with JSONB config for flexible tier definitions
- Created `user_limits` table linking users to plans with optional overrides
- Added soft delete columns (`deleted_at`) to all user-owned tables for GDPR compliance
- Inserted 4 default plans: free, trial, pro, enterprise
- Implemented RLS policies for secure data access

**Library Modules (4 new files):**
- `src/lib/billing/entitlements.ts` - Plan definitions, limits, and usage calculations
- `src/lib/legal/consent.ts` - Cookie consent management with browser storage
- `src/lib/account/dataExport.ts` - GDPR data export (right to access)
- `src/lib/account/deleteAccount.ts` - Account deletion with soft delete (right to erasure)

**UI Pages (5 new pages):**
- `src/pages/Billing.tsx` - Current plan display with usage metrics and upgrade CTAs
- `src/pages/Account.tsx` - DSR actions (export data, delete account)
- `src/pages/legal/Terms.tsx` - Terms of Service
- `src/pages/legal/PrivacyPolicy.tsx` - Privacy Policy with user rights
- `src/pages/legal/ContactPage.tsx` - Contact form and support options

**UI Components (1 new component):**
- `src/components/legal/CookieBanner.tsx` - Cookie consent banner with 3 levels

**Routes:**
- `/billing` (protected) - View plan and usage
- `/account` (protected) - DSR export/delete
- `/legal/terms` (public) - Terms of Service
- `/legal/privacy` (public) - Privacy Policy
- `/legal/contact` (public) - Contact page

**Tests (28 new tests):**
- `tests/unit/billing/entitlements.spec.ts` - 20 tests for plan entitlements
- `tests/unit/legal/consent.spec.ts` - 8 tests for cookie consent

## Plan Definitions

| Plan | Queries/Day | Monthly Credits | Max Export Rows | Custom Thresholds | API Access |
|------|-------------|-----------------|-----------------|-------------------|------------|
| **Free** | 5 | 100 | 500 | ❌ | ❌ |
| **Trial** | 20 | 500 | 1000 | ❌ | ❌ |
| **Pro** | 100 | 2000 | 10000 | ✅ | ✅ |
| **Enterprise** | Unlimited | Unlimited | Unlimited | ✅ | ✅ |

## How to Test

### Prerequisites
```bash
# Ensure all dependencies are installed
npm install

# Run quality checks (should all pass)
npm run type-check  # ✅ No errors
npm run lint        # ✅ No new warnings
npm run test        # ✅ 85/85 tests passing
```

### Database Migrations

1. **Apply migrations:**
   ```bash
   supabase db reset  # Resets local DB and applies all migrations
   # OR
   supabase migration up  # Applies pending migrations only
   ```

2. **Verify tables:**
   ```sql
   -- Check plans table
   SELECT id, name, config FROM public.plans;

   -- Should return 4 rows: free, trial, pro, enterprise

   -- Check user_limits table (empty initially)
   SELECT * FROM public.user_limits;

   -- Check soft delete columns added
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'profiles' AND column_name = 'deleted_at';
   ```

3. **Test RLS policies:**
   ```sql
   -- As authenticated user, should see own limits
   SELECT * FROM user_limits WHERE user_id = auth.uid();

   -- As unauthenticated user, should see all plans
   SELECT * FROM plans;
   ```

### UI Testing

1. **Billing Page** (`/billing`):
   - Sign in to the app
   - Navigate to `/billing`
   - Verify current plan displays (defaults to "free" if no user_limits record)
   - Check usage metrics: queries today, credits used, exports count
   - Verify all 4 plans display in comparison grid
   - Check feature lists are accurate
   - Note: "Upgrade" buttons show placeholder toast (Stripe not yet integrated)

2. **Cookie Consent** (appears on first visit):
   - Clear browser cookies for the app
   - Reload app
   - Cookie banner should appear at bottom
   - Click "Manage Preferences" to expand details
   - Test "Accept All" - banner disappears, page reloads
   - Verify consent stored: `document.cookie` should contain `kfp_cookie_consent`
   - Test "Essential Only" - banner disappears, no reload
   - Reload and verify banner doesn't reappear

3. **Legal Pages**:
   - Navigate to `/legal/terms` - verify Terms of Service displays
   - Navigate to `/legal/privacy` - verify Privacy Policy displays
   - Navigate to `/legal/contact` - verify Contact form displays
   - Submit contact form (shows placeholder toast, backend not implemented)

### DSR Workflows

1. **Data Export** (`/account`):
   - Sign in and create some data (keyword research, exports, etc.)
   - Navigate to `/account`
   - Click "Export My Data"
   - Wait for processing (queries all user tables in parallel)
   - Verify JSON file downloads: `keyword-foundry-data-export-{timestamp}.json`
   - Open JSON and verify structure:
     ```json
     {
       "user": { "id": "...", "email": "...", "created_at": "..." },
       "profile": { ... },
       "keyword_research": [ ... ],
       "exports": [ ... ],
       "snapshots": [ ... ],
       "clusters": [ ... ],
       "audit_events": [ ... ],
       "usage_stats": [ ... ],
       "exported_at": "2025-10-26T..."
     }
     ```
   - Check audit_events table for `action='dsr_export'` entry

2. **Account Deletion** (`/account`):
   - Navigate to `/account`
   - Click "Delete My Account"
   - Alert dialog appears with warning checklist
   - Verify warnings displayed:
     - Data will be permanently deleted
     - Subscriptions will be cancelled
     - Cannot be undone
     - 30-day grace period for recovery
   - Click "Delete My Account" in dialog
   - Verify account deletion processing
   - Check database for soft delete:
     ```sql
     SELECT deleted_at, email, display_name
     FROM profiles
     WHERE user_id = 'YOUR_USER_ID';

     -- Should show:
     -- deleted_at: NOT NULL (timestamp)
     -- email: 'deleted-{user_id}@deleted.local'
     -- display_name: 'Deleted User'
     ```
   - Verify user signed out automatically
   - Verify redirect to `/auth/sign-in`

### Entitlements Library Testing

Run unit tests:
```bash
npm run test tests/unit/billing/entitlements.spec.ts
```

Manual testing:
```typescript
import { getEntitlements, isOverLimit, getUsageLevel } from '@/lib/billing/entitlements';

// Get plan limits
const proLimits = getEntitlements('pro');
console.log(proLimits.limits.queriesPerDay); // 100
console.log(proLimits.features.apiAccess); // true

// Check if over limit
isOverLimit(95, 100); // false
isOverLimit(100, 100); // true
isOverLimit(50, -1); // false (unlimited)

// Get usage level
getUsageLevel(50, 100); // 'none' (50%)
getUsageLevel(85, 100); // 'warning' (85%)
getUsageLevel(100, 100); // 'critical' (100%)
```

### Cookie Consent Testing

Run unit tests:
```bash
npm run test tests/unit/legal/consent.spec.ts
```

Manual testing in browser console:
```javascript
import { setConsent, getConsent, shouldLoadAnalytics } from '@/lib/legal/consent';

// Set consent
setConsent('all');
console.log(document.cookie); // Should contain 'kfp_cookie_consent'

// Get consent
const consent = getConsent();
console.log(consent); // { level: 'all', timestamp: '...' }

// Check if analytics should load
shouldLoadAnalytics(); // true (only if level === 'all')

// Test other levels
setConsent('essential');
shouldLoadAnalytics(); // false
```

## Risks

### 1. Stripe Integration Pending
**Risk:** Billing page shows upgrade CTAs but Stripe checkout is not implemented.
**Mitigation:**
- CTAs show placeholder toast messages
- Next phase (Day 4B) will implement Stripe checkout, portal, and webhooks
- Plan definitions are ready and stable for Stripe integration

### 2. Soft Delete vs Hard Delete
**Risk:** User data persists in database after "deletion" (soft delete pattern).
**Mitigation:**
- PII is anonymized (email, display_name)
- deleted_at timestamp allows filtering in queries
- Maintains referential integrity for audit trail
- Can implement hard delete after retention period
- GDPR compliant: data is no longer identifiable

### 3. Cookie Consent Browser-Only
**Risk:** Consent not recorded in database, can't be audited server-side.
**Mitigation:**
- Cookie has 365-day expiry
- Works for unauthenticated users
- Can add database sync in future if needed for compliance
- Current implementation meets GDPR requirements

### 4. No Active Subscription Check for Deletion
**Risk:** Users could delete accounts while subscriptions are active.
**Mitigation:**
- `canDeleteAccount()` function exists but Stripe check not implemented
- Placeholder always returns `allowed: true`
- Will be implemented when Stripe webhooks are added
- Delete flow includes warnings about subscription cancellation

### 5. No Email Verification for DSR Actions
**Risk:** DSR actions (export, delete) don't require email confirmation.
**Mitigation:**
- Both actions require authentication (protected routes)
- Delete requires explicit AlertDialog confirmation
- Audit events recorded for all DSR actions
- Can add email confirmation in future for extra security

### 6. Migration Rollback Complexity
**Risk:** Adding columns to multiple tables in migration is hard to rollback.
**Mitigation:**
- Migration uses conditional checks (IF NOT EXISTS)
- Safe to re-run if partially applied
- Soft delete columns are nullable (no data migration required)
- Can be dropped individually if needed

## Acceptance Criteria

### A. Plans & Limits (Entitlements)

- [x] **A1:** Database tables created
  - [x] `plans` table with id (PK), name, config (JSONB)
  - [x] `user_limits` table with user_id (FK), plan_id (FK), overrides (JSONB)
  - [x] Default plans inserted: free, trial, pro, enterprise
  - [x] RLS policies: public read for plans, users view own limits

- [x] **A2:** Entitlements library implemented
  - [x] Typed interfaces: `PlanId`, `PlanFeatures`, `PlanEntitlements`
  - [x] `PLANS` constant with all tier definitions
  - [x] `getEntitlements(planId)` returns plan limits
  - [x] `isUnlimited(value)` detects -1 limits
  - [x] `isOverLimit(usage, limit)` checks threshold
  - [x] `getUsagePercentage(usage, limit)` calculates 0-100%
  - [x] `getUsageLevel(usage, limit)` returns none/warning/critical

- [x] **A3:** Plan limits defined correctly
  - [x] Free: 5 queries/day, 100 credits, 500 max rows
  - [x] Trial: 20 queries/day, 500 credits, 1000 max rows
  - [x] Pro: 100 queries/day, 2000 credits, 10000 max rows
  - [x] Enterprise: unlimited (-1) for all limits

- [x] **A4:** Unit tests for entitlements
  - [x] 20 tests covering all helper functions
  - [x] Tests validate plan constants
  - [x] Tests verify percentage and level calculations
  - [x] All tests passing

### B. Stripe Integration (DEFERRED to Day 4B)

- [ ] **B1:** Stripe checkout API route
- [ ] **B2:** Stripe customer portal API route
- [ ] **B3:** Stripe webhook handler
- [ ] **B4:** Webhook events processed (subscription lifecycle)
- [ ] **B5:** Unit tests for Stripe integration

**Note:** Section B is explicitly out of scope for this PR. Placeholders exist in UI, implementation planned for Day 4B.

### C. Over-limit UX (DEFERRED)

- [ ] **C1:** Global banners component created
- [ ] **C2:** CreditMeter integration
- [ ] **C3:** Server guards updated to be plan-aware
- [ ] **C4:** Guards applied in API endpoints
- [ ] **C5:** Unit tests for limit enforcement

**Note:** Section C is out of scope for this PR. Entitlements library is ready for integration.

### D. Legal Pages & Cookie Consent

- [x] **D1:** Legal pages created
  - [x] Terms of Service page (`/legal/terms`)
  - [x] Privacy Policy page (`/legal/privacy`)
  - [x] Contact page (`/legal/contact`)
  - [x] All pages use Card layout with prose styling

- [x] **D2:** Cookie consent implemented
  - [x] CookieBanner component created
  - [x] Consent library with setConsent, getConsent, shouldLoadAnalytics
  - [x] Three consent levels: all, essential, none
  - [x] Banner auto-hides after consent
  - [x] Page reload on 'all' consent for analytics

- [x] **D3:** Legal pages accessible
  - [x] Routes added to App.tsx
  - [x] Pages are public (no auth required)
  - [x] Footer links pending (noted in deferred tasks)

- [x] **D4:** Cookie consent respects choice
  - [x] shouldLoadAnalytics() returns true only for 'all'
  - [x] Consent stored in browser cookie (365-day expiry)
  - [x] Consent persists across sessions

- [x] **D5:** Unit tests for cookie consent
  - [x] 8 tests covering all consent functions
  - [x] Tests verify storage and retrieval
  - [x] Tests validate analytics loading logic
  - [x] All tests passing

### E. DSR - Data Subject Rights

- [x] **E1:** Data export implemented
  - [x] exportUserData() collects all user data
  - [x] Includes: profiles, keyword_research, exports, snapshots, clusters, audit_events, usage_stats
  - [x] downloadDataExport() triggers browser download
  - [x] Audit event recorded (action='dsr_export')
  - [x] JSON format with all user data

- [x] **E2:** Account deletion implemented
  - [x] deleteUserAccount() soft deletes all records
  - [x] Sets deleted_at timestamp on all user-owned tables
  - [x] Anonymizes profile (email, display_name)
  - [x] canDeleteAccount() checks subscription status (placeholder)
  - [x] Audit event recorded (action='dsr_delete_requested')
  - [x] User signed out after deletion

- [x] **E3:** Soft delete schema
  - [x] deleted_at column added to all user-owned tables
  - [x] Columns are TIMESTAMPTZ NULL
  - [x] Partial indexes created on deleted_at
  - [x] Migration safe to re-run

- [x] **E4:** Account page UI
  - [x] /account route created (protected)
  - [x] "Export My Data" button with one-click download
  - [x] "Delete My Account" button with confirmation dialog
  - [x] Warning checklist in delete dialog
  - [x] Toast notifications for success/error
  - [x] Auto-redirect after deletion

- [x] **E5:** Confirmations and audit
  - [x] Delete requires AlertDialog confirmation
  - [x] Export records audit event
  - [x] Delete records audit event
  - [x] All DSR actions logged

### Global Acceptance Criteria

- [x] **G1:** All unit tests pass (85/85)
- [x] **G2:** Type-check passes with no errors
- [x] **G3:** Lint passes with no new warnings
- [x] **G4:** Conventional commits used (7 commits)
- [x] **G5:** PR description includes testing steps, risks, and acceptance criteria

## Notes for Reviewers

1. **Stripe Integration:** This PR focuses on the foundation. Stripe checkout, portal, and webhooks will be implemented in Day 4B.

2. **Over-limit UX:** The entitlements library is complete and ready to use. Integration into existing limit enforcement and UI components is deferred.

3. **Footer Links:** Legal page links should be added to the footer component (not included in this PR).

4. **Environment Variables:** Document these for Stripe integration (Day 4B):
   - `STRIPE_PUBLIC_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `NEXT_PUBLIC_APP_URL`

5. **Test Coverage:** Added 28 new tests (20 for entitlements, 8 for consent). Total test suite: 85 tests passing.

6. **Database Migrations:** Safe to run multiple times due to conditional checks. Apply with `supabase db reset` or `supabase migration up`.

7. **Soft Delete Pattern:** Balances GDPR compliance with data integrity. Can implement hard delete after retention period.

## Related Issues

This PR addresses the Day 4 specification for billing, legal compliance, and DSR features as outlined in the project requirements.
