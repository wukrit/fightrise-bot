---
title: Sync registrations between Start.gg and Discord
type: feat
status: active
date: 2026-02-13
issue: 19
---

## Enhancement Summary

**Deepened on:** 2026-02-13
**Research sources:** 5 (2 learnings, 3 review agents)

### Key Improvements

1. **Critical Schema Fixes**: Plan had ghost registration feature but `userId` was NOT NULL - now fixed with schema changes
2. **Concurrency Safety**: Added transaction wrapping and atomic state updates from learnings
3. **Race Condition Prevention**: Added state guards using `updateMany` pattern
4. **Complete Matching**: Added handling for existing Discord registrations when Start.gg entrant matches
5. **Performance**: Changed from fetching ALL users to targeted queries for only matching users
6. **Rate Limit Resilience**: Added exponential backoff with jitter for 429 errors
7. **Data Validation**: Added entrant validation before processing

---

# Sync Registrations Between Start.gg and Discord

## Overview

Implement a registration synchronization system that keeps registrations in sync between Start.gg and the local database. This ensures players who register directly on Start.gg appear in FightRise's database and can participate in Discord-based match workflows.

## Problem Statement

Players often register for tournaments directly on Start.gg without using the Discord bot. This creates a gap where:
- Admins can't see all registrants in one place
- Match threads can't be created for Start.gg-only registrants
- Check-in and score reporting workflows break for these players

## Proposed Solution

Create a `RegistrationSyncService` that syncs entrants from Start.gg to local Registration records, matching them to existing Discord users where possible.

## Technical Approach

### Schema Updates Required

**CRITICAL - Current schema has conflicts with ghost registration plan:**

1. **`userId` is NOT NULL** - Plan wants ghost registrations with `userId: null`
2. **`startggEntrantId` is nullable** - Unique constraint won't prevent duplicates properly
3. **`eventId` is nullable** - Start.gg sync requires event

**Required schema changes:**

```prisma
// Registration model changes
model Registration {
  // Make nullable for ghost registrations
  userId          String?   @map("user_id")   // CHANGED: nullable

  // Make NOT NULL for sync
  startggEntrantId String   @map("startgg_entrant_id")  // CHANGED: NOT NULL
  eventId         String   @map("event_id")            // CHANGED: NOT NULL

  // Updated constraints
  @@unique([userId, eventId])  // userId is now nullable - handles ghost regs
  @@unique([eventId, startggEntrantId])  // Now works properly
  @@index([tournamentId])
  @@index([eventId])
}

// User model - add indexes for matching
model User {
  // ... existing fields
  @@index([startggId])         // ADD: for matching
  @@index([startggGamerTag])   // ADD: for tag matching
}
```

**Migration:**
```sql
-- Migration must handle:
-- 1. Make userId nullable
-- 2. Make startggEntrantId NOT NULL
-- 3. Make eventId NOT NULL
-- 4. Add unique constraint on (eventId, startggEntrantId)
-- 5. Add indexes on User.startggId and User.startggGamerTag
```

**Note:** Registrations are per-event, not per-tournament. Use `eventId` in sync.

### Architecture

```
RegistrationSyncService
├── syncEventRegistrations(eventId)  # Main sync entry point
├── fetchEntrantsFromStartgg(eventId) # Call Start.gg API (handles pagination)
├── matchEntrantToUser(entrant)       # Match logic
├── createOrUpdateRegistration(...)    # Upsert registration
└── notifyNewRegistration(...)         # Discord notification
```

**Location:** `apps/bot/src/services/registrationSyncService.ts`

### Sync Logic (Priority Order)

1. **By startggEntrantId**: Check if registration exists with this entrant ID (use eventId + entrantId)
2. **By startggUserId**: Match entrant.participants[].user.id → User.startggId
3. **By gamer tag**: Case-insensitive exact match on User.startggGamerTag or User.displayName
4. **No match**: Create ghost registration (userId: null, source: STARTGG)

### Matching Algorithm

```
For each entrant from Start.gg:
  1. Get participant userId = entrant.participants[0]?.user?.id (first participant)
  2. Try: Find registration by (eventId, startggEntrantId=entrant.id)
  3. If not found, try: Find User where startggId === participant.userId
  4. If not found, try: Find User where LOWER(startggGamerTag) === LOWER(entrant.name)
  5. If not found: Create ghost registration (no userId)
```

**Edge Cases:**
- **Team entrants**: Use first participant's userId
- **Anonymous entrants**: No user.id in participant → create ghost registration
- **Multiple registrations**: Use unique constraint to prevent duplicates

### Data Flow

