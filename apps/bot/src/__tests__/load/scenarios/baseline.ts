/**
 * Baseline load test scenario.
 * Tests normal operation with 1 tournament.
 */

import { describe, it, expect } from 'vitest';
import { SCENARIO_CONFIGS } from '../types.js';
import { runLoadTestWithAssertions } from './baseRunner.js';

describe('Load Test: Baseline', () => {
  const config = SCENARIO_CONFIGS.baseline;

  it('should complete baseline load test with acceptable metrics', async () => {
    const results = await runLoadTestWithAssertions(config, {
      maxErrorRate: 0.01, // 1% error rate
      maxLatencyP99: 500, // 500ms p99 latency
      maxApiCallsPerMinute: 80, // Stay under rate limit
      maxMemoryGrowthMB: 100, // 100MB memory growth
    });

    // Log results for analysis
    console.log('Baseline Results:', {
      scenario: results.scenario,
      totalRequests: results.totalRequests,
      errorRate: results.errorRate,
      latencyP50: results.latencyP50,
      latencyP95: results.latencyP95,
      latencyP99: results.latencyP99,
      throughput: results.throughput,
      memoryGrowthMB: results.memoryGrowthMB,
      apiCallsPerMinute: results.apiCallsPerMinute,
    });

    // Assertions
    expect(results.totalRequests).toBeGreaterThan(0);
    expect(results.errorRate).toBeLessThanOrEqual(0.01);
  }, 600000); // 10 minute timeout
});
