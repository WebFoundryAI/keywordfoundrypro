-- Create runbook documentation table for versioned operational procedures
CREATE TABLE IF NOT EXISTS public.runbook_docs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  body_md TEXT NOT NULL,
  version INTEGER NOT NULL,
  edited_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_runbook_docs_version
ON public.runbook_docs(version DESC);

CREATE INDEX IF NOT EXISTS idx_runbook_docs_created_at
ON public.runbook_docs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_runbook_docs_edited_by
ON public.runbook_docs(edited_by);

-- Enable RLS
ALTER TABLE public.runbook_docs ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can read runbook docs
CREATE POLICY "Admins can read runbook docs"
ON public.runbook_docs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Policy: Only admins can insert runbook docs
CREATE POLICY "Admins can insert runbook docs"
ON public.runbook_docs
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Seed initial runbook version
INSERT INTO public.runbook_docs (title, body_md, version, edited_by)
SELECT
  'Operations Runbook',
  E'# Operations Runbook

## 1. Rotate API Keys

### DataForSEO API Keys
- **Location**: Supabase Edge Functions secrets
- **Rotation steps**:
  1. Generate new API key in DataForSEO dashboard
  2. Update `DATAFORSEO_API_KEY` in Edge Function secrets
  3. Test with a sample query
  4. Verify observability logs for successful calls
  5. Revoke old API key in DataForSEO dashboard

### Stripe API Keys
- **Location**: Environment variables (`STRIPE_SECRET_KEY`, `STRIPE_PUBLIC_KEY`)
- **Rotation steps**:
  1. Generate new keys in Stripe Dashboard
  2. Update environment variables
  3. Redeploy application
  4. Test checkout flow
  5. Revoke old keys after 24h validation period

### OpenAI API Keys
- **Location**: Edge Function secrets
- **Rotation steps**:
  1. Create new API key in OpenAI dashboard
  2. Update `OPENAI_API_KEY` secret
  3. Test AI features (clustering, insights)
  4. Monitor for errors in logs
  5. Revoke old key

## 2. Rate Limit Increases (DataForSEO)

### Contacts
- Email: api@dataforseo.com
- Support portal: https://dataforseo.com/contact

### Proof of Need Checklist
- [ ] Current usage metrics (last 30 days)
- [ ] Projected growth forecast
- [ ] Business justification
- [ ] Current plan tier
- [ ] Use case description
- [ ] Sample API calls
- [ ] Contact information

### Process
1. Gather metrics from observability dashboard
2. Document use cases and growth projections
3. Submit support ticket with proof of need
4. Follow up within 48 hours
5. Update plan limits in database once approved

## 3. Outage Handling

### Immediate Response
1. **Set status incident** (from Day 6):
   - Navigate to `/admin/status`
   - Create new incident with appropriate severity
   - Update component state (degraded or outage)

2. **Communications template**:
   ```
   Subject: [Service Status] {Component} experiencing {issue}

   We are currently investigating {description of issue}.

   Impact: {affected features/users}
   Started: {timestamp}
   Next update: {estimated time}

   Status page: https://keywordfoundrypro.com/status
   ```

3. **Rollback steps**:
   - Identify deployment version before issue
   - Execute: `git checkout {version-tag}`
   - Redeploy to production
   - Verify service restoration
   - Update status incident

### Investigation Checklist
- [ ] Check Supabase dashboard for database issues
- [ ] Review Edge Function logs
- [ ] Check DataForSEO API status
- [ ] Verify DNS resolution
- [ ] Check for deployment errors
- [ ] Review recent code changes

## 4. Cache Management

### Invalidating Cache Keys
From Day 1 caching implementation:

```sql
-- Clear specific cache entry
DELETE FROM cached_results
WHERE keyword = \\'target-keyword\\';

-- Clear user\\'s cache
DELETE FROM cached_results
WHERE user_id = \\'user-uuid\\';

-- Clear all expired cache
DELETE FROM cached_results
WHERE created_at < NOW() - INTERVAL \\'7 days\\';

-- Check cache statistics
SELECT
  COUNT(*) as total_entries,
  COUNT(DISTINCT user_id) as unique_users,
  SUM(CASE WHEN created_at > NOW() - INTERVAL \\'24 hours\\' THEN 1 ELSE 0 END) as last_24h
FROM cached_results;
```

