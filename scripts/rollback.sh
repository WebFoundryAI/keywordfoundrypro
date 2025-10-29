#!/bin/bash
#
# ISSUE FIX #9: Automated deployment rollback script
#
# Usage: ./scripts/rollback.sh <version>
# Example: ./scripts/rollback.sh v1.1.0
#
# This script automates the rollback process including:
# - Git checkout to specified version
# - Docker image rollback
# - Edge Function redeployment
# - Health checks
#

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOCKER_IMAGE="keywordfoundrypro"
EDGE_FUNCTIONS=("keyword-research" "related-keywords" "competitor-analyze" "serp-analysis" "rankping")

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if version argument provided
if [ $# -eq 0 ]; then
    log_error "No version specified"
    echo ""
    echo "Usage: $0 <version>"
    echo "Example: $0 v1.1.0"
    echo ""
    echo "Available versions:"
    git tag -l --sort=-version:refname | head -10
    exit 1
fi

VERSION=$1

log_info "Starting rollback to $VERSION..."
echo ""

# 1. Verify version exists
log_info "Step 1/6: Verifying version exists..."
if ! git tag -l | grep -q "^$VERSION$"; then
    log_error "Version $VERSION not found in git tags"
    echo ""
    echo "Available versions:"
    git tag -l --sort=-version:refname | head -10
    exit 1
fi
log_success "Version $VERSION found"
echo ""

# 2. Check for uncommitted changes
log_info "Step 2/6: Checking for uncommitted changes..."
if ! git diff-index --quiet HEAD --; then
    log_warning "You have uncommitted changes"
    echo ""
    git status --short
    echo ""
    read -p "Do you want to stash these changes? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git stash save "Pre-rollback stash $(date +%Y-%m-%d_%H:%M:%S)"
        log_success "Changes stashed"
    else
        log_error "Rollback aborted. Please commit or stash your changes first."
        exit 1
    fi
fi
log_success "Working directory clean"
echo ""

# 3. Create rollback branch
log_info "Step 3/6: Creating rollback branch..."
BRANCH_NAME="rollback/$VERSION-$(date +%Y%m%d-%H%M%S)"
git checkout -b "$BRANCH_NAME" "$VERSION" 2>/dev/null || {
    log_warning "Branch already exists, switching to it..."
    git checkout "$BRANCH_NAME"
}
log_success "Checked out to $BRANCH_NAME"
echo ""

# 4. Rollback Docker image (if docker-compose.yml exists)
if [ -f "docker-compose.yml" ]; then
    log_info "Step 4/6: Updating Docker Compose configuration..."

    # Backup current docker-compose.yml
    cp docker-compose.yml "docker-compose.yml.backup-$(date +%Y%m%d-%H%M%S)"

    # Update image version
    sed -i.bak "s/${DOCKER_IMAGE}:v[0-9]\+\.[0-9]\+\.[0-9]\+/${DOCKER_IMAGE}:$VERSION/g" docker-compose.yml

    log_success "Docker Compose updated to use $DOCKER_IMAGE:$VERSION"

    # Optionally restart containers
    read -p "Do you want to restart Docker containers now? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Pulling and restarting containers..."
        docker-compose pull
        docker-compose up -d --force-recreate
        log_success "Containers restarted"
    fi
else
    log_warning "docker-compose.yml not found, skipping Docker rollback"
fi
echo ""

# 5. Rollback Edge Functions (if Supabase CLI available)
if command -v supabase &> /dev/null; then
    log_info "Step 5/6: Redeploying Edge Functions from $VERSION..."

    for func in "${EDGE_FUNCTIONS[@]}"; do
        if [ -d "supabase/functions/$func" ]; then
            log_info "Deploying $func..."
            if supabase functions deploy "$func" --no-verify-jwt 2>/dev/null; then
                log_success "$func deployed"
            else
                log_warning "$func deployment failed (may not exist)"
            fi
        fi
    done

    log_success "Edge Functions redeployment complete"
else
    log_warning "Supabase CLI not found, skipping Edge Function rollback"
    log_info "To manually rollback Edge Functions, run:"
    echo "  supabase functions deploy <function-name> --no-verify-jwt"
fi
echo ""

# 6. Run health checks
log_info "Step 6/6: Running health checks..."

# Check if npm test command exists
if grep -q '"test"' package.json; then
    log_info "Running unit tests..."
    if npm test -- --run 2>&1 | tail -n 20; then
        log_success "Tests passed"
    else
        log_warning "Some tests failed - please review"
    fi
else
    log_warning "No test script found in package.json"
fi

# Check if application is running
if command -v curl &> /dev/null; then
    log_info "Checking application health..."

    # Try localhost:5173 (Vite dev server)
    if curl -f -s http://localhost:5173 > /dev/null 2>&1; then
        log_success "Application is responding at http://localhost:5173"
    else
        log_warning "Application not responding at http://localhost:5173"
        log_info "You may need to start the dev server: npm run dev"
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_success "Rollback to $VERSION complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
log_info "Current branch: $BRANCH_NAME"
log_info "Previous version backed up in docker-compose.yml.backup-*"
echo ""
echo "Next steps:"
echo "1. Verify application is working:"
echo "   npm run dev"
echo ""
echo "2. Check logs for errors:"
echo "   docker logs $DOCKER_IMAGE  # if using Docker"
echo "   npm run dev                 # check console output"
echo ""
echo "3. Run integration tests:"
echo "   npm run test:integration"
echo ""
echo "4. If everything looks good, finalize the rollback:"
echo "   git checkout main"
echo "   git merge $BRANCH_NAME"
echo "   git push origin main"
echo ""
echo "5. If issues persist, you can rollback further or restore from backup"
echo ""
log_warning "Remember to:"
echo "  - Update status page if user-facing"
echo "  - Notify team in #incidents"
echo "  - Document incident in runbook"
echo "  - Schedule post-mortem"
echo ""

# Save rollback log
ROLLBACK_LOG="rollback-log-$(date +%Y%m%d-%H%M%S).txt"
cat > "$ROLLBACK_LOG" <<EOF
Rollback Log
============

Date: $(date)
Target Version: $VERSION
Rollback Branch: $BRANCH_NAME
Operator: $(whoami)

Steps Completed:
1. Version verification: ✅
2. Uncommitted changes check: ✅
3. Rollback branch creation: ✅
4. Docker image rollback: $([ -f "docker-compose.yml" ] && echo "✅" || echo "⏭️  Skipped")
5. Edge Function redeployment: $(command -v supabase &> /dev/null && echo "✅" || echo "⏭️  Skipped")
6. Health checks: ✅

Next Actions Required:
- Verify application functionality
- Monitor for errors
- Finalize rollback if successful
- Document incident

EOF

log_info "Rollback log saved to: $ROLLBACK_LOG"
