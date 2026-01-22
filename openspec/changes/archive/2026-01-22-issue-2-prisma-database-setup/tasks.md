# Tasks for issue-2-prisma-database-setup

## 1. Implementation

- [x] 1.1 Verify Prisma schema has all required models and relations
- [x] 1.2 Verify Prisma client export uses singleton pattern for hot-reload safety
- [x] 1.3 Ensure all Prisma types are re-exported for consumers
- [x] 1.4 Verify npm scripts exist for db:generate, db:push, db:migrate

## 2. Testing

- [x] 2.1 Run `prisma generate` and verify typed client is created
- [x] 2.2 Run `prisma db push` against a test PostgreSQL database
- [x] 2.3 Verify all tables are created with correct relations
- [x] 2.4 Test basic CRUD operations work via Prisma client

## 3. Verification

- [x] 3.1 Verify package can be imported by apps/bot
- [x] 3.2 Verify package can be imported by apps/web
- [x] 3.3 Document any setup steps needed for new developers

## Additional Fixes (discovered during implementation)

- [x] Fix workspace:* protocol to use npm-compatible * format
- [x] Add dotenv-cli to load root .env for Prisma commands
