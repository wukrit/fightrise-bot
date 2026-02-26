# Feature Landscape: Test Coverage Enhancement

**Domain:** Testing infrastructure for FightRise Discord bot and web portal
**Researched:** 2026-02-26
**Confidence:** HIGH

## Executive Summary

FightRise v2.0 aims to add comprehensive test coverage across all packages. This research identifies what should be tested in each package, the appropriate test type (unit, integration, E2E), and critical paths that require coverage.

**Key Findings:**
- Bot has test harness infrastructure but limited service/handler tests (only ~20% coverage estimated)
- Web has API route tests but missing page/component tests
- Database has seeders and basic smoke tests, needs full integration coverage
- Start.gg client has mocks but missing mutation/query coverage
- Shared package has good validation test coverage

## Test Breakdown by Package

### 1. Discord Bot (`apps/bot/`)

#### What's Already Tested
| Area | Status | Test Pattern |
|------|--------|--------------|
| `/tournament` command | Partial | Unit tests with mocked services |
| `/register` command | Partial | Unit tests with mocked services |
| `/link-startgg` command | Partial | Unit tests |
| `/my-matches` command | Partial | Unit tests |
| Command loader | Partial | Unit tests |
| Polling service | Partial | Unit tests |

#### What's NOT Tested (Priority Order)

**Critical Paths (must have tests):**
| Area | Test Type | Complexity | Rationale |
|------|-----------|------------|-----------|
| `matchService.ts` | Unit + Integration | High | Core match thread creation, check-in handling |
| `scoreHandler.ts` | Unit + Integration | High | Score reporting flow, loser confirmation |
| `checkin.ts` (handler) | Unit + Integration | Medium | Check-in button interactions |
| `registrationSyncService.ts` | Unit + Integration | High | Start.gg registration sync |
| `tournamentService.ts` | Unit + Integration | High | Tournament setup, admin checks |
| `dqService.ts` | Unit + Integration | High | Player disqualification |
| `auditService.ts` | Unit | Medium | Admin audit logging |

**Button Handlers:**
| Handler | Test Type | Complexity |
|---------|-----------|------------|
| `buttonHandlers.ts` router | Unit | Low |
| `scoreHandler.ts` confirm path | Integration | High |
| `registration.ts` flow | Integration | Medium |

**Commands Missing Tests:**
| Command | Priority | Complexity |
|---------|----------|------------|
| `/admin` | Critical | High |
| `/checkin` | Critical | Medium |
| `/report` | Critical | High |
| `/unlink-startgg` | Medium | Low |
| `/tournament status` | Medium | Low |
| `/tournament setup` subcommands | Partial | High |

#### Bot Test Dependencies
- Uses vitest with discord.js mocking
- Test harness: `apps/bot/src/__tests__/harness/` (DiscordTestClient, MockInteraction, MockChannel)
- Mock infrastructure for Redis (BullMQ), Prisma

---

### 2. Web Portal (`apps/web/`)

#### What's Already Tested
| Area | Status | Test Pattern |
|------|--------|--------------|
| `/api/tournaments` route | Full | Unit tests |
| `/api/health` route | Full | Unit tests |
| `/api/auth/[...nextauth]` | Partial | Unit tests |
| `/api/matches/[id]/report` | Partial | Unit tests |
| `/api/tournaments/[id]/admin/audit` | Full | Unit tests |
| `/api/tournaments/[id]/admin/matches` | Full | Unit tests |
| `/api/tournaments/[id]/admin/players/[playerId]/dq` | Full | Unit tests |
| `/api/tournaments/[id]/admin/registrations/*` | Full | Unit tests |
| Home page | Partial | Unit tests |

#### What's NOT Tested (Priority Order)

**API Routes Missing Tests:**
| Route | Priority | Complexity |
|-------|----------|------------|
| `/api/tournaments/[id]/admin/register` | Critical | High |
| `/api/tournaments/[id]/admin/seeding` | Critical | High |
| `/api/tournaments/[id]/register` | Critical | High |
| `/api/tournaments/[id]/matches` | Critical | High |
| `/api/tournaments/me` | Medium | Medium |
| `/api/tournaments/validate` | Medium | Low |
| `/api/user/matches` | Critical | High |
| `/api/user/profile` | Medium | Medium |
| `/api/user/tournaments` | Medium | Medium |
| `/api/matches/[id]` | Medium | Medium |
| `/api/matches/[id]/checkin` | Medium | Medium |
| `/api/matches/[id]/confirm` | Medium | Medium |
| `/api/matches/[id]/dispute` | Critical | High |
| `/api/matches/[id]/dq` | Critical | High |
| `/api/registrations/[id]/approve` | Medium | Medium |
| `/api/registrations/[id]/reject` | Medium | Medium |
| `/api/discord/guilds` | Low | Low |
| `/api/keys` | Low | Low |
| `/api/auth/callback/*` | Medium | High |

