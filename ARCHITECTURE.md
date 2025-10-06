# Keyword Foundry Pro - Architecture Documentation

**Last Updated:** 2025-10-06  
**Project Type:** Vite + React + TypeScript + Supabase  
**Status:** Production-ready with light mode theme

---

## Tech Stack

### Core Framework
- **React** `^18.3.1` - UI library
- **TypeScript** `^5.8.3` - Type safety
- **Vite** `^5.4.19` - Build tool and dev server
- **React Router DOM** `^6.30.1` - Client-side routing

### Backend & Database
- **Supabase** `^2.58.0` - PostgreSQL database, authentication, edge functions
- **Project ID:** `vhjffdzroebdkbmvcpgv`
- **Database:** PostgreSQL with Row-Level Security (RLS)

### UI & Styling
- **Tailwind CSS** `^3.4.17` - Utility-first CSS
- **shadcn/ui** - Component library (Radix UI primitives)
- **Framer Motion** `^12.23.22` - Animation library
- **Lucide React** `^0.462.0` - Icon library
- **next-themes** `^0.3.0` - Theme management (configured for light mode only)

### Data & Forms
- **React Hook Form** `^7.61.1` - Form management
- **Zod** `^3.25.76` - Schema validation
- **@tanstack/react-query** `^5.83.0` - Data fetching & caching
- **Recharts** `^2.15.4` - Data visualization

---

## Directory Structure (Depth 3)

```
keyword-foundry-pro/
├── public/
│   ├── favicon.ico
│   ├── placeholder.svg
│   └── robots.txt
├── src/
│   ├── assets/
│   │   └── hero-image.jpg
│   ├── components/
│   │   ├── ui/                      # shadcn/ui components (50+ files)
│   │   │   ├── accordion.tsx
│   │   │   ├── alert.tsx
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── table.tsx
│   │   │   ├── toast.tsx
│   │   │   └── ...
│   │   ├── AuthProvider.tsx         # Authentication context
│   │   ├── Header.tsx               # App header
│   │   ├── KeywordMetricsSummary.tsx
│   │   ├── KeywordResearchForm.tsx
│   │   ├── KeywordResultsTable.tsx
│   │   ├── Navigation.tsx
│   │   ├── ThemeProvider.tsx        # Theme management (light mode only)
│   │   ├── ThemeToggle.tsx          # Exists but not used in UI
│   │   └── UserMenu.tsx             # User dropdown
│   ├── hooks/
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts            # Supabase client config
│   │       └── types.ts             # Auto-generated DB types
│   ├── lib/
│   │   └── utils.ts                 # Utility functions
│   ├── pages/
│   │   ├── Index.tsx                # Landing page (/)
│   │   ├── SignIn.tsx               # Sign-in page (/auth/sign-in)
│   │   ├── SignUp.tsx               # Sign-up page (/auth/sign-up)
│   │   ├── Research.tsx             # Keyword research (/research)
│   │   ├── KeywordResults.tsx       # Research results (/keyword-results)
│   │   ├── SerpAnalysis.tsx         # SERP analysis (/serp-analysis)
│   │   ├── RelatedKeywords.tsx      # Related keywords (/related-keywords)
│   │   └── NotFound.tsx             # 404 page
│   ├── App.tsx                      # Route configuration
│   ├── main.tsx                     # Entry point
│   ├── index.css                    # Global styles + design tokens
│   └── vite-env.d.ts
├── supabase/
│   ├── config.toml                  # Supabase config
│   ├── migrations/                  # Database migrations
│   └── functions/                   # Edge functions (API)
│       ├── keyword-research/
│       │   └── index.ts
│       ├── keyword-suggestions/
│       │   └── index.ts
│       ├── related-keywords/
│       │   └── index.ts
│       └── serp-analysis/
│           └── index.ts
├── ARCHITECTURE.md                  # This file
├── README.md
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── vite.config.ts
└── components.json                  # shadcn/ui config
```

---

## Routes & API Endpoints

### UI Routes (React Router)