## 5. GDPR Data Subject Rights (DSR)

From Day 4 implementation:

### Data Export Flow
1. User requests export via `/account` page
2. System collects data from all tables:
   - profiles
   - keyword_research
   - exports
   - project_snapshots
   - clusters
   - audit_events
   - usage_stats
3. Generate JSON file with all user data
4. Record audit event: `dsr_export`
5. Download provided to user

### Data Deletion Flow
1. User requests deletion via `/account` page
2. **Verification checklist**:
   - [ ] Check for active subscriptions
   - [ ] Warn about data permanence
   - [ ] Require explicit confirmation
3. Soft delete all user-owned records (set `deleted_at`)
4. Anonymize profile data:
   ```sql
   UPDATE profiles
   SET
     email = \\'deleted-{user_id}@deleted.local\\',
     display_name = \\'Deleted User\\',
     deleted_at = NOW()
   WHERE user_id = \\'target-user-id\\';
   ```
5. Record audit event: `dsr_delete_requested`
6. Sign out user immediately

### Verification
```sql
-- Verify soft delete applied
SELECT deleted_at, email
FROM profiles
WHERE user_id = \\'target-user-id\\';

-- Verify audit trail
SELECT action, created_at, metadata
FROM audit_events
WHERE user_id = \\'target-user-id\\'
ORDER BY created_at DESC;
```

## 6. Backups & Restore

### Nightly Backup Process
- **Schedule**: 02:00 UTC daily
- **Tables backed up**: projects, cached_results, exports, audit_events, clusters
- **Storage**: Supabase Storage bucket `/backups/{YYYY}/{MM}/{DD}/`
- **Format**: NDJSON compressed (gzip)
- **Retention**: 30 days

### Backup Verification
```sql
-- Check recent backup manifests
SELECT run_at, status, duration_ms, tables
FROM backup_manifests
ORDER BY run_at DESC
LIMIT 7;

-- Verify backup file exists in Storage
SELECT name, created_at, metadata
FROM storage.objects
WHERE bucket_id = \\'backups\\'
ORDER BY created_at DESC
LIMIT 10;
```

### Restore Procedure (DEV ONLY)
⚠️ **NEVER run restore in production without approval**

1. Navigate to `/admin/backups` (dev environment only)
2. Select backup date from list
3. Review manifest for tables and row counts
4. Click "Restore" for specific table
5. Verify restoration in database
6. Check audit logs for restore event

### Manual Backup
```bash
# Export table to CSV
psql $DATABASE_URL -c "\\COPY projects TO \\'projects_backup.csv\\' CSV HEADER"

# Import from CSV
psql $DATABASE_URL -c "\\COPY projects FROM \\'projects_backup.csv\\' CSV HEADER"
```

## 7. Security Notes

### Row Level Security (RLS) Expectations
- **All tables must have RLS enabled**
- **Default deny**: No policy = no access
- **User isolation**: Users can only see their own data
- **Admin override**: Admins can view all data for support

### RLS Verification
```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = \\'public\\'
AND rowsecurity = false;

-- Should return empty - all tables should have RLS

-- List policies per table
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = \\'public\\'
ORDER BY tablename, policyname;
```

### Audit Trail Requirements
- All administrative actions must be logged
- Include: action type, user_id, timestamp, metadata
- Retention: 365 days minimum
- Review monthly for anomalies

### Access Control Checklist
- [ ] RLS enabled on all tables
- [ ] Policies tested with non-admin users
- [ ] Admin actions audited
- [ ] Sensitive data encrypted at rest
- [ ] API keys rotated quarterly
- [ ] User permissions reviewed monthly

## Emergency Contacts

- **Infrastructure**: ops@keywordfoundrypro.com
- **On-call**: Slack #incidents
- **DataForSEO**: api@dataforseo.com
- **Stripe**: https://support.stripe.com
- **Supabase**: support@supabase.io',
  1,
  (SELECT id FROM auth.users WHERE email LIKE '%admin%' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM public.runbook_docs WHERE version = 1);

COMMENT ON TABLE public.runbook_docs IS 'Versioned operational runbook documentation for admin use';
COMMENT ON COLUMN public.runbook_docs.version IS 'Version number, incremented on each edit';
COMMENT ON COLUMN public.runbook_docs.body_md IS 'Markdown content of the runbook';
