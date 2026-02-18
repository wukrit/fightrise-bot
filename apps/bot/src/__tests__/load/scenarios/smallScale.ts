/**
 * Small scale load test scenario.
 * Tests with 10 concurrent tournaments.
 */

import { describe, it, expect } from 'vitest';
import { SCENARIO_CONFIGS } from '../types.js';
import { runLoadTestWithAssertions } from './baseRunner.js';

describe('Load Test: Small Scale', () => {
  const config = SCENARIO_CONFIGS.smallScale;

  it('should handle 10 concurrent tournaments without rate limit issues', async () => {
    const results = await runLoadTestWithAssertions(config, {
      maxErrorRate: 0.01, // 1% error rate
      maxLatencyP99: 500, // 500ms p99 latency
      maxApiCallsPerMinute: 80, // Stay under rate limit with caching
      maxMemoryGrowthMB: 100, // 100MB memory growth
    });

    // Log results for analysis
    console.log('Small Scale Results:', {
      scenario: results.scenario,
      tournamentCount: config.tournamentCount,
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
    // With caching, API calls should stay under limit
    expect(results.apiCallsPerMinute).toBeLessThanOrEqual(80);
  }, 600000); // 10 minute timeout
});