| Route | Component | Auth Required | Description |
|-------|-----------|---------------|-------------|
| `/` | `Index.tsx` | No | Landing page with features |
| `/auth/sign-in` | `SignIn.tsx` | No | Email/password sign-in |
| `/auth/sign-up` | `SignUp.tsx` | No | Email/password sign-up |
| `/research` | `Research.tsx` | Yes | Keyword research form |
| `/keyword-results` | `KeywordResults.tsx` | Yes | Research results display |
| `/serp-analysis` | `SerpAnalysis.tsx` | Yes | SERP analysis tool |
| `/related-keywords` | `RelatedKeywords.tsx` | Yes | Related keywords finder |
| `*` | `NotFound.tsx` | No | 404 page |

### API Endpoints (Supabase Edge Functions)

All edge functions are Deno-based serverless functions deployed to Supabase.

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/keyword-research` | POST | Required | Fetch keyword data from DataForSEO Labs API |
| `/keyword-suggestions` | POST | No Auth | Get keyword suggestions (public) |
| `/related-keywords` | POST | Required | Find related keywords with metrics |
| `/serp-analysis` | POST | Required | Analyze SERP results for keywords |

**Edge Function Config (`supabase/config.toml`):**
```toml
project_id = "vhjffdzroebdkbmvcpgv"

[functions.keyword-research]
verify_jwt = true

[functions.keyword-suggestions]
verify_jwt = false

[functions.related-keywords]
verify_jwt = true

[functions.serp-analysis]
verify_jwt = true
```

---

## Environment Variables

### Hardcoded (No .env support in Lovable)

**Frontend (`src/integrations/supabase/client.ts`):**
```typescript
const SUPABASE_URL = "https://vhjffdzroebdkbmvcpgv.supabase.co"
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Edge Functions (Supabase Secrets):**
- `SUPABASE_URL` - Used in all edge functions for DB queries
- `SUPABASE_ANON_KEY` - Public API key
- `SUPABASE_SERVICE_ROLE_KEY` - Admin key for edge functions
- `SUPABASE_DB_URL` - Database connection string
- `DATAFORSEO_LOGIN` - DataForSEO API username
- `DATAFORSEO_PASSWORD` - DataForSEO API password

**Usage Locations:**
- **Edge Functions:** All 4 functions access secrets via `Deno.env.get()`
- **Frontend:** Supabase client initialized in `src/integrations/supabase/client.ts`

---

## Key Dependencies (Top 20 by Impact)

| Package | Version | Purpose | Bundle Impact |
|---------|---------|---------|---------------|
| `react` | 18.3.1 | Core UI library | High |
| `react-dom` | 18.3.1 | React rendering | High |
| `react-router-dom` | 6.30.1 | Client-side routing | Medium |
| `@supabase/supabase-js` | 2.58.0 | Backend client (auth, DB, functions) | High |
| `@tanstack/react-query` | 5.83.0 | Server state management | Medium |
| `framer-motion` | 12.23.22 | Animations (sign-in/up pages) | High |
| `tailwindcss` | 3.4.17 | CSS framework | Build-time |
| `lucide-react` | 0.462.0 | Icon library (tree-shakeable) | Medium |
| `zod` | 3.25.76 | Schema validation | Small |
| `react-hook-form` | 7.61.1 | Form state management | Small |
| `@hookform/resolvers` | 3.10.0 | Zod + React Hook Form integration | Small |
| `@radix-ui/*` | Various | Accessible UI primitives (40+ packages) | High |
| `class-variance-authority` | 0.7.1 | Component variant styling | Small |
| `clsx` | 2.1.1 | Conditional classnames | Tiny |
| `tailwind-merge` | 2.6.0 | Merge Tailwind classes | Small |
| `next-themes` | 0.3.0 | Theme management (light mode only) | Small |
| `sonner` | 1.7.4 | Toast notifications | Small |
| `recharts` | 2.15.4 | Data visualization | High |
| `date-fns` | 3.6.0 | Date utilities | Medium |
| `vite` | 5.4.19 | Build tool | Build-time |

**Radix UI Packages (shadcn/ui foundation):**
- 18 separate packages for accordion, dialog, dropdown, select, tabs, etc.
- All tree-shakeable, only imported components are bundled

