/**
 * Load Test Suite for Polling System
 *
 * This test suite validates the polling system can handle multiple concurrent tournaments
 * under various stress conditions.
 *
 * Run with:
 *   npm run docker:test:integration -- --testPathPattern=load
 *
 * Or run individual scenarios:
 *   npm run docker:test:integration -- --testPathPattern=load/scenarios/baseline
 */

import { describe, it, expect } from 'vitest';
import { SCENARIO_CONFIGS, type LoadTestResult, type LoadTestScenario } from './types.js';
import { runLoadTest, runLoadTestWithAssertions, aggregateResults } from './scenarios/baseRunner.js';

// Re-export for convenience
export { SCENARIO_CONFIGS } from './types.js';
export type { LoadTestConfig, LoadTestResult, LoadTestScenario } from './types.js';

describe('Load Test Suite: Polling System', () => {
  it('should export types correctly', () => {
    // Verify type exports work
    const config = SCENARIO_CONFIGS.baseline;
    expect(config.scenario).toBe('baseline');
    expect(config.tournamentCount).toBe(1);
  });

  describe('Acceptance Criteria Validation', () => {
    it('baseline: 1 tournament, verify normal operation', async () => {
      const result = await runLoadTestWithAssertions(SCENARIO_CONFIGS.baseline, {
        maxErrorRate: 0.01,
        maxLatencyP99: 500,
        maxApiCallsPerMinute: 20,
        maxMemoryGrowthMB: 50,
      });

      expect(result.scenario).toBe('baseline');
      expect(result.totalRequests).toBeGreaterThan(0);
    }, 600000);

    it('smallScale: 10 concurrent tournaments with caching', async () => {
      const result = await runLoadTestWithAssertions(SCENARIO_CONFIGS.smallScale, {
        maxErrorRate: 0.01,
        maxLatencyP99: 500,
        maxApiCallsPerMinute: 80, // With caching, should stay under limit
        maxMemoryGrowthMB: 100,
      });

      expect(result.scenario).toBe('smallScale');
      expect(result.totalRequests).toBeGreaterThan(0);
    }, 600000);

    it('burst: rapid state changes', async () => {
      const result = await runLoadTestWithAssertions(SCENARIO_CONFIGS.burst, {
        maxErrorRate: 0.02,
        maxLatencyP99: 500,
        maxApiCallsPerMinute: 80,
        maxMemoryGrowthMB: 100,
      });

      expect(result.scenario).toBe('burst');
    }, 600000);
  });

  describe('Performance Metrics', () => {
    it('should measure latency percentiles', async () => {
      const result = await runLoadTest(SCENARIO_CONFIGS.baseline);

      // Verify percentiles are calculated correctly
      expect(result.latencyP50).toBeGreaterThanOrEqual(0);
      expect(result.latencyP95).toBeGreaterThanOrEqual(result.latencyP50);
      expect(result.latencyP99).toBeGreaterThanOrEqual(result.latencyP95);

      console.log('Latency Percentiles:', {
        p50: result.latencyP50,
        p95: result.latencyP95,
        p99: result.latencyP99,
      });
    }, 600000);

    it('should track memory usage', async () => {
      const result = await runLoadTest(SCENARIO_CONFIGS.smallScale);

      // Verify memory metrics
      expect(result.memoryUsedMB).toBeGreaterThan(0);
      expect(result.memoryGrowthMB).toBeGreaterThanOrEqual(0);

      console.log('Memory Usage:', {
        usedMB: result.memoryUsedMB,
        growthMB: result.memoryGrowthMB,
      });
    }, 600000);

    it('should track API call rates', async () => {
      const result = await runLoadTest(SCENARIO_CONFIGS.smallScale);

      // Verify API metrics
      expect(result.totalRequests).toBeGreaterThan(0);
      expect(result.apiCallsPerMinute).toBeGreaterThan(0);

      console.log('API Metrics:', {
        totalRequests: result.totalRequests,
        apiCallsPerMinute: result.apiCallsPerMinute,
      });
    }, 600000);
  });

  describe('Stress Testing', () => {
    it('mediumScale: 50 concurrent tournaments stress test', async () => {
      const result = await runLoadTest(SCENARIO_CONFIGS.mediumScale);

      // Should complete without crashing
      expect(result.scenario).toBe('mediumScale');
      expect(result.totalRequests).toBeGreaterThan(0);

      console.log('Medium Scale Results:', {
        tournamentCount: SCENARIO_CONFIGS.mediumScale.tournamentCount,
        totalRequests: result.totalRequests,
        errorRate: result.errorRate,
        latencyP99: result.latencyP99,
      });
    }, 600000);

    it('highScale: 100 concurrent tournaments capacity test', async () => {
      const result = await runLoadTest(SCENARIO_CONFIGS.highScale);

      // Should complete without crashing
      expect(result.scenario).toBe('highScale');

      console.log('High Scale Results:', {
        tournamentCount: SCENARIO_CONFIGS.highScale.tournamentCount,
        totalRequests: result.totalRequests,
        errorRate: result.errorRate,
        latencyP99: result.latencyP99,
        memoryGrowthMB: result.memoryGrowthMB,
      });
    }, 600000);
  });
});

// Export test runner functions for manual execution
export async function runAllScenarios(): Promise<Record<LoadTestScenario, LoadTestResult>> {
  const scenarios: LoadTestScenario[] = [
    'baseline',
    'smallScale',
    'burst',
    'concurrency',
    'rateLimit',
  ];

  const results: Record<string, LoadTestResult> = {};

  for (const scenario of scenarios) {
    console.log(`\n=== Running scenario: ${scenario} ===`);
    const result = await runLoadTest(SCENARIO_CONFIGS[scenario]);
    results[scenario] = result;
  }

  return results as Record<LoadTestScenario, LoadTestResult>;
}

export async function runScenario(scenario: LoadTestScenario): Promise<LoadTestResult> {
  console.log(`\n=== Running scenario: ${scenario} ===`);
  return runLoadTest(SCENARIO_CONFIGS[scenario]);
}
