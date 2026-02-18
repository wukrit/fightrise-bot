/**
 * Concurrency scaling load test scenario.
 * Tests different BullMQ worker concurrency levels to find optimal.
 */

import { describe, it, expect } from 'vitest';
import { SCENARIO_CONFIGS, type LoadTestConfig, type LoadTestResult } from '../types.js';
import { runLoadTest } from './baseRunner.js';

describe('Load Test: Concurrency Scaling', () => {
  const config = SCENARIO_CONFIGS.concurrency;
  const concurrencyLevels = [1, 5, 10, 20];

  it('should find optimal BullMQ worker concurrency', async () => {
    const results: Array<{ concurrency: number; result: LoadTestResult }> = [];

    for (const concurrency of concurrencyLevels) {
      const testConfig: LoadTestConfig = {
        ...config,
        concurrency,
      };

      console.log(`Testing concurrency level: ${concurrency}`);

      const result = await runLoadTest(testConfig);

      results.push({ concurrency, result });

      // Log results for this concurrency level
      console.log(`Concurrency ${concurrency}:`, {
        latencyP99: result.latencyP99,
        errorRate: result.errorRate,
        throughput: result.throughput,
        apiCallsPerMinute: result.apiCallsPerMinute,
      });
    }

    // Find optimal concurrency (lowest latency with acceptable error rate)
    const optimal = results.find(
      (r) => r.result.latencyP99 < 500 && r.result.errorRate < 0.01
    );

    console.log('All Results:', results.map((r) => ({
      concurrency: r.concurrency,
      latencyP99: r.result.latencyP99,
      errorRate: r.result.errorRate,
      throughput: r.result.throughput,
    })));

    console.log('Optimal Concurrency:', optimal?.concurrency);

    // Assertions
    expect(results.length).toBe(concurrencyLevels.length);
    expect(optimal).toBeDefined();
    expect(optimal?.concurrency).toBeGreaterThan(0);

    // Log the optimal value for documentation
    console.log(`\n=== CONCURRENCY TEST RESULTS ===`);
    console.log(`Optimal concurrency: ${optimal?.concurrency}`);
    console.log(`Latency p99 at optimal: ${optimal?.result.latencyP99}ms`);
    console.log(`Error rate at optimal: ${optimal?.result.errorRate}`);
  }, 600000); // 10 minute timeout
});
