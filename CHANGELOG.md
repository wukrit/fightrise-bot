# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-02-18

### Added

#### Discord Bot

- **Slash Commands**: Implemented complete command system including:
  - `/tournament setup` - Configure tournament Discord settings
  - `/tournament status` - View tournament status
  - `/register` - Register for a tournament
  - `/checkin` - Check in for current match
  - `/report` - Report match score with detailed game scores
  - `/my-matches` - View upcoming matches
  - `/link-startgg` - Link Start.gg account
  - `/unlink-startgg` - Unlink Start.gg account
  - `/admin` - Tournament admin operations
- **Match Threads**: Auto-creation of Discord threads for matches
- **Check-in Flow**: Button-based check-in system with configurable windows
- **Score Reporting**: Score submission with loser confirmation to Start.gg
- **Dispute System**: Match dispute handling with database records
- **DQ Service**: Player disqualification handling
- **Audit Logging**: Comprehensive admin action tracking

#### Start.gg Integration

- **GraphQL API Client**: Complete wrapper with retry logic
- **Polling System**: BullMQ-based polling with dynamic intervals
- **OAuth**: Start.gg OAuth callback and token management
- **Registration Sync**: Synchronization between Start.gg and Discord

#### Web Portal

- **Authentication**: NextAuth with Discord OAuth
- **Dashboard**: User dashboard with tournament overview
- **Tournament Pages**: Browse and view tournaments
- **Tournament Creation Wizard**: Multi-step form for setup
- **Tournament Configuration**: Admin settings for Discord integration
- **Bracket Visualization**: Visual bracket display
- **Real-time Match Status**: Live match status updates
- **Admin Registration Management**: Panel for managing registrations
- **User Account Management**: Account settings and linked services
- **Notification Preferences**: User-configurable notifications

#### Database

- **Prisma Setup**: Complete database schema with 11 models
  - User, Tournament, Event, Match, MatchPlayer, GameResult
  - Dispute, Registration, TournamentAdmin, GuildConfig, AuditLog
- **All Relations**: Proper foreign keys and relations defined

#### Security

- **OAuth Token Encryption**: AES-256 encryption for tokens at rest
- **Rate Limiting**: API route protection against abuse
- **Security Headers**: Next.js security headers configuration
- **CSRF Protection**: State parameter validation for OAuth flows
- **Bot Authorization Callback**: Secure Discord bot OAuth flow

#### UI/UX

- **Responsive Component Library**: Reusable UI components
- **Mobile Optimization**: Full mobile-responsive design

#### Testing

- **Test Infrastructure**: Discord test harness, MSW mocks, Testcontainers
- **Unit Tests**: Comprehensive coverage for services and utilities
- **Integration Tests**: Bot command flows with mocked Discord client
- **E2E Tests**: Playwright-based browser testing for web portal

### Changed

- **Polling Performance**: Enabled caching and configurable BullMQ concurrency
- **CI/CD**: Improved workflows for testing, linting, and E2E

### Fixed

- Various bug fixes for test infrastructure and CI pipelines
- TypeScript errors and unused imports/variables
- Prisma model relations and JSON type compatibility

### Removed

- Unused code and imports identified during code reviews
