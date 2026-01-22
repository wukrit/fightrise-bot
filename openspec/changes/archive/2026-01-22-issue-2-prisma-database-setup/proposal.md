# Change: Initialize Prisma with database schema

GitHub Issue: #2

## Why

The FightRise bot requires a database to persist tournament data, user accounts, match states, and Discord thread mappings. The `@fightrise/database` package has been created with a Prisma schema, but the setup needs to be completed and verified to ensure the database layer is production-ready.

## What Changes

- Verify and complete Prisma client export with proper singleton pattern
- Add re-exports of Prisma types for consumers
- Test database migrations work correctly with PostgreSQL
- Add npm scripts for common database operations

## Impact

- Affected specs: `database` (new capability)
- Affected code: `packages/database/`
- Downstream: `apps/bot` and `apps/web` depend on this package for data access
