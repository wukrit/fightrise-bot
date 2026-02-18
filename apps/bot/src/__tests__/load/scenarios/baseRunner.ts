/**
 * Base load test runner with common functionality.
 * Used by all test scenarios.
 */

import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { MetricsCollector } from '../mocks/metricsCollector.js';
import { createMockStartggServer, type MockServerConfig } from '../mocks/startggMockServer.js';
import { createTestTournaments, cleanupTestData } from '../utils/tournamentFactory.js';
import type { LoadTestConfig, LoadTestResult, LoadTestScenario } from '../types.js';

// Global test state
let metricsCollector: MetricsCollector;
let mockServerConfig: MockServerConfig | null = null;

// Set up global fixtures
beforeAll(async () => {
  metricsCollector = new MetricsCollector();
});

afterAll(async () => {
  // Cleanup test data after all tests
  await cleanupTestData();
});

/**
 * Run a single load test scenario.
 */
export async function runLoadTest(config: LoadTestConfig): Promise<LoadTestResult> {
  const { server, config: serverConfig } = createMockStartggServer({
    latencyMs: config.mockLatencyMs,
    rateLimitInjection: config.rateLimitInjection,
    tournamentCount: config.tournamentCount,
    eventCount: config.eventCount,
    matchCount: config.matchCount,
  });

  mockServerConfig = serverConfig;

  // Start mock server
  server.listen({ onUnhandledRequest: 'bypass' });

  try {
    // Start metrics collection
    metricsCollector.start();

    // Create test data
    await createTestTournaments({
      tournamentCount: config.tournamentCount,
      eventCount: config.eventCount,
      matchCount: config.matchCount,
    });

    // Run the test for the specified duration
    await sleep(config.durationMinutes * 60 * 1000);

    // Get results
    const results = metricsCollector.getResults(config);

    return results;
  } finally {
    // Cleanup
    metricsCollector.stop();
    server.close();

    // Clean up test data
    await cleanupTestData();
  }
}

/**
 * Run a load test and assert results against thresholds.
 */
export async function runLoadTestWithAssertions(
  config: LoadTestConfig,
  thresholds: {
    maxErrorRate?: number;
    maxLatencyP99?: number;
    maxApiCallsPerMinute?: number;
    maxMemoryGrowthMB?: number;
  } = {}
): Promise<LoadTestResult> {
  const results = await runLoadTest(config);

  // Default thresholds
  const {
    maxErrorRate = 0.01,
    maxLatencyP99 = 500,
    maxApiCallsPerMinute = 80,
    maxMemoryGrowthMB = 100,
  } = thresholds;

  // Assert thresholds
  if (maxErrorRate !== undefined) {
    expect(results.errorRate).toBeLessThanOrEqual(maxErrorRate);
  }

  if (maxLatencyP99 !== undefined) {
    expect(results.latencyP99).toBeLessThanOrEqual(maxLatencyP99);
  }

  if (maxApiCallsPerMinute !== undefined) {
    expect(results.apiCallsPerMinute).toBeLessThanOrEqual(maxApiCallsPerMinute);
  }

  if (maxMemoryGrowthMB !== undefined) {
    expect(results.memoryGrowthMB).toBeLessThanOrEqual(maxMemoryGrowthMB);
  }

  return results;
}

/**
 * Sleep utility.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Run multiple iterations of a scenario and aggregate results.
 */
export async function runLoadTestIterations(
  config: LoadTestConfig,
  iterations: number = 3
): Promise<LoadTestResult[]> {
  const results: LoadTestResult[] = [];

  for (let i = 0; i < iterations; i++) {
    console.log(`Running iteration ${i + 1}/${iterations} for scenario: ${config.scenario}`);
    const result = await runLoadTest(config);
    results.push(result);
  }

  return results;
}

/**
 * Aggregate results from multiple iterations.
 */
export function aggregateResults(results: LoadTestResult[]): LoadTestResult {
  if (results.length === 0) {
    throw new Error('No results to aggregate');
  }

  const avg = <T extends number>(arr: T[]): number =>
    arr.reduce((sum, val) => sum + val, 0) / arr.length;

  const max = <T extends number>(arr: T[]): number => Math.max(...arr);

  return {
    scenario: results[0].scenario,
    durationMs: avg(results.map((r) => r.durationMs)),
    totalRequests: avg(results.map((r) => r.totalRequests)),
    totalErrors: avg(results.map((r) => r.totalErrors)),
    errorRate: avg(results.map((r) => r.errorRate)),
    latencyP50: avg(results.map((r) => r.latencyP50)),
    latencyP95: avg(results.map((r) => r.latencyP95)),
    latencyP99: avg(results.map((r) => r.latencyP99)),
    throughput: avg(results.map((r) => r.throughput)),
    memoryUsedMB: avg(results.map((r) => r.memoryUsedMB)),
    memoryGrowthMB: avg(results.map((r) => r.memoryGrowthMB)),
    peakQueueDepth: max(results.map((r) => r.peakQueueDepth)),
    rateLimitHits: max(results.map((r) => r.rateLimitHits)),
    apiCallsPerMinute: avg(results.map((r) => r.apiCallsPerMinute)),
  };
}
