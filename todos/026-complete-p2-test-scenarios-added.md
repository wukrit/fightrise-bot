---
status: pending
priority: p2
issue_id: "026"
tags: [load-test, scenarios, testing, concurrency]
dependencies: []
---

# Missing Test Scenarios for Load Testing

## Problem Statement

The load test plan lacks several important test scenarios that are needed to properly validate the system under different conditions. Specifically, scenarios for BullMQ concurrency scaling and rate limit handling are missing.

**Why it matters:** The load test should validate that the system handles realistic conditions including high concurrency and rate limiting. Without these scenarios, the test will not catch performance issues that occur under stress.

## Findings

**Evidence from Performance Oracle review:**

Missing scenarios identified:
1. BullMQ concurrency scaling - Test with different concurrency levels
2. Rate limit handling - Test with rate limit injection (429 responses)
3. Connection pool exhaustion - Database and Redis connection limits
4. API latency variations - Test with 200-800ms response times

**Current state:**
- Basic polling scenarios may exist
- No concurrency scaling tests
- No rate limit injection
- No latency variation tests

**What's needed:**

| Scenario | Description | Why Important |
|----------|-------------|---------------|
| Baseline | 2 tournaments, 60s poll interval | Establish baseline performance |
| Normal Load | 5 tournaments, 30s poll interval | Typical production load |
| High Load | 10 tournaments, 15s poll interval | Maximum expected load |
| Concurrency Scaling | Test with concurrency=1,2,4,8 | Validate worker scaling |
| Rate Limit Normal | 5 tournaments, no rate limiting | Within API limits |
| Rate Limit Exceeded | 10 tournaments with rate limiting | Handle 429 gracefully |
| Latency Stress | Add 200-800ms latency to API | Realistic API behavior |
| Connection Exhaustion | High concurrency, verify no crashes | System resilience |

## Proposed Solutions

### Solution 1: Create Scenario Framework

Implement a scenario-based test runner.

```typescript
// apps/bot/src/load-test/scenarios/scenarioRunner.ts

import { LoadTestConfig, LoadTestScenario } from '../types';

export const SCENARIOS: LoadTestScenario[] = [
  {
    name: 'baseline',
    weight: 0.1,
    config: {
      concurrentTournaments: 2,
      pollIntervalMs: 60000,
      duration: 60,
    },
  },
  {
    name: 'normal-load',
    weight: 0.3,
    config: {
      concurrentTournaments: 5,
      pollIntervalMs: 30000,
      duration: 120,
    },
  },
  {
    name: 'high-load',
    weight: 0.3,
    config: {
      concurrentTournaments: 10,
      pollIntervalMs: 15000,
      duration: 120,
    },
  },
  {
    name: 'concurrency-scaling',
    weight: 0.15,
    config: {
      concurrentTournaments: 5,
      pollIntervalMs: 15000,
      concurrencyLevels: [1, 2, 4, 8],
      duration: 180,
    },
  },
  {
    name: 'rate-limit-handling',
    weight: 0.15,
    config: {
      concurrentTournaments: 10,
      pollIntervalMs: 15000,
      rateLimitEnabled: true,
      rateLimitThreshold: 80, // requests per minute
      duration: 120,
    },
  },
];

export async function runScenario(
  scenario: LoadTestScenario
): Promise<LoadTestResult> {
  console.log(`[LoadTest] Running scenario: ${scenario.name}`);

  // Set up test environment
  await setupTestEnvironment(scenario.config);

  // Run the test
  const metrics = await executeLoadTest(scenario.config);

  // Validate results
  const passed = validateResults(metrics, scenario);

  return {
    scenario: scenario.name,
    metrics,
    passed,
    timestamp: new Date(),
  };
}
```

### Solution 2: Add Latency Injection Middleware

Add realistic API latency to mock server.

```typescript
// apps/bot/src/load-test/mocks/latencyMiddleware.ts

export function createLatencyMiddleware(latencyConfig: {
  minMs: number;
  maxMs: number;
  enabled: boolean;
}) {
  return async (req: Request, next: NextFunction) => {
    if (!latencyConfig.enabled) {
      return next(req);
    }

    // Random latency between min and max
    const latency =
      latencyConfig.minMs +
      Math.random() * (latencyConfig.maxMs - latencyConfig.minMs);

    await new Promise(resolve => setTimeout(resolve, latency));

    return next(req);
  };
}

// Usage in load test:
const mockServer = createMockServer({
  latency: {
    minMs: 200,
    maxMs: 800,
    enabled: true,
  },
});
```

### Solution 3: Add Rate Limit Injection

Test rate limit handling.

```typescript// apps/bot/src/load-test/mocks/rateLimitMiddleware.ts

export function createRateLimitMiddleware(config: {
  maxRequestsPerMinute: number;
  enabled: boolean;
}) {
  const requestCounts = new Map<string, number[]>();

  return (req: Request, next: NextFunction) => {
    if (!config.enabled) {
      return next(req);
    }

    const key = 'global'; // Could be per-user, per-tournament
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Get request times in the last minute
    const times = requestCounts.get(key) || [];
    const recentTimes = times.filter(t => t > oneMinuteAgo);

    if (recentTimes.length >= config.maxRequestsPerMinute) {
      // Return 429 Rate Limited
      return new Response(
        JSON.stringify({
          errors: [{ message: 'Rate limit exceeded' }],
        }),
        {
          status: 429,
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Limit': String(config.maxRequestsPerMinute),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    recentTimes.push(now);
    requestCounts.set(key, recentTimes);

    return next(req);
  };
}
```

| Aspect | Assessment |
|--------|------------|
| Pros | Comprehensive coverage of edge cases |
| Cons | Requires significant implementation |
| Effort | Medium to Large |
| Risk | Low |

## Recommended Action

<!-- Filled during triage -->

## Technical Details

**New files needed:**
- `apps/bot/src/load-test/scenarios/index.ts` - Scenario definitions
- `apps/bot/src/load-test/scenarios/scenarioRunner.ts` - Runner implementation
- `apps/bot/src/load-test/mocks/latencyMiddleware.ts` - Latency injection
- `apps/bot/src/load-test/mocks/rateLimitMiddleware.ts` - Rate limit injection

**Components needing updates:**
- Load test runner to support scenarios
- Mock server to support middleware

## Acceptance Criteria

- [ ] Scenario framework implemented
- [ ] Baseline scenario runs successfully
- [ ] Normal load scenario runs successfully
- [ ] High load scenario runs successfully
- [ ] Concurrency scaling scenario tests different worker counts
- [ ] Rate limit handling scenario injects 429 responses
- [ ] Latency injection adds 200-800ms to responses
- [ ] All scenarios report pass/fail results

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-02-17 | Created from Performance Oracle and Agent Native reviews | Missing key scenarios for realistic testing |
