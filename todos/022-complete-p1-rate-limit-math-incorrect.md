---
status: pending
priority: p1
issue_id: "022"
tags: [load-test, rate-limiting, startgg-api, math-error]
dependencies: []
---

# Rate Limit Math Incorrect in Load Test Plan

## Problem Statement

The load test plan contains unrealistic rate limit calculations. The current plan assumes 10 tournaments could make 300+ API calls per minute, but the actual rate limit is 80 requests per minute. This math error will cause the load test to fail against the Start.gg API rate limits.

**Why it matters:** Load testing against the Start.gg API without proper rate limit handling will result in API rejections, failed tests, and potentially API key throttling.

## Findings

**Evidence from Performance Oracle review:**

Rate limit calculation issues identified:
1. 10 tournaments could make 300+ API calls/min but Start.gg limit is 80/min
2. The plan assumes each tournament poll makes ~30 API calls
3. With 15-second polling intervals during active tournaments: 10 tournaments x 4 polls/min x 30 calls = 1200 calls/min (!)
4. Realistic calculation: Need to account for caching, pagination, and rate limit headers

**Additional metrics issues:**
- Start.gg API latency: 200-800ms per request (not accounted for)
- This adds significant time to each poll cycle

**Impact:**
- Load test will exceed API rate limits immediately
- Tests will fail with 429 responses
- Plan does not include rate limit backoff handling

## Proposed Solutions

### Solution 1: Fix Rate Limit Calculations

Recalculate realistic API call volumes:

```typescript
// Realistic calculations:
// - Tournament poll: ~5 API calls (event list + sets for each event)
// - Registration sync: ~2-3 API calls (entrants query, paginated)
// - Caching: Reduces redundant calls within TTL window

// Active tournament (15s interval):
// 10 tournaments x 4 polls/min x 5 calls = 200 calls/min (exceeds limit!)

// Need: rate limiting + caching must work together
```

### Solution 2: Add Rate Limit Handler to Load Test

Implement rate limit detection and backoff:

```typescript
// In StartGGClient or load test harness:
interface RateLimitConfig {
  maxRequestsPerMinute: number;
  backoffMultiplier: number;
  retryAfterHeader: string; // 'X-RateLimit-Reset' or similar
}

// Rate limiter for load tests:
class RateLimitHandler {
  private requestTimestamps: number[] = [];
  private limit: number;

  constructor(limit: number) {
    this.limit = limit;
  }

  async acquire(): Promise<void> {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Remove timestamps older than 1 minute
    this.requestTimestamps = this.requestTimestamps.filter(ts => ts > oneMinuteAgo);

    if (this.requestTimestamps.length >= this.limit) {
      const oldestInWindow = this.requestTimestamps[0];
      const waitTime = 60000 - (now - oldestInWindow);
      await this.sleep(waitTime);
    }

    this.requestTimestamps.push(now);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Solution 3: Add Rate Limit Test Scenarios

Update load test plan to include:

| Scenario | Description | Expected Behavior |
|----------|-------------|-------------------|
| Normal Load | 5 tournaments, 30s intervals | All requests succeed |
| High Load | 10 tournaments, 15s intervals | Rate limiting kicks in, requests retry |
| Rate Limit Recovery | After 429, verify backoff works | Graceful recovery |

| Aspect | Assessment |
|--------|------------|
| Pros | Realistic testing of rate limit handling |
| Cons | Requires test infrastructure changes |
| Effort | Medium |
| Risk | Low |

## Recommended Action

<!-- Filled during triage -->

## Technical Details

**Affected files:**
- Load test plan documentation
- `packages/startgg-client/src/client.ts` (add rate limit handling)
- Load test harness

**Components needing updates:**
- RateLimitHandler implementation
- Test scenario definitions

## Acceptance Criteria

- [ ] Rate limit calculations in plan are mathematically correct
- [ ] Load test implements rate limit detection and backoff
- [ ] Test scenarios include rate limit injection
- [ ] API latency (200-800ms) is factored into timing expectations

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-02-17 | Created from Performance Oracle review | Confirmed rate limit math is unrealistic |
