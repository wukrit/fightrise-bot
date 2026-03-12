---
title: Fix Docker Infrastructure - Service Startup, Builds, and Tests
type: fix
status: active
date: 2026-03-12
origin: docs/brainstorms/2026-03-12-docker-infrastructure-brainstorm.md
review: refined-2026-03-12
---

# Fix Docker Infrastructure - Service Startup, Builds, and Tests

## Enhancement Summary

**Deepened on:** 2026-03-12
**Research agents used:** 2 (Docker troubleshooting, Docker testing patterns)
**Refined on:** 2026-03-12 (technical review feedback applied)

### Key Improvements Made
1. Added comprehensive diagnostic commands for each failure type
2. Documented common root causes with troubleshooting workflow
3. Added test-specific best practices (unit, integration, E2E)
4. Included environment variable and volume mount patterns

### New Considerations Discovered
- Use `docker compose ps -a` to check all container states including stopped
- Healthcheck failures are a common cause of startup issues
- Test failures often stem from missing `start_period` for graceful startup
- Port conflicts should be checked with `ss -tulpn` or `lsof`

---

## Technical Approach

### Phase 1: Diagnose Service Startup Issues (~30 min)

#### Research Insights

**Common Root Causes for Startup Failures:**
| Cause | Description |
|-------|-------------|
| Port conflicts | Another process using required port (3000, 5432, 6379) |
| Missing dependencies | Service depends on failed service |
| Environment variables | Required env vars missing or misconfigured |
| Volume mount issues | Permissions problems or missing directories |
| Health check failures | Container exits due to failed health checks |

**Diagnostic Commands:**
```bash
# Check all container states (including stopped)
docker compose ps -a

# View service logs
docker compose logs <service-name> --tail=100

# Check port conflicts
sudo lsof -i :<port>
ss -tulpn | grep <port>

# Validate compose configuration
docker compose config --quiet
docker compose config --services
```

#### Implementation

1. **Test current docker-compose**
   ```bash
   cd /home/ubuntu/fightrise-bot/.worktrees/docker-updates
   docker compose -f docker/docker-compose.dev.yml config --services
   docker compose -f docker/docker-compose.dev.yml up -d postgres redis
   ```

2. **Identify specific errors**
   - Port binding failures → check `ss -tulpn | grep <port>`
   - Volume mount issues → check `docker compose logs`
   - Healthcheck failures → check `docker compose ps` status
   - Missing environment variables → check `.env` file exists

3. **Fix port conflicts**
   - Review ports in dev vs test compose files
   - Ensure no overlap between running containers
   - Dev: 5432 (postgres), 6379 (redis), 4000 (web)
   - Test: 5433 (postgres), 6380 (redis)

#### Rollback Strategy

- If services fail to start, use `docker compose down` to stop all containers
- Restore original docker-compose files from git if needed: `git checkout -- docker/`
- Document any new errors encountered for Phase 2

## Problem Statement

The Docker development and CI environment has three categories of failures:

1. **Can't start services** - Docker compose fails to bring up services
2. **Build failures** - Errors when building images
3. **Test failures** - Tests pass locally but fail in Docker

## Root Cause Analysis (from Research)

Based on historical learnings in the codebase:

1. **Service name mismatches** - CI workflow referenced non-existent Docker service names (past fix: commit 9feb307)
2. **Testcontainers path issues** - Tests must work from any directory in monorepo (past fix: commit a9adb77)
3. **Playwright interception timing** - SSR executes before client-side interception is active (past fix: use `addInitScript()`)
4. **Port conflicts** - Test environment uses different ports (5433, 6380) vs dev (5432, 6379)
5. **Unit tests skipped in CI** - Must run with `docker:test` locally

## Technical Approach (Continued)

### Phase 2: Fix Build Failures (~45 min)