---

## Database Schema

### Tables

#### `profiles`
- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users)
- `email` (text)
- `display_name` (text)
- `avatar_url` (text)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**RLS Policies:** Users can view/update their own profile

#### `keyword_research`
- `id` (uuid, PK)
- `user_id` (uuid, FK)
- `seed_keyword` (text)
- `language_code` (text, default: 'en')
- `location_code` (int, default: 2840)
- `results_limit` (int, default: 100)
- `total_results` (int)
- `api_cost` (numeric)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**RLS Policies:** Users can view/create/update their own research

#### `keyword_results`
- `id` (uuid, PK)
- `research_id` (uuid, FK → keyword_research)
- `keyword` (text)
- `search_volume` (int)
- `cpc` (numeric)
- `difficulty` (int)
- `intent` (text)
- `cluster_id` (text)
- `metrics_source` (text)
- `related_keywords` (text[])
- `suggestions` (text[])
- `created_at` (timestamptz)

**RLS Policies:** Users can view/insert results for their research

### Database Functions

#### `handle_new_user()`
- **Trigger:** `AFTER INSERT ON auth.users`
- **Purpose:** Auto-create profile when user signs up
- **Security:** `SECURITY DEFINER`

#### `update_updated_at_column()`
- **Trigger:** `BEFORE UPDATE` on profiles/keyword_research
- **Purpose:** Auto-update `updated_at` timestamp

---

## Build Scripts & Deployment

### NPM Scripts (`package.json`)

```json
{
  "dev": "vite",                          // Local dev server (port 5173)
  "build": "vite build",                  // Production build
  "build:dev": "vite build --mode development", // Dev build with sourcemaps
  "lint": "eslint .",                     // Lint TypeScript files
  "preview": "vite preview"               // Preview production build
}
```

### Build Output
- **Directory:** `dist/`
- **Entry:** `index.html` (SPA)
- **Assets:** Hashed filenames for cache busting
- **Code Splitting:** Automatic route-based splitting

### Deployment Target
- **Platform:** Lovable Cloud (preview) + Custom domain support
- **Edge Functions:** Supabase Edge Network (Deno runtime)
- **Database:** Supabase PostgreSQL (hosted)
- **CDN:** Automatic via Lovable deployment

**Build Command:** `npm run build`  
**Output Directory:** `dist/`

---

## Authentication Flow

### Sign-Up
1. User submits email + password on `/auth/sign-up`
2. `supabase.auth.signUp()` called with `emailRedirectTo` option
3. Supabase creates user in `auth.users` table
4. Database trigger `handle_new_user()` creates profile in `profiles` table
5. User redirected to `/research`
6. (Optional) Email confirmation based on Supabase settings

### Sign-In
1. User submits credentials on `/auth/sign-in`
2. `supabase.auth.signInWithPassword()` authenticates
3. Session stored in localStorage (auto-managed by Supabase)
4. `AuthProvider` updates context with user/session
5. Protected routes check `useAuth()` hook
6. Unauthenticated users redirected to `/auth/sign-in`

### Password Reset
1. User clicks "Forgot password?" on sign-in page
2. `supabase.auth.resetPasswordForEmail()` sends reset link
3. User clicks link in email
4. Redirected to `/auth/sign-in` with reset token
5. (Future: Add password update UI)

---

## Known TODOs, FIXMEs, and Notes

### Aggregated Comments

**File:** `src/pages/Research.tsx`
- **Lines 115-134:** Multiple inline comments about localStorage usage and success message building
  - Stores research ID, keyword, and success messages in localStorage
  - No action items, purely explanatory

### Missing Features (Not in Code)
1. **Password Update UI** - Reset flow sends email but no UI to set new password
2. **Google OAuth Integration** - Frontend prepared but not configured in Supabase
3. **Email Confirmation** - Can be enabled in Supabase settings
4. **User Profile Page** - `UserMenu` has "Profile" link but no route
5. **My Research Page** - `UserMenu` has "My Research" link but no route
6. **Terms & Privacy Pages** - SignUp links to `/terms` and `/privacy` (404)

