---
phase: "02"
plan: "01"
type: "execute"
wave: 1
depends_on: []
files_modified:
  - apps/web/app/api/tournaments/[id]/admin/registrations/route.ts
  - apps/web/app/api/tournaments/[id]/admin/registrations/[registrationId]/route.ts
  - apps/web/app/api/tournaments/[id]/admin/audit/route.ts
autonomous: false
must_haves:
  - Admin can POST new manual registration (API-02)
  - Admin can PATCH registration status (approve/reject) (API-03)
  - Admin can DELETE registration (API-04)
  - Registrations list supports filtering by status (REG-01)
  - Registrations list supports pagination 20 per page (REG-06)
  - All mutations logged to audit log (AUDIT-01)
  - Admin can view audit logs via API with filtering (API-07, AUDIT-03)
---

# Phase 2: Registration Management

**Goal:** Admins can manage tournament registrations through both API and web interface.

## Context

This plan implements registration CRUD operations and audit logging. The database schema already supports this with Registration model and AuditLog with registration actions. API endpoints need to be extended and new pages created.

## Wave 1 Tasks (API)

<task>
<name>Admin Registration CRUD API</name>

<files>
- apps/web/app/api/tournaments/[id]/admin/registrations/route.ts (MODIFY)
- apps/web/app/api/tournaments/[id]/admin/registrations/[registrationId]/route.ts (NEW)
</files>

<action>
Extend existing registrations route and create new route for individual registration:

1. In registrations/route.ts - add POST handler:
   - Accept body: { discordUsername, displayName }
   - Find user by discordUsername
   - Create Registration with source: MANUAL
   - Use prisma.$transaction to create registration + audit log
   - Return 201 with created registration

2. Add filtering and pagination to GET handler:
   - Accept query params: status (PENDING/CONFIRMED/CANCELLED), page, limit
   - Use Prisma skip/take for pagination (20 per page)
   - Return pagination metadata

3. Create registrations/[registrationId]/route.ts:
   - PATCH: Accept body { action: 'approve' | 'reject', reason? }
   - approve: Set status to CONFIRMED, log REGISTRATION_APPROVED
   - reject: Require reason, set status to CANCELLED, log REGISTRATION_REJECTED
   - DELETE: Remove registration, log REGISTRATION_MANUAL_REMOVE
   - All use prisma.$transaction for atomic mutation + audit

Use existing admin authorization pattern from the registrations route.
</action>

<verify>
- API tests pass: `npm run docker:test:integration`
- Manual: POST new registration returns 201
- Manual: PATCH approve sets status CONFIRMED
- Manual: PATCH reject requires reason, sets CANCELLED
- Manual: DELETE removes registration
- Manual: GET with status filter works
- Manual: GET with pagination works
</verify>

<done>
- Admin can create manual registrations via API
- Admin can approve/reject registrations via API
- Admin can remove registrations via API
- All mutations create audit log entries
</done>
</task>

<task>
<name>Admin Audit Logs API</name>

<files>
- apps/web/app/api/tournaments/[id]/admin/audit/route.ts (NEW)
</files>

<action>
Create audit logs endpoint:

1. Create GET handler at /api/tournaments/[id]/admin/audit
2. Accept query params: action (filter), page, limit
3. Filter actions to registration-related: REGISTRATION_APPROVED, REGISTRATION_REJECTED, REGISTRATION_MANUAL_ADD, REGISTRATION_MANUAL_REMOVE
4. Use Prisma skip/take for pagination
5. Include user info in response
6. Return pagination metadata

Use existing admin authorization pattern.
</action>

<verify>
- API tests pass: `npm run docker:test:integration`
- Manual: GET returns audit logs filtered by action
- Manual: Pagination works
</verify>

<done>
- Admin can view audit logs via API
- Audit logs can be filtered by action type
</done>
</task>

## Wave 2 Tasks (UI) - See 02-PLAN-UI.md

---

Wave 1 implements API endpoints. Wave 2 (see 02-PLAN-UI.md) implements UI pages.
