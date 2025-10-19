# E2E Testing with Playwright

## Setup

1. **Install Playwright browsers** (first time only):
   ```bash
   npx playwright install
   ```

2. **Create test environment file**:
   ```bash
   cp .env.test.example .env.test
   ```

3. **Add test user credentials** to `.env.test`:
   - Create a test user in your Supabase project
   - Update `TEST_USER_EMAIL` and `TEST_USER_PASSWORD`

## Running Tests

### Run all tests (headless)
```bash
npm run test:e2e
```

### Run with UI mode (recommended for debugging)
```bash
npm run test:e2e:ui
```

### Debug mode (step-by-step)
```bash
npm run test:e2e:debug
```

### Run specific test file
```bash
npx playwright test tests/e2e/auth-redirect.spec.ts
```

## CI Configuration

For CI environments, set these environment variables:
- `TEST_USER_EMAIL` - Test user email
- `TEST_USER_PASSWORD` - Test user password
- `BASE_URL` - Deployed app URL (optional, defaults to localhost)
- `CI=true` - Enables CI-specific settings (retries, single worker)

## Auth Redirect Test

The `auth-redirect.spec.ts` test verifies:
- ✅ Users land on `/app/keyword-research` after login
- ✅ No 404 responses occur during auth flow
- ✅ No 404 page content appears at any point
- ✅ OAuth callback route (`/auth/callback`) works without 404

If this test fails, it indicates a regression in the auth redirect logic.