**Web Pages Missing Tests:**
| Page | Test Type | Priority |
|------|-----------|----------|
| Dashboard (`/dashboard`) | E2E | Critical |
| Tournament list (`/tournaments`) | E2E | Critical |
| Tournament detail (`/tournaments/[id]`) | E2E | Critical |
| Tournament registrations (`/tournaments/[id]/registrations`) | E2E | Critical |
| Tournament matches (`/tournaments/[id]/matches`) | E2E | Critical |
| Tournament bracket (`/tournaments/[id]/bracket`) | E2E | Medium |
| Admin page (`/tournaments/[id]/admin`) | E2E | Critical |
| Admin registrations (`/tournaments/[id]/admin/registrations`) | E2E | Critical |
| Admin matches (`/tournaments/[id]/admin/matches`) | E2E | Critical |
| Admin audit (`/tournaments/[id]/admin/audit`) | E2E | Critical |
| Matches list (`/matches`) | E2E | Medium |
| Match detail (`/matches/[id]`) | E2E | Medium |
| Account (`/account`) | E2E | Medium |

**Components Missing Tests:**
- All page components (React testing library)
- Shared UI components from `@fightrise/ui`

---

### 3. Database Package (`packages/database/`)

#### What's Already Tested
| Area | Status | Test Pattern |
|------|--------|--------------|
| Basic export | Partial | Smoke tests |
| Seeders | Partial | Manual verification |

#### What's NOT Tested (Priority Order)

| Area | Test Type | Complexity | Rationale |
|------|-----------|------------|-----------|
| All Prisma operations | Integration | High | All CRUD for 11 models |
| Model relations | Integration | High | User->Registration, Tournament->Match, etc. |
| Transaction patterns | Integration | High | Atomic operations in services |
| Enum constraints | Unit | Low | TournamentState, MatchState transitions |
| Indexes/queries | Integration | Medium | Performance at scale |

**Database Models Needing Tests:**
| Model | Operations to Test |
|-------|-------------------|
| User | create, findUnique, findFirst, update, link/unlink |
| Tournament | create, findUnique, findMany, update, delete |
| Event | create, findMany, update state |
| Match | create, findUnique, update state, thread creation |
| MatchPlayer | create, update check-in, report score |
| GameResult | create for each game in best-of |
| Dispute | create, resolve, status transitions |
| Registration | create, approve, reject, DQ |
| TournamentAdmin | create, find, role checks |
| GuildConfig | create, find, update |
| AuditLog | create, findMany, pagination |

---

### 4. Start.gg Client (`packages/startgg-client/`)

#### What's Already Tested
| Area | Status | Test Pattern |
|------|--------|--------------|
| GraphQL client | Partial | Unit tests |
| Retry logic | Full | Unit tests |
| Cache | Partial | Unit tests |
| MSW mocks | Full | Handler fixtures |

#### What's NOT Tested (Priority Order)

| Area | Test Type | Complexity | Rationale |
|------|-----------|------------|-----------|
| All GraphQL queries | Integration | Medium | getTournament, getEventSets, getEventEntrants |
| All GraphQL mutations | Integration | High | reportSet, dqEntrant |
| Error handling | Unit | Medium | API failures, rate limits |
| Rate limiting | Integration | High | Backoff behavior |

**Queries Needing Tests:**
- `getTournament.ts`
- `getTournamentsByOwner.ts`
- `getEventSets.ts`
- `getEventEntrants.ts`

**Mutations Needing Tests:**
- `reportSet.ts` - Score reporting
- `dqEntrant.ts` - Disqualification

---

### 5. Shared Package (`packages/shared/`)

#### What's Already Tested (Good Coverage)
| Area | Status |
|------|--------|
| Validation (`validation.ts`) | Full |
| Types (`types.ts`) | Partial |
| Constants (`constants.ts`) | Partial |
| Errors (`errors.ts`) | Partial |
| DateTime (`datetime.ts`) | Partial |
| Interactions (`interactions.ts`) | Partial |
| Schemas (`schemas.ts`) | Partial |

#### What's NOT Tested (Low Priority)
- Edge cases in type guards
- Schema validation edge cases
- Error class hierarchy

---

## Critical Paths Requiring Coverage

