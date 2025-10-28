# Day 8: Collaboration, Templates, Feedback, Perf+A11y, Security Polish

## Summary

This PR implements Day 8 "fast follow polish" features to enhance collaboration, provide templates, capture feedback, improve performance/accessibility, and harden security. All features include comprehensive test coverage (94 new tests).

## Changes

### A) Collaboration: Share & Comment

**Database Migrations:**
1. `20251026170001_create_table_user_emails.sql`
   - Maps emails to user IDs for sharing invitations
   - Auto-creates mapping on profile creation
   - RLS: users read own, admins read all

2. `20251026170002_create_table_project_shares.sql`
   - Share projects with viewer/commenter roles
   - Unique constraint per project+email
   - Updated projects RLS to allow shared access
   - RLS: owners manage shares, invited users see their shares

3. `20251026170003_create_table_comments.sql`
   - Comments on keywords and clusters
   - Subject types: keyword, cluster
   - RLS: owners and commenters can insert, viewers can only read
   - Auto-update timestamp trigger

**Library & API:**
- `src/lib/collab/shares.ts`: CRUD for project shares with role validation
- `src/lib/collab/comments.ts`: Comment management with permission checks
- `src/app/api/projects/[projectId]/share/route.ts`: Share API (GET/POST/DELETE)
- `src/app/api/comments/route.ts`: Comment API (GET/POST/PATCH/DELETE)

**Features:**
- Email-based invitations (viewer/commenter roles)
- Viewers can read projects/results
- Commenters can add/edit/delete own comments
- Project owners can delete any comment on their projects
- Comment counts and threading by subject

### B) Templates & Presets

**Database Migration:**
4. `20251026170004_create_table_presets.sql`
   - Query/filter preset bundles
   - System presets (read-only) + user presets
   - Seeded 5 system presets:
     - E-commerce SEO (commercial intent, 100+ volume)
     - Blog Content Ideas (informational, 50+ volume)
     - Local Business (location-based keywords)
     - Low Competition Wins (500+ volume, <30 difficulty)
     - Question Keywords (what/how/why, informational)
   - RLS: everyone reads system presets, users CRUD own presets

**Library:**
- `src/lib/presets/index.ts`: CRUD operations for presets
- `src/lib/presets/utils.ts`: Filter serialization

**Features:**
- Apply preset to instantly set query, filters, and sort
- Save current filters as custom preset
- Delete user presets (system presets protected)
- Payload structure: `{query, filters: {minVolume, maxDifficulty, intent, etc.}, sort}`

### C) Feedback: NPS + Feature Requests

**Database Migration:**
5. `20251026170005_create_table_feedback.sql`
   - Feedback kinds: nps, feature
   - NPS scores 0-10, feature requests with title/body
   - Status workflow: new → triaged → in-progress → done → wont-fix
   - Auto-triage tracking (triaged_by, triaged_at)
   - RLS: users read/create own feedback, admins read/update all

**Library:**
- `src/lib/feedback/hooks.ts`: NPS submission, feature requests, display frequency logic

**Features:**
- NPS prompt shown after key milestones (first export, 3rd session)
- 30-day cooldown between NPS prompts
- Feature request form with title + description
- Admin triage dashboard (future UI)
- Categorizes NPS: detractors (0-6), passive (7-8), promoters (9-10)

### D) Performance Hardening + Smoke Tests

**Performance:**
- `src/lib/perf/measure.ts`: TTFB, FCP, INP measurement for dev
- Logs performance metrics in development mode
- Tracks interactions for INP (Interaction to Next Paint)

**Smoke Tests:**
- `tests/e2e/smoke.spec.ts`: Basic page load, error detection, TTFB/FCP baselines
- Ensures pages load without console errors
- Response time under 5s for dev
- TTFB < 1s, FCP < 2s

**Features:**
- Performance monitoring in dev environment
- Baseline metrics for regression detection
- E2E smoke tests for critical paths

### E) Accessibility & i18n Primer

**i18n Scaffold:**
- `src/lib/i18n/index.ts`: Translation function with parameter substitution
- `src/lib/i18n/locales/en.json`: English translations for core UI
- Covers: navigation, filters, export, credits, cookies, presets, sharing, comments, feedback

**Features:**
- `t(key, params)` translation function
- Parameter substitution: `{{param}}`
- Locale switching support (currently EN only)
- Translation coverage for all Day 8 features

**Accessibility:**
- i18n labels ready for screen readers
- Baseline structure for a11y improvements
- (Note: Full a11y pass on components is deferred to UI implementation phase)

### F) Security & Hardening

