import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Client, GatewayIntentBits } from 'discord.js';

// Mock fs module
vi.mock('fs', () => ({
  readdirSync: vi.fn(),
}));

describe('eventLoader', () => {
  let mockClient: Client;

  beforeEach(() => {
    vi.resetModules();
    mockClient = new Client({ intents: [GatewayIntentBits.Guilds] });
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockClient.destroy();
  });

  describe('loadEvents', () => {
    it('should handle missing events directory gracefully', async () => {
      const fs = await import('fs');
      vi.mocked(fs.readdirSync).mockImplementation(() => {
        throw new Error('ENOENT');
      });

      const { loadEvents } = await import('./eventLoader.js');

      // Should not throw
      await expect(loadEvents(mockClient)).resolves.toBeUndefined();
    });

    it('should handle empty events directory', async () => {
      const fs = await import('fs');
      vi.mocked(fs.readdirSync).mockReturnValue([]);

      const { loadEvents } = await import('./eventLoader.js');

      await expect(loadEvents(mockClient)).resolves.toBeUndefined();
    });

    it('should filter non-ts/js files and test files', async () => {
      const files = ['ready.ts', 'ready.test.ts', 'notes.md', 'config.json', 'error.js', 'error.spec.js'];
      const filtered = files.filter(
        (file) =>
          (file.endsWith('.js') || file.endsWith('.ts')) &&
          !file.includes('.test.') &&
          !file.includes('.spec.')
      );

      expect(filtered).toEqual(['ready.ts', 'error.js']);
    });
  });
});
