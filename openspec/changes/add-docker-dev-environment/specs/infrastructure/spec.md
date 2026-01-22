## ADDED Requirements

### Requirement: Docker Service Health Checks

All Docker Compose services SHALL include health checks that verify the service is operational and ready to accept connections.

#### Scenario: PostgreSQL health check

- **WHEN** the PostgreSQL container starts
- **THEN** the health check uses `pg_isready` to verify database readiness
- **AND** dependent services wait for healthy status before starting

#### Scenario: Redis health check

- **WHEN** the Redis container starts
- **THEN** the health check uses `redis-cli ping` to verify availability
- **AND** dependent services wait for healthy status before starting

#### Scenario: Bot service health check

- **WHEN** the bot container starts
- **THEN** the health check verifies the Node.js process is running
- **AND** the container reports unhealthy if the process crashes

#### Scenario: Web service health check

- **WHEN** the web container starts
- **THEN** the health check verifies HTTP responses from the Next.js server
- **AND** the container reports unhealthy if the server is not responding

### Requirement: Development Volume Mounts

The development Docker Compose configuration SHALL mount source code directories as volumes to enable live editing without container rebuilds.

#### Scenario: Source code changes reflected immediately

- **WHEN** a developer modifies a source file on the host
- **THEN** the change is immediately visible inside the container
- **AND** the hot-reload mechanism detects the change

#### Scenario: Node modules isolated in container

- **WHEN** dependencies are installed
- **THEN** node_modules remain inside the container via anonymous volumes
- **AND** host node_modules do not conflict with container dependencies

### Requirement: Development Hot-Reload Support

The development environment SHALL support automatic reloading when source files change.

#### Scenario: Bot hot-reload on file change

- **WHEN** a TypeScript file in apps/bot is modified
- **THEN** the bot process restarts automatically
- **AND** the developer does not need to manually restart the container

#### Scenario: Web hot-reload on file change

- **WHEN** a file in apps/web is modified
- **THEN** Next.js Fast Refresh updates the browser
- **AND** the developer does not need to manually refresh

### Requirement: Development Setup Documentation

The project SHALL include README documentation that guides developers through the local development setup process.

#### Scenario: New developer onboarding

- **WHEN** a new developer clones the repository
- **THEN** the README provides step-by-step instructions to start the development environment
- **AND** the instructions cover environment variables, Docker commands, and verification steps
