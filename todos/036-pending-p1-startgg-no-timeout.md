---
status: ready
priority: p1
issue_id: "code-review"
tags: [code-review, performance, startgg-client]
dependencies: []
---

# No Request Timeout for Start.gg Client

## Problem Statement

The GraphQL client is created without a timeout configuration. Network issues or slow Start.gg API responses could cause the bot to hang indefinitely.

**Why it matters:** Bot could hang waiting for API response, affecting all tournament operations.

## Findings

**Location:** `packages/startgg-client/src/index.ts:31-35`

```typescript
this.client = new GraphQLClient(STARTGG_API_URL, {
  headers: {
    Authorization: `Bearer ${config.apiKey}`,
  },
  // Missing: timeout, fetchOptions
});
```

## Proposed Solutions

### Solution A: Add timeout configuration
- **Description:** Add timeout option to GraphQLClient
- **Pros:** Prevents indefinite hangs
- **Cons:** None
- **Effort:** Small
- **Risk:** Low

```typescript
this.client = new GraphQLClient(STARTGG_API_URL, {
  headers: { Authorization: `Bearer ${config.apiKey}` },
  timeout: config.timeout ?? 30000, // 30 second default
});
```

## Recommended Action

**Solution A** - Add timeout configuration.

## Technical Details

**Affected Files:**
- `packages/startgg-client/src/index.ts`

## Acceptance Criteria

- [x] Timeout configured (default 30s)
- [x] Timeout handling in error path

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-18 | Created | Found during code review |
| 2026-02-18 | Completed | Added timeout: 30000 to GraphQLClient options |

## Resources

- Review: Start.gg Client
