## ADDED Requirements

### Requirement: Prisma Client Export

The `@fightrise/database` package SHALL export a singleton Prisma client instance that is safe for hot-reload environments.

#### Scenario: Client singleton in development
- **WHEN** the package is imported multiple times during hot-reload
- **THEN** the same Prisma client instance is returned
- **AND** no "Too many Prisma clients" warnings occur

#### Scenario: Type exports available
- **WHEN** a consumer imports from `@fightrise/database`
- **THEN** all Prisma-generated types (User, Tournament, Match, etc.) are available
- **AND** the PrismaClient type is available for type annotations

### Requirement: Database Schema Completeness

The Prisma schema SHALL define all models required for tournament management.

#### Scenario: Core models exist
- **WHEN** the schema is inspected
- **THEN** these models exist: User, Tournament, Event, Match, MatchPlayer, Registration, TournamentAdmin, GuildConfig

#### Scenario: Relations are bidirectional
- **WHEN** a model has a foreign key reference
- **THEN** both sides of the relation are defined
- **AND** cascade delete is configured where appropriate

### Requirement: Database Migration Support

The package SHALL support database migrations via Prisma CLI.

#### Scenario: Generate client
- **WHEN** `npm run db:generate` is executed
- **THEN** the Prisma client is generated with TypeScript types

#### Scenario: Push schema to database
- **WHEN** `npm run db:push` is executed against a PostgreSQL database
- **THEN** all tables and relations are created
- **AND** indexes are created as defined in the schema
