# Route → Component Mapping

**Generated:** 2025-10-06  
**Source:** `src/App.tsx`

## Authentication Routes

| Route | Component | Import Path | File Location |
|-------|-----------|-------------|---------------|
| `/auth/sign-in` | `SignIn` | `import SignIn from "./pages/SignIn";` | `src/pages/SignIn.tsx` |
| `/auth/sign-up` | `SignUp` | `import SignUp from "./pages/SignUp";` | `src/pages/SignUp.tsx` |

## Application Routes

| Route | Component | Import Path | File Location |
|-------|-----------|-------------|---------------|
| `/` | `Index` | `import Index from "./pages/Index";` | `src/pages/Index.tsx` |
| `/research` | `Research` | `import Research from "./pages/Research";` | `src/pages/Research.tsx` |
| `/keyword-results` | `KeywordResults` | `import KeywordResults from "./pages/KeywordResults";` | `src/pages/KeywordResults.tsx` |
| `/serp-analysis` | `SerpAnalysis` | `import SerpAnalysis from "./pages/SerpAnalysis";` | `src/pages/SerpAnalysis.tsx` |
| `/related-keywords` | `RelatedKeywords` | `import RelatedKeywords from "./pages/RelatedKeywords";` | `src/pages/RelatedKeywords.tsx` |
| `*` (catch-all) | `NotFound` | `import NotFound from "./pages/NotFound";` | `src/pages/NotFound.tsx` |

## Sign-Up Route Details

**Route:** `/auth/sign-up`  
**Component:** `SignUp`  
**Import Line (App.tsx:14):**
```tsx
import SignUp from "./pages/SignUp";
```

**Route Definition (App.tsx:34):**
```tsx
<Route path="/auth/sign-up" element={<SignUp />} />
```

**Active File:** `src/pages/SignUp.tsx`
