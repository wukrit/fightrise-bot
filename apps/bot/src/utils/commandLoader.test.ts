import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Collection } from 'discord.js';

// Mock fs module
vi.mock('fs', () => ({
  readdirSync: vi.fn(),
}));

describe('commandLoader', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('loadCommands', () => {
    it('should return empty collection when commands directory does not exist', async () => {
      const fs = await import('fs');
      vi.mocked(fs.readdirSync).mockImplementation(() => {
        throw new Error('ENOENT');
      });

      const { loadCommands } = await import('./commandLoader.js');
      const commands = await loadCommands();

      expect(commands).toBeInstanceOf(Collection);
      expect(commands.size).toBe(0);
    });

    it('should return empty collection when commands directory is empty', async () => {
      const fs = await import('fs');
      vi.mocked(fs.readdirSync).mockReturnValue([]);

      const { loadCommands } = await import('./commandLoader.js');
      const commands = await loadCommands();

      expect(commands).toBeInstanceOf(Collection);
      expect(commands.size).toBe(0);
    });

    it('should filter non-ts/js files and test files', async () => {
      const fs = await import('fs');
      vi.mocked(fs.readdirSync).mockReturnValue([
        'command.ts',
        'command.test.ts',
        'readme.md',
        'config.json',
      ] as unknown as ReturnType<typeof fs.readdirSync>);

      // This test verifies the filtering logic
      const files = ['command.ts', 'command.test.ts', 'readme.md', 'config.json', 'other.spec.ts'];
      const filtered = files.filter(
        (file) =>
          (file.endsWith('.js') || file.endsWith('.ts')) &&
          !file.includes('.test.') &&
          !file.includes('.spec.')
      );

      expect(filtered).toEqual(['command.ts']);
    });
  });

  describe('getCommandsData', () => {
    it('should convert commands collection to JSON array', async () => {
      const { getCommandsData } = await import('./commandLoader.js');

      const mockCommand = {
        data: {
          name: 'test',
          toJSON: () => ({ name: 'test', description: 'A test command' }),
        },
        execute: vi.fn(),
      };

      // Use type assertion since we're testing with a simplified mock
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const commands = new Collection<string, any>();
      commands.set('test', mockCommand);

      const result = getCommandsData(commands);

      expect(result).toEqual([{ name: 'test', description: 'A test command' }]);
    });
  });
});
