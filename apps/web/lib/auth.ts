import { prisma } from '@fightrise/database';
import type { NextAuthOptions } from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';

// Note: We intentionally don't use an adapter here because:
// 1. We're using JWT sessions (not database sessions)
// 2. We handle user creation/updates directly in the signIn callback
// 3. Using both adapter and signIn callback for user management causes conflicts
//    (duplicate user creation with unique constraint violations)

// Determine if we're behind HTTPS (tunnel/production)
const useSecureCookies = process.env.NEXTAUTH_URL?.startsWith('https://') ?? false;

// Build providers list - Start.gg OAuth requires callback route
const providers = [
  DiscordProvider({
    clientId: process.env.DISCORD_CLIENT_ID!,
    clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    authorization: {
      params: {
        scope: 'identify guilds',
      },
    },
  }),
];

export const authOptions: NextAuthOptions = {
  // No adapter - we manage users directly in signIn callback
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  // Cookie configuration for running behind reverse proxy (Cloudflare Tunnel)
  useSecureCookies,
  cookies: {
    pkceCodeVerifier: {
      name: 'next-auth.pkce.code_verifier',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
      },
    },
    state: {
      name: 'next-auth.state',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
      },
    },
  },
  providers: providers as NextAuthOptions['providers'],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Handle Discord OAuth
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
          // Create new user with Discord data
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

      // Note: Start.gg OAuth handling is done in the callback route
      // See apps/web/app/api/auth/callback/startgg/route.ts

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