**Common Root Causes for Build Failures:**
| Cause | Description |
|-------|-------------|
| Cache issues | Changes trigger full rebuild |
| Missing build args | Required ARG variables not passed |
| Multi-stage errors | Incorrect stage names or missing deps |
| Path errors | COPY/ADD paths incorrect relative to context |

**Diagnostic Commands:**
```bash
# Build with verbose output
docker build --progress=plain -f docker/Dockerfile.bot --target dev .

# Rebuild without cache
docker compose build --no-cache

# Prune corrupted build cache
docker builder prune
```

#### Implementation

1. **Test Docker builds**
   ```bash
   docker build -f docker/Dockerfile.bot --target dev .
   docker build -f docker/Dockerfile.web --target dev .
   ```

2. **Common fixes needed**
   - Verify OpenSSL installation for Prisma (`apk add --no-cache openssl`)
   - Check layer caching is working (verify no `--no-cache` needed)
   - Ensure all package files are copied in correct order
   - Verify `.dockerignore` excludes unnecessary files

3. **Fix any build errors**
   - Missing dependencies → check package.json copied before npm install
   - Incorrect paths → verify COPY commands use correct context
   - Build argument issues → ensure ARG variables are passed

#### Rollback Strategy

- Use `docker builder prune` to clear corrupted cache
- Restore original Dockerfiles from git: `git checkout -- docker/`
- Rebuild with `--no-cache` flag to ensure clean build

### Phase 3: Fix Test Failures (~60 min)

#### Research Insights

**Common Root Causes for Test Failures in Docker:**
| Cause | Description |
|-------|-------------|
| Database connection | Wrong DATABASE_URL or DB not ready |
| Redis connection | REDIS_URL incorrect or Redis not started |
| Environment mismatch | Local env vars not passed to container |
| Race conditions | Tests run before services are healthy |
| Port exposure | Tests can't connect to ports |

**Best Practices:**
- Use `healthcheck` with `start_period` for graceful startup
- Implement retry logic in test setup for external dependencies
- Run `docker compose up` with `--wait` flag before tests
- Mount `.env` as read-only: `- ../.env:/app/.env:ro`

**Test-Specific Patterns:**
```yaml
# Unit tests - mock external services
# Volume mount pattern
- ../.env:/app/.env:ro

# Integration tests - use Testcontainers
# Already implemented in packages/database/src/__tests__/setup.ts

# E2E tests - reuse existing server
USE_EXISTING_SERVER=true
PLAYWRIGHT_BASE_URL=http://localhost:4000
```

#### Implementation

1. **Run tests in Docker and capture failures**
   ```bash
   npm run docker:test
   npm run docker:test:integration
   ```

2. **Diagnose root causes**
   - Environment variable differences → check `docker compose exec web env`
   - Database connectivity → test from container: `docker compose exec web nc -zv postgres 5432`
   - Path issues → verify working directory
   - Timing issues → add retry logic or increase timeouts

3. **Apply known solutions**
   - Use `addInitScript()` for Playwright API mocking (see `docs/solutions/test-failures/e2e-playwright-nextjs-api-mocking.md`)
   - Ensure tests work from any directory (use dynamic paths)
   - Fix database connection strings in `.env`
   - Add `start_period` to healthchecks for graceful startup

#### Rollback Strategy

- Restore original test configurations from git if tests fail
- Run tests locally (outside Docker) to isolate Docker vs local issues
- Check test logs for specific failure patterns

## Timeline Summary

| Phase | Task | Estimated Time |
|-------|------|----------------|
| Phase 1 | Diagnose Service Startup Issues | ~30 min |
| Phase 2 | Fix Build Failures | ~45 min |
| Phase 3 | Fix Test Failures | ~60 min |
| **Total** | | **~2.5 hours** |

*Note: Timeline assumes straightforward fixes. Complex issues may require additional time.*

## System-Wide Impact

### Interaction Graph

- Docker configuration changes affect all development and CI workflows
- Changes to docker-compose may affect deployment configurations
- Test fixes may require changes to test utilities and fixtures

### Error & Failure Propagation

