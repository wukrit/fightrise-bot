# Tasks for add-docker-dev-environment

## 1. Implementation

- [x] 1.1 Add health check for bot service in docker-compose.yml
- [x] 1.2 Add health check for web service in docker-compose.yml
- [x] 1.3 Add development stage to Dockerfile.bot with nodemon/tsx support
- [x] 1.4 Add development stage to Dockerfile.web with Next.js dev mode
- [x] 1.5 Create docker-compose.dev.yml with:
  - Volume mounts for source code (apps/, packages/)
  - Development stage targets for bot and web
  - Hot-reload configuration
- [x] 1.6 Create README.md with development setup documentation
- [x] 1.7 Create /api/health endpoint for web health check

## 2. Testing

- [x] 2.1 Verify docker-compose.yml syntax is valid
- [x] 2.2 Verify docker-compose.dev.yml syntax is valid
- [x] 2.3 Verify bot lint passes
- [ ] 2.4 Verify `docker compose -f docker/docker-compose.dev.yml up` starts all services (requires env vars)
- [ ] 2.5 Verify hot-reload works (requires running containers)

## 3. Verification

- [x] 3.1 Health check endpoints defined for all services
- [x] 3.2 /api/health endpoint created for web
- [x] 3.3 README includes setup instructions, commands, and service documentation
