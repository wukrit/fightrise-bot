---
status: ready
priority: p1
issue_id: "code-review"
tags: [code-review, security, bot, rate-limiting]
dependencies: []
---

# No Rate Limiting on Discord Interactions

## Problem Statement

No rate limiting is implemented on any Discord interactions. All slash commands and button handlers can be spammed without throttling.

**Why it matters:** Bot can be abused with rapid command spam, causing performance issues or abuse.

## Findings

**Location:** `apps/bot/src/events/interactionCreate.ts` (entire file)

- No middleware or guard for rate limiting
- No Discord.js rate limit handling visible
- Button handlers can be clicked repeatedly without any cooldown

## Proposed Solutions

### Solution A: Implement Redis-based rate limiting
- **Description:** Use Redis (already available) for per-user rate limiting
- **Pros:** Works across multiple bot instances
- **Cons:** Adds Redis dependency for rate limiting
- **Effort:** Medium
- **Risk:** Low

### Solution B: In-memory rate limiting
- **Description:** Simple in-memory Map for rate limiting
- **Pros:** No external dependency
- **Cons:** Doesn't work with multiple instances
- **Effort:** Small
- **Risk:** Low (for single-instance deployments)

## Recommended Action

**Solution A** - Use Redis for distributed rate limiting.

## Technical Details

**Affected Files:**
- `apps/bot/src/events/interactionCreate.ts`

## Acceptance Criteria

- [x] Rate limiting on slash commands
- [x] Rate limiting on button handlers
- [x] Configurable limits per user

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-18 | Created | Found during code review |
| 2026-02-18 | Implemented | Redis-based sliding window rate limiting (10 actions/10s per user) |

## Resources

- Review: Discord Bot Domain
