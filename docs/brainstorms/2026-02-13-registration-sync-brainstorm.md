# Brainstorm: Sync Registrations Between Start.gg and Discord

**Date:** 2026-02-13
**Issue:** #19
**Status:** Draft

## What We're Building

A registration synchronization system that keeps registrations in sync between Start.gg and the local database. This ensures that:
- Players who register on Start.gg appear in the local database
- Discord users are matched to their Start.gg entrants
- Status changes (DQ, withdrawn) sync both directions
- No duplicate registrations exist

## Why This Matters

Players often register directly on Start.gg without using the Discord bot. Admins need a complete view of all registrations regardless of source.

## Key Decisions

### 1. Sync Timing
**Decision:** Sync both on tournament setup AND during polling

- On `/tournament set`: Full sync of all entrants
- During polling: Incremental updates (new entrants, status changes)

This ensures registrations are available immediately after tournament setup, then stay current during the event.

### 2. Conflict Resolution
**Decision:** Start.gg wins as source of truth

When a user has both a Discord registration AND a Start.gg entrant:
- Prefer the Start.gg data (entrant ID, status, etc.)
- Update the local registration with Start.gg details
- Preserve the Discord user link

### 3. Gamer Tag Matching
**Decision:** Fuzzy matching (case-insensitive, handles minor differences)

Algorithm:
1. Exact match on `startggUserId` (highest confidence)
2. Exact match on `startggEntrantId` (if already linked)
3. Fuzzy match on gamer tag (case-insensitive, trim whitespace)
4. If no match, create new registration

### 4. DQ/Withdrawal Handling
- **DQ on Start.gg:** Update local registration status to `DQ`
- **Withdrawn/Removed:** Update local status to `CANCELLED`
- **Bidirectional:** Also push local registration status changes to Start.gg (when user has valid OAuth token)

### 5. Unregistration Flow
- If entrant removed from Start.gg: Mark local registration as `CANCELLED`
- Never delete records - preserve audit trail

### 6. Existing Discord Registrations
- Discord-only registrations (no Start.gg link) are preserved
- If Start.gg entrant matches by gamer tag, link the existing registration to the Start.gg entrant

## Sync Logic

```
For each Start.gg entrant:
  1. Check if registration exists by startggEntrantId
  2. If not, try to match by startggUserId → linked User
  3. If not, try to match by gamer tag → fuzzy match to User
  4. If matched, link records and update status
  5. If no match found:
     - Create new registration with source=STARTGG
     - Set status to CONFIRMED (verified on Start.gg)
     - Leave userId null (unlinked registration)
```

### No Match Scenario

When a Start.gg entrant has no matching local user:
- Create a "ghost" registration with `source: STARTGG` and `status: CONFIRMED`
- The `userId` field remains null until the player links their Discord via `/link-startgg`
- The registration is still useful for tracking attendance
- When they later link their account, the sync can re-run to link them

## Key Decisions (Final)

1. **Sync Timing:** Both on tournament setup AND during polling
2. **Conflict Resolution:** Start.gg wins as source of truth
3. **Gamer Tag Matching:** Exact match (case-insensitive, trim whitespace)
4. **DQ/Withdrawal:** Sync status to local; push to Start.gg if user has linked account
5. **Unregistration:** Mark as CANCELLED, never delete
6. **Existing Discord Registrations:** Preserve and link if Start.gg match found
7. **Notifications:** Send Discord notification when new registrations sync

## Approaches Considered

### Approach A: Dedicated Sync Service (Recommended)
- New `RegistrationSyncService` in bot services
- Called from both tournament setup and polling
- Handles all matching logic in one place
- **Pros:** Clear separation of concerns, testable, reusable
- **Cons:** Additional service to maintain

### Approach B: Inline in Polling Service
- Add sync logic directly to `PollingService`
- **Pros:** Less code to write initially
- **Cons:** Poll service gets more complex, harder to test

### Approach C: Separate Background Job
- New BullMQ job queue for registration sync
- Independent of tournament polling
- **Pros:** Can run on different schedule, more control
- **Cons:** Overkill for this use case, more infrastructure

## Recommendation

**Approach A: Dedicated Sync Service** - Keeps the codebase clean and testable. The sync logic is distinct from polling logic and can be called from multiple places.

---

*This brainstorm captures requirements from issue #19. Next step: proceed to `/workflows:plan` for implementation planning.*
