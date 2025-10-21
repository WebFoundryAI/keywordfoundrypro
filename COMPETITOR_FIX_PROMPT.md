# Competitor Analyzer Fix - Loveable.dev Prompt

## Problem
Competitor analyzer Edge Function is failing with database insert errors.

## Root Cause
The `competitor_analysis` table doesn't have columns for the new `your_keywords` and `competitor_keywords` fields, causing the database insert to fail and crash the entire Edge Function.

## Solution
Add error handling to the database cache insert so it doesn't crash the API response.

---

## 🚀 PASTE THIS INTO LOVEABLE.DEV:

```
Fix the competitor analyzer Edge Function error handling.

Edit supabase/functions/competitor-analyze/index.ts around line 403-413:

Change this:
    await supabaseClient.from('competitor_analysis').insert({
      user_id: user.id,
      your_domain: yourHost,
      competitor_domain: competitorHost,
      keyword_gap_list: result.keyword_gap_list,
      backlink_summary: result.backlink_summary,
      onpage_summary: result.onpage_summary,
      warnings: result.warnings,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });

To this:
    // Store in competitor_analysis table (only stores gaps for backwards compatibility)
    await supabaseClient.from('competitor_analysis').insert({
      user_id: user.id,
      your_domain: yourHost,
      competitor_domain: competitorHost,
      keyword_gap_list: result.keyword_gap_list,
      backlink_summary: result.backlink_summary,
      onpage_summary: result.onpage_summary,
      warnings: result.warnings,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    }).catch(err => {
      // Log but don't fail - cache storage is not critical
      console.error('Failed to store in competitor_analysis table:', err);
    });

This adds error handling so database insert errors don't crash the API.
```

---

## What This Does

- Wraps the database insert in a `.catch()` to handle errors gracefully
- Logs the error for debugging but doesn't crash the Edge Function
- The API will still return all keyword data to the frontend
- Only the cache storage might fail (which is non-critical)

---

## Testing After Deploy

1. Go to https://keywordfoundrypro.com/competitor-analyzer
2. Enter two domains (e.g., `example.com` vs `competitor.com`)
3. Click "Analyze"
4. Should now see results with:
   - Your Keywords list
   - Competitor Keywords list
   - Keyword Gaps list
   - Backlink comparison
   - On-page comparison

---

**Created:** October 21, 2025
**Fix:** Edge Function error handling for database inserts
