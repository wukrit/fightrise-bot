---
status: complete
priority: p3
issue_id: "007"
tags: [code-review, performance]
dependencies: []
---

# Unbounded Cache Growth in StartGGClient

## Problem Statement

The StartGGClient is configured with caching enabled but no size limits. Over time with many tournaments, the cache could grow unbounded.

**Why it matters:** Memory usage could grow indefinitely, potentially causing OOM issues in long-running processes.

## Findings

**Location:** `apps/bot/src/services/pollingService.ts:27-31`

```typescript
client = new StartGGClient({
  apiKey,
  cache: { enabled: true, ttlMs: 30000 },
  retry: { maxRetries: 3 },
});
```

**Evidence from Performance Oracle review:**
- Severity: Minor/Nice-to-have
- Cache has TTL but no max size limit
- Long-running bot could accumulate stale entries

## Proposed Solutions

### Solution 1: Add Max Size to Cache Config

If the StartGGClient supports it, add a max entries limit.

```typescript
cache: { enabled: true, ttlMs: 30000, maxEntries: 1000 },
```

| Aspect | Assessment |
|--------|------------|
| Pros | Simple if supported |
| Cons | Depends on client implementation |
| Effort | Small |
| Risk | Low |

### Solution 2: Periodic Cache Clear

Clear the cache periodically or on tournament completion.

| Aspect | Assessment |
|--------|------------|
| Pros | Works regardless of client implementation |
| Cons | May cause cache misses |
| Effort | Small |
| Risk | Low |

## Recommended Action

<!-- Filled during triage - may be deferred -->

## Acceptance Criteria

- [ ] Cache has bounded growth
- [ ] Memory usage stable over time

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-28 | Created from code review | Performance oracle noted unbounded cache |
| 2026-01-28 | Fixed: Added maxEntries to CacheConfig, implemented LRU-style eviction | Default 1000 entries, polling uses 500; 3 new tests added |

## Resources

- PR #52
