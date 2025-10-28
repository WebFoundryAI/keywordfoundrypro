# GitHub Issues for Day 10 Implementation

Create these issues in the GitHub repository to track remaining work and improvements.

---

## Issue 1: Add Integration Tests for API Routes

**Labels:** `testing`, `enhancement`, `good first issue`
**Priority:** Medium
**Assignee:** Unassigned

### Description

All Day 10 API routes currently have excellent unit test coverage (311 tests passing), but lack integration tests that verify end-to-end functionality with actual HTTP requests and database interactions.

### Acceptance Criteria

- [ ] Add integration tests for `/api/projects/[projectId]/members` (GET, POST, PATCH, DELETE)
- [ ] Add integration tests for `/api/roadmap` (GET, POST)
- [ ] Add integration tests for `/api/roadmap/[itemId]` (PATCH, DELETE)
- [ ] Add integration tests for `/api/roadmap/[itemId]/vote` (POST, DELETE)
- [ ] Add integration tests for `/api/batch/import` routes
- [ ] Tests should verify authentication, authorization, and RLS policies
- [ ] Use test database or mocks for Supabase interactions

### Technical Notes

Consider using:
- Supertest for HTTP testing
- Test containers for database isolation
- Mock Supabase client for faster tests

### Related

- Day 10 PR #XXX

---

## Issue 2: Implement Rate Limiting for Member Management

**Labels:** `security`, `enhancement`
**Priority:** High
**Assignee:** Unassigned

### Description

The member management endpoints (`/api/projects/[projectId]/members`) currently have no rate limiting, which could allow abuse through rapid add/remove operations.

### Security Impact

- **Severity:** Medium
- **Attack Vector:** Authenticated users could spam member operations
- **Mitigation:** Add rate limiting middleware

### Proposed Solution

Implement rate limiting for:
- POST `/api/projects/[projectId]/members` - Max 10 requests per minute
- PATCH `/api/projects/[projectId]/members` - Max 20 requests per minute
- DELETE `/api/projects/[projectId]/members` - Max 10 requests per minute

### Acceptance Criteria

- [ ] Rate limiting middleware implemented
- [ ] Different limits for different endpoints
- [ ] Proper 429 Too Many Requests responses
- [ ] Rate limit headers included (X-RateLimit-*)
- [ ] Tests for rate limiting behavior

### Recommended Libraries

- `express-rate-limit`
- `rate-limiter-flexible`

### Related

- Day 10 security fixes (commit 159ada2)

---

## Issue 3: Cache Vote Counts in Database

**Labels:** `performance`, `optimization`
**Priority:** Medium
**Assignee:** Unassigned

### Description

The `GET /api/roadmap` endpoint currently calculates vote counts on every request by fetching all votes and counting them in memory. This is O(n*m) complexity and will not scale.

### Current Behavior

```typescript
// Fetches all votes
const { data: votes } = await supabase
  .from('roadmap_votes')
  .select('item_id');

// Counts in memory
const voteCounts: Record<string, number> = {};
votes?.forEach((vote) => {
  voteCounts[vote.item_id] = (voteCounts[vote.item_id] || 0) + 1;
});
```

### Proposed Solution

1. Add `vote_count` column to `roadmap_items` table
2. Create database triggers to increment/decrement on vote insert/delete
3. Update API to read cached count directly

### Acceptance Criteria

- [ ] Migration adds `vote_count INTEGER DEFAULT 0` to `roadmap_items`
- [ ] Trigger increments count on `roadmap_votes` INSERT
- [ ] Trigger decrements count on `roadmap_votes` DELETE
- [ ] API reads `vote_count` directly instead of calculating
- [ ] Migration includes backfill for existing data
- [ ] Tests verify trigger behavior

### Migration Example

```sql
ALTER TABLE roadmap_items ADD COLUMN vote_count INTEGER DEFAULT 0;

CREATE OR REPLACE FUNCTION update_roadmap_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE roadmap_items SET vote_count = vote_count + 1 WHERE id = NEW.item_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE roadmap_items SET vote_count = vote_count - 1 WHERE id = OLD.item_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER roadmap_vote_count_trigger
  AFTER INSERT OR DELETE ON roadmap_votes
  FOR EACH ROW EXECUTE FUNCTION update_roadmap_vote_count();
```

### Related

- src/app/api/roadmap/route.ts:24-38

---

## Issue 4: Display User Names Instead of IDs in MemberManager

**Labels:** `ui`, `enhancement`, `ux`
**Priority:** Medium
**Assignee:** Unassigned

### Description

The `MemberManager` component currently displays raw user IDs instead of user names or emails, making it difficult to identify team members.

### Current Behavior

```
User ID: 550e8400-e29b-41d4-a716-446655440000
```

### Desired Behavior

```
John Doe (john@example.com)
```

### Proposed Solution

1. Join with `profiles` table when fetching members
2. Display `display_name` or `email` instead of `user_id`
3. Fall back to user ID if profile not found

### Acceptance Criteria

