# Phase 2: Registration Management - Plan

**Phase:** 2
**Goal:** Admins can manage tournament registrations through both API and web interface
**Waves:** 2
**Files Modified:** N/A (new endpoints and pages)
**Autonomous:** false

## Objective

Implement full registration CRUD with admin UI and audit logging. This phase adds the ability to view, approve, reject, manually add, and remove tournament registrations through both API endpoints and a web interface.

## Context

### Requirements
- API-02, API-03, API-04, API-07: Admin registration API endpoints
- REG-01 through REG-06: Registration table with filters, actions, pagination
- AUDIT-01, AUDIT-02, AUDIT-03: Audit log viewing and filtering
- DASH-03: Dashboard shows recent admin actions (already implemented)

### User Decisions (from CONTEXT.md)
- Table columns: player, status, source, createdAt
- Filters: All, Pending, Confirmed, Cancelled
- Pagination: 20 per page
- Approve: Single click, sets status to CONFIRMED
- Reject: Requires reason input, sets status to CANCELLED
- Manual Add: Search by Discord username, form for details
- Remove: Confirmation dialog, hard delete
- Audit actions: APPROVE, REJECT, CREATE, DELETE

### Research Findings
- Database: Registration model with status/source enums, AuditLog with registration actions
- API: Existing GET registrations endpoint, need POST/PATCH/DELETE
- UI: Table, Button, Modal, Select, Badge components exist in packages/ui
- Auth: requireTournamentAdminById helper exists

---

## Wave 1: API Endpoints

### Task 1.1: Admin Registration CRUD API
**Type:** api
**Verification:** `npm run docker:test:integration`

1. **Extend existing registrations route** (`apps/web/app/api/tournaments/[id]/admin/registrations/route.ts`)
   - Add POST handler for creating manual registrations
   - Add query params for filtering (status) and pagination (page, limit)
   - Use Prisma with `skip`/`take` for offset pagination

2. **Create registration ID route** (`apps/web/app/api/tournaments/[id]/admin/registrations/[registrationId]/route.ts`)
   - Add PATCH handler for approve (no reason) and reject (requires reason)
   - Add DELETE handler for removal
   - All mutations create AuditLog entries in transaction

3. **Add audit logging helpers**
   - Use `prisma.$transaction` for mutation + audit atomically
   - Log actions: REGISTRATION_APPROVED, REGISTRATION_REJECTED, REGISTRATION_MANUAL_ADD, REGISTRATION_MANUAL_REMOVE

**Verification commands:**
```bash
npm run docker:test:integration
```

### Task 1.2: Admin Audit Logs API
**Type:** api
**Verification:** `npm run docker:test:integration`

1. **Create audit logs route** (`apps/web/app/api/tournaments/[id]/admin/audit/route.ts`)
   - GET handler with filters: action, page, limit
   - Filter to registration-related actions only
   - Include user info in response
   - Pagination with total count

**Verification commands:**
```bash
npm run docker:test:integration
```

---

## Wave 2: Admin UI Pages

### Task 2.1: Registrations Admin Page
**Type:** ui
**Verification:** `npm run docker:test:e2e`

1. **Create registrations page** (`apps/web/app/tournaments/[id]/admin/registrations/page.tsx`)
   - Server Component that fetches registrations with filters from URL
   - Pass data to client component

2. **Create RegistrationsTable client component**
   - Use @fightrise/ui Table, Button, Badge, Select, Modal
   - Filter buttons: All, Pending, Confirmed, Cancelled
   - Table columns: Player, Status, Source, Created, Actions
   - Action buttons: Approve (if pending), Reject (opens modal with reason), Remove (confirmation)

3. **Create action modals**
   - RejectModal: Textarea for reason, Confirm button
   - RemoveModal: Confirmation message, Confirm/Cancel buttons

4. **Create manual add form**
   - Discord username search input
   - Display name input
   - Submit to POST /api/tournaments/[id]/admin/registrations

**Verification commands:**
```bash
npm run docker:test:e2e
```

### Task 2.2: Audit Log Viewer Page
**Type:** ui
**Verification:** Manual verification

1. **Create audit logs page** (`apps/web/app/tournaments/[id]/admin/audit/page.tsx`)
   - Server Component that fetches audit logs
   - Filter dropdown: All Registration Actions, Approved, Rejected, Manual Add, Removed
   - Pagination controls

2. **Display audit log entries**
   - Action type badge
   - User who performed action
   - Timestamp
   - Details (registration info, reason if applicable)

**Verification commands:**
```bash
# Manual: Navigate to /tournaments/[id]/admin/audit
```

---

## Dependencies

### Wave 1
- Task 1.1: No dependencies - foundational
- Task 1.2: No dependencies - can run in parallel with Task 1.1

### Wave 2
- Task 2.1: Depends on Task 1.1 (needs API endpoints)
- Task 2.2: Depends on Task 1.2 (needs audit API)

---

## Must-Haves (Goal-Backward Verification)

| Must Have | Task | How Verified |
|-----------|------|--------------|
| Admin can POST new registration | Task 1.1 | API returns 201, registration created |
| Admin can PATCH registration status | Task 1.1 | API returns 200, status updated |
| Admin can DELETE registration | Task 1.1 | API returns 204, registration removed |
| Registrations list supports filtering | Task 1.1 | API accepts status param |
| Registrations list supports pagination | Task 1.1 | API returns pagination metadata |
| All mutations logged to audit | Task 1.1 | AuditLog entries created |
| Admin can view audit logs via API | Task 1.2 | API returns filtered audit entries |
| Admin can view registrations table | Task 2.1 | Page renders with data |
| Admin can approve registration | Task 2.1 | Button calls PATCH, UI updates |
| Admin can reject with reason | Task 2.2 | Modal opens, reason submitted |
| Admin can manually add player | Task 2.1 | Form submits POST, table updates |
| Admin can remove registration | Task 2.1 | Confirmation works, DELETE called |
| Audit log supports filtering | Task 2.2 | Filter dropdown works |

---

## Execution Order

1. **Wave 1** (API): Both tasks can run in parallel
   - Task 1.1: Admin Registration CRUD API
   - Task 1.2: Admin Audit Logs API

2. **Wave 2** (UI): After Wave 1 complete
   - Task 2.1: Registrations Admin Page
   - Task 2.2: Audit Log Viewer Page

---

## Notes

- All admin endpoints must verify tournament admin role
- Use prisma.$transaction for all mutation + audit log pairs
- Pagination is 20 per page per user decision
- Filters: All, Pending, Confirmed, Cancelled per user decision

---

## Next Phase

Phase 3: Match Management (depends on Phase 2)

---

*Plan created: 2026-02-25*