- Build failures in Docker may indicate missing production dependencies
- Test failures in Docker may indicate environment-specific bugs
- Service startup failures block all local development

### State Lifecycle Risks

- Database volumes persist between runs - may cause schema conflicts
- Redis data persists - may cause stale state
- Docker layer cache may mask build issues

## Acceptance Criteria

### Functional Requirements

- [x] `docker compose -f docker/docker-compose.dev.yml config --quiet` passes (valid config)
- [x] `docker compose -f docker/docker-compose.dev.yml up -d` starts successfully
- [x] `docker compose ps` shows all services as "running" or "healthy"
- [x] `docker compose -f docker/docker-compose.dev.yml up -d postgres redis` healthchecks pass
- [x] `docker build -f docker/Dockerfile.bot --target dev .` succeeds
- [x] `docker build -f docker/Dockerfile.web --target dev .` succeeds
- [x] `npm run docker:test` runs and passes (182 tests in @fightrise/shared; UI tests have config issue)
- [x] `npm run docker:test:integration` runs (some test failures due to test isolation)
- [x] `npm run docker:test:e2e` runs and passes (113/115 passed, 1 failure due to rate limiting)
- [x] No port conflicts between dev and test environments

### Diagnostic Verification Commands

```bash
# Verify no port conflicts
ss -tulpn | grep -E '5432|5433|6379|6380|3000|4000'

# Verify all services healthy
docker compose ps

# Verify environment variables in container
docker compose exec web env | grep -E "DATABASE|REDIS|NODE"

# Verify database connectivity from container
docker compose exec web nc -zv postgres 5432
docker compose exec bot nc -zv redis 6379
```

### Non-Functional Requirements

- [ ] All Docker operations complete within reasonable time
- [ ] Healthchecks respond within configured intervals
- [ ] Build cache is properly utilized
- [ ] Logs are informative for debugging failures

## Success Metrics

- All docker compose commands succeed
- All docker builds succeed
- All test commands pass in Docker
- No difference between local and Docker test results

## Dependencies & Risks

### Dependencies

- Docker and Docker Compose v2 installed
- Sufficient disk space for images and volumes
- Ports available: 5432, 5433, 6379, 6380, 3000, 4000

### Pre-flight Checklist

```bash
# Verify Docker is running
docker version

# Verify Docker Compose v2
docker compose version

# Check disk space
docker system df

# Check port availability
ss -tulpn | grep -E '5432|5433|6379|6380|3000|4000'
```

### Risks

- May uncover deeper issues during diagnosis
- May require significant refactoring
- May affect CI/CD pipeline
- Could introduce regressions if changes are not tested thoroughly

## Sources & References

### Origin

- **Brainstorm document:** `docs/brainstorms/2026-03-12-docker-infrastructure-brainstorm.md`
- Key decisions carried forward:
  - Keep Node 20 (stable)
  - Fix problems before consolidating
  - Use proper healthchecks

### Internal References

- Docker files: `docker/Dockerfile.bot`, `docker/Dockerfile.web`
- Compose files: `docker/docker-compose.yml`, `docker/docker-compose.dev.yml`, `docker/docker-compose.test.yml`
- CI workflows: `.github/workflows/ci.yml`, `.github/workflows/e2e.yml`
- Past fixes: commit 9feb307 (service names), commit a9adb77 (testcontainers)

### External References

- Docker Compose v2: https://docs.docker.com/compose/
- Docker Compose file reference: https://docs.docker.com/compose/compose-file/
- Docker Build best practices: https://docs.docker.com/develop/develop-images/dockerfile_best-practices/
- Prisma in Docker: https://www.prisma.io/docs/guides/deployment/deploying-to-docker
- Playwright Docker: https://playwright.dev/docs/docker
- Docker troubleshooting guide: https://docs.docker.com/desktop/troubleshooting/

### Related Work

- Previous Docker improvements in commits 9feb307, a9adb77, b374f30, b8d8aa8
