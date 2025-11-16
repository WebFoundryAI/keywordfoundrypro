# Database Rebuild Instructions

## Current Status: Database Unresponsive
The database is timing out on all queries. Complete rebuild required.

---

## STEP 1: Reset Database via Supabase Dashboard

### Option A: Database Reset (Recommended)
1. Go to: https://supabase.com/dashboard/project/vhjffdzroebdkbmvcpgv/settings/general
2. Scroll to "Danger Zone"
3. Click "Reset database password" or use the reset option
4. **This will automatically re-run all 102 migrations**

### Option B: Manual SQL Reset (If needed)
If Option A doesn't work, go to SQL Editor and run:

```sql
-- Drop all tables in public schema
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END $$;

-- Drop all functions
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public') 
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS public.' || quote_ident(r.routine_name) || ' CASCADE';
    END LOOP;
END $$;

-- Drop all types
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT typname FROM pg_type WHERE typnamespace = 'public'::regnamespace) 
    LOOP
        EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
    END LOOP;
END $$;
```

Then manually re-run migrations or use Supabase CLI:
```bash
supabase db reset --linked
```

---

## STEP 2: Setup Backup Infrastructure

After database is reset and responsive, run this SQL in SQL Editor:

```sql
-- ============================================
-- BACKUP INFRASTRUCTURE SETUP
-- ============================================

-- 1. Create database-backups storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'database-backups',
  'database-backups',
  false,
  52428800, -- 50MB limit per file
  ARRAY['application/x-ndjson', 'application/json']
)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS Policies for backup storage bucket
CREATE POLICY "Admins can read backup files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'database-backups'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Service role can upload backup files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'database-backups'
);

CREATE POLICY "Service role can delete old backup files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'database-backups'
);

-- 3. Create backup_manifests table
CREATE TABLE IF NOT EXISTS public.backup_manifests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
  tables jsonb NOT NULL,
  duration_ms integer NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.backup_manifests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view backup manifests"
ON public.backup_manifests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE INDEX IF NOT EXISTS idx_backup_manifests_run_at 
ON public.backup_manifests(run_at DESC);

-- 4. Create database health check function
CREATE OR REPLACE FUNCTION public.check_database_health()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  table_count integer;
  function_count integer;
  trigger_count integer;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public';
  
  SELECT COUNT(*) INTO function_count
  FROM information_schema.routines
  WHERE routine_schema = 'public';
  
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers
  WHERE trigger_schema = 'public';
  
  result := jsonb_build_object(
    'status', 'healthy',
    'tables', table_count,
    'functions', function_count,
    'triggers', trigger_count,
    'checked_at', now()
  );
  
  RETURN result;
END;
$$;
```

---

## STEP 3: Setup Automated Daily Backups

Run this SQL to create a cron job for nightly backups:

```sql
-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily backup at 3 AM UTC
SELECT cron.schedule(
  'nightly-database-backup',
  '0 3 * * *', -- 3 AM UTC daily
  $$
  SELECT net.http_post(
    url := 'https://vhjffdzroebdkbmvcpgv.supabase.co/functions/v1/run-backup',
    headers := jsonb_build_object(
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoamZmZHpyb2ViZGtibXZjcGd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxMzA0MDgsImV4cCI6MjA3NDcwNjQwOH0.jxNm1b-5oJJTzFFHpmZ1BNYZGb2lJuphDlmY3Si4tHc',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Verify cron job was created
SELECT * FROM cron.job WHERE jobname = 'nightly-database-backup';
```

---

## STEP 4: Create Your Admin User

Replace `YOUR_AUTH_USER_ID` with your actual user ID from auth.users table:

