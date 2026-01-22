import { prisma } from '@fightrise/database';
import type { NextAuthOptions } from 'next-auth';
import type { Adapter, AdapterUser, AdapterAccount } from 'next-auth/adapters';
import DiscordProvider from 'next-auth/providers/discord';

// Helper to convert DB user to AdapterUser
function toAdapterUser(user: {
  id: string;
  email: string | null;
  discordUsername: string | null;
  discordAvatar: string | null;
}): AdapterUser {
  return {
    id: user.id,
    email: user.email ?? '',
    emailVerified: null,
    name: user.discordUsername,
    image: user.discordAvatar,
  };
}

// Custom adapter to work with our existing User model
function PrismaAdapter(): Adapter {
  return {
    async createUser(user: Omit<AdapterUser, 'id'>): Promise<AdapterUser> {
      const created = await prisma.user.create({
        data: {
          email: user.email,
          discordUsername: user.name,
          discordAvatar: user.image,
        },
      });
      return toAdapterUser(created);
    },

    async getUser(id: string): Promise<AdapterUser | null> {
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) return null;
      return toAdapterUser(user);
    },

    async getUserByEmail(email: string): Promise<AdapterUser | null> {
      if (!email) return null;
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return null;
      return toAdapterUser(user);
    },

    async getUserByAccount({
      providerAccountId,
      provider,
    }: Pick<AdapterAccount, 'provider' | 'providerAccountId'>): Promise<AdapterUser | null> {
      if (provider !== 'discord') return null;
      const user = await prisma.user.findUnique({
        where: { discordId: providerAccountId },
      });
      if (!user) return null;
      return toAdapterUser(user);
    },

    async updateUser(
      user: Partial<AdapterUser> & Pick<AdapterUser, 'id'>
    ): Promise<AdapterUser> {
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
          email: user.email ?? undefined,
          discordUsername: user.name ?? undefined,
          discordAvatar: user.image ?? undefined,
        },
      });
      return toAdapterUser(updated);
    },

    async linkAccount(account: AdapterAccount): Promise<void> {
      if (account.provider === 'discord') {
        await prisma.user.update({
          where: { id: account.userId },
          data: { discordId: account.providerAccountId },
        });
      }
    },

    async createSession(): Promise<never> {
      // We use JWT strategy, so sessions are not stored in database
      throw new Error('createSession not implemented - using JWT strategy');
    },

    async getSessionAndUser(): Promise<never> {
      // We use JWT strategy, so sessions are not stored in database
      throw new Error('getSessionAndUser not implemented - using JWT strategy');
    },

    async updateSession(): Promise<never> {
      // We use JWT strategy, so sessions are not stored in database
      throw new Error('updateSession not implemented - using JWT strategy');
    },

    async deleteSession(): Promise<void> {
      // We use JWT strategy, so sessions are not stored in database
      // No-op for JWT strategy
    },

    async unlinkAccount(): Promise<void> {
      // Not implementing account unlinking for now
    },

    async deleteUser(): Promise<void> {
      // Not implementing user deletion for now
    },
  };
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(),
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'identify guilds',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'discord' && profile) {
        const discordProfile = profile as {
          id: string;
          username: string;
          avatar: string | null;
        };

        // Find or create user by Discord ID
        const existingUser = await prisma.user.findUnique({
          where: { discordId: discordProfile.id },
        });

        if (existingUser) {
          // Update existing user with latest Discord data
          await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              discordUsername: discordProfile.username,
              discordAvatar: discordProfile.avatar,
            },
          });
          // Set the user ID for the JWT
          user.id = existingUser.id;
        } else {
          // Create new user
          const newUser = await prisma.user.create({
            data: {
              discordId: discordProfile.id,
              discordUsername: discordProfile.username,
              discordAvatar: discordProfile.avatar,
            },
          });
          user.id = newUser.id;
        }
      }
      return true;
    },

    async jwt({ token, user, account, profile }) {
      if (user) {
        token.userId = user.id;
      }
      if (account?.provider === 'discord' && profile) {
        const discordProfile = profile as {
          id: string;
          username: string;
          avatar: string | null;
        };
        token.discordId = discordProfile.id;
        token.discordUsername = discordProfile.username;
        token.discordAvatar = discordProfile.avatar;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.discordId = token.discordId as string;
        session.user.discordUsername = token.discordUsername as string;
        session.user.discordAvatar = token.discordAvatar as string | null;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
};

// Type augmentation for NextAuth
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      discordId: string;
      discordUsername: string;
      discordAvatar: string | null;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }

  interface User {
    id: string;
    discordId?: string;
    discordUsername?: string;
    discordAvatar?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string;
    discordId: string;
    discordUsername: string;
    discordAvatar: string | null;
  }
}
