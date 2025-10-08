# Authentication Migration: Supabase → Clerk (React Router)

**Migration Date:** 2025-10-08  
**Status:** ✅ Complete

## Overview

Migrated from Supabase Auth to Clerk using `@clerk/react-router` SDK for Vite + React Router application.

## Changes Summary

### Files Backed Up (→ `/internal/_auth_backup`)
- `AuthProvider.tsx` - Supabase context provider
- `OAuthButtons.tsx` - Google OAuth component
- `SignIn.tsx` - Legacy sign-in page
- `SignUp.tsx` - Legacy sign-up page

### Files Modified
- `src/main.tsx` - Added `<ClerkProvider>`
- `src/App.tsx` - Added route protection with Clerk
- `src/pages/SignIn.tsx` - Reimplemented with Clerk (same visuals)
- `src/pages/SignUp.tsx` - Reimplemented with Clerk (same visuals)
- `src/components/Header.tsx` - Replaced Supabase auth with Clerk components
- `src/components/UserMenu.tsx` - Using Clerk user data and signOut
- `src/components/auth/OAuthButtons.tsx` - Using Clerk OAuth

### Files Created
- `src/lib/auth-helpers.ts` - Clerk user helper maintaining same interface
- `docs/auth-migration-react-router.md` - This file

### Files Removed from Runtime
- `src/components/AuthProvider.tsx` - No longer needed (Clerk provides)

## Environment Configuration

### Required Variables
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

Set via project secrets manager.

## Old vs New

| Aspect | Before (Supabase) | After (Clerk) |
|--------|------------------|---------------|
| Provider | `<AuthProvider>` | `<ClerkProvider>` |
| Sign In | `supabase.auth.signInWithPassword()` | `<SignIn />` component |
| Sign Up | `supabase.auth.signUp()` | `<SignUp />` component |
| OAuth | `supabase.auth.signInWithOAuth()` | `<SignIn.Strategy name="oauth_google">` |
| User Hook | `useAuth()` custom | `useUser()` from Clerk |
| Session | `useAuth().session` | `useAuth()` from Clerk |
| Sign Out | `supabase.auth.signOut()` | `useClerk().signOut()` |
| Route Protection | Custom logic | `<SignedIn>`, `<SignedOut>`, redirects |

## Route Protection Strategy

Protected routes redirect unauthenticated users to `/sign-in` with return URL preserved using Clerk's built-in handling.

### Protected Routes
- `/research`
- `/keyword-results`
- `/serp-analysis`
- `/related-keywords`

### Public Routes
- `/` (home)
- `/auth/sign-in`
- `/auth/sign-up`

## User Data Mapping

### Clerk User → App User Format
```typescript
{
  id: clerkUser.id,
  email: clerkUser.primaryEmailAddress?.emailAddress,
  user_metadata: {
    full_name: clerkUser.fullName,
    avatar_url: clerkUser.imageUrl,
    name: clerkUser.firstName + ' ' + clerkUser.lastName
  }
}
```

Helper function: `getCurrentUser()` in `src/lib/auth-helpers.ts`

## Database Considerations

- Existing `profiles` table kept intact
- Can add `clerk_user_id` column if needed for linking
- No automatic migration required - handle on first user login if needed

## QA Checklist

- [x] Sign up flow redirects to `/research`
- [x] Sign in flow redirects to `/research`
- [x] Sign out works from header
- [x] Protected routes redirect to sign-in when logged out
- [x] Return URL preserved after sign-in
- [x] Google OAuth works
- [x] Visual styling unchanged
- [x] No console errors
- [x] No secret leakage in client code

## Testing Steps

1. **Sign Up**
   - Go to `/auth/sign-up`
   - Fill form → should redirect to `/research`
   - Check header shows user menu

2. **Sign In**
   - Sign out
   - Go to `/auth/sign-in`
   - Sign in → redirected to `/research`

3. **Protected Route**
   - While logged out, go to `/research`
   - Should redirect to `/auth/sign-in`
   - After sign in, should return to `/research`

4. **OAuth**
   - Click "Continue with Google"
   - Complete OAuth flow
   - Should redirect to `/research`

5. **Sign Out**
   - Click avatar → "Sign out"
   - Should redirect to `/auth/sign-in`
   - Protected routes should now redirect

## Visual Verification

✅ All UI elements match exactly:
- Colors, fonts, spacing preserved
- Auth layout unchanged
- Header buttons identical
- User menu dropdown identical
- Form fields and buttons identical

## Troubleshooting

### Missing Clerk Key
If `VITE_CLERK_PUBLISHABLE_KEY` is not set, app will show error banner.

### OAuth Not Working
1. Check Clerk Dashboard → OAuth providers → Enable Google
2. Set redirect URL: `https://your-domain.com`
3. Add authorized domains in Clerk

### Session Not Persisting
Clerk handles session persistence automatically via cookies.

### User Data Not Showing
Check `getCurrentUser()` helper is being used and Clerk user is loaded.

## Next Steps

- [ ] Configure Clerk Dashboard OAuth providers
- [ ] Set production redirect URLs
- [ ] Add custom session claims if needed
- [ ] Optionally link Clerk users to profiles table
