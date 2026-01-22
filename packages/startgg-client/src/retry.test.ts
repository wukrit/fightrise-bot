import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withRetry, createRetryWrapper } from './retry.js';
import { RateLimitError } from './types.js';

describe('retry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('withRetry', () => {
    it('should return result on first successful call', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      const result = await withRetry(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on rate limit error', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('rate limit exceeded'))
        .mockResolvedValueOnce('success');

      const promise = withRetry(fn, { maxRetries: 3 });

      // Advance timers to allow retry
      await vi.advanceTimersByTimeAsync(5000);

      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should retry on 429 error', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('HTTP 429'))
        .mockResolvedValueOnce('success');

      const promise = withRetry(fn, { maxRetries: 3 });
      await vi.advanceTimersByTimeAsync(5000);
      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-rate-limit errors', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Some other error'));

      await expect(withRetry(fn, { maxRetries: 3 })).rejects.toThrow(
        'Some other error'
      );
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should throw RateLimitError after max retries', async () => {
      vi.useRealTimers(); // Use real timers for this test
      const fn = vi.fn().mockRejectedValue(new Error('rate limit'));

      await expect(
        withRetry(fn, { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 5 })
      ).rejects.toThrow(RateLimitError);
      expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should call onRetry callback', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('rate limit'))
        .mockResolvedValueOnce('success');
      const onRetry = vi.fn();

      const promise = withRetry(fn, { maxRetries: 3, onRetry });
      await vi.advanceTimersByTimeAsync(5000);
      await promise;

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(
        1,
        expect.any(Number),
        expect.any(Error)
      );
    });

    it('should use custom delay settings', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('rate limit'))
        .mockResolvedValueOnce('success');
      const onRetry = vi.fn();

      const promise = withRetry(fn, {
        maxRetries: 3,
        baseDelayMs: 500,
        maxDelayMs: 1000,
        onRetry,
      });
      await vi.advanceTimersByTimeAsync(5000);
      await promise;

      // Delay should be at least baseDelayMs
      expect(onRetry).toHaveBeenCalledWith(
        1,
        expect.any(Number),
        expect.any(Error)
      );
      const delay = onRetry.mock.calls[0][1];
      expect(delay).toBeGreaterThanOrEqual(500);
      expect(delay).toBeLessThanOrEqual(1000);
    });
  });

  describe('createRetryWrapper', () => {
    it('should create a wrapper with default options', async () => {
      const retry = createRetryWrapper({ maxRetries: 2 });
      const fn = vi.fn().mockResolvedValue('result');

      const result = await retry(fn);

      expect(result).toBe('result');
    });

    it('should allow overriding options per call', async () => {
      vi.useRealTimers(); // Use real timers for this test
      const retry = createRetryWrapper({ maxRetries: 1 });
      const fn = vi.fn().mockRejectedValue(new Error('rate limit'));

      await expect(
        retry(fn, { maxRetries: 0, baseDelayMs: 1, maxDelayMs: 5 })
      ).rejects.toThrow(RateLimitError);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});