**Security Middleware:**
- `src/app/middleware.ts`:
  - `X-Frame-Options: DENY` (prevent clickjacking)
  - `X-Content-Type-Options: nosniff` (MIME type security)
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy` (disable camera, microphone, geolocation)
  - `Content-Security-Policy` (strict resource loading)

**Secret Scanning:**
- `.husky/pre-commit`: Pre-commit hook scans for secrets
- Patterns: AWS keys, Google API keys, Stripe keys, private keys, UUIDs
- Blocks commits with potential secrets

**Rate Limiting:**
- `src/lib/rateLimit/memory.ts`: Token bucket rate limiter
- Configurable max tokens and refill rate
- Auto-cleanup of old buckets
- Ready for sensitive API endpoints

**Features:**
- Security headers on all pages
- Pre-commit secret detection
- Rate limiting infrastructure for API protection

### Tests

**Unit Tests (94 new, 417 total):**

1. **Collaboration (36 tests):**
   - `tests/unit/collab/shares.spec.ts` (18): Email validation, role validation, access control, share creation
   - `tests/unit/collab/comments.spec.ts` (18): Subject validation, body validation, permissions, counting, threading

2. **Presets (13 tests):**
   - `tests/unit/presets.spec.ts`: Serialization, scoping, application, naming, ordering

3. **Feedback (18 tests):**
   - `tests/unit/feedback.spec.ts`: NPS validation, feature validation, kind validation, status management, display frequency, triage workflow

4. **Security (16 tests):**
   - `tests/unit/security/permissions.spec.ts`: Project access, admin routes, comment permissions, rate limiting, preset ownership, feedback triage

5. **i18n (7 tests):**
   - `tests/unit/i18n/keys.spec.ts`: Translation lookup, parameter substitution, missing key detection, coverage verification

6. **Smoke Tests (4 tests):**
   - `tests/e2e/smoke.spec.ts`: Page loads, error detection, response time, TTFB/FCP measurements

**All tests passing:** ✅ 417/417

## How to Test

### 1. Database Setup
```bash
# Apply migrations (dev environment)
supabase db reset

# Verify tables created
supabase db inspect tables
```

### 2. Project Sharing
```bash
# As project owner
- Navigate to a project
- Click "Share" button (UI to be implemented)
- Invite user by email with "viewer" or "commenter" role
- Verify share appears in list

# As invited user
- Log in with invited email
- Verify project appears in "Shared with me" section
- As viewer: can read but not comment
- As commenter: can add comments
```

### 3. Comments
```bash
# As project owner or commenter
- Navigate to project results
- Click comment icon on keyword row
- Add comment text and submit
- Verify comment appears with author and timestamp
- Edit/delete own comments
- As owner: delete any comments
```

### 4. Presets
```bash
# Apply system preset
- Click "Presets" dropdown
- Select "E-commerce SEO"
- Verify filters applied: minVolume=100, intent=commercial/transactional

# Create custom preset
- Set custom filters (e.g., minVolume=200, maxDifficulty=40)
- Click "Save Preset"
- Name it and save
- Verify preset appears in "My Presets" section

# Apply custom preset
- Select saved preset
- Verify filters match saved values

# Delete preset
- Click delete on user preset
- Verify removed from list
- System presets cannot be deleted
```

### 5. Feedback
```bash
# Submit NPS
- Trigger NPS prompt (after export or manually)
- Rate 0-10
- Add optional comment
- Submit
- Verify stored in feedback table

# Feature Request
- Click Help → "Request a Feature"
- Enter title and description
- Submit
- Verify appears in admin feedback triage

# Admin Triage (future UI)
- View all feedback
- Update status: new → triaged → in-progress → done
- Verify triaged_at and triaged_by set
```

### 6. Performance
```bash
# Check dev performance logs
pnpm dev
# Navigate to dashboard
# Check console for:
# [Perf] TTFB: XXms
# [Perf] FCP: XXms
# [Perf] INP: XXms (on interaction)

# Run smoke tests
pnpm test tests/e2e/smoke.spec.ts
```

### 7. Security
```bash
# Test security headers
curl -I http://localhost:3000
# Verify headers:
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# Content-Security-Policy: ...

# Test secret scanning
echo "AKIA1234567890123456" > test-secret.txt
git add test-secret.txt
git commit -m "test"
# Should block commit with "Potential secret found"

# Test rate limiting (in code)
const result = checkRateLimit({
  maxTokens: 10,
  refillRate: 1,
  identifier: 'user-123'
});
// Verify allowed/denied based on token availability
```

### 8. i18n
```bash
# Verify translations
import { t } from '@/lib/i18n';
console.log(t('nav.dashboard')); // "Dashboard"
console.log(t('credits.remaining', { count: '50' })); // "50 credits remaining"

# Check translation coverage
pnpm test tests/unit/i18n/keys.spec.ts
```

### 9. Quality Checks
```bash
# Type check
pnpm run type-check

# Lint
pnpm run lint

# All tests
pnpm run test

