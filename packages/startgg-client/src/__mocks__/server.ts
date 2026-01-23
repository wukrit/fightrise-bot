/**
 * MSW server setup for testing Start.gg API client.
 *
 * Usage in tests:
 *
 * ```ts
 * import { server } from '../__mocks__/server';
 * import { errorHandlers } from '../__mocks__/handlers';
 *
 * beforeAll(() => server.listen());
 * afterEach(() => server.resetHandlers());
 * afterAll(() => server.close());
 *
 * it('handles errors', async () => {
 *   server.use(errorHandlers.unauthorized);
 *   // ... test error handling
 * });
 * ```
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers.js';

/**
 * MSW server instance configured with default handlers.
 * Default handlers return successful responses for all Start.gg API operations.
 */
export const server = setupServer(...handlers);

/**
 * Helper to reset server to default handlers.
 * Use this in afterEach() to ensure test isolation.
 */
export function resetServer(): void {
  server.resetHandlers();
}

/**
 * Helper to add additional handlers for specific test scenarios.
 * These handlers take precedence over default handlers.
 */
export function useHandlers(
  ...additionalHandlers: Parameters<typeof server.use>
): void {
  server.use(...additionalHandlers);
}

/**
 * Setup helpers for test files.
 * Call this in a beforeAll/afterAll block.
 */
export function setupMswServer(): {
  beforeAll: () => void;
  afterEach: () => void;
  afterAll: () => void;
} {
  return {
    beforeAll: () => server.listen({ onUnhandledRequest: 'error' }),
    afterEach: () => server.resetHandlers(),
    afterAll: () => server.close(),
  };
}