- [ ] API returns user profile data with member list
- [ ] UI displays name/email prominently
- [ ] User ID shown in smaller text or tooltip
- [ ] Graceful fallback if profile missing
- [ ] No breaking changes to existing API

### Files to Modify

- `src/app/api/projects/[projectId]/members/route.ts`
- `src/components/projects/MemberManager.tsx`
- `src/lib/permissions/roles.ts` (getProjectMembers)

### Related

- src/components/projects/MemberManager.tsx:304-308

---

## Issue 5: Add Navigation Link to ProjectMembers Page

**Labels:** `ui`, `navigation`, `ux`
**Priority:** Low
**Assignee:** Unassigned

### Description

The `ProjectMembers` page (`/project-members`) was created but there's no navigation link to access it, making it discoverable only by direct URL.

### Current State

- Page exists at `/project-members?projectId=XXX`
- No link in main navigation
- No link in project settings
- Users cannot discover this feature

### Proposed Solution

Add link in appropriate location(s):
1. Project settings dropdown/menu
2. Project detail page sidebar
3. User/team management section

### Acceptance Criteria

- [ ] Navigation link added to project settings
- [ ] Link includes correct projectId parameter
- [ ] Link only visible to users with canView permission
- [ ] Icon added for better UX
- [ ] Mobile-friendly navigation

### Design Considerations

- Should this be under a "Settings" or "Team" section?
- Should we show member count badge?
- Should non-owners see "View Team" vs "Manage Team"?

### Files to Modify

- `src/components/MainLayout.tsx` or similar navigation component
- Possibly create project-specific navigation component

### Related

- src/pages/ProjectMembers.tsx

---

## Issue 6: Improve Phone Number Regex for International Formats

**Labels:** `security`, `privacy`, `bug`, `good first issue`
**Priority:** Low
**Assignee:** Unassigned

### Description

The PII redaction regex for phone numbers in `src/lib/privacy/filters.ts` only matches US phone number formats and will miss international numbers.

### Current Regex

```typescript
const phonePattern = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;
```

### Issues

- Only matches 10-digit US format
- Misses international prefixes (+1, +44, etc.)
- Misses parentheses format: (555) 123-4567
- Misses extensions: x1234

### Proposed Solution

Use a more comprehensive regex or library like `libphonenumber-js`.

### Example Improvement

```typescript
const phonePattern = /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}(\s*(ext|x)\s*\d+)?/gi;
```

Or use library:
```typescript
import { parsePhoneNumber } from 'libphonenumber-js';
```

### Acceptance Criteria

- [ ] Regex matches US formats: (555) 123-4567, 555-123-4567, 555.123.4567
- [ ] Regex matches international: +1-555-123-4567, +44 20 7123 4567
- [ ] Regex matches extensions: 555-123-4567 x1234
- [ ] Tests added for all formats
- [ ] No false positives on non-phone numbers

### Test Cases

```typescript
// Should match
"+1-555-123-4567"
"(555) 123-4567"
"+44 20 7123 4567"
"555.123.4567 ext 1234"

// Should not match
"123-45-6789" // SSN format
"192.168.1.1" // IP address
```

### Related

- src/lib/privacy/filters.ts:15-17

---

## Issue 7: Add E2E Tests for Day 10 User Flows

**Labels:** `testing`, `e2e`, `enhancement`
**Priority:** Medium
**Assignee:** Unassigned

### Description

While unit tests provide good coverage, E2E tests are needed to verify complete user workflows for Day 10 features.

### User Flows to Test

1. **Team Collaboration Flow**
   - Owner adds viewer to project
   - Viewer can see project but cannot edit
   - Owner upgrades viewer to editor
   - Editor can modify resources
   - Owner removes editor

2. **Roadmap Voting Flow**
   - Anonymous user views roadmap
   - Authenticated user votes for item
   - User sees vote count increment
   - User removes vote
   - User cannot vote twice

3. **Privacy Settings Flow**
   - User navigates to privacy settings
   - User enables opt-out
   - User sets retention period
   - Settings persist after reload

4. **Admin Roadmap Management**
   - Admin creates roadmap item
   - Admin changes item state
   - Non-admin cannot access admin page
   - Admin deletes item

### Acceptance Criteria

- [ ] E2E tests using Playwright or Cypress
- [ ] Tests run against test database
- [ ] Tests verify UI interactions
- [ ] Tests verify database state changes
- [ ] Tests run in CI/CD pipeline

### Recommended Tools

- Playwright (already in project)
- Testing Library for component queries
- Mock Supabase or test database

### Related

- All Day 10 UI components

---

## Issue 8: Document Day 10 API Endpoints

**Labels:** `documentation`, `good first issue`
**Priority:** Low
**Assignee:** Unassigned

### Description

The Day 10 API endpoints need comprehensive documentation for frontend developers and API consumers.

### Missing Documentation

- Endpoint descriptions
- Request/response schemas
- Authentication requirements
- Permission requirements
- Error codes and messages
- Rate limits
- Example requests

