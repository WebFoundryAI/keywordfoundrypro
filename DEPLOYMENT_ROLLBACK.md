# Deployment Rollback Guide

**ISSUE FIX #9: Comprehensive deployment rollback support**

This guide provides procedures for rolling back deployments in case of issues.

## Table of Contents

1. [Overview](#overview)
2. [Version Tagging Strategy](#version-tagging-strategy)
3. [Rollback Procedures](#rollback-procedures)
4. [Docker Image Rollback](#docker-image-rollback)
5. [Database Migration Rollback](#database-migration-rollback)
6. [Supabase Edge Function Rollback](#supabase-edge-function-rollback)
7. [Automated Rollback Script](#automated-rollback-script)
8. [Post-Rollback Checklist](#post-rollback-checklist)

---

## Overview

The rollback system supports reverting to previous versions at multiple levels:
- **Application code** (Git tags + Docker images)
- **Database schema** (Migration rollback)
- **Edge Functions** (Version pinning)
- **Frontend assets** (Static site rollback)

## Version Tagging Strategy

### Semantic Versioning

We use semantic versioning: `v<MAJOR>.<MINOR>.<PATCH>`

Examples:
- `v1.0.0` - Initial release
- `v1.1.0` - New feature (backward compatible)
- `v1.1.1` - Bug fix
- `v2.0.0` - Breaking change

### Creating Release Tags

```bash
# Tag the current commit
git tag -a v1.2.0 -m "Release v1.2.0 - Keyword deduplication and performance improvements"

# Push tag to remote
git push origin v1.2.0

# List all tags
git tag -l
```

### Docker Image Tagging

Each release is tagged with:
- Semantic version: `keywordfoundrypro:v1.2.0`
- Git commit SHA: `keywordfoundrypro:abc123def`
- Latest: `keywordfoundrypro:latest`

```bash
# Build and tag Docker image
docker build -t keywordfoundrypro:v1.2.0 -t keywordfoundrypro:latest .

# Push to registry
docker push keywordfoundrypro:v1.2.0
docker push keywordfoundrypro:latest
```

---

## Rollback Procedures

### 1. Identify Current Version

```bash
# Check currently deployed version
git describe --tags

# Check Docker container version
docker ps | grep keywordfoundrypro

# Check package.json version
cat package.json | grep version
```

### 2. Determine Rollback Target

```bash
# List recent releases
git tag -l --sort=-version:refname | head -10

# View release notes
git show v1.1.0

# Compare versions
git diff v1.1.0..v1.2.0
```

### 3. Execute Rollback

Choose the appropriate rollback method based on your deployment:

- [Git-based rollback](#git-based-rollback)
- [Docker image rollback](#docker-image-rollback)
- [Database migration rollback](#database-migration-rollback)

---

## Git-Based Rollback

### Option A: Rollback via Git Reset (Development)

⚠️ **Warning:** This rewrites history. Only use in non-production environments.

```bash
# Rollback to specific tag
git reset --hard v1.1.0

# Force push (if needed)
git push --force origin main
```

### Option B: Rollback via Revert (Production)

✅ **Recommended:** Preserves history and is safer for production.

```bash
# Create revert commit
git revert HEAD~5..HEAD

# Or revert to specific tag
git revert --no-commit v1.2.0..HEAD
git commit -m "Revert to v1.1.0"

# Push to trigger deployment
git push origin main
```

### Option C: Rollback via New Branch

✅ **Best Practice:** Creates a clean rollback without touching main history.

```bash
# Create rollback branch from previous tag
git checkout -b rollback/v1.1.0 v1.1.0

# Deploy this branch
# Update your CI/CD to deploy from this branch temporarily

# Once stable, merge or create hotfix
git checkout main
git merge rollback/v1.1.0
```

---

## Docker Image Rollback

### Prerequisites

- Docker images tagged with version numbers
- Access to container registry (Docker Hub, AWS ECR, etc.)
- Kubernetes or Docker Compose configuration

### Kubernetes Rollback

```bash
# View deployment history
kubectl rollout history deployment/keywordfoundrypro

# Rollback to previous version
kubectl rollout undo deployment/keywordfoundrypro

# Rollback to specific revision
kubectl rollout undo deployment/keywordfoundrypro --to-revision=3

# Check rollback status
kubectl rollout status deployment/keywordfoundrypro
```

### Docker Compose Rollback

```bash
# Update docker-compose.yml to use previous version
sed -i 's/keywordfoundrypro:v1.2.0/keywordfoundrypro:v1.1.0/g' docker-compose.yml

# Pull and restart
docker-compose pull
docker-compose up -d

# Verify
docker ps
docker logs keywordfoundrypro
```

### Manual Docker Rollback

```bash
# Stop current container
docker stop keywordfoundrypro
docker rm keywordfoundrypro

# Pull previous version
docker pull keywordfoundrypro:v1.1.0

# Start previous version
docker run -d --name keywordfoundrypro \
  -p 5173:5173 \
  -e VITE_SUPABASE_URL=$SUPABASE_URL \
  -e VITE_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY \
  keywordfoundrypro:v1.1.0

# Verify
docker ps
docker logs -f keywordfoundrypro
```

---

## Database Migration Rollback

### Supabase Migration Rollback

Supabase migrations are numbered sequentially. To rollback:

```bash
# List migrations
ls supabase/migrations/

# Identify target migration
# Example: Rolling back from 20251029_create_status_tables.sql
# to 20251028_create_batch_jobs.sql

# Create down migration (manual)
cat > supabase/migrations/20251029_rollback_status_tables.sql <<EOF
-- Rollback migration: 20251029_create_status_tables.sql

DROP TABLE IF EXISTS public.status_components CASCADE;
DROP TABLE IF EXISTS public.status_incidents CASCADE;
DROP TABLE IF EXISTS public.status_pages CASCADE;
EOF

# Apply rollback migration
supabase db push

# Or manually via SQL
supabase db execute -f supabase/migrations/20251029_rollback_status_tables.sql
```

### Best Practices for Migration Rollback

1. **Always create DOWN migrations** alongside UP migrations
2. **Test rollback in staging** before production
3. **Backup database** before migration rollback
4. **Document breaking changes** in migration files

### Example: Reversible Migration Pattern

```sql
-- UP Migration: 20251029_add_column.sql
ALTER TABLE keyword_results ADD COLUMN IF NOT EXISTS cluster_score INTEGER DEFAULT 0;

-- DOWN Migration: 20251029_remove_column.sql
ALTER TABLE keyword_results DROP COLUMN IF EXISTS cluster_score;
```

---

## Supabase Edge Function Rollback

### Version Pinning

Each Edge Function deployment should be versioned:

```bash
# Deploy with version tag
supabase functions deploy keyword-research --import-map=deno.json --no-verify-jwt

# To rollback, redeploy previous version from Git
git checkout v1.1.0
supabase functions deploy keyword-research --import-map=deno.json --no-verify-jwt

# Return to current branch
git checkout main
```

### Edge Function Deployment Log

Keep a deployment log:

```bash
# deployment-log.txt
2025-10-29 10:00 UTC - keyword-research v1.2.0 - SHA abc123
2025-10-28 15:30 UTC - keyword-research v1.1.0 - SHA def456
2025-10-27 09:15 UTC - competitor-analyze v1.1.0 - SHA ghi789
```

---

## Automated Rollback Script

Save as `scripts/rollback.sh`:

```bash
#!/bin/bash
# Automated rollback script

set -e

VERSION=$1

if [ -z "$VERSION" ]; then
  echo "Usage: ./scripts/rollback.sh <version>"
  echo "Example: ./scripts/rollback.sh v1.1.0"
  exit 1
fi

echo "🔄 Starting rollback to $VERSION..."

# 1. Verify version exists
if ! git tag -l | grep -q "^$VERSION$"; then
  echo "❌ Error: Version $VERSION not found"
  exit 1
fi

# 2. Create rollback branch
echo "📦 Creating rollback branch..."
git checkout -b rollback/$VERSION $VERSION

# 3. Rollback Docker image
echo "🐳 Rolling back Docker image..."
sed -i "s/keywordfoundrypro:v.*/keywordfoundrypro:$VERSION/g" docker-compose.yml

# 4. Rollback Edge Functions
echo "⚡ Redeploying Edge Functions from $VERSION..."
supabase functions deploy keyword-research --no-verify-jwt
supabase functions deploy related-keywords --no-verify-jwt
supabase functions deploy competitor-analyze --no-verify-jwt

# 5. Run health checks
echo "🏥 Running health checks..."
npm run test:integration

# 6. Summary
echo "✅ Rollback to $VERSION complete!"
echo ""
echo "Next steps:"
echo "1. Verify application is working: npm run dev"
echo "2. Check logs: docker logs keywordfoundrypro"
echo "3. Monitor for errors"
echo ""
echo "To finalize rollback:"
echo "  git checkout main"
echo "  git merge rollback/$VERSION"
echo "  git push origin main"
```

Make executable:

```bash
chmod +x scripts/rollback.sh
```

Usage:

```bash
# Rollback to v1.1.0
./scripts/rollback.sh v1.1.0
```

---

## Post-Rollback Checklist

After completing a rollback, verify the following:

### 1. Application Health

- [ ] Application starts without errors
- [ ] Health endpoint responds: `curl http://localhost:5173/health`
- [ ] All critical API endpoints functional
- [ ] Database connections working

### 2. Functionality Verification

- [ ] Keyword research working
- [ ] User authentication working
- [ ] Billing/subscriptions working
- [ ] Export functionality working
- [ ] Admin panel accessible

### 3. Performance Monitoring

- [ ] Check error rates in logs
- [ ] Monitor API response times
- [ ] Check database query performance
- [ ] Verify memory usage is stable

### 4. User Communication

- [ ] Notify users of rollback (if user-facing)
- [ ] Update status page
- [ ] Document incident in runbook
- [ ] Schedule post-mortem meeting

### 5. Prevention

- [ ] Identify root cause of issue
- [ ] Add tests to prevent regression
- [ ] Update deployment checklist
- [ ] Review rollback procedure effectiveness

---

## Emergency Rollback Procedure

For critical production issues requiring immediate rollback:

```bash
# 1. STOP - Assess the situation
# - Is this a critical bug affecting all users?
# - Can it be hotfixed quickly?
# - What version should we roll back to?

# 2. NOTIFY team in #incidents channel
# - Declare incident
# - Assign incident commander

# 3. EXECUTE rollback (choose fastest method)

# Option A: Kubernetes (fastest for containerized apps)
kubectl rollout undo deployment/keywordfoundrypro

# Option B: Docker Compose
docker-compose pull
docker-compose up -d --force-recreate

# Option C: Git + Redeploy
git checkout v1.1.0
./deploy.sh

# 4. VERIFY rollback successful
curl -I https://keywordfoundrypro.com/health

# 5. MONITOR for 30 minutes
# - Check error logs
# - Monitor user activity
# - Verify core functions working

# 6. COMMUNICATE status
# - Update status page
# - Notify users if needed
# - Schedule post-mortem
```

---

## Rollback Automation with CI/CD

### GitHub Actions Example

`.github/workflows/rollback.yml`:

```yaml
name: Rollback Deployment

on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to rollback to (e.g., v1.1.0)'
        required: true
        type: string

jobs:
  rollback:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          ref: ${{ inputs.version }}

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Deploy previous version
        run: |
          npm run build
          # Deploy to your hosting provider
          # e.g., npm run deploy

      - name: Verify deployment
        run: npm run test:e2e

      - name: Notify team
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Rollback to ${{ inputs.version }} completed'
        if: always()
```

---

## Support and Troubleshooting

If rollback fails or issues persist:

1. **Check rollback logs:** `docker logs` or `kubectl logs`
2. **Verify database state:** Check recent migrations
3. **Consult runbook:** `/docs/runbooks/`
4. **Escalate to on-call engineer**
5. **Consider full system restore from backup**

### Contact

- **On-call engineer:** Check PagerDuty
- **Incident channel:** #incidents (Slack)
- **Documentation:** `/docs/runbooks/`

---

## Version History

| Version | Date       | Changes                           |
|---------|------------|-----------------------------------|
| 1.0     | 2025-10-29 | Initial rollback guide created    |

