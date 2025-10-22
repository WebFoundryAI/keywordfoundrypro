# 🔍 Competitor Analyzer - Complete Flow & External Resources

## What the Page Does

The Competitor Analyzer at `https://keywordfoundrypro.com/competitor-analyzer` compares two domains to identify:
1. **Keyword Gaps** - Keywords your competitor ranks for that you don't
2. **All Ranked Keywords** - Full lists for both domains
3. **Backlink Summary** - Backlink metrics for both domains
4. **On-Page SEO** - Technical scores for both domains

---

## 📊 Complete Request Flow

### **Frontend → Backend → External APIs**

```
User Browser
    ↓ (1) User enters domains & clicks "Compare"
    ↓
Frontend (CompetitorAnalyzer.tsx)
    ↓ (2) Calls: invokeWithAuth('competitor-analyze', payload)
    ↓
Supabase Edge Function (competitor-analyze/index.ts)
    ↓ (3) Makes 6 external API calls to DataForSEO
    ↓
DataForSEO API (https://api.dataforseo.com/v3)
    ↓ (4) Returns keyword, backlink, and on-page data
    ↓
Edge Function processes & combines data
    ↓ (5) Returns results to frontend
    ↓
Frontend displays results
```

---

## 🌐 External Resources Called

### **1. Supabase Services**

**Supabase URL**: `https://vhjffdzroebdkbmvcpgv.supabase.co`

**Calls Made**:
- **Auth Check**: `supabase.auth.getSession()` - Verify user is logged in
- **Admin Check**: `supabase.rpc('is_admin', { _user_id: user.id })` - Check if admin
- **Profile Check**: `supabase.from('profiles').select('free_reports_used, free_reports_renewal_at')` - Check usage limits
- **Edge Function**: `supabase.functions.invoke('competitor-analyze', payload)` - Main analysis request
- **Cache Check**: `supabase.from('competitor_cache').select()` - Check for cached results
- **Cache Store**: `supabase.from('competitor_analysis').insert()` - Store results

### **2. DataForSEO API** ⭐ (MAIN EXTERNAL DEPENDENCY)

**Base URL**: `https://api.dataforseo.com/v3`

**6 API Calls Made Per Analysis**:

#### **Call #1 & #2: Ranked Keywords** (2 calls - one per domain)
- **Endpoint**: `/dataforseo_labs/google/ranked_keywords/live`
- **Purpose**: Get all keywords each domain ranks for
- **Parameters**:
  - `target`: domain name (e.g., "gooutdoors.co.uk")
  - `location_code`: country (default: 2840 = USA)
  - `language_code`: language (default: "en")
  - `limit`: max keywords (default: 300)
- **Returns**: Array of keywords with rank, search volume, URL
- **Cost**: ~0.05 credits per call

#### **Call #3 & #4: Backlink Summary** (2 calls - one per domain)
- **Endpoint**: `/backlinks/summary/live`
- **Purpose**: Get backlink metrics
- **Parameters**:
  - `target`: domain name
  - `include_subdomains`: true
- **Returns**:
  - Total backlinks count
  - Referring domains count
  - Referring IPs count
- **Cost**: ~0.01 credits per call

#### **Call #5 & #6: On-Page Analysis** (2 calls - one per domain)
- **Step A - Create Task**: `/on_page/task_post`
  - Creates a crawl task for the domain
  - Crawls up to 50 pages
  - Returns a `task_id`
- **Step B - Poll Results**: `/on_page/summary/{task_id}`
  - Polls up to 8 times with 8-second delays
  - Max wait time: 64 seconds
  - Gets technical SEO metrics
- **Returns**:
  - Pages crawled count
  - Internal links count
  - External links count
  - Images count
  - Technical score (0-100)
- **Cost**: ~0.1 credits per call

---

## ⏱️ Timing Breakdown

**Total Time**: 60-90 seconds

