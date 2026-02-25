# Feature Research: Tournament Admin Web Portal

**Domain:** Tournament Management Web Admin Portal
**Researched:** 2026-02-25
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete for tournament admins.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Tournament Dashboard** | Admins need a central view of tournament state, entrants, matches, and progress | MEDIUM | Core entry point; shows event summary, entrant count, bracket status |
| **Registration Management** | Admins must view, approve, reject, and remove registrations; bulk operations essential | MEDIUM | Already exists partially in Discord bot; web UI needed for bulk actions |
| **Manual Registration** | Admins need to register players who cannot self-register (walk-ins, substitutions) | LOW | Simple form with player lookup/creation |
| **Player Search/Lookup** | Admins must find players by Discord username, Start.gg ID, or display name | LOW | Search across linked User records |
| **Match List View** | Admins need to see all matches with filters (by round, state, player) | MEDIUM | Table with sorting, filtering by match state (checked-in, in-progress, completed) |
| **Disqualification (DQ) Management** | Admins must be able to disqualify players and handle DQ disputes | MEDIUM | Includes DQ confirmation, reason logging, cascade to bracket |
| **Match State Override** | Admins need to manually correct match states (reset, advance player) | MEDIUM | Emergency fix for bracket errors or software bugs |
| **Event/Bracket View** | Admins need to visualize the bracket and match progression | HIGH | Full bracket visualization; complex for double-elimination |
| **Admin Role Management** | Assign/remove tournament admins with different permission levels | LOW | Already in database schema (TournamentAdmin model) |
| **Audit Log Viewer** | Admins need to see who did what and when (especially for DQ, DQs, seeding changes) | LOW | Already tracked in database; needs UI display |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable for FightRise's Discord-centric positioning.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Seeding Management** | Web-based seeding editor with drag-drop reordering; syncs to Discord notifications | MEDIUM | Start.gg handles seeding, but web UI for manual adjustments adds value |
| **Real-time Match Feed** | Live-updating match cards showing current matches, scores, who's up next | MEDIUM | Complements Discord thread creation; useful for venue displays |
| **Check-in Dashboard** | See who's checked in, who's pending, send reminder notifications | LOW | Real-time check-in status board; integrates with Discord reminders |
| **Bulk Messaging** | Send messages to all entrants, specific subgroups (e.g., "round 1 losers") | LOW | Uses Discord DM capabilities via bot |
| **Registration CSV Export** | Export entrant data for external tools, prize distribution, etc. | LOW | Simple download feature |
| **Score Correction** | Admins can modify reported scores after submission (with audit trail) | MEDIUM | Beyond basic DQ; handles honest mistakes |
| **Multi-event Management** | View/manage multiple events (brackets) within a tournament from one view | MEDIUM | Tournament often has multiple games/events |
| **Discord Channel Linking** | Configure which Discord channels receive tournament updates from web UI | LOW | Bridge between web admin and Discord bot |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Full Bracket Editor** | Admins want complete manual control over bracket structure | High complexity, conflicts with Start.gg as source of truth, creates sync issues | Provide seeding adjustments only; let Start.gg handle bracket |
| **Tournament Creation from Web** | Users prefer web UI for setup | Duplicates Start.gg functionality; Discord bot setup is faster for existing users | Keep tournament creation in Start.gg; focus on management |
| **Real-time WebSocket Updates** | Admins want instant updates without refreshing | Significant complexity, maintenance burden, marginal value for admin use | Simple polling (5-10s) is sufficient for admin dashboard |
| **Player Profile Pages** | Public profile pages for players | Scope creep; Focus on admin features, not social features | Keep player data private; minimal profile for admin lookup only |
| **Payment Processing** | Handle venue fees, prize pool distribution | Regulatory complexity, payment integration overhead | Integrate with existing payment tools; don't rebuild |
| **Automated Seeding Algorithms** | Auto-generate optimal seeding | Complex to get right; Start.gg already handles this | Trust Start.gg seeding; offer manual adjustments only |

## Feature Dependencies

