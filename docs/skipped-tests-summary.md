# Skipped Tests Summary

This document catalogs all skipped tests in the codebase and explains why they are skipped.

---

## E2E Tests (Playwright)

### Running Tests (pages exist)
| File | Status | Notes |
|------|--------|-------|
| `dashboard.spec.ts` | ✅ Running | Dashboard page exists |
| `matches.spec.ts` | ✅ Running | Matches page exists |
| `auth.spec.ts` | ⚠️ 1 test skipped | One auth test fails due to session mocking issue |

### Skipped Tests (pages don't exist yet)
| File | Status | Reason |
|------|--------|--------|
| `account.spec.ts` | Skipped | `/account` page not implemented |
| `tournaments.spec.ts` | Skipped | Tournament pages not fully implemented |
| `tournament-list.spec.ts` | Skipped | Tournament list page not implemented |
| `registrations-admin.spec.ts` | Skipped | Admin registrations page not implemented |
| `matches-admin.spec.ts` | Skipped | Admin matches page not implemented |
| `audit-log.spec.ts` | Skipped | Audit log page not implemented |

---

## Smoke Tests

Smoke tests are skipped when required credentials are not provided in environment variables. They are designed to run against real APIs in controlled environments.

| File | Status | Skip Condition | Reason |
|------|--------|----------------|--------|
| `oauth.smoke.spec.ts` | Skipped | `!SMOKE_DISCORD_CLIENT_ID` | Requires Discord OAuth credentials |
| `discord-api.smoke.test.ts` | Skipped | `!SMOKE_DISCORD_TOKEN` | Requires Discord bot token |
| `redis.smoke.test.ts` | Skipped | `!REDIS_URL` | Requires Redis connection |
| `database.smoke.test.ts` | Skipped | `!DATABASE_URL` | Requires PostgreSQL connection |
| `startgg-api.smoke.test.ts` | Skipped | `!SMOKE_STARTGG_API_KEY` | Requires Start.gg API key |

---

## Load Tests

| File | Status | Reason |
|------|--------|--------|
| `pollingLoad.test.ts` | Skipped | Load test - runs manually, not in CI |

---

## Unit Tests

### Bot Services
| File | Status | Skipped Tests | Reason |
|------|--------|---------------|--------|
| `tournamentService.test.ts` | 2 tests skipped | `should successfully create tournament...`, `should mark as update...` | Broken mocks (pre-existing issue) |

---

## Summary

| Category | Count | Status |
|----------|-------|--------|
| E2E Running | 2 files + 1 partial | ✅ Working |
| E2E Skipped (pages missing) | 6 files | Pages not implemented |
| E2E Skipped (auth issue) | 1 test | Session mocking broken |
| Smoke Tests | 5 files | Missing credentials |
| Load Tests | 1 file | Manual only |
| Unit Tests | 2 tests | Broken mocks |
| **Total Skipped** | **~90+ tests** | |

---

## Recommendations

1. **E2E Tests**: The pages for skipped tests need to be implemented. Priority order:
   - `/account` - User account settings
   - `/tournaments` - Tournament list/detail
   - `/tournaments/[id]/admin/*` - Admin pages
   - `/audit` - Audit log

2. **Auth Test**: Fix the session mocking in `auth.spec.ts` to enable the skipped authenticated user test

3. **Unit Tests**: Fix the mock setup in `tournamentService.test.ts`

4. **Smoke Tests**: Already correctly configured - should only run in controlled environments with proper credentials
