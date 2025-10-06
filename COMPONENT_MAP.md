# Component Inventory: SignIn & Authentication

**Generated:** 2025-10-06  
**Scope:** All SignIn/Login related components

## SignIn Components Found

### ✅ Active Component (Wired to Route)

**File:** `src/pages/SignIn.tsx`  
**Status:** Active - wired to `/auth/sign-in` route  
**Export:** `export default function SignIn()`  
**Lines of Code:** 172  
**Dependencies:**
- `react` (useState)
- `react-router-dom` (useNavigate, Link)
- `framer-motion` (motion, AnimatePresence)
- `lucide-react` (Eye, EyeOff, Mail, Lock, ArrowRight icons)
- `@/integrations/supabase/client`
- `@/hooks/use-toast`

**Features:**
- Email/password authentication
- Password visibility toggle
- Password reset flow ("Forgot password?" link)
- Error handling with toast notifications
- Redirects to `/research` on success
- Links to SignUp page

### 📦 Backup Created

**File:** `src/pages/__backup__/SignIn.2025-10-06-1445.tsx`  
**Status:** Backup copy of original  
**Purpose:** Rollback if replacement fails  
**Created:** 2025-10-06 14:45

## Related Authentication Components

### SignUp Component

**File:** `src/pages/SignUp.tsx`  
**Route:** `/auth/sign-up`  
**Features:**
- Email/password registration
- Password confirmation validation
- Terms & Privacy checkbox
- Links to SignIn page

### AuthProvider

**File:** `src/components/AuthProvider.tsx`  
**Purpose:** Global auth context  
**Wraps:** Entire application in `src/App.tsx`

### UserMenu

**File:** `src/components/UserMenu.tsx`  
**Purpose:** User dropdown with sign-out functionality

## Component Variants Search Results

**Search Query:** `SignIn|sign-in|Login|login` in `src/**/*.{tsx,ts}`  
**Total Matches:** 22 occurrences in 11 files

**Files:**
1. `src/App.tsx` (import + route definition)
2. `src/pages/SignIn.tsx` (component implementation) ✅ **WIRED**
3. `src/pages/SignUp.tsx` (links to sign-in)
4. `src/pages/__backup__/SignUp.2025-10-06-1430.tsx` (backup file)
5. `src/pages/Index.tsx` (navigation to sign-in)
6. `src/pages/KeywordResults.tsx` (redirects to sign-in if not authenticated)
7. `src/pages/RelatedKeywords.tsx` (redirects to sign-in if not authenticated)
8. `src/pages/Research.tsx` (redirects to sign-in if not authenticated)
9. `src/pages/SerpAnalysis.tsx` (redirects to sign-in if not authenticated)
10. `src/components/AuthProvider.tsx` (signOut method)
11. `src/components/UserMenu.tsx` (signOut handler)

**No duplicate or alternative SignIn/Login components found.**

---

## Ready Status

✅ Route identified: `/auth/sign-in`  
✅ Component located: `src/pages/SignIn.tsx`  
✅ Backup created: `src/pages/__backup__/SignIn.2025-10-06-1445.tsx`  
✅ No conflicts or duplicates detected  
✅ **Ready to replace `SignIn.tsx`**

**Next Step:** Paste replacement component code.
