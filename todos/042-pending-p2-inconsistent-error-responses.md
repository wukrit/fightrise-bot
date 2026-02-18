---
status: ready
priority: p2
issue_id: "code-review"
tags: [code-review, quality, bot]
dependencies: []
---

# Inconsistent Error Responses in Handlers

## Problem Statement

Some handlers return detailed error messages while others return generic "An error occurred" messages. This makes debugging difficult and user experience inconsistent.

**Why it matters:** Poor user experience, difficult debugging.

## Findings

**Location:** Multiple handlers in `apps/bot/src/handlers/`

- `checkin.ts` line 48-51: Generic "Invalid button format"
- `scoreHandler.ts` line 37: Generic "Invalid button format"
- But `admin.ts` provides specific error messages

## Proposed Solutions

### Solution A: Use typed errors from shared package
- **Description:** Use ValidationError, AuthorizationError from @fightrise/shared
- **Pros:** Consistent, typed errors
- **Cons:** None
- **Effort:** Small
- **Risk:** Low

## Recommended Action

**Solution A** - Use typed errors from shared package.

## Technical Details

**Affected Files:**
- `apps/bot/src/handlers/*.ts`

## Acceptance Criteria

- [ ] Consistent error handling
- [ ] Specific error messages

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-18 | Created | Found during code review |

## Resources

- Review: Discord Bot Domain
