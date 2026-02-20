# Code Review Findings Status (2026-02-20)

This tracks findings raised in the full-app code review and current remediation status.

## Status legend

- `Done`: Fix implemented and validated with targeted tests.
- `Implemented`: Fix implemented; broader validation still pending.
- `Partial`: Some mitigation in place, follow-up still needed.

## Findings

### 1) [P2] Rate limiter trusts spoofable `x-real-ip` from untrusted clients
- File: `apps/web/lib/ratelimit.ts`
- Finding: Untrusted clients could spoof `x-real-ip` and evade per-IP limits.
- Status: `Partial`
- What changed:
  - Fallback no longer trusts `x-real-ip`; now uses `connectionIp` only.
- Remaining:
  - Most call sites do not pass `connectionIp`, so production IP derivation should be wired/confirmed.
  - Add dedicated tests for trusted-proxy vs untrusted-header behavior.

### 2) [P0] Start.gg OAuth callback trusts unsigned state
- File: `apps/web/app/api/auth/callback/startgg/route.ts`
- Finding: Forged state could link attacker Start.gg account to victim Discord user.
- Status: `Done`
- What changed:
  - Added signed state creation/verification (`packages/shared/src/oauthState.ts`).
  - Bot link command now generates signed state (`apps/bot/src/commands/link-startgg.ts`).
  - Callback verifies signature and rejects invalid state.
  - Added nonce one-time consumption (anti-replay) via `apps/web/lib/startggStateStore.ts`.
- Validation:
  - `apps/web/app/api/auth/callback/startgg/route.test.ts` passes.

### 3) [P0] Score agreement logic inverted (false disputes)
- File: `apps/web/app/api/matches/[id]/report/route.ts`
- Finding: Valid matching reports could be marked disputed.
- Status: `Done`
- What changed:
  - Agreement check corrected to require opposing winner flags.
- Validation:
  - `apps/web/app/api/matches/[id]/report/route.test.ts` passes.

### 4) [P1] Reported score assigned from wrong player perspective
- File: `apps/web/app/api/matches/[id]/report/route.ts`
- Finding: Player 2 reports could write wrong score to reporter row.
- Status: `Done`
- What changed:
  - Reporter score now mapped from actual reporter row/player position.
  - Added winner participant validation guard.
- Validation:
  - `apps/web/app/api/matches/[id]/report/route.test.ts` passes.

### 5) [P1] NextAuth GET handler mutates function as Response
- File: `apps/web/app/api/auth/[...nextauth]/route.ts`
- Finding: Could throw at runtime and lose rate-limit headers.
- Status: `Done`
- What changed:
  - GET now awaits handler response and applies headers to returned `Response`.
- Validation:
  - `apps/web/app/api/auth/[...nextauth]/route.test.ts` passes.

### 6) [P1] Start.gg token storage/decoding formats inconsistent
- File: `apps/web/lib/startgg.ts` (+ callback write path)
- Finding: Tokens written by callback could fail downstream decode/refresh.
- Status: `Done`
- What changed:
  - Added canonical shared token encode/decode helpers (`packages/shared/src/startggToken.ts`).
  - Updated callback write path and web token read/refresh path to shared helpers.
- Validation:
  - Covered by passing callback/auth/report targeted test set.

### 7) [P1] Tournament admin validation uses encrypted token as bearer token
- File: `apps/bot/src/services/tournamentService.ts`
- Finding: Admin verification could fail for valid users.
- Status: `Implemented`
- What changed:
  - Setup flow now decodes stored Start.gg token before admin validation request.
- Remaining:
  - Add focused bot service test for decoded-token path.

### 8) [P1] Select-menu score reporting not wired in interaction router
- File: `apps/bot/src/events/interactionCreate.ts` (+ handler typing updates)
- Finding: Detailed score select submissions were dropped.
- Status: `Implemented`
- What changed:
  - Added `isStringSelectMenu()` handling and dispatch path.
  - Updated handler typings to accept select-menu interactions.
  - Added integration coverage in `apps/bot/src/__tests__/integration/event-handlers.integration.test.ts`.
- Remaining:
  - Run full bot integration suite in Docker for broad regression confidence.

### 9) [P2] Middleware permits broad auth bypass by host/port checks
- File: `apps/web/middleware.ts`
- Finding: Environment-dependent bypass logic increased auth risk.
- Status: `Done`
- What changed:
  - Removed host/port bypass rules.
  - Added explicit test-only bypass flag `AUTH_BYPASS_FOR_E2E` (non-production only).
  - Updated `.env.example` and `.env.test.example`.

## Test run snapshot

Targeted Docker tests executed and passing:

- `app/api/auth/[...nextauth]/route.test.ts`
- `app/api/matches/[id]/report/route.test.ts`
- `app/api/auth/callback/startgg/route.test.ts`

Result: `3 files passed, 5 tests passed`.

## Suggested follow-up before merge

1. Wire/verify real `connectionIp` propagation for rate limiting.
2. Add ratelimit header-spoof regression tests (trusted/untrusted proxy scenarios).
3. Run full Docker checks: unit, integration, lint.
