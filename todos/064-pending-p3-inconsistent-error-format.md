---
status: complete
priority: p3
issue_id: "064"
tags: [code-review, api, error-handling]
dependencies: []
---

# Inconsistent Error Response Format

## Problem Statement

API routes return inconsistent error response formats - some return `{ error: string }` while structures vary.

## Findings

**Locations:**
- `apps/web/app/api/matches/[id]/report/route.ts`
- `apps/web/app/api/tournaments/[id]/route.ts`

## Proposed Solutions

### Solution A: Create Standardized Error Helper
Create `createErrorResponse(message, statusCode)` helper.

**Pros:** Consistent API, easier client handling

**Effort:** Small

## Resolution

Implemented standardized API response helpers:

1. Created `/home/ubuntu/fightrise-bot/apps/web/lib/api-response.ts` with:
   - `createErrorResponse(message, statusCode, options)` - Standardized error responses
   - `createSuccessResponse(data, statusCode, rateLimitHeaders)` - Standardized success responses
   - `createRateLimitResponse(rateLimitResult)` - Standardized rate limit responses
   - `HttpStatus` enum for consistent status codes
   - `ApiError` interface for consistent error structure

2. Updated `/home/ubuntu/fightrise-bot/apps/web/lib/ratelimit.ts` to use `createRateLimitResponse`

3. Updated `/home/ubuntu/fightrise-bot/apps/web/app/api/matches/[id]/report/route.ts` to use helpers

4. Updated `/home/ubuntu/fightrise-bot/apps/web/app/api/tournaments/[id]/route.ts` to use helpers

All error responses now use consistent format:
```json
{ "error": "message", "code": "optional-code", "details": {} }
```

## Technical Details

- **Affected Files:**
  - `apps/web/lib/api-response.ts` (new)
  - `apps/web/lib/ratelimit.ts`
  - `apps/web/app/api/matches/[id]/report/route.ts`
  - `apps/web/app/api/tournaments/[id]/route.ts`

## Acceptance Criteria

- [x] Standardized error response format
- [x] Consistent status codes