### Path 1: Tournament Setup -> Registration -> Check-in -> Match

```
/tournament setup (command)
  -> tournamentService.setupTournament()
  -> Start.gg API call
  -> Create Tournament in DB

/register (command)
  -> Create Registration in DB

/match ready (pollingService)
  -> matchService.handleMatchReady()
  -> Create Discord thread
  -> Notify players

/checkin (button)
  -> checkinHandler
  -> Update MatchPlayer.isCheckedIn

/report (button)
  -> scoreHandler
  -> reportSet mutation
  -> Update Match state
```

**Test Coverage Needed:**
- Unit: Each service method
- Integration: Full flow with mocked Discord/Start.gg

### Path 2: Admin Registration Management (Web API)

```
GET /api/tournaments/[id]/admin/registrations
  -> requireTournamentAdmin
  -> Query registrations
  -> Return paginated list

POST /api/tournaments/[id]/admin/registrations
  -> requireTournamentAdmin
  -> Validate input
  -> Create or find User
  -> Create Registration
  -> Create AuditLog

PATCH /api/tournaments/[id]/admin/registrations/[id]
  -> requireTournamentAdmin
  -> Update status
  -> Sync to Start.gg if needed
  -> Create AuditLog
```

**Test Coverage Needed:**
- Unit: Input validation, auth checks
- Integration: Full flow with database

### Path 3: Score Reporting Flow

```
User clicks "Report Score" button
  -> scoreHandler receives button data
  -> Parse scores, validate
  -> If opponent needs to confirm:
     -> Send confirmation to opponent
     -> Wait for confirmation

Opponent clicks "Confirm" or "Dispute"
  -> Confirm: reportSet mutation to Start.gg
  -> Dispute: Create Dispute record
```

**Test Coverage Needed:**
- Unit: Score validation, state machine
- Integration: Full confirmation flow

---

## Test Type Recommendations

### Unit Tests
- Pure functions in shared package
- Validation functions
- Service methods with mocked dependencies
- Command option parsing

### Integration Tests
- Database operations (all 11 models)
- Service-to-service communication
- API routes with real database (Testcontainers)
- Start.gg client queries/mutations with mocked server

### E2E Tests
- Web portal user flows (Playwright)
- Auth flow (Discord OAuth)
- Tournament registration flow
- Admin workflows

---

## MVP Test Recommendation

Prioritize critical paths first:

1. **matchService.ts** - Core match thread functionality
2. **scoreHandler.ts** - Score reporting critical path
3. **tournamentService.ts** - Tournament setup/admin
4. **API registration routes** - Web admin CRUD
5. **API match routes** - Score reporting endpoints
6. **Database model tests** - All Prisma operations

Defer:
- UI component tests (lower ROI)
- Load tests (out of scope)
- Smoke tests (require credentials)

---

## Existing Test Infrastructure

| Component | Tool | Location |
|-----------|------|----------|
| Bot test harness | vitest | `apps/bot/src/__tests__/harness/` |
| Bot unit tests | vitest | `apps/bot/src/__tests__/` |
| Web API tests | vitest | `apps/web/app/api/**/*.test.ts` |
| Database tests | vitest + Testcontainers | `packages/database/src/__tests__/` |
| Start.gg mocks | MSW | `packages/startgg-client/src/__mocks__/` |
| Shared tests | vitest | `packages/shared/src/**/*.test.ts` |

---

## Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Bot tests | HIGH | Test harness exists, patterns clear |
| Web API tests | HIGH | Test patterns established, good coverage so far |
| Database tests | MEDIUM | Testcontainers setup exists, needs expansion |
| Start.gg tests | MEDIUM | MSW setup exists, needs query/mutation tests |
| E2E tests | LOW | Playwright setup needed, patterns unclear |

---

## Gaps to Address

1. **Bot handlers**: scoreHandler, checkinHandler, registrationHandler need full test coverage
2. **Bot services**: matchService, dqService, registrationSyncService need integration tests
3. **Web E2E**: No Playwright tests exist yet for pages
4. **Database**: No comprehensive integration tests for all models
5. **Start.gg mutations**: reportSet, dqEntrant not tested

---

## Sources

- Existing test files in `apps/bot/src/__tests__/`
- Existing test files in `apps/web/app/api/`
- Test harness in `apps/bot/src/__tests__/harness/`
- MSW mocks in `packages/startgg-client/src/__mocks__/`
- Database schema in `packages/database/prisma/schema.prisma`
- CLAUDE.md testing documentation

---

*Feature research for: Test Coverage Enhancement v2.0*
*Researched: 2026-02-26*
