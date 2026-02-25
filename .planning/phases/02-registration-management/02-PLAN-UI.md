---
phase: "02"
plan: "02"
type: "execute"
wave: 2
depends_on: ["01"]
files_modified:
  - apps/web/app/tournaments/[id]/admin/registrations/page.tsx
  - apps/web/components/admin/RegistrationsTable.tsx
  - apps/web/components/admin/ManualAddModal.tsx
  - apps/web/components/admin/RejectModal.tsx
  - apps/web/components/admin/RemoveModal.tsx
  - apps/web/app/tournaments/[id]/admin/audit/page.tsx
autonomous: false
must_haves:
  - Admin can view registrations table with filters (REG-01)
  - Admin can approve pending registrations with single click (REG-02)
  - Admin can reject registrations with reason input (REG-03)
  - Admin can manually register a player (walk-in) (REG-04)
  - Admin can remove a registration (REG-05)
  - Admin can view audit log page (AUDIT-01)
  - Audit log supports filtering by action type (AUDIT-03)
---

# Phase 2: Registration Management - Wave 2 (UI)

**Goal:** Admins can manage tournament registrations through web interface.

## Context

This plan implements the web UI for registration management. Wave 1 implemented the API endpoints. This wave adds the user-facing pages.

## Tasks

<task>
<name>Registrations Admin Page</name>

<files>
- apps/web/app/tournaments/[id]/admin/registrations/page.tsx (NEW)
- apps/web/components/admin/RegistrationsTable.tsx (NEW)
- apps/web/components/admin/ManualAddModal.tsx (NEW)
- apps/web/components/admin/RejectModal.tsx (NEW)
- apps/web/components/admin/RemoveModal.tsx (NEW)
</files>

<action>
Create registrations admin page with table and actions:

1. Create page.tsx as Server Component:
   - Use requireTournamentAdminById for authorization
   - Fetch registrations with filters from URL searchParams
   - Pass data to client component

2. Create RegistrationsTable client component:
   - Use @fightrise/ui Table, Button, Badge, Select
   - Filter buttons: All, Pending, Confirmed, Cancelled
   - Table columns: Player, Status, Source, Created, Actions
   - Action buttons: Approve (if pending), Reject, Remove

3. Create modals:
   - ManualAddModal: Discord username input, display name, submit
   - RejectModal: Reason textarea, Confirm button
   - RemoveModal: Confirmation message, Confirm/Cancel

Call API endpoints for all mutations.
</action>

<verify>
- E2E tests pass: `npm run docker:test:e2e`
- Manual: Page loads with registrations table
- Manual: Filter buttons filter the table
- Manual: Approve button works
- Manual: Reject modal accepts reason
- Manual: Remove modal confirms before delete
- Manual: Manual add creates new registration
</verify>

<done>
- Registrations table displays with filters
- Admin can approve registrations
- Admin can reject with reason
- Admin can manually add players
- Admin can remove registrations
- Pagination works
</done>
</task>

<task>
<name>Audit Log Viewer Page</name>

<files>
- apps/web/app/tournaments/[id]/admin/audit/page.tsx (NEW)
</files>

<action>
Create audit log viewer page:

1. Create page.tsx as Server Component:
   - Use requireTournamentAdminById for authorization
   - Fetch audit logs with filters from URL searchParams
   - Pass data to client component

2. Create client component:
   - Filter dropdown: All, Approved, Rejected, Manual Add, Removed
   - Table/list showing: Action, User, Timestamp, Details
   - Pagination controls
   - Use @fightrise/ui Badge for action types
</action>

<verify>
- Manual: Page loads with audit logs
- Manual: Filter dropdown filters entries
- Manual: Pagination works
</verify>

<done>
- Audit log page displays entries
- Entries can be filtered by action type
- Pagination works
</done>
</task>