### Technical Debt
- No centralized error handling (scattered try/catch blocks)
- localStorage used for state persistence (consider React Query persistence)
- No retry logic for failed API calls
- No loading skeletons for tables (just spinners)
- Duplicate code in edge functions (auth checks, CORS headers)

---

## Security Considerations

### Current Protections
✅ Row-Level Security (RLS) enabled on all user tables  
✅ JWT verification on protected edge functions  
✅ Supabase client auto-refreshes tokens  
✅ Input validation with Zod schemas  
✅ SQL injection prevented (Supabase client handles escaping)  
✅ Secrets stored in Supabase (not in code)

### Potential Risks
⚠️ No rate limiting on edge functions (rely on Supabase defaults)  
⚠️ No CAPTCHA on sign-up (vulnerable to bot registrations)  
⚠️ localStorage accessible to XSS (Supabase mitigates with httpOnly cookies on server)  
⚠️ No CSP headers configured  
⚠️ DataForSEO credentials in Supabase secrets (single point of failure)

---

## Performance Optimizations

### Implemented
- **Code Splitting:** React Router lazy loading
- **Tree Shaking:** Vite + ES modules
- **Icon Optimization:** Lucide (tree-shakeable)
- **CSS Purging:** Tailwind production build
- **Asset Hashing:** Cache busting via Vite

### Opportunities
- Add React Query cache persistence
- Implement virtual scrolling for large tables
- Lazy load Framer Motion animations
- Preload critical routes
- Add service worker for offline support

---

## External Services

### DataForSEO API
- **Endpoint:** `https://api.dataforseo.com/v3`
- **Used In:** All 4 edge functions
- **Purpose:** Keyword metrics, SERP data, related keywords
- **Cost Model:** Per-request pricing ($0.002-$0.003 per query)
- **Auth:** Basic auth (username + password in Supabase secrets)

### Supabase Services
- **Database:** PostgreSQL with pgvector extension
- **Auth:** Email/password, OAuth (Google available but not configured)
- **Edge Functions:** Deno runtime on Cloudflare Workers
- **Storage:** Not currently used (buckets exist but no uploads)

---

## Monitoring & Debugging

### Available Tools
- **Supabase Dashboard:** Database logs, auth logs, edge function logs
- **Browser DevTools:** Network tab shows all API calls
- **React Query DevTools:** (Not installed but could add)
- **Console Logs:** Extensive logging in edge functions

### Key Metrics to Monitor
- Edge function invocation count (cost tracking)
- Database query performance (RLS overhead)
- Failed authentication attempts
- API error rates (DataForSEO rate limits)

---

## Development Workflow

### Local Setup
```bash
npm install
npm run dev  # Starts Vite at http://localhost:5173
```

### Testing Edge Functions Locally
```bash
supabase functions serve  # Requires Supabase CLI
```

### Database Migrations
```bash
# Migrations auto-applied by Lovable
# View in Supabase Dashboard > SQL Editor
```

### Code Style
- **Linting:** ESLint with TypeScript rules
- **Formatting:** (Not configured - add Prettier if needed)
- **Conventions:** 
  - React components use PascalCase
  - Hooks use camelCase with `use` prefix
  - Utility functions use camelCase

---

## Browser Support

### Minimum Requirements
- Modern evergreen browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- ES2020 features required (Promise, async/await, optional chaining)
- localStorage support required
- Cookies enabled for Supabase auth

### Known Issues
- Framer Motion animations may lag on older devices
- Large tables (>1000 rows) can cause memory issues in Safari

---

## Contacts & Resources

- **Project Repository:** (Lovable internal)
- **Supabase Dashboard:** https://supabase.com/dashboard/project/vhjffdzroebdkbmvcpgv
- **DataForSEO Docs:** https://docs.dataforseo.com/v3/
- **shadcn/ui Docs:** https://ui.shadcn.com/
- **Tailwind Docs:** https://tailwindcss.com/docs

---

**End of Architecture Documentation**  
*Generated: 2025-10-06*
