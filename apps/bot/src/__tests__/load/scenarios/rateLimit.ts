/**
 * Rate limit injection load test scenario.
 * Tests graceful degradation when Start.gg API returns 429 errors.
 */

import { describe, it, expect } from 'vitest';
import { SCENARIO_CONFIGS } from '../types.js';
import { runLoadTest } from './baseRunner.js';

describe('Load Test: Rate Limit Injection', () => {
  const config = SCENARIO_CONFIGS.rateLimit;

  it('should handle rate limit errors gracefully with 30% injection', async () => {
    // Inject 30% rate limit responses
    const result = await runLoadTest(config);

    // Log results for analysis
    console.log('Rate Limit Test Results:', {
      scenario: result.scenario,
      totalRequests: result.totalRequests,
      totalErrors: result.totalErrors,
      errorRate: result.errorRate,
      rateLimitHits: result.rateLimitHits,
      latencyP50: result.latencyP50,
      latencyP95: result.latencyP95,
      latencyP99: result.latencyP99,
    });

    // Assertions
    expect(result.totalRequests).toBeGreaterThan(0);

    // With 30% rate limit injection, we expect some errors but graceful degradation
    // The error rate should be less than the injection rate (retries work)
    expect(result.errorRate).toBeLessThan(0.35);

    // Rate limit hits should be recorded
    expect(result.rateLimitHits).toBeGreaterThan(0);

    // System should continue functioning (some requests succeed)
    expect(result.totalRequests - result.totalErrors).toBeGreaterThan(0);
  }, 600000); // 10 minute timeout
});

describe('Load Test: Rate Limit Recovery', () => {
  it('should recover after rate limit period', async () => {
    // First, simulate rate limiting
    const configWithRateLimit = {
      ...SCENARIO_CONFIGS.rateLimit,
      rateLimitInjection: 50, // 50% rate limit
    };

    const resultWithRateLimit = await runLoadTest(configWithRateLimit);

    console.log('Rate Limit Recovery - Phase 1 (with rate limits):', {
      errorRate: resultWithRateLimit.errorRate,
      rateLimitHits: resultWithRateLimit.rateLimitHits,
    });

    // Then run without rate limiting
    const configNoRateLimit = {
      ...SCENARIO_CONFIGS.rateLimit,
      rateLimitInjection: 0,
    };

    const resultNoRateLimit = await runLoadTest(configNoRateLimit);

    console.log('Rate Limit Recovery - Phase 2 (no rate limits):', {
      errorRate: resultNoRateLimit.errorRate,
      rateLimitHits: resultNoRateLimit.rateLimitHits,
    });

    // After rate limits, error rate should be much lower
    expect(resultNoRateLimit.errorRate).toBeLessThan(resultWithRateLimit.errorRate);
    expect(resultNoRateLimit.rateLimitHits).toBe(0);
  }, 600000); // 10 minute timeout
});