# All should pass
```

## Risks & Mitigations

### 1. Collaboration Permissions Complexity
**Risk**: Complex RLS policies could have edge cases
**Mitigation**:
- Comprehensive permission tests (16 tests)
- Clear role hierarchy: owner > commenter > viewer
- Admin override for all operations

### 2. Rate Limiting in Memory
**Risk**: In-memory rate limiter doesn't persist across restarts
**Mitigation**:
- Acceptable for MVP
- Future: move to Redis for distributed rate limiting
- Auto-cleanup prevents memory leaks

### 3. Preset Payload Changes
**Risk**: Changing filter structure could break saved presets
**Mitigation**:
- JSONB payload is flexible
- Add payload version field if structure changes significantly
- Serialize function handles undefined gracefully

### 4. NPS Display Frequency
**Risk**: LocalStorage-based tracking can be cleared
**Mitigation**:
- Acceptable for MVP UX
- Future: track in database if needed
- Worst case: user sees NPS prompt again

### 5. Secret Scanning Patterns
**Risk**: May have false positives or miss some secret types
**Mitigation**:
- Basic patterns cover common cases (AWS, Google, Stripe)
- Can extend patterns as needed
- Users can override with --no-verify if needed (documented)

### 6. CSP Restrictions
**Risk**: Strict CSP may block legitimate resources
**Mitigation**:
- Allows 'unsafe-inline' and 'unsafe-eval' for dev compatibility
- Allows Supabase domains for API calls
- Can relax for specific use cases if needed

## Rollback Plan

### If Issues Found Post-Merge:

1. **Revert migrations:**
   ```bash
   # Drop new tables
   DROP TABLE IF EXISTS public.feedback CASCADE;
   DROP TABLE IF EXISTS public.presets CASCADE;
   DROP TABLE IF EXISTS public.comments CASCADE;
   DROP TABLE IF EXISTS public.project_shares CASCADE;
   DROP TABLE IF EXISTS public.user_emails CASCADE;
   ```

2. **Revert RLS changes:**
   ```sql
   -- Restore original projects SELECT policy
   DROP POLICY "Users can read own or shared projects" ON public.projects;
   CREATE POLICY "Users can read own projects"
   ON public.projects FOR SELECT TO authenticated
   USING (user_id = auth.uid() AND deleted_at IS NULL);
   ```

3. **Remove security headers (if causing issues):**
   ```bash
   # Delete or comment out middleware.ts
   ```

4. **Disable pre-commit hook:**
   ```bash
   chmod -x .husky/pre-commit
   ```

## Acceptance Criteria

✅ **A) Collaboration: Share & Comment**
- [x] Email-based sharing with viewer/commenter roles
- [x] RLS allows shared users to read projects
- [x] Comments on keywords and clusters
- [x] Permission checks: commenters can add comments, viewers cannot
- [x] Project owners can delete any comment
- [x] 36 unit tests covering permissions and CRUD

✅ **B) Templates & Presets**
- [x] System presets (5 seeded)
- [x] User presets (save/apply/delete)
- [x] Payload serialization and application
- [x] RLS: system presets read-only, user presets editable
- [x] 13 unit tests covering scoping and serialization

✅ **C) Feedback: NPS + Feature Requests**
- [x] NPS submission with 0-10 score
- [x] Feature request with title/body
- [x] Status workflow (new → triaged → done)
- [x] Display frequency logic (30-day interval)
- [x] Admin triage support
- [x] 18 unit tests covering validation and workflow

✅ **D) Performance Hardening + Smoke Tests**
- [x] Performance measurement utilities (TTFB, FCP, INP)
- [x] Smoke tests for page loads and metrics
- [x] TTFB < 1s, FCP < 2s baselines
- [x] 4 e2e tests

✅ **E) Accessibility & i18n Primer**
- [x] i18n scaffold with EN translations
- [x] Translation function with parameter substitution
- [x] Coverage for all core UI surfaces
- [x] 7 unit tests for translation coverage

✅ **F) Security & Hardening**
- [x] Security headers (X-Frame-Options, CSP, etc.)
- [x] Pre-commit secret scanning
- [x] Rate limiting infrastructure
- [x] Permission tests
- [x] 16 unit tests for permissions

✅ **Quality Checks**
- [x] Type-check: Passes
- [x] Lint: Passes (warnings only)
- [x] Tests: 417/417 passing (94 new for Day 8)

## Notes

- UI components for collaboration, presets, and feedback are minimal/pending
- Focus on backend, API, and comprehensive test coverage
- Smoke tests are baseline for future e2e expansion
- All features are production-ready from security/permission standpoint
- i18n is scaffolded for future locale additions
- Rate limiting is in-memory (consider Redis for production scale)

## Related Issues

Part of Day 8 "fast follow polish" implementation as specified.
