# Change: Add Docker Development Environment

GitHub Issue: #6

## Why

The current Docker setup includes production-focused Dockerfiles and a basic docker-compose.yml. Developers need a streamlined local development experience with hot-reload support so they can iterate quickly without rebuilding containers for every code change.

## What Changes

- Add health checks for bot and web services in docker-compose.yml
- Create `docker-compose.dev.yml` for development-specific configuration
- Add development Dockerfile stages with hot-reload support (nodemon for bot, Next.js dev mode for web)
- Configure source code volume mounts for live editing
- Create README.md documenting the development setup

## Impact

- Affected specs: infrastructure (new capability)
- Affected code:
  - `docker/docker-compose.yml` - Add health checks for bot/web
  - `docker/docker-compose.dev.yml` - New development compose file
  - `docker/Dockerfile.bot` - Add development stage
  - `docker/Dockerfile.web` - Add development stage
  - `README.md` - New file with setup documentation
