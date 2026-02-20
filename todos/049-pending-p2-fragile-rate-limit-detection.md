---
status: complete
priority: p2
issue_id: "code-review"
tags: [code-review, reliability, startgg-client]
dependencies: []
---

# Fragile Rate Limit Detection

## Problem Statement

Rate limit detection relies on string matching in error messages. This is fragile because error message formats can change, and graphql-request may wrap errors.

**Why it matters:** Rate limits could be missed, causing more failures.

## Findings

**Location:** `packages/startgg-client/src/retry.ts:11-21`

```typescript
return (
  message.includes('rate limit') ||
  message.includes('429') ||
  message.includes('too many requests')
);
```

## Proposed Solutions

### Solution A: Check HTTP status code
- **Description:** Check error.response.status === 429 in addition to message
- **Pros:** More reliable
- **Cons:** None
- **Effort:** Small
- **Risk:** Low

## Recommended Action

**Solution A** - Check HTTP status code for rate limits.

## Technical Details

**Affected Files:**
- `packages/startgg-client/src/retry.ts`
- `packages/startgg-client/src/index.ts`

## Acceptance Criteria

- [ ] HTTP 429 status checked
- [ ] Fallback to message matching

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-18 | Created | Found during code review |

## Resources

- Review: Start.gg Client
