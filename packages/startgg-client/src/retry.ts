import { RateLimitError, RetryConfig } from './types.js';

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 1000;
const DEFAULT_MAX_DELAY_MS = 30000;

export interface RetryOptions extends RetryConfig {
  onRetry?: (attempt: number, delayMs: number, error: Error) => void;
}

function isRateLimitError(error: unknown): boolean {
  // Check HTTP status code first (most reliable)
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { status?: number } }).response;
    if (response && response.status === 429) {
      return true;
    }
  }

  // Fallback to message matching
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('rate limit') ||
      message.includes('429') ||
      message.includes('too many requests')
    );
  }
  return false;
}

function isServerError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { status?: number } }).response;
    const status = response?.status;
    if (typeof status === 'number' && status >= 500 && status < 600) {
      return true;
    }
  }
  return false;
}

function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('timeout') ||
      message.includes('econnreset') ||
      message.includes('enotfound') ||
      message.includes('ECONNREFUSED') ||
      message.includes('network') ||
      message.includes('socket')
    );
  }
  return false;
}

/**
 * Determine if an error is retryable.
 * Retryable errors include:
 * - Rate limit errors (429)
 * - Server errors (5xx)
 * - Network errors (timeouts, connection issues)
 */
function isRetryableError(error: unknown): boolean {
  return isRateLimitError(error) || isServerError(error) || isNetworkError(error);
}

function calculateDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number
): number {
  // Exponential backoff with jitter
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt - 1);
  const jitter = Math.random() * 0.3 * exponentialDelay; // 0-30% jitter
  const delay = exponentialDelay + jitter;
  return Math.min(delay, maxDelayMs);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const maxDelayMs = options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on non-retryable errors
      if (!isRetryableError(lastError)) {
        throw lastError;
      }

      // Don't retry if we've exhausted attempts
      if (attempt > maxRetries) {
        throw new RateLimitError(
          `Retryable error after ${maxRetries} retries: ${lastError.message}`
        );
      }

      const delayMs = calculateDelay(attempt, baseDelayMs, maxDelayMs);

      if (options.onRetry) {
        options.onRetry(attempt, delayMs, lastError);
      }

      await sleep(delayMs);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError ?? new Error('Retry failed unexpectedly');
}

export function createRetryWrapper(defaultOptions: RetryOptions = {}) {
  return <T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T> => {
    return withRetry(fn, { ...defaultOptions, ...options });
  };
}