```
[Tournament Dashboard]
    └──requires──> [Tournament Data API]
    └──requires──> [Admin Authentication]

[Registration Management]
    └──requires──> [Player Search]
    └──enhances──> [Manual Registration]

[Match Management]
    └──requires──> [Match List View]
    └──requires──> [Score Reporting API]

[Disqualification]
    └──requires──> [Match State Override]
    └──enhances──> [Audit Log Viewer]

[Seeding Management]
    └──requires──> [Registration Management]
    └──conflicts──> [Full Bracket Editor]  (Don't build both)

[Check-in Dashboard]
    └──requires──> [Registration Management]
    └──enhances──> [Bulk Messaging]
```

### Dependency Notes

- **Tournament Dashboard requires Tournament Data API:** The web dashboard is meaningless without API endpoints exposing tournament state. This is foundational.
- **Seeding Management conflicts with Full Bracket Editor:** If we build full bracket editing, we create a sync nightmare with Start.gg. Better to only allow seeding reorder which pushes back to Start.gg.
- **Check-in Dashboard enhances Bulk Messaging:** Once admins know who's not checked in, they need to send reminders via Discord.
- **DQ Management requires Match State Override:** Disqualifying a player must also update the bracket state correctly.

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept.

- [ ] **Tournament Dashboard** — Central view of tournament state; essential for any admin work
- [ ] **Registration List + Manual Registration** — View and add entrants; core admin task
- [ ] **Match List with Filters** — See all matches, filter by state; essential for tournament running
- [ ] **Basic DQ Functionality** — Disqualify players with reason; handle bracket implications
- [ ] **Admin Authentication** — Discord OAuth + tournament admin role verification

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] **Seeding Management** — Drag-drop reordering; high value for competitive events
- [ ] **Check-in Dashboard** — Real-time check-in status board with reminder buttons
- [ ] **Audit Log Viewer** — See all admin actions for accountability
- [ ] **Match State Override** — Emergency corrections for bracket errors

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Full Bracket Visualization** — Complex to build well; consider embedding existing library
- [ ] **Bulk Messaging** — Requires careful message rate limiting
- [ ] **CSV Export** — Nice-to-have for data portability
- [ ] **Multi-event Management** — Once multiple event tournaments become common

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Tournament Dashboard | HIGH | MEDIUM | P1 |
| Registration List + Search | HIGH | LOW | P1 |
| Manual Registration | HIGH | LOW | P1 |
| Match List (filtered) | HIGH | MEDIUM | P1 |
| Basic DQ | HIGH | MEDIUM | P1 |
| Admin Auth + Role Check | HIGH | LOW | P1 |
| Seeding Management | MEDIUM | MEDIUM | P2 |
| Check-in Dashboard | MEDIUM | MEDIUM | P2 |
| Audit Log Viewer | MEDIUM | LOW | P2 |
| Match State Override | MEDIUM | MEDIUM | P2 |
| Bracket Visualization | MEDIUM | HIGH | P3 |
| Bulk Messaging | LOW | MEDIUM | P3 |
| CSV Export | LOW | LOW | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Start.gg | Challonge | Our Approach |
|---------|-----------|------------|--------------|
| Tournament Dashboard | Full web dashboard | Full web dashboard | Build web portal; Discord-first notifications |
| Registration Management | Full management | Limited | Web UI + Discord integration for notifications |
| Seeding | Manual + import | Manual only | Web UI for manual adjustments; push to Start.gg |
| DQ Management | Via bracket editor | Via match editing | Dedicated DQ flow with Discord notifications |
| Check-in | Built-in check-in | Not built-in | Real-time check-in dashboard; Discord reminders |
| Bracket Visualization | Full + embeddable | Full + embeddable | Embed Start.gg brackets rather than rebuild |
| Audit Log | Not prominent | Not built-in | First-class audit trail for accountability |

**Our Differentiation:**
- **Discord-native notifications** — All admin actions can trigger Discord messages to relevant players
- **Tournament thread integration** — Match threads already created in Discord; web admin complements this
- **Audit trail first** — Critical for community trust in DQ decisions

## Sources

- Start.gg tournament management features (existing platform)
- Challonge admin capabilities
- FightRise existing Discord bot functionality (apps/bot/src/services/)
- Database schema analysis (packages/database/prisma/schema.prisma)
- CONCERNS.md - identifies missing Admin API endpoints, Registration API, DQ API, Check-in API
- PROJECT.md - defines requirements for REST API + web UI admin pages

---
*Feature research for: Tournament Admin Web Portal*
*Researched: 2026-02-25*
