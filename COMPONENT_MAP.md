# Component Inventory: SignUp & Authentication

**Generated:** 2025-10-06  
**Scope:** All SignUp/SignIn related components

## SignUp Components Found

### ✅ Active Component (Wired to Route)

**File:** `src/pages/SignUp.tsx`  
**Status:** Active - wired to `/auth/sign-up` route  
**Export:** `export default function SignUp()`  
**Lines of Code:** 195  
**Dependencies:**
- `react` (useState)
- `react-router-dom` (useNavigate, Link)
- `framer-motion` (motion, AnimatePresence)
- `lucide-react` (icons)
- `@/integrations/supabase/client`
- `@/hooks/use-toast`

**Features:**
- Email/password registration
- Password confirmation with live validation
- Terms & Privacy checkbox
- Error handling with toast notifications
- Redirects to `/research` on success
- Email verification flow

### 📦 Backup Created

**File:** `src/pages/__backup__/SignUp.2025-10-06-1430.tsx`  
**Status:** Backup copy of original  
**Purpose:** Rollback if replacement fails  
**Created:** 2025-10-06 14:30

## Related Authentication Components

### SignIn Component

**File:** `src/pages/SignIn.tsx`  
**Route:** `/auth/sign-in`  
**Features:**
- Email/password authentication
- Password reset flow
- Links to SignUp page

### AuthProvider

**File:** `src/components/AuthProvider.tsx`  
**Purpose:** Global auth context  
**Wraps:** Entire application in `src/App.tsx`

## Component Variants Search Results

**Search Query:** `SignUp` in `src/**/*.{tsx,ts}`  
**Total Matches:** 5 occurrences in 2 files

**Files:**
1. `src/App.tsx` (import + route definition)
2. `src/pages/SignUp.tsx` (component implementation)

**No duplicate or alternative SignUp components found.**

---

## Ready Status

✅ Route identified: `/auth/sign-up`  
✅ Component located: `src/pages/SignUp.tsx`  
✅ Backup created: `src/pages/__backup__/SignUp.2025-10-06-1430.tsx`  
✅ No conflicts or duplicates detected  
✅ **Ready to replace `SignUp.tsx`**

**Next Step:** Paste replacement component code.
