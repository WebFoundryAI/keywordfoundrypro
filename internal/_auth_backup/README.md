# Legacy Auth Backup

**Date:** 2025-10-08
**Reason:** Migration from Supabase Auth to Clerk

## Files Backed Up

### Authentication Components
- `AuthProvider.tsx` - Supabase auth context provider
- `OAuthButtons.tsx` - Google OAuth button component
- `AuthLayout.tsx` - Auth pages layout wrapper

### Pages
- `SignIn.tsx` - Legacy sign-in page with Supabase
- `SignUp.tsx` - Legacy sign-up page with Supabase

### Related Components
- References in `Header.tsx` - Auth UI in header
- References in `UserMenu.tsx` - User dropdown with Supabase auth

## Environment Variables (Removed)
- Supabase auth was using the existing Supabase client from `@/integrations/supabase/client`

## Notes
- All auth logic has been replaced with Clerk React Router SDK
- Visual styling preserved exactly as was
- Protected routes now use Clerk's session management
- User data structure maintained for compatibility