### Proposed Solution

Create API documentation using:
- OpenAPI/Swagger spec
- Markdown docs in `/docs/api/`
- JSDoc comments in route files

### Endpoints to Document

**Team Members:**
- `GET /api/projects/[projectId]/members`
- `POST /api/projects/[projectId]/members`
- `PATCH /api/projects/[projectId]/members`
- `DELETE /api/projects/[projectId]/members`

**Roadmap:**
- `GET /api/roadmap`
- `POST /api/roadmap`
- `PATCH /api/roadmap/[itemId]`
- `DELETE /api/roadmap/[itemId]`
- `POST /api/roadmap/[itemId]/vote`
- `DELETE /api/roadmap/[itemId]/vote`

**Batch Import:**
- `POST /api/batch/import`
- `GET /api/batch/import/[jobId]`

### Acceptance Criteria

- [ ] OpenAPI spec created
- [ ] Markdown documentation written
- [ ] Examples for all endpoints
- [ ] Authentication documented
- [ ] Error responses documented
- [ ] Hosted on docs site

### Related

- All Day 10 API routes

---

## Issue 9: Audit SECURITY DEFINER Functions

**Labels:** `security`, `database`, `critical`
**Priority:** High
**Assignee:** Unassigned

### Description

Several database functions use `SECURITY DEFINER` which runs with elevated privileges. These need security audit to prevent SQL injection and privilege escalation.

### Functions to Audit

1. `public.is_project_member()`
2. `public.add_project_creator_as_owner()`

### Security Concerns

- **SQL Injection:** Are parameters properly escaped?
- **Privilege Escalation:** Can functions be exploited?
- **STABLE vs VOLATILE:** Are function volatility categories correct?
- **Input Validation:** Are inputs validated?

### Audit Checklist

- [ ] Review `is_project_member()` for SQL injection
- [ ] Review `add_project_creator_as_owner()` trigger safety
- [ ] Verify all parameters use proper types
- [ ] Check for dynamic SQL (avoid `EXECUTE` with user input)
- [ ] Ensure functions have minimal required privileges
- [ ] Consider replacing SECURITY DEFINER with RLS policies where possible

### Example Risk

```sql
-- BAD: Dynamic SQL with user input
CREATE FUNCTION bad_function(table_name TEXT)
RETURNS TABLE(id UUID) AS $$
BEGIN
  RETURN QUERY EXECUTE 'SELECT id FROM ' || table_name; -- SQL INJECTION!
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- GOOD: Static SQL only
CREATE FUNCTION good_function(project_id UUID)
RETURNS TABLE(id UUID) AS $$
BEGIN
  RETURN QUERY SELECT id FROM projects WHERE id = project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Acceptance Criteria

- [ ] All SECURITY DEFINER functions audited
- [ ] SQL injection risks mitigated
- [ ] Documentation added for each function
- [ ] Alternative RLS approaches considered
- [ ] Security review signed off

### Related

- supabase/migrations/20251027010005_update_rls_for_team_access.sql:4-23
- supabase/migrations/20251027010001_create_table_project_members.sql:81-88

---

## Issue 10: Add Pagination to Project Members List

**Labels:** `performance`, `enhancement`, `ux`
**Priority:** Low
**Assignee:** Unassigned

### Description

The `getProjectMembers()` function fetches all members at once with no pagination. This could cause performance issues for projects with many members.

### Current Behavior

```typescript
// Fetches ALL members
const { data } = await supabase
  .from('project_members')
  .select('*')
  .eq('project_id', projectId)
  .order('created_at', { ascending: false });
```

### Proposed Solution

Add pagination support:
- Default page size: 50 members
- Support for offset or cursor-based pagination
- Return total count for UI

### API Changes

**Request:**
```
GET /api/projects/[projectId]/members?page=1&limit=50
```

**Response:**
```json
{
  "members": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

### Acceptance Criteria

- [ ] API supports `page` and `limit` query parameters
- [ ] Default limit is 50
- [ ] Maximum limit is 100
- [ ] Returns pagination metadata
- [ ] UI shows pagination controls when needed
- [ ] "Load more" button or infinite scroll option

### Files to Modify

- `src/app/api/projects/[projectId]/members/route.ts`
- `src/lib/permissions/roles.ts` (getProjectMembers)
- `src/components/projects/MemberManager.tsx`

### Related

- src/lib/permissions/roles.ts:86-103

---

## Summary

**Total Issues:** 10

**Priority Breakdown:**
- Critical: 0 (all fixed!)
- High: 2 (Rate Limiting, Security Audit)
- Medium: 5 (Integration Tests, Vote Caching, User Names, E2E Tests, Admin Roadmap)
- Low: 3 (Navigation, Phone Regex, Documentation, Pagination)

**Category Breakdown:**
- Security: 3
- Testing: 3
- Performance: 2
- UX/UI: 3
- Documentation: 1
- Database: 1

All critical security issues from the initial review have been fixed in commit 159ada2. These issues represent improvements and nice-to-haves for production readiness.
