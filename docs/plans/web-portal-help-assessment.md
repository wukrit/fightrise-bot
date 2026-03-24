# Web Portal Help Assessment

## Pages in `apps/web/app/`

| Page | Path | Purpose | Complexity |
|------|------|---------|------------|
| Dashboard | `/dashboard/` | User's tournaments and upcoming matches | Low |
| Tournaments | `/tournaments/` | Browse public tournaments | Low |
| Tournament Detail | `/tournaments/[id]/` | Tournament info, bracket, matches | Medium |
| Admin - Overview | `/tournaments/[id]/admin/` | Admin dashboard | Medium |
| Admin - Registrations | `/tournaments/[id]/admin/registrations/` | Manage player registrations | Medium |
| Admin - Matches | `/tournaments/[id]/admin/matches/` | View/manage tournament matches | Medium |
| Admin - Audit Log | `/tournaments/[id]/admin/audit/` | View admin action history | Low |
| Account | `/account/` | Link/unlink Start.gg, preferences | Low |
| My Matches | `/matches/` | Player's upcoming and recent matches | Low |
| Match Detail | `/matches/[id]/` | Specific match info and actions | Medium |

## Assessment Criteria

Pages are evaluated based on:
- **Self-explanatory UI**: Clear labels, intuitive flows
- **Help needed**: Complex actions that benefit from guidance
- **Error potential**: Flows where users might get stuck
- **Action required**: Pages with important user actions

## Page-by-Page Analysis

### Low Complexity (no help needed)

**Dashboard** (`/dashboard/`)
- Shows user's tournaments and upcoming matches
- UI is self-explanatory with clear cards and buttons
- No complex flows

**Tournaments** (`/tournaments/`)
- Simple list view with filters
- Standard pattern, no guidance needed

**Admin - Audit Log** (`/tournaments/[id]/admin/audit/`)
- Read-only view of history
- No user action required

**Account** (`/account/`)
- Link/unlink Start.gg OAuth flow
- Uses standard OAuth UI from NextAuth

**My Matches** (`/matches/`)
- List view similar to dashboard
- Clear status indicators

### Medium Complexity (minor guidance helpful)

**Tournament Detail** (`/tournaments/[id]/`)
- Multiple sections: info, bracket, matches
- Admin users see additional options
- Could benefit from tooltip hints for new TOs

**Admin - Overview** (`/tournaments/[id]/admin/`)
- Central hub for tournament management
- Multiple actions available
- New TOs might need guidance on sequence

**Admin - Registrations** (`/tournaments/[id]/admin/registrations/`)
- Approve/reject registrations
- Bulk actions available
- Could use tooltips for bulk operations

**Admin - Matches** (`/tournaments/[id]/admin/matches/`)
- View all matches with states
- DQ and dispute handling
- Clear UI with status badges

**Match Detail** (`/matches/[id]/`)
- Score reporting interface
- Dispute initiation
- Clear winner/loser flow

## Recommendation

**Option A: Help content belongs in docs** — Add links from web pages

The web portal pages are relatively self-explanatory with clear UI patterns. Most complexity is for tournament admins who should be directed to the TO Quickstart guide for comprehensive documentation.

**Suggested approach:**
1. Add a "Help" link or tooltip to admin pages pointing to `/docs/guides/to-quickstart/`
2. Add help text on complex admin actions (e.g., DQ, dispute)
3. Keep all detailed documentation in the docs site

**Implementation:**
- Add help icon next to page titles on admin pages
- Tooltip or link: "For help, see the TO Quickstart Guide"
- No new web app pages needed

## Discrepancies Found in Existing Guides

While reviewing for this assessment, noted:

1. **Command formatting inconsistency**: Existing guides (`to-quickstart.mdx`, `player-quickstart.mdx`) show commands without backticks (e.g., `/link-startgg` instead of `` `/link-startgg` ``). This is a style inconsistency but not a factual error.

2. **zero-to-beta.mdx not linked**: The comprehensive setup guide at `content/getting-started/zero-to-beta.mdx` is not linked from the getting-started index or any guide.

## Next Steps

If recommendation Option A is accepted:
- Add help links/tooltips to admin pages in web app
- No new documentation pages needed beyond existing docs

If recommendation Option B is preferred (inline help):
- Create `apps/web/app/help/page.tsx` with web-specific help
- This would duplicate some content from docs
