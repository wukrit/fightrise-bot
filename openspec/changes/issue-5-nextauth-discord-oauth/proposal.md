# Change: Set up NextAuth with Discord OAuth

GitHub Issue: #5

## Why

The FightRise web portal needs user authentication to allow tournament organizers to configure tournaments and for players to link their Discord accounts. Discord OAuth is the natural choice since the primary interaction happens through Discord.

## What Changes

- Add NextAuth.js configuration with Discord OAuth provider
- Create auth API route handler for Next.js App Router
- Implement custom Prisma adapter to use existing User model
- Add SessionProvider wrapper to root layout
- Create auth middleware for protected routes
- Add sign-in/sign-out components

## Impact

- Affected specs: New `web-auth` capability (no existing auth spec)
- Affected code:
  - `apps/web/lib/auth.ts` - NextAuth configuration
  - `apps/web/app/api/auth/[...nextauth]/route.ts` - Auth API route
  - `apps/web/app/layout.tsx` - SessionProvider wrapper
  - `apps/web/middleware.ts` - Route protection
  - `apps/web/components/auth/` - Auth UI components
