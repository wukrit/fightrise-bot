---
status: complete
priority: p1
issue_id: "103"
tags: [code-review, reliability, startgg-client]
dependencies: []
---

# Start.gg Client Retry Only Handles Rate Limits

## Problem Statement

The retry logic in the Start.gg client only retries on HTTP 429 (rate limit) errors. Network timeouts, transient errors, and 5xx server errors are not retried, causing unnecessary failures.

**Why it matters:** Start.gg API can have transient failures. Without proper retry logic, legitimate requests fail unnecessarily, disrupting tournament operations.

## Findings

**Location:** `packages/startgg-client/src/retry.ts:64-67`

```typescript
// Only retries on rate limit errors
if (response.status === 429) {
  // retry logic
}
```

## Proposed Solutions

### Solution 1: Expand Retryable Status Codes (Recommended)

Add 5xx errors and ETIMEDOUT to retryable errors.

```typescript
const RETRYABLE_CODES = [429, 500, 502, 503, 504];
const RETRYABLE_ERRORS = ['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND'];
```

| Aspect | Assessment |
|--------|------------|
| Pros | More resilient to API issues |
| Cons | Slightly higher latency on failures |
| Effort | Small |
| Risk | Low |

## Recommended Action

<!-- Filled during triage -->

## Technical Details

**Affected files:**
- `packages/startgg-client/src/retry.ts`

## Acceptance Criteria

- [ ] Retry on 5xx errors
- [ ] Retry on network timeouts
- [ ] Add tests for retry behavior

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-11 | Verified already fixed | Code reviewed - issue no longer present |
| 2026-03-10 | Created from packages review | Found in database-packages-review agent |

## Resources

- Start.gg API Status page
- GraphQL Retry Patterns
