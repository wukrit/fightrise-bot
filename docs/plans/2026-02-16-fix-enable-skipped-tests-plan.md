---
title: Enable all skipped tests
type: fix
status: active
date: 2026-02-16
---

## Enhancement Summary

**Deepened on:** 2026-02-16

### Key Findings

1. **Dashboard page ALREADY EXISTS** at `/dashboard` - the issue is it uses mock data instead of real API calls
2. **Tournament detail page EXISTS** at `/tournaments/[id]` - also uses mock data
3. **Tournament index page MISSING** - need to create `/tournaments` list view
4. **Matches pages MISSING** - need to implement `/matches` and `/matches/[id]`

### Pages Already Implemented
- `/dashboard` ✅ (needs API integration)
- `/tournaments/[id]` ✅ (needs API integration)
- `/tournaments/new` ✅
- `/account` ✅
- Auth pages ✅

### Pages That Need Implementation
- `/tournaments` (index/list) - NEW
- `/matches` (list) - NEW
- `/matches/[id]` (detail) - NEW

### API Endpoints Needed
| Endpoint | Purpose |
|----------|---------|
| `GET /api/tournaments/me` | User's tournaments for dashboard |
| `GET /api/tournaments` | List all tournaments |
| `POST /api/tournaments/:id/register` | Register for tournament |
| `GET /api/matches` | User's matches |
| `GET /api/matches/:id` | Match details |
| `POST /api/matches/:id/report` | Report score |
| `POST /api/matches/:id/confirm` | Confirm result |

# Enable All Skipped Tests

## Overview

Address all skipped tests in the codebase (excluding smoke tests) by either fixing the underlying issues or implementing the missing functionality.

## Problem Statement

The codebase has 5 groups of skipped tests:
1. **Dashboard E2E tests** - Page exists but uses mock data instead of real API
2. **Tournament Flow E2E tests** - Missing `/tournaments` index page, existing pages use mock data
3. **Match Reporting E2E tests** - Missing `/matches` page entirely
4. **TournamentService unit tests** (2 tests) - skipped due to incomplete mock setup

## Research Findings

### E2E Tests Status

| Test File | Pages Required | Current Status | Issue |
|-----------|----------------|----------------|-------|
| `dashboard.spec.ts` | `/dashboard` | Page exists | Uses mock data, needs real API |
| `tournaments.spec.ts` | `/tournaments`, `/tournaments/[id]` | Index missing, detail page exists | Index missing, detail uses mock data |
| `matches.spec.ts` | `/matches`, `/matches/:id` | Both missing | Pages need implementation |

### Unit Tests Status

| Test File | Failing Tests | Root Cause |
|-----------|---------------|------------|
| `tournamentService.test.ts` | 2 tests | Missing `auditLog.create` mock, incomplete transaction mock |

## Implementation Plan

### Phase 1: Fix TournamentService Unit Tests

- [x] Fix missing `auditLog.create` mock in test setup
- [x] Complete transaction mock setup for `setupTournament` tests
- [x] Remove `.skip` from the two failing tests

### Phase 2: Connect Dashboard to Real API

The dashboard page exists at `/dashboard` but uses mock data. Need to connect it to real API endpoints:
- [ ] Create API endpoint `GET /api/tournaments/me` to fetch user's tournaments
- [ ] Replace mock data with API calls in dashboard page
- [ ] Enable `dashboard.spec.ts` tests (requires NextAuth test setup)

**Status**: Dashboard page exists with mock data. E2E tests require full auth setup to run.

### Phase 3: Create Tournament Index and connect APIs (MOVED TO NEW PLAN)

See: `docs/plans/2026-02-16-feat-implement-web-portal-pages-plan.md`

### Phase 4: Create Matches pages (MOVED TO NEW PLAN)

See: `docs/plans/2026-02-16-feat-implement-web-portal-pages-plan.md`

### Phase 3: Implement Tournament Index and Connect API

- [ ] Create `/tournaments` index page (list view)
- [ ] Connect tournament detail page (`/tournaments/[id]`) to real API
- [ ] Create API endpoint `GET /api/tournaments` for listing all tournaments
- [ ] Create API endpoint `POST /api/tournaments/:id/register` for registration
- [ ] Enable `tournaments.spec.ts` tests

### Phase 4: Implement Matches Pages

- [ ] Create `/matches` page for user's matches list
- [ ] Create `/matches/[id]` page for match details and score reporting
- [ ] Create API endpoint `GET /api/matches` for user's matches
- [ ] Create API endpoint `GET /api/matches/:id` for match details
- [ ] Create API endpoint `POST /api/matches/:id/report` for score reporting
- [ ] Create API endpoint `POST /api/matches/:id/confirm` for result confirmation
- [ ] Enable `matches.spec.ts` tests

## Acceptance Criteria

- [ ] All 5 skipped test groups are enabled and passing
- [ ] No new skipped tests introduced
- [ ] All E2E tests pass against implemented pages
- [ ] All unit tests pass with complete mocks

## Dependencies & Risks

**Dependencies:**
- Next.js 14 app router patterns
- Existing authentication (NextAuth)
- Existing API endpoints

**Risks:**
- E2E pages require full implementation - significant effort
- May need to create additional API endpoints for the pages

## References

- Skipped tests summary: `docs/skipped-tests-summary.md`
- Dashboard E2E: `apps/web/__tests__/e2e/dashboard.spec.ts`
- Tournament E2E: `apps/web/__tests__/e2e/tournaments.spec.ts`
- Match E2E: `apps/web/__tests__/e2e/matches.spec.ts`
- Unit tests: `apps/bot/src/services/__tests__/tournamentService.test.ts`