1. **Auth & Profile Check**: 1-2 seconds
2. **Cache Check**: 1-2 seconds (if cache hit, stops here)
3. **Ranked Keywords (2x)**: 5-10 seconds each = 10-20 seconds total
4. **Backlink Summary (2x)**: 2-5 seconds each = 4-10 seconds total
5. **On-Page Analysis (2x)**:
   - Task creation: 2-3 seconds each
   - Polling (8 attempts × 8s): up to 64 seconds
   - **This is the slowest part** = 40-64 seconds total
6. **Process & Return**: 1-2 seconds

---

## 💰 Cost Per Analysis (DataForSEO Credits)

| API Call | Cost | Count | Total |
|----------|------|-------|-------|
| Ranked Keywords | 0.05 | × 2 | 0.10 |
| Backlinks | 0.01 | × 2 | 0.02 |
| On-Page | 0.10 | × 2 | 0.20 |
| **TOTAL** | | | **0.32 credits** |

**Approximate USD cost**: $0.32 per analysis (at $1 per credit)

---

## 🔒 Authentication & Permissions

**Required**:
1. User must be signed in (JWT token required)
2. Session must be valid
3. For non-admins: Must have free reports remaining (< 3 used)

**Admin Bypass**:
- Admins skip usage limits
- No credit counter increment
- Can run unlimited analyses

---

## 📦 Environment Variables Required

**In Supabase Edge Function Secrets**:
```env
DATAFORSEO_LOGIN=your_dataforseo_username
DATAFORSEO_PASSWORD=your_dataforseo_password
SUPABASE_URL=https://vhjffdzroebdkbmvcpgv.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Missing Credentials = "Failed to send request" error**

---

## ❌ Common Failure Points

### **1. "Failed to send request to the edge function"**
**Cause**: Edge Function not deployed to Supabase
**Fix**: Deploy via Loveable.dev or Supabase CLI

### **2. "DataForSEO credits exhausted"**
**Cause**: No credits in DataForSEO account
**Fix**: Add credits at https://app.dataforseo.com

### **3. "Network error"**
**Causes**:
- DataForSEO API timeout (> 64 seconds)
- DataForSEO API rate limit (429 error)
- Invalid DataForSEO credentials (401 error)
- Domain has no search visibility (0 keywords found)

### **4. "Authentication Error"**
**Cause**: Session expired or no auth token
**Fix**: Sign out and sign in again

---

## 🔍 How to Debug

### **Step 1: Check Edge Function is Deployed**

Open browser console (F12) and run:
```javascript
const { data, error } = await supabase.functions.invoke('competitor-analyze', {
  body: { op: 'health' }
});
console.log('Health:', data);
```

**Expected**: `{ ok: true, d4s_creds_present: true }`
**If error**: Edge Function not deployed

### **Step 2: Check DataForSEO Credentials**

If health check shows `d4s_creds_present: false`:
- DataForSEO credentials not set in Supabase Edge Function secrets
- Go to Supabase Dashboard → Edge Functions → Secrets
- Add `DATAFORSEO_LOGIN` and `DATAFORSEO_PASSWORD`

### **Step 3: Check DataForSEO Credits**

1. Login to https://app.dataforseo.com
2. Check balance in dashboard
3. Need at least 0.32 credits per analysis
4. If low, add more credits

### **Step 4: Check Browser Console Logs**

When running analysis, look for:
```
[d4s] request_id Fetching keywords for YOUR domain: example.com
[d4s] request_id Found 150 keywords for example.com
[d4s] request_id onpage_poll attempt 1/8 for example.com
```

These logs show which step it's on.

---

## 🎯 Summary

**The competitor analyzer**:
- Calls **1 Supabase Edge Function** (`competitor-analyze`)
- Which calls **6 DataForSEO API endpoints**
- Takes **60-90 seconds** to complete
- Costs **~$0.32** per analysis (in DataForSEO credits)
- Requires **valid DataForSEO credentials** and **credits**

**If you're getting errors**, the issue is likely:
1. ❌ Edge Function not deployed → Deploy via Loveable.dev
2. ❌ DataForSEO credentials missing → Add to Supabase secrets
3. ❌ DataForSEO credits exhausted → Add credits to account
4. ❌ Auth issues → Sign out and in again

**Run the health check in Step 1 above to diagnose!** 🔍
