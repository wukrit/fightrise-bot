import { describe, it, expect, vi } from 'vitest';
import { authOptions } from './auth';

// Mock the database
vi.mock('@fightrise/database', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('authOptions', () => {
  it('should have JWT session strategy', () => {
    expect(authOptions.session?.strategy).toBe('jwt');
  });

  it('should have 30 day session maxAge', () => {
    expect(authOptions.session?.maxAge).toBe(30 * 24 * 60 * 60);
  });

  it('should have Discord provider configured', () => {
    const discordProvider = authOptions.providers.find(
      (p) => p.id === 'discord'
    );
    expect(discordProvider).toBeDefined();
  });

  it('should have custom sign-in page configured', () => {
    expect(authOptions.pages?.signIn).toBe('/auth/signin');
  });

  it('should not have adapter (user management handled in signIn callback)', () => {
    // We intentionally don't use an adapter to avoid conflicts between
    // adapter and signIn callback user creation
    expect(authOptions.adapter).toBeUndefined();
  });

  it('should have required callbacks', () => {
    expect(authOptions.callbacks?.signIn).toBeDefined();
    expect(authOptions.callbacks?.jwt).toBeDefined();
    expect(authOptions.callbacks?.session).toBeDefined();
  });
});

describe('session callback', () => {
  it('should add user info to session', async () => {
    const mockToken = {
      userId: 'user-123',
      discordId: 'discord-456',
      discordUsername: 'testuser',
      discordAvatar: 'avatar-hash',
    };

    const mockSession = {
      user: {
        name: 'Test User',
        email: 'test@example.com',
        image: null,
      },
      expires: new Date().toISOString(),
    };

    const result = await authOptions.callbacks?.session?.({
      session: mockSession as any,
      token: mockToken as any,
      user: {} as any,
      newSession: undefined,
      trigger: 'update',
    });

    const user = result?.user as {
      id: string;
      discordId: string;
      discordUsername: string;
      discordAvatar: string | null;
    };
    expect(user?.id).toBe('user-123');
    expect(user?.discordId).toBe('discord-456');
    expect(user?.discordUsername).toBe('testuser');
    expect(user?.discordAvatar).toBe('avatar-hash');
  });
});

describe('jwt callback', () => {
  it('should add user id to token on initial sign-in', async () => {
    const mockUser = { id: 'user-123' };
    const mockToken = {};

    const result = await authOptions.callbacks?.jwt?.({
      token: mockToken as any,
      user: mockUser as any,
      account: null,
      profile: undefined,
      trigger: 'signIn',
      isNewUser: false,
      session: undefined,
    });

    expect(result?.userId).toBe('user-123');
  });

  it('should add discord info to token from profile', async () => {
    const mockProfile = {
      id: 'discord-456',
      username: 'testuser',
      avatar: 'avatar-hash',
    };

    const mockAccount = {
      provider: 'discord',
      providerAccountId: 'discord-456',
      type: 'oauth' as const,
    };

    const mockToken = {};

    const result = await authOptions.callbacks?.jwt?.({
      token: mockToken as any,
      user: { id: 'user-123' } as any,
      account: mockAccount as any,
      profile: mockProfile as any,
      trigger: 'signIn',
      isNewUser: false,
      session: undefined,
    });

    expect(result?.discordId).toBe('discord-456');
    expect(result?.discordUsername).toBe('testuser');
    expect(result?.discordAvatar).toBe('avatar-hash');
  });
});
