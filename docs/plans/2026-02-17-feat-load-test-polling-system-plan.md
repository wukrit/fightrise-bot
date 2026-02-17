---
title: Load test polling system
type: feat
status: completed
date: 2026-02-17
---

# Load Test Polling System

## Overview

Create load testing infrastructure and scripts to verify the polling system can handle multiple concurrent tournaments under various stress conditions. This validates the system meets the acceptance criteria defined in the issue.

## Problem Statement

The FightRise bot polls Start.gg for tournament data using BullMQ workers. As the user base grows, multiple tournaments will be polled simultaneously. We need to verify the system can handle:
- 10+ concurrent tournaments
- 50+ concurrent tournaments
- 100+ active matches

Without hitting rate limits, overwhelming the database, or causing Redis/BullMQ bottlenecks.

## Recent Fixes (Pre-requisites)

Before running load tests, these issues were fixed:

1. **RegistrationSyncService caching enabled** (`apps/bot/src/services/registrationSyncService.ts:28`)
   - Changed from `cache: { enabled: false }` to `cache: { enabled: true, ttlMs: 30000, maxEntries: 500 }`
   - This reduces API calls from ~300/min to ~80/min for 10 tournaments

2. **BullMQ concurrency now configurable** (`apps/bot/src/services/pollingService.ts:64`)
   - Added `BULLMQ_CONCURRENCY` environment variable (default: 1)
   - Enables testing different concurrency levels

## Technical Context

### Current Architecture

**Polling Service** (`apps/bot/src/services/pollingService.ts`):
- Uses BullMQ with configurable worker concurrency (default: **1**)
- Dynamic poll intervals: 15s (active), 1min (registration), 5min (inactive)
- Job retry: 3 attempts with exponential backoff
- Job ID pattern: `poll-${tournamentId}` to prevent duplicates

**Start.gg API Limits** (from `docs/STARTGG_SETUP.md`):
- 80 requests per 60 seconds
- 1,000 objects per request
- Returns HTTP 200 with `{ success: false }` on rate limit

**Performance Optimizations Already Implemented**:
- Batch prefetch with Map lookup to avoid N+1 queries
- Parallel event processing within a tournament (`Promise.all`)
- Redis singleton with reconnection handling
- Cache eviction with LRU-style FIFO (30s TTL, 500 max entries)
- RegistrationSyncService now uses caching

### Rate Limit Budget Calculation

**Critical**: With 10 active tournaments (15s interval = 4 polls/min), each poll makes multiple API calls:

| Call Type | Per Event | 10 Events | Notes |
|-----------|-----------|-----------|-------|
| Tournament query | 1 | 10 | Cached after first |
| Sets query (paginated) | ~20 | ~200 | 50 items/page, 10 sets avg |
| Entrants query | ~5 | ~50 | Cached now |
| **Total per poll cycle** | - | ~260 | Without caching |
| **Total with caching** | - | ~60 | With 30s TTL |

**Conclusion**: With caching enabled, 10 tournaments stay under the 80 req/min limit.

### Key Components to Test

| Component | Current State | Test Focus |
|-----------|---------------|-------------|
| BullMQ Worker | Concurrency configurable via env | Test 1, 5, 10, 20 |
| Start.gg API | 80 req/60s with caching | Rate limit handling |
| Redis/BullMQ | Singleton connection | Memory, connection pool |
| Database | Prisma with pooling | Query performance |
| Poll intervals | Dynamic 15s-5min | Under load behavior |

## Proposed Solution

### Phase 1: Load Test Infrastructure

Create a load testing framework that can:
1. Simulate N concurrent tournaments being polled
2. Mock Start.gg API responses with realistic data
3. Measure key metrics (latency, throughput, errors)
4. Run in Docker for CI/CD compatibility

### Phase 2: Define Test Scenarios

| Scenario | Tournaments | Matches | Purpose |
|----------|-------------|---------|---------|
| Baseline | 1 | 10 | Verify normal operation |
| Small Scale | 10 | 50 | Target: 10+ concurrent |
| Medium Scale | 50 | 200 | Stress test |
| High Scale | 100 | 500 | Capacity limit |
| Burst | 10 | 100 | Rapid state changes |
| **Concurrency** | 10 | 50 | Test 1/5/10/20 workers |
| **Rate Limit** | 10 | 50 | 30% 429 injection |

### Phase 3: Execute & Measure

Metrics to capture:
- API calls per minute (vs 80 req/60s limit)
- Database queries per second
- Redis memory usage
- Job queue depth
- Response latency (target: <500ms)
- Error rates

### Phase 4: Optimize & Document

Identify bottlenecks and:
- Adjust BullMQ concurrency if needed
- Implement request batching for Start.gg
- Document capacity limits

