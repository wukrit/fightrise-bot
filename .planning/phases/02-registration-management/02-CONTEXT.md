# Phase 2: Registration Management - Context

**Gathered:** 2026-02-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Full registration CRUD (create, read, update, delete) with admin UI and audit logging. Includes: registration list with filters, approve/reject, manual registration, pagination.

</domain>

<decisions>
## Implementation Decisions

### Registration Table
- Table with columns: player, status, source, createdAt
- Filters: All, Pending, Confirmed, Cancelled
- Pagination: 20 per page

### Registration Actions
- Approve: Single click, sets status to CONFIRMED
- Reject: Requires reason input, sets status to CANCELLED
- Manual Add: Search by Discord username, form for details
- Remove: Confirmation dialog, hard delete

### Audit Logging
- Log all actions: APPROVE, REJECT, CREATE, DELETE
- Include: user, timestamp, registration details, reason (if applicable)

</decisions>

<specifics>
## Specific Ideas

No specific references — open to standard admin table patterns.

</specifics>

<deferred>
## Deferred Ideas

- Bulk operations (Phase 3+)
- CSV export (Phase 3+)

</deferred>

---
*Phase: 02-registration-management*
*Context gathered: 2026-02-25*