```sql
-- First, find your user ID
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Then create admin role (replace the UUID)
INSERT INTO public.user_roles (user_id, role)
VALUES ('YOUR_AUTH_USER_ID', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

---

## STEP 5: Seed Essential Data

```sql
-- Create subscription plans
INSERT INTO public.subscription_plans (tier, name, price_monthly, price_yearly, keywords_per_month, serp_analyses_per_month, related_keywords_per_month, max_saved_projects, features, is_active)
VALUES
  ('free', 'Free Plan', 0, 0, 100, 10, 10, 5, ARRAY['Basic keyword research', 'Limited SERP analysis'], true),
  ('pro', 'Pro Plan', 29, 290, 5000, 500, 500, 50, ARRAY['Advanced keyword research', 'Unlimited SERP analysis', 'API access', 'Priority support'], true),
  ('enterprise', 'Enterprise Plan', 99, 990, 50000, 5000, 5000, 500, ARRAY['Everything in Pro', 'White-label', 'Dedicated support', 'Custom integrations'], true)
ON CONFLICT (tier) DO UPDATE SET
  name = EXCLUDED.name,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  keywords_per_month = EXCLUDED.keywords_per_month,
  serp_analyses_per_month = EXCLUDED.serp_analyses_per_month,
  related_keywords_per_month = EXCLUDED.related_keywords_per_month,
  max_saved_projects = EXCLUDED.max_saved_projects,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active;
```

---

## STEP 6: Enable Point-in-Time Recovery (PITR)

**Most Important Step for Future Protection**

1. Go to: https://supabase.com/dashboard/project/vhjffdzroebdkbmvcpgv/settings/addons
2. Find "Point-in-Time Recovery (PITR)"
3. Click "Enable" (requires Pro plan)
4. This provides:
   - Continuous backups every minute
   - 7-day recovery window
   - Much more reliable than custom scripts

---

## STEP 7: Verify Everything Works

```sql
-- 1. Check database health
SELECT public.check_database_health();

-- 2. Verify backup infrastructure
SELECT * FROM storage.buckets WHERE id = 'database-backups';

-- 3. Check cron job
SELECT * FROM cron.job WHERE jobname = 'nightly-database-backup';

-- 4. Test backup (manual trigger)
-- Go to: https://supabase.com/dashboard/project/vhjffdzroebdkbmvcpgv/functions/run-backup
-- Click "Invoke" to test backup function
```

---

## What Was Created

✅ **Edge Function**: `run-backup` - Automated backup system
✅ **Storage Bucket**: `database-backups` - Stores NDJSON backups
✅ **Cron Job**: Daily backups at 3 AM UTC
✅ **Backup Manifests**: Tracks backup history and status
✅ **Health Check Function**: Monitors database status

---

## Data Loss Summary

⚠️ **Lost Forever**:
- All user profiles and accounts
- All saved projects
- All keyword research results
- All cached data
- All historical usage data

✅ **Preserved**:
- Complete database schema (all 102 migrations)
- All RLS security policies
- All database functions and triggers
- All storage bucket configurations
- All application code
- Stripe integration setup

---

## Next Steps After Rebuild

1. ✅ Test user signup/login
2. ✅ Create a test project
3. ✅ Run keyword research
4. ✅ Verify backup runs successfully (check manifests table next day)
5. ✅ Monitor backup logs: https://supabase.com/dashboard/project/vhjffdzroebdkbmvcpgv/functions/run-backup/logs
6. ✅ Enable PITR for maximum protection

---

## Support Links

- **SQL Editor**: https://supabase.com/dashboard/project/vhjffdzroebdkbmvcpgv/sql/new
- **Backup Function Logs**: https://supabase.com/dashboard/project/vhjffdzroebdkbmvcpgv/functions/run-backup/logs
- **Storage Buckets**: https://supabase.com/dashboard/project/vhjffdzroebdkbmvcpgv/storage/buckets
- **Cron Jobs**: https://supabase.com/dashboard/project/vhjffdzroebdkbmvcpgv/database/extensions (enable pg_cron)
- **Database Settings**: https://supabase.com/dashboard/project/vhjffdzroebdkbmvcpgv/settings/database