1. On `/tournament set`: Call `syncEventRegistrations()` for each event
2. During polling: Call `syncEventRegistrations()` with incremental updates
3. For each entrant:
   - Match to existing User or create ghost Registration
   - Set status to CONFIRMED (verified on Start.gg)
   - Link to User if matched

### Error Handling

- **API rate limits (429)**: Add exponential backoff with jitter:
```typescript
async function fetchWithRetry(query, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await query();
    } catch (error) {
      if (error.status === 429 && attempt < maxRetries - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 1000, 30000);
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }
}
```
- **API timeout**: Log error, skip this batch, retry on next poll
- **Invalid entrant data**: Skip entrant, log warning, continue
- **Partial batch failure**: Log failures, continue processing remaining entrants
- **All failures**: Don't fail tournament setup - log error and continue

### Concurrency Safety

**From learnings - prevent race conditions:**

1. **Atomic state transitions** - Use `updateMany` with state guards:
```typescript
// SAFE: Only updates if status is PENDING
const result = await prisma.registration.updateMany({
  where: { id: regId, status: RegistrationStatus.PENDING },
  data: { status: RegistrationStatus.CONFIRMED },
});
if (result.count === 0) {
  // Already confirmed or doesn't exist - handle gracefully
}
```

2. **Transaction wrapping** - Wrap matching + upsert in transaction:
```typescript
await prisma.$transaction(async (tx) => {
  const existing = await tx.registration.findUnique({
    where: { eventId_startggEntrantId: { eventId, startggEntrantId: entrant.id }},
  });
  if (existing) {
    // Update existing
    return;
  }
  // ... matching and create logic
});
```

3. **Handle existing Discord registration** - When Start.gg entrant matches existing Discord registration:
```typescript
// First try to find by userId + eventId (existing Discord registration)
const existingByUser = await tx.registration.findUnique({
  where: { userId_eventId: { userId: matchedUser.id, eventId }}
});
if (existingByUser) {
  // Link the Start.gg entrant to existing registration
  await tx.registration.update({
    where: { id: existingByUser.id },
    data: { startggEntrantId: entrant.id, status: RegistrationStatus.CONFIRMED }
  });
  return;
}
```

### Pagination

- Use `getEventEntrants(eventId, page)` with page size 50
- Check `pageInfo.hasNextPage` from response
- Process all pages up to MAX_PAGES = 20 (1000 entrants max)

### Integration Points

1. **TournamentService**: Call sync in `saveTournamentConfig()` after event sync completes (around line 246)
2. **PollingService**: Add to `pollTournament()` after fetching tournament state, before match sync

## Implementation Phases

### Phase 0: Schema Changes (Prerequisite)

- [x] Add migration: `@@unique([eventId, startggEntrantId])` to Registration model
- [x] Generate Prisma client after migration
- [x] Note: Registrations are per-event, not per-tournament

**Migration file:** `packages/database/prisma/migrations/xxx_add_registration_event_entrant_unique/migration.sql`

### Phase 1: Core Sync Service

- [x] Create `registrationSyncService.ts` with `syncEventRegistrations(eventId)` method
- [x] Implement `fetchEntrantsFromStartgg()` using existing `startggClient.getEventEntrants()` with pagination
- [x] Implement `matchEntrantToUser()` with priority matching
- [x] Implement `createOrUpdateRegistration()` with Prisma upsert and transaction
- [x] Handle DQ/withdrawal detection from Start.gg response
- [x] Validate entrant data before processing

**Files:**
- `apps/bot/src/services/registrationSyncService.ts` (new)

**Key code patterns:**
```typescript
// Batch prefetch + Map for O(1) lookups (from learnings)
// OPTIMIZED: Only fetch users that could match current entrants (not all users)
const participantUserIds = entrants
  .map(e => e.participants?.[0]?.user?.id)
  .filter(Boolean);
const gamerTags = entrants.map(e => e.name?.toLowerCase()).filter(Boolean);

const relevantUsers = await prisma.user.findMany({
  where: {
    OR: [
      { startggId: { in: participantUserIds }},
      { startggGamerTag: { in: gamerTags, mode: 'insensitive' }},
    ],
  },
  select: { id: true, startggId: true, startggGamerTag: true },
});
const usersByStartggId = new Map(
  relevantUsers.filter(u => u.startggId).map(u => [u.startggId!, u])
);
const usersByGamerTag = new Map(
  relevantUsers
    .filter(u => u.startggGamerTag)
    .map(u => [u.startggGamerTag!.toLowerCase(), u])
);

// Transaction for matching + upsert (from learnings - prevents race conditions)
await prisma.$transaction(async (tx) => {
  const existing = await tx.registration.findUnique({
    where: { eventId_startggEntrantId: { eventId, startggEntrantId: entrant.id }},
  });
  if (existing) {
    // Update status - use atomic updateMany with state guard
    await tx.registration.updateMany({
      where: { id: existing.id, status: { not: RegistrationStatus.DQ }},
      data: { status: RegistrationStatus.CONFIRMED },
    });
    return;
  }
  // ... create new registration
});

// Data validation
function validateEntrant(entrant: Entrant): boolean {
  if (!entrant.id) return false;
  if (!entrant.name && !entrant.participants?.[0]?.name) return false;
  return true;
}
```

