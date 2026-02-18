---
status: pending
priority: p2
issue_id: "025"
tags: [load-test, metrics, monitoring, instrumentation]
dependencies: []
---

# MetricsCollector Implementation Missing

## Problem Statement

The load test plan references a MetricsCollector component but no implementation exists. This component is essential for gathering performance data during load tests (latency, throughput, error rates, etc.).

**Why it matters:** Without a metrics collector, there is no way to measure the performance of the system under load or determine if the load test passed or failed.

## Findings

**Evidence from Agent Native Reviewer:**

The review identified:
1. MetricsCollector implementation missing
2. No way to collect latency metrics
3. No way to track throughput
4. No error tracking

**What's needed:**

```typescript
// Expected MetricsCollector interface
class MetricsCollector {
  // Track individual requests
  recordRequest(durationMs: number, success: boolean, endpoint: string): void;

  // Track specific metrics
  recordLatency(endpoint: string, latencyMs: number): void;
  recordError(errorType: string, endpoint: string): void;

  // Get aggregated metrics
  getMetrics(): LoadTestMetrics;

  // Get percentile calculations
  getPercentile(p: number): number;

  // Reset for new test run
  reset(): void;
}
```

**Metrics that should be collected:**
- Total requests
- Successful requests
- Failed requests
- Average latency
- P50 latency
- P95 latency
- P99 latency
- Requests per second (throughput)
- Error types and counts

## Proposed Solutions

### Solution 1: Create MetricsCollector Class

Implement a comprehensive metrics collector.

```typescript
// apps/bot/src/load-test/utils/metricsCollector.ts

interface MetricPoint {
  timestamp: number;
  value: number;
}

interface EndpointMetrics {
  latencies: number[];
  successCount: number;
  errorCount: number;
}

export class MetricsCollector {
  private endpointMetrics: Map<string, EndpointMetrics> = new Map();
  private startTime: number = 0;
  private endTime: number = 0;

  start(): void {
    this.startTime = Date.now();
  }

  end(): void {
    this.endTime = Date.now();
  }

  recordRequest(durationMs: number, success: boolean, endpoint: string): void {
    let metrics = this.endpointMetrics.get(endpoint);
    if (!metrics) {
      metrics = { latencies: [], successCount: 0, errorCount: 0 };
      this.endpointMetrics.set(endpoint, metrics);
    }

    metrics.latencies.push(durationMs);
    if (success) {
      metrics.successCount++;
    } else {
      metrics.errorCount++;
    }
  }

  getMetrics(): {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageLatencyMs: number;
    p50LatencyMs: number;
    p95LatencyMs: number;
    p99LatencyMs: number;
    throughputRps: number;
  } {
    let allLatencies: number[] = [];
    let totalSuccess = 0;
    let totalErrors = 0;

    for (const [, metrics] of this.endpointMetrics) {
      allLatencies = allLatencies.concat(metrics.latencies);
      totalSuccess += metrics.successCount;
      totalErrors += metrics.errorCount;
    }

    allLatencies.sort((a, b) => a - b);

    const durationSeconds = (this.endTime - this.startTime) / 1000;
    const totalRequests = totalSuccess + totalErrors;

    return {
      totalRequests,
      successfulRequests: totalSuccess,
      failedRequests: totalErrors,
      averageLatencyMs: allLatencies.length > 0
        ? allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length
        : 0,
      p50LatencyMs: this.percentile(allLatencies, 50),
      p95LatencyMs: this.percentile(allLatencies, 95),
      p99LatencyMs: this.percentile(allLatencies, 99),
      throughputRps: durationSeconds > 0 ? totalRequests / durationSeconds : 0,
    };
  }

  private percentile(sortedArray: number[], p: number): number {
    if (sortedArray.length === 0) return 0;
    const index = Math.ceil((p / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }

  reset(): void {
    this.endpointMetrics.clear();
    this.startTime = 0;
    this.endTime = 0;
  }
}
```

### Solution 2: Integrate with Existing Monitoring

Consider integrating with existing observability tools:

```typescript
// Use existing logging/metrics infrastructure
import { logger } from '../lib/logger';

class MetricsCollector {
  // ... implementation

  async reportResults(): Promise<void> {
    const metrics = this.getMetrics();

    // Log summary
    logger.info('[LoadTest] Results:', {
      totalRequests: metrics.totalRequests,
      successRate: `${(metrics.successfulRequests / metrics.totalRequests * 100).toFixed(2)}%`,
      avgLatency: `${metrics.averageLatencyMs.toFixed(2)}ms`,
      p95Latency: `${metrics.p95LatencyMs.toFixed(2)}ms`,
      throughput: `${metrics.throughputRps.toFixed(2)} req/s`,
    });

    // Could also export to Prometheus, DataDog, etc.
  }
}
```

| Aspect | Assessment |
|--------|------------|
| Pros | Complete control, no external dependencies |
| Cons | Need to ensure thread-safety for concurrent requests |
| Effort | Small |
| Risk | Low |

## Recommended Action

<!-- Filled during triage -->

## Technical Details

**New files needed:**
- `apps/bot/src/load-test/utils/metricsCollector.ts`

**Components needing updates:**
- Load test runner to use MetricsCollector
- Scenario implementations to record metrics

## Acceptance Criteria

- [ ] MetricsCollector tracks request count
- [ ] MetricsCollector tracks success/failure
- [ ] MetricsCollector calculates average latency
- [ ] MetricsCollector calculates percentiles (p50, p95, p99)
- [ ] MetricsCollector calculates throughput
- [ ] Thread-safe for concurrent requests

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-02-17 | Created from Agent Native Reviewer review | MetricsCollector referenced but not implemented |