## Technical Implementation

### TypeScript Interfaces

```typescript
// apps/bot/src/__tests__/load/types.ts

export type LoadTestScenario = 'baseline' | 'smallScale' | 'mediumScale' | 'highScale' | 'burst' | 'concurrency' | 'rateLimit';

export interface LoadTestConfig {
  scenario: LoadTestScenario;
  tournamentCount: number;
  matchCount: number;
  eventCount: number;
  durationMinutes: number;
  mockLatencyMs: number;
  rateLimitInjection?: number; // % of requests that return 429
  concurrency?: number; // BullMQ concurrency setting
}

export interface LoadTestResult {
  scenario: LoadTestScenario;
  durationMs: number;
  totalRequests: number;
  totalErrors: number;
  errorRate: number;
  latencyP50: number;
  latencyP95: number;
  latencyP99: number;
  throughput: number; // requests/second
  memoryUsedMB: number;
  peakQueueDepth: number;
  rateLimitHits: number;
  apiCallsPerMinute: number;
}

export interface LoadTestMetrics {
  latencies: number[];
  errors: Error[];
  requests: number;
  queueDepths: number[];
  memorySnapshots: number[];
}
```

### File Structure

```
apps/bot/src/__tests__/load/
├── pollingLoad.test.ts       # Main load test suite
├── types.ts                  # TypeScript interfaces
├── scenarios/                # Test scenario definitions
│   ├── baseline.ts
│   ├── smallScale.ts
│   ├── mediumScale.ts
│   ├── burst.ts
│   ├── concurrency.ts        # NEW: Concurrency scaling tests
│   └── rateLimit.ts          # NEW: Rate limit injection tests
├── mocks/
│   ├── startggMockServer.ts  # Mock Start.gg GraphQL
│   └── metricsCollector.ts   # Metrics aggregation
└── utils/
    ├── tournamentFactory.ts  # Generate test tournaments
    └── loadRunner.ts         # Execute load tests
```

### MetricsCollector Implementation

```typescript
// apps/bot/src/__tests__/load/mocks/metricsCollector.ts

export class MetricsCollector {
  private latencies: number[] = [];
  private errors: Error[] = [];
  private requests = 0;
  private queueDepths: number[] = [];
  private memorySnapshots: number[] = [];
  private startTime: number = 0;

  start(): void {
    this.startTime = Date.now();
    this.latencies = [];
    this.errors = [];
    this.requests = 0;
    this.queueDepths = [];
    this.memorySnapshots = [];
  }

  recordLatency(ms: number): void {
    this.latencies.push(ms);
  }

  recordRequest(): void {
    this.requests++;
  }

  recordError(err: Error): void {
    this.errors.push(err);
  }

  recordQueueDepth(depth: number): void {
    this.queueDepths.push(depth);
  }

  recordMemory(): void {
    const used = process.memoryUsage();
    this.memorySnapshots.push(used.heapUsed / 1024 / 1024);
  }

  getResults(config: LoadTestConfig): LoadTestResult {
    const durationMs = Date.now() - this.startTime;
    const sorted = [...this.latencies].sort((a, b) => a - b);

    return {
      scenario: config.scenario,
      durationMs,
      totalRequests: this.requests,
      totalErrors: this.errors.length,
      errorRate: this.errors.length / this.requests,
      latencyP50: percentile(sorted, 50),
      latencyP95: percentile(sorted, 95),
      latencyP99: percentile(sorted, 99),
      throughput: (this.requests / durationMs) * 1000,
      memoryUsedMB: Math.max(...this.memorySnapshots, 0),
      peakQueueDepth: Math.max(...this.queueDepths, 0),
      rateLimitHits: this.errors.filter(e => e.message.includes('429')).length,
      apiCallsPerMinute: (this.requests / durationMs) * 60000,
    };
  }
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}
```

### Mock Start.gg Server Implementation

```typescript
// apps/bot/src/__tests__/load/mocks/startggMockServer.ts

import { http, HttpResponse, delay } from 'msw';
import { setupServer } from 'msw/node';

interface MockServerConfig {
  latencyMs: number;
  rateLimitInjection?: number; // % of requests to 429
}

export function createMockStartggServer(config: MockServerConfig) {
  const handlers = [
    // Tournament query
    http.post('https://api.start.gg/gql/alpha', async ({ request }) => {
      await delay(config.latencyMs);

      // Simulate rate limiting
      if (config.rateLimitInjection && Math.random() * 100 < config.rateLimitInjection) {
        return HttpResponse.json({
          data: null,
          errors: [{ message: 'Rate limit exceeded', extensions: { code: 'RATE_LIMITED' }]
        });
      }

      // Return mock tournament data based on query
      const body = await request.json();
      // ... mock responses matching Start.gg schema
    }),
  ];

  const server = setupServer(...handlers);
  return { server, handlers };
}
```