**DQ/Withdrawal Detection:**
- Check `entrant.isCheckedIn` (if available in API response)
- Check `entrant.participants` array - empty = withdrawn
- Future: Check for `entrant.status` field in API

### Phase 2: Tournament Setup Integration

- [ ] Import RegistrationSyncService in tournamentService.ts
- [ ] Call `syncEventRegistrations()` after saving tournament config
- [ ] Wrap in try-catch with logging (don't fail tournament setup if sync fails)

**Files:**
- `apps/bot/src/services/tournamentService.ts`

### Phase 3: Polling Integration

- [ ] Add registration sync call in pollingService.ts
- [ ] Use 1-minute interval during registration phase (from learnings)
- [ ] Handle incremental updates (new entrants only after initial sync)

**Files:**
- `apps/bot/src/services/pollingService.ts`

### Phase 4: Bidirectional Sync (Status Changes)

- [ ] Handle DQ status from Start.gg → local
- [ ] Handle withdrawal/removal → CANCELLED
- [ ] Implement push to Start.gg for users with valid startggToken

**Note:** Push to Start.gg requires OAuth token - skip if not available.

### Phase 5: Discord Notifications

- [x] Send notification to configured channel when new registrations sync
- [x] Include player name and source info

**Files:**
- `apps/bot/src/services/registrationSyncService.ts`

## Acceptance Criteria

- [x] Schema migration: Make userId nullable for ghost registrations
- [x] Schema migration: Keep startggEntrantId nullable (for backwards compatibility)
- [x] Schema migration: Keep eventId nullable (for backwards compatibility)
- [x] Schema migration: Add indexes on User.startggGamerTag
- [x] Note: Application-level enforcement of uniqueness during sync
- [ ] Start.gg entrants appear in local Registration table after tournament setup
- [ ] Discord users matched to Start.gg entrants via startggId or gamer tag
- [ ] New registrations trigger Discord notification
- [ ] DQ status syncs from Start.gg to local (when API field available)
- [ ] Withdrawal syncs from Start.gg to local as CANCELLED (empty participants array)
- [ ] No duplicate registrations created on re-sync (unique constraint)
- [ ] Ghost registrations created for unmatched entrants (userId: null)
- [ ] Existing Discord registrations linked when Start.gg entrant matches
- [ ] Integration tests pass
- [ ] Handle Start.gg API 429 errors gracefully

## Testing Requirements

- [ ] Unit tests for `matchEntrantToUser()` - all priority levels
- [ ] Unit tests for `createOrUpdateRegistration()` - create, update, link scenarios
- [ ] Integration tests for full sync flow with mocked Start.gg API
- [ ] Test edge cases: no entrants, duplicate gamer tags, user already registered

**Test files:**
- `apps/bot/src/services/__tests__/registrationSyncService.test.ts` (new)

**Use existing test patterns:**
- MSW handlers: `packages/startgg-client/src/__mocks__/handlers.ts`
- Discord test harness: `apps/bot/src/__tests__/harness/`

## Dependencies

- Start.gg client `getEventEntrants()` - already exists
- Prisma Registration model - already exists
- Discord bot client for notifications

## Risks & Mitigation

| Risk | Mitigation |
|------|------------|
| Start.gg API rate limits | Add backoff, log rate limit hits |
| Duplicate registrations | Use unique constraint on startggEntrantId + eventId |
| Large tournament (500+) | Batch processing with cursor-based pagination |
| Race conditions | Use atomic upserts, not check-then-create |

## References

- Similar sync: `apps/bot/src/services/pollingService.ts` (match sync)
- Registration model: `packages/database/prisma/schema.prisma:189`
- Start.gg entrants: `packages/startgg-client/src/index.ts:181`
- Learnings: Dynamic polling intervals (1min during registration)
- API verification needed: Check actual Entrant type fields for DQ/withdrawal status

## API Verification Notes

Before Phase 1, verify the Start.gg API `Entrant` response structure:
- What fields indicate DQ status?
- What fields indicate withdrawal?
- Is `entrant.participants` empty for withdrawn entrants?

Reference: `packages/startgg-client/src/types.ts` for current type definitions
