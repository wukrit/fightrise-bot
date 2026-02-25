# Phase 3: Match Management - Context

**Gathered:** 2026-02-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Admins can view matches in a table, see match details with player scores and check-in status, and disqualify players from matches. This includes match list UI with filters, expandable row details, and DQ flow with Start.gg sync.

</domain>

<decisions>
## Implementation Decisions

### Match List UI
- Layout: Expandable rows (click to expand inline details), not separate detail page
- Filters: Search by player name + dropdowns for round and state
- Columns: Full columns (Round, Player 1, Player 2, Score, Status, Actions)
- DQ Action: In expanded view only (not in collapsed row actions)
- Pagination: 50 matches per page
- Empty State: Helpful message about tournament state
- Sort Order: By round number (default)
- Auto-refresh: Enabled (every 30 seconds)
- Status Display: Color-coded badges (green=complete, yellow=in progress, red=disputed)
- Round Labels: Include bracket type (e.g., "Winners R1", "Losers R3")
- Mobile: Card view on small screens

### Match Detail View
- Information: Full details (players, scores, round, state, check-in status, timestamps)
- Score Format: Game scores (e.g., "2-1")
- Player Names: Both Discord username and Start.gg name
- Check-in Info: Detailed (who checked in, timestamp, timeout status)
- Timestamps: Relative ("5 min ago") not absolute
- Disputed Matches: Show link to dispute details
- DQ Button: In expanded details section

### DQ Flow
- Trigger: Two-step (click player row, then confirm DQ)
- Reason: Optional (not required)
- Confirmation: Show "Are you sure?" dialog before DQ
- Feedback: Status toast ("Player disqualified, syncing to Start.gg...")
- Error Handling: Show error, keep dialog open with retry option
- Audit Log: Full details (admin, timestamp, player, reason, match)

### Check-in Display
- Icons: Color + icon (green check, red X, yellow clock)
- Timeout: Show time they timed out at
- Summary: Show count per match ("1/2 checked in")
- Warning: Highlight near-deadline matches in yellow

</decisions>

<specifics>
## Specific Ideas

No specific references from user — open to standard admin dashboard patterns.

</specifics>

<deferred>
## Deferred Ideas

- Real-time updates via WebSocket — later phase
- Match reseeding UI — later phase

</deferred>

---

*Phase: 03-match-management*
*Context gathered: 2026-02-25*
