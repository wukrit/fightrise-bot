# Brainstorm: Docker Infrastructure Modernization

**Date:** 2026-03-12
**Status:** In Progress

## What We're Building

A modernized, consolidated Docker infrastructure for the FightRise monorepo that:
- Fixes current breakage issues
- Streamlines local development experience with hot-reload
- Provides consistent CI/CD pipelines
- Creates production-ready container configurations
- Simplifies maintenance through consolidation

## Why This Approach

**Consolidated Docker Compose** was chosen because:
1. Reduces configuration duplication between dev/test/prod files
2. Uses Docker Compose v2 `include` feature for shared configuration
3. Makes updates easier - single source of truth for common config
4. Better separation of concerns with environment-specific overrides
5. Industry trend toward consolidated configs

## Current Problems (Verified)

- **Can't start services** - Docker compose fails to bring up services
- **Build failures** - Errors when building images
- **Test failures** - Tests pass locally but fail in Docker

## Key Decisions

### 1. Docker Compose Architecture

```
docker/
├── compose.base.yml          # Shared infrastructure (postgres, redis)
├── compose.yml               # Production override
├── compose.dev.yml           # Development override
└── compose.test.yml          # Testing override
```

- Use `include` to share common service definitions
- Environment-specific files override base configuration
- Single source of truth for ports, healthchecks, volumes

### 2. Node.js Version

- **Keep Node 20** (current production, stable)
- Rationale: Node 22 is new; Node 20 is proven stable for this project
- Upgrade can be considered later when 22 becomes more established

### 3. Dockerfile Improvements

**Current Issues:**
- Dev stage doesn't copy source code (relies on volume mounts)
- Healthcheck uses `node -e process.exit(0)` (not a real healthcheck)
- Some duplication between bot and web Dockerfiles

**Proposed:**
- Add proper healthchecks with actual endpoint checks
- Use build arguments for configurable values
- Standardize multi-stage build patterns
- Keep alpine-based images (smaller than distroless, easier debugging)

### 4. npm Script Consolidation

**Current Issues:**
- Mix of `docker compose` and `docker-compose` commands
- Using `dmno` but some scripts use `turbo` directly
- Inconsistent naming (docker:dev vs docker:dev)

**Proposed:**
- Standardize all docker commands to `docker compose` (v2 syntax)
- Create helper scripts or use docker-compose project names
- Document which runner (dmno vs turbo) to use for each command

### 5. CI/CD Pipeline Optimization

**Current Issues:**
- Multiple separate workflows (ci.yml, e2e.yml, smoke.yml)
- Some duplication of setup steps
- Unit tests skipped in CI (should run in docker)

**Proposed:**
- Consolidate into a single workflow with matrix strategy
- Use Docker for all test runs (consistent with local dev)
- Add proper caching for Docker layers
- Parallelize independent jobs better

## Technical Approach

### Phase 1: Fix Service Startup Issues
1. Diagnose docker compose startup failures
2. Fix port conflicts between dev/test environments
3. Ensure healthchecks are working correctly
4. Verify all dependencies are properly configured

### Phase 2: Fix Build Failures
1. Review and fix Dockerfile issues
2. Ensure proper dependency installation
3. Fix layer caching issues
4. Verify multi-stage builds work correctly

### Phase 3: Fix Test Failures
1. Diagnose why tests pass locally but fail in Docker
2. Fix environment variable issues
3. Ensure database connectivity in containers
4. Verify test isolation

### Phase 4: Consolidation (Optional, if time permits)
1. Create `compose.base.yml` with shared config
2. Refactor to use Docker Compose v2 includes
3. Optimize CI/CD pipelines
4. Add proper caching strategies

## Open Questions

1. **Production Deployment**: How do you deploy to production? (Kubernetes, ECS, bare metal, etc.) - This affects production Docker configuration.

2. **Secrets Management**: Currently using .env files. Should we integrate with Docker secrets, HashiCorp Vault, or cloud provider secrets?

3. **E2E Test Strategy**: Currently E2E tests start their own server. Should we use the docker-compose services instead?

## Next Steps

1. Approve this approach
2. Begin Phase 1: Diagnose and fix service startup issues
3. Test docker compose starts successfully
4. Proceed to Phase 2: Fix build failures
5. Phase 3: Fix test failures
6. Phase 4: Optional consolidation
