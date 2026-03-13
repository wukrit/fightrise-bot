# Brainstorm: E2E Test Suite Audit & Reliability Improvements

**Date:** 2026-03-12
**Status:** Ready for Planning

## What We're Exploring

The E2E test suite has 11 failing tests out of 115 total. This brainstorm explores:
1. Why the tests are failing
2. What's causing test flakiness
3. How to fix the failures and improve reliability

## Current Test Results

| Status | Count |
|--------|-------|
| Passed | 103 (90%) |
| Failed | 11 (10%) |
| Skipped | 1 |

### Failed Tests by Category

1. **Authentication (auth.spec.ts)** - 3 failures
   - `should show sign in page with Discord provider` - Discord button not visible
   - `should redirect to sign in when accessing protected route without session` - redirect issue
   - `API health endpoint returns OK` - API route failing

2. **Dashboard (dashboard.spec.ts)** - 1 failure
   - `should load dashboard page successfully` - redirect to sign-in

3. **Matches (matches.spec.ts)** - 6 failures
   - `should display match information` - waitForSelector timeout
   - `should show 404 for non-existent match` - timeout
   - `should display best of format` - timeout
   - `should show score reporting interface for pending match` - timeout
   - `should not allow reporting for completed match` - timeout
   - `should show confirmation for opponent reported score` - timeout

4. **Tournament List (tournament-list.spec.ts)** - 1 failure
   - `should load tournament list page successfully` - redirect to sign-in

## Root Cause Summary

After running tests, I verified that `NODE_ENV` is already set to `test` in the Playwright webServer config. The real issue is **middleware runs on the server** before the cookie is set, causing a race condition.

The failures fall into two categories:
1. **Auth-related (8 tests)**: Race condition between cookie setting and middleware
2. **Match tests (6 tests)**: Likely same auth issue + potential API mock problems

## Key Questions to Resolve

1. **Is NODE_ENV actually set to 'test' on the Next.js server?**
   - Need to verify the middleware environment

2. **Why do some tests in the same file fail while others pass?**
   - Race condition vs. test order dependency?

3. **What's causing the match page timeouts?**
   - API mock issue or actual page redirect?

4. **Is the health check endpoint properly configured for tests?**

## Recommended Fix

**Primary Issue:** Middleware bypass isn't working reliably in tests.

**Immediate action:** Add explicit auth bypass flag to middleware and pass it from Playwright config.

### Implementation Plan

1. **Modify middleware** (`apps/web/middleware.ts`):
   - Add `E2E_AUTH_BYPASS` check alongside existing `NODE_ENV` bypass
   - Keep both for redundancy

2. **Update Playwright config** (`playwright.config.ts`):
   - Ensure `NODE_ENV=test` is passed to webServer
   - Add `E2E_AUTH_BYPASS=true` to webServer env

3. **Fix health check** (if failing):
   - Check `/api/health` route exists and works

4. **Verify match tests**:
   - After auth fixes, re-run to see if timeouts persist
   - May need API mock fixes if still failing

## Resolved Questions

1. **Why are tests failing?** - Auth race condition + possible API mock issues
2. **Is NODE_ENV being passed?** - Yes, but middleware still has timing issues

## Next Steps

1. Implement the middleware fix (add E2E_AUTH_BYPASS)
2. Run tests to verify fix
3. Address any remaining match test failures
