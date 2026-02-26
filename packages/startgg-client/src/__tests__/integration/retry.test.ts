/**
 * Integration tests for Start.gg client retry logic.
 *
 * Tests verify that the withRetry function correctly handles:
 * - Successful first attempt (no retries)
 * - Retry on rate limit error (429)
 * - No retry on network errors
 * - No retry on timeout errors
 * - No retry on validation errors (4xx except 429)
 * - No retry on auth errors (401/403)
 * - Max retries configuration
 * - Exponential backoff
 * - Retry callbacks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withRetry } from '../../retry.js';
import { RateLimitError } from '@fightrise/shared';

describe('withRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should succeed on first attempt', async () => {
    const mockFn = vi.fn().mockResolvedValue('success');

    const result = await withRetry(mockFn);

    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should retry on rate limit error (429)', async () => {
    const error = new Error('Rate limit exceeded');
    (error as any).response = { status: 429 };

    const mockFn = vi.fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValue('success');

    const result = await withRetry(mockFn);

    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it('should not retry on network error (ECONNREFUSED)', async () => {
    const error = new Error('connect ECONNREFUSED 127.0.0.1:3000');

    const mockFn = vi.fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValue('success');

    // Network errors are not retried - they throw immediately
    // This test verifies current behavior (no retry on network error)
    await expect(withRetry(mockFn)).rejects.toThrow('connect ECONNREFUSED');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should not retry on timeout error', async () => {
    const error = new Error('Request timed out');
    error.name = 'TimeoutError';

    const mockFn = vi.fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValue('success');

    // Timeouts are not retried by current implementation
    // This test verifies current behavior
    await expect(withRetry(mockFn)).rejects.toThrow('Request timed out');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should not retry on validation error (400)', async () => {
    const error = new Error('Bad Request');
    (error as any).response = { status: 400 };

    const mockFn = vi.fn().mockRejectedValue(error);

    await expect(withRetry(mockFn)).rejects.toThrow('Bad Request');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should not retry on auth error (401)', async () => {
    const error = new Error('Unauthorized');
    (error as any).response = { status: 401 };

    const mockFn = vi.fn().mockRejectedValue(error);

    await expect(withRetry(mockFn)).rejects.toThrow('Unauthorized');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should not retry on auth error (403)', async () => {
    const error = new Error('Forbidden');
    (error as any).response = { status: 403 };

    const mockFn = vi.fn().mockRejectedValue(error);

    await expect(withRetry(mockFn)).rejects.toThrow('Forbidden');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should respect maxRetries config (0 retries)', async () => {
    const error = new Error('Rate limit exceeded');
    (error as any).response = { status: 429 };

    const mockFn = vi.fn().mockRejectedValue(error);

    // With maxRetries: 0, should only attempt once
    await expect(
      withRetry(mockFn, { maxRetries: 0 })
    ).rejects.toThrow();
    expect(mockFn).toHaveBeenCalledTimes(1);
  }, 10000);

  it('should respect maxRetries config (custom value)', async () => {
    const error = new Error('Rate limit exceeded');
    (error as any).response = { status: 429 };

    const mockFn = vi.fn().mockRejectedValue(error);

    // With maxRetries: 5, should attempt 6 times (initial + 5 retries)
    // Use very short baseDelay to avoid timeout
    await expect(
      withRetry(mockFn, { maxRetries: 5, baseDelayMs: 10 })
    ).rejects.toThrow();
    expect(mockFn).toHaveBeenCalledTimes(6);
  }, 30000);

  it('should throw RateLimitError after exhausting retries', async () => {
    const error = new Error('Rate limit exceeded');
    (error as any).response = { status: 429 };

    const mockFn = vi.fn().mockRejectedValue(error);

    // Default maxRetries is 3, so should throw RateLimitError after 4 attempts
    // Use very short baseDelay to avoid timeout
    await expect(
      withRetry(mockFn, { baseDelayMs: 10 })
    ).rejects.toThrow(RateLimitError);
    expect(mockFn).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
  }, 30000);

  it('should call onRetry callback on each retry', async () => {
    const error = new Error('Rate limit exceeded');
    (error as any).response = { status: 429 };

    const mockFn = vi.fn()
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockResolvedValue('success');

    const onRetry = vi.fn();

    const result = await withRetry(mockFn, { baseDelayMs: 10, onRetry });

    expect(result).toBe('success');
    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenNthCalledWith(1, 1, expect.any(Number), error);
    expect(onRetry).toHaveBeenNthCalledWith(2, 2, expect.any(Number), error);
  });

  it('should use custom baseDelayMs', async () => {
    const error = new Error('Rate limit exceeded');
    (error as any).response = { status: 429 };

    const mockFn = vi.fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValue('success');

    const onRetry = vi.fn();

    await withRetry(mockFn, { baseDelayMs: 100, onRetry });

    // With baseDelayMs: 100, first retry delay should be close to 100 (with jitter)
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Number), error);
    const delayMs = onRetry.mock.calls[0][1];
    expect(delayMs).toBeGreaterThanOrEqual(100);
    expect(delayMs).toBeLessThanOrEqual(130); // 100 + 30% jitter
  });

  it('should handle rate limit error via message matching', async () => {
    const error = new Error('429 Too Many Requests');

    const mockFn = vi.fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValue('success');

    // Should retry because message contains '429'
    const result = await withRetry(mockFn);

    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it('should handle rate limit error via message content', async () => {
    const error = new Error('Rate limit exceeded - please try again later');

    const mockFn = vi.fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValue('success');

    // Should retry because message contains 'rate limit'
    const result = await withRetry(mockFn);

    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it('should work with async function', async () => {
    const mockAsyncFn = vi.fn().mockResolvedValue('async success');

    const result = await withRetry(mockAsyncFn);

    expect(result).toBe('async success');
    expect(mockAsyncFn).toHaveBeenCalledTimes(1);
  });

  it('should work with rate limit Error instance', async () => {
    const error = new Error('Rate limit');
    (error as any).response = { status: 429 };

    const mockFn = vi.fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValue('success');

    const result = await withRetry(mockFn);

    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it('should create retry wrapper with default options', async () => {
    const { createRetryWrapper } = await import('../../retry.js');

    const retryWithDefaults = createRetryWrapper({ maxRetries: 2, baseDelayMs: 10 });

    const error = new Error('Rate limit');
    (error as any).response = { status: 429 };

    const mockFn = vi.fn().mockRejectedValue(error);

    await expect(retryWithDefaults(mockFn)).rejects.toThrow();
    // 1 initial + 2 retries = 3 calls
    expect(mockFn).toHaveBeenCalledTimes(3);
  }, 30000);
});
