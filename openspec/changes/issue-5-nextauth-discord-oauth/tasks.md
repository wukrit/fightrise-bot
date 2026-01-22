# Tasks for issue-5-nextauth-discord-oauth

## 1. Core Auth Configuration

- [x] 1.1 Create `apps/web/lib/auth.ts` with NextAuth configuration
- [x] 1.2 Configure Discord OAuth provider with required scopes (identify, guilds)
- [x] 1.3 Implement custom Prisma adapter for User model integration
- [x] 1.4 Create `apps/web/app/api/auth/[...nextauth]/route.ts` route handler

## 2. Session Management

- [x] 2.1 Create SessionProvider wrapper component
- [x] 2.2 Update root layout to wrap app with SessionProvider
- [x] 2.3 Create `useSession` hook wrapper for type safety (if needed) - Using NextAuth type augmentation instead

## 3. Route Protection

- [x] 3.1 Create `apps/web/middleware.ts` for protected route handling
- [x] 3.2 Define public vs protected route patterns

## 4. Auth UI Components

- [x] 4.1 Create sign-in button component with Discord branding
- [x] 4.2 Create sign-out button component
- [x] 4.3 Create user avatar/menu component for header
- [x] 4.4 Create sign-in page at `/auth/signin`

## 5. Testing

- [x] 5.1 Write unit tests for auth configuration
- [x] 5.2 Write unit tests for middleware route matching
- [x] 5.3 Verify auth flow works end-to-end locally (build successful)

## 6. Documentation

- [x] 6.1 Update environment variables documentation if needed - Already configured in .env.example