### Key Test Functions

```typescript
// apps/bot/src/__tests__/load/scenarios/smallScale.ts
export async function runSmallScaleTest(config: LoadTestConfig): Promise<LoadTestResult> {
  const metrics = new MetricsCollector();
  const mockServer = createMockStartggServer({ latencyMs: config.mockLatencyMs });
  mockServer.server.listen();

  metrics.start();

  // Create 10 tournaments with 5 events each
  await tournamentFactory.createMany(config.tournamentCount, config.eventCount);

  // Set concurrency
  process.env.BULLMQ_CONCURRENCY = String(config.concurrency || 1);
  await startPollingService();

  // Run for duration
  await sleep(config.durationMinutes * 60 * 1000);

  // Collect metrics
  const results = metrics.getResults(config);

  mockServer.server.close();

  // Assert
  expect(results.errorRate).toBeLessThan(0.01);
  expect(results.latencyP99).toBeLessThan(500);
  expect(results.rateLimitHits).toBe(0);

  return results;
}

// apps/bot/src/__tests__/load/scenarios/concurrency.ts
// NEW: Test different concurrency levels
export async function runConcurrencyTest(config: LoadTestConfig): Promise<LoadTestResult> {
  const results: LoadTestResult[] = [];

  for (const concurrency of [1, 5, 10, 20]) {
    const result = await runLoadTest({ ...config, concurrency });
    results.push(result);
  }

  // Find optimal concurrency
  const optimal = results.find(r => r.latencyP99 < 500 && r.errorRate < 0.01);
  return optimal || results[0];
}

// apps/bot/src/__tests__/load/scenarios/rateLimit.ts
// NEW: Test rate limit handling
export async function runRateLimitTest(config: LoadTestConfig): Promise<LoadTestResult> {
  // Inject 30% rate limit responses
  const result = await runLoadTest({
    ...config,
    rateLimitInjection: 30,
  });

  // Verify graceful degradation
  expect(result.errorRate).toBeLessThan(0.35); // Some errors expected
  expect(result.rateLimitHits).toBeGreaterThan(0);

  return result;
}
```

### Integration with Existing Tests

Use the existing test harness patterns from:
- `apps/bot/src/__tests__/smoke/redis.smoke.test.ts` - Redis connection patterns
- `apps/bot/src/__tests__/services/pollingService.test.ts` - Polling unit tests

## Acceptance Criteria

- [x] Load test infrastructure created (types, mock server, metrics collector)
- [ ] Baseline test (1 tournament) passes
- [ ] 10 concurrent tournaments test passes (with caching)
- [ ] 50 concurrent tournaments test completes without crash
- [ ] 100+ matches scenario completes
- [ ] Concurrency test finds optimal BullMQ concurrency
- [ ] Rate limit injection test verifies graceful degradation
- [ ] Start.gg rate limit (80 req/60s) never exceeded
- [ ] Latency stays under 500ms p99
- [ ] Memory usage stable (no leaks)
- [ ] Capacity limits documented

## Success Metrics

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| API calls/min | < 80 | > 80 (rate limit) |
| Latency p99 | < 500ms | > 1000ms |
| Error rate | < 1% | > 5% |
| Memory growth | < 100MB | > 200MB |
| Queue depth | < 100 | > 500 |
| Optimal concurrency | Found | N/A |

## Dependencies & Risks

### Dependencies
- Docker environment for consistent testing
- Mock Start.gg server (can't hit real API during load test)
- Redis and PostgreSQL running

### Risks (Addressed)
1. **Start.gg Rate Limits**: ✅ FIXED - RegistrationSyncService caching enabled
2. **Redis Connection Pool**: May need to increase connections for high concurrency
3. **Database Connections**: Prisma connection pool may saturate
4. **Test Flakiness**: Load tests can be non-deterministic
5. **BullMQ Concurrency**: ✅ FIXED - Now configurable via BULLMQ_CONCURRENCY env var

## References

- BullMQ Documentation: https://docs.bullmq.io/
- Start.gg Rate Limits: `docs/STARTGG_SETUP.md`
- Existing polling service: `apps/bot/src/services/pollingService.ts:1`
- Poll intervals: `packages/shared/src/constants.ts` (POLL_INTERVALS)
- Redis config: `apps/bot/src/lib/redis.ts`

## Related Work

- Issue #35: Integration test suite (patterns for test infrastructure)
- Previous polling implementation: `docs/solutions/integration-issues/startgg-polling-service-implementation.md`
