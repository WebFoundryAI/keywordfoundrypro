# Integration Example: Cache & Credits in Edge Functions

This document shows how to integrate the cache and credit enforcement helpers into DataForSEO Edge Functions.

## Pattern Overview

```
1. Check credits BEFORE calling DataForSEO
2. Check cache BEFORE calling DataForSEO
3. Call DataForSEO only if cache miss
4. Store result in cache on success
5. Increment usage on success
```

## Complete Example

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { callDataForSEO } from "../_shared/dataforseo/client.ts";
import { getCachedResult, setCachedResult } from "../_shared/cache.ts";
import { enforceCredits, incrementUsage } from "../_shared/credits.ts";
import { CreditLimitError } from "../_shared/dataforseo/types.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await req.json();
    const { keyword, country = 'us', language = 'en', projectId } = body;

    if (!keyword) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: keyword' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. ENFORCE CREDITS - Check before making API call
    try {
      await enforceCredits(supabase, user.id, 'keyword');
    } catch (error) {
      if (error instanceof CreditLimitError) {
        return new Response(
          JSON.stringify({
            error: error.message,
            code: error.code,
            used: error.used,
            limit: error.limit,
            upgradeUrl: '/pricing'
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw error;
    }

    // 3. CHECK CACHE - Avoid re-charging for identical queries
    const cacheResult = await getCachedResult(supabase, {
      userId: user.id,
      projectId,
      seedQuery: keyword,
      country,
      language,
      endpoint: '/v3/dataforseo_labs/google/keywords_for_keywords/live',
    });

    if (cacheResult.hit && cacheResult.data) {
      console.log('[keyword-research] Cache hit, returning cached result');
      return new Response(
        JSON.stringify({
          ...cacheResult.data,
          _meta: {
            cached: true,
            cacheKey: cacheResult.cacheKey,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. CALL DATAFORSEO - Only on cache miss
    console.log('[keyword-research] Cache miss, calling DataForSEO API');

    const payload = {
      keyword,
      location_code: 2840, // US
      language_code: "en",
      depth: 2,
      limit: 1000,
    };

    const response = await callDataForSEO({
      endpoint: '/dataforseo_labs/google/keywords_for_keywords/live',
      payload: [payload],
      module: 'keywords_for_keywords',
      userId: user.id,
      projectId,
    });

    // 5. STORE IN CACHE - Avoid future charges for 24h
    await setCachedResult(supabase, {
      userId: user.id,
      projectId,
      seedQuery: keyword,
      country,
      language,
      endpoint: '/v3/dataforseo_labs/google/keywords_for_keywords/live',
    }, response);

    // 6. INCREMENT USAGE - Track consumption
    await incrementUsage(supabase, user.id, 'keyword', 1);

    // 7. Return result
    return new Response(
      JSON.stringify({
        ...response,
        _meta: {
          cached: false,
          cost: response.cost,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[keyword-research] Error:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

## Key Points

### 1. Credit Enforcement

```typescript
try {
  await enforceCredits(supabase, user.id, 'keyword');
} catch (error) {
  if (error instanceof CreditLimitError) {
    // Return 429 with upgrade CTA
    return Response.json({ error: error.message, code: 'CREDIT_LIMIT' }, { status: 429 });
  }
  throw error;
}
```

**Action Types:**
- `'keyword'` - For keyword research
- `'serp'` - For SERP analysis
- `'related'` - For related keywords

### 2. Cache Integration

**Check cache:**
```typescript
const cacheResult = await getCachedResult(supabase, {
  userId: user.id,
  projectId,
  seedQuery: keyword,
  country,
  language,
  endpoint: '/v3/dataforseo_labs/google/keywords_for_keywords/live',
  filters: { /* optional normalized filters */ }
});

if (cacheResult.hit) {
  return Response.json({ ...cacheResult.data, _cached: true });
}
```

**Store in cache:**
```typescript
await setCachedResult(supabase, {
  userId: user.id,
  projectId,
  seedQuery: keyword,
  country,
  language,
  endpoint: '/v3/dataforseo_labs/google/keywords_for_keywords/live',
}, apiResponse);
```

**Key composition:**
- Deterministic hash of: `userId|projectId|seedQuery|country|language|endpoint|filters`
- Same params = same key = cache hit
- Default TTL: 24 hours

### 3. Usage Tracking

```typescript
// After successful API call
await incrementUsage(supabase, user.id, 'keyword', 1);
```

**This automatically:**
- Updates `user_usage` table
- Respects billing period boundaries
- Returns new usage count

## Admin Bypass (Future Enhancement)

To allow admins to bypass cache:

```typescript
const bypassCache = req.headers.get('X-Bypass-Cache') === 'true';
const isAdmin = await checkIsAdmin(supabase, user.id);

if (!bypassCache || !isAdmin) {
  const cached = await getCachedResult(...);
  if (cached.hit) return cached.data;
}
```

## Cache Invalidation (Future Enhancement)

Admin endpoint to invalidate cache:

```typescript
import { invalidateCacheEntry, invalidateUserCache } from "../_shared/cache.ts";

// Invalidate specific entry
await invalidateCacheEntry(supabase, cacheKey);

// Invalidate all entries for user
const deletedCount = await invalidateUserCache(supabase, userId);
```

## Testing Edge Functions Locally

```bash
# Start Supabase locally
supabase start

# Test with curl
curl -X POST http://localhost:54321/functions/v1/keyword-research \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"keyword": "seo tools", "country": "us", "language": "en"}'

# Test cache hit (run same request twice)
# First call = cache miss, DataForSEO called
# Second call = cache hit, instant response
```

## Error Handling Checklist

- [x] Missing auth → 401
- [x] Credit limit exceeded → 429 with `CreditLimitError`
- [x] Invalid input → 422
- [x] DataForSEO errors → Pass through with proper logging
- [x] Cache failures → Non-blocking (proceed to API call)
- [x] Network errors → Retry with backoff (handled by client)

## Observability

All operations emit structured logs:

```json
{"event": "credit_limit_exceeded", "user_id": "...", "action_type": "keyword", ...}
{"event": "cache_hit", "cache_key": "...", "hit_count": 5, "age_seconds": 3600, ...}
{"event": "cache_set", "cache_key": "...", "ttl_seconds": 86400, ...}
{"event": "usage_incremented", "user_id": "...", "action_type": "keyword", ...}
{"event": "dataforseo_retry", "attempt": 2, "delay_ms": 2000, ...}
```

Query these logs in production to monitor:
- Cache hit rate
- Credit usage patterns
- Retry frequency
- Error rates
