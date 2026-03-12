---
status: pending
priority: p1
issue_id: "111"
tags: [code-review, infrastructure, testing]
dependencies: []
---

# Playwright E2E Tests Fail in Docker

## Problem Statement

Playwright E2E tests fail in the Docker container because the browser binary is not properly installed. The Playwright test runner can't find the Chromium browser.

**Why it matters:** E2E tests are critical for verifying the web application works correctly. Without them, regressions can go undetected.

## Findings

```
Error: browserType.launch: Failed to launch: Error: spawn /root/.cache/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-linux64/chrome-headless-shell ENOENT
```

Dockerfile already includes Playwright system dependencies (lines 6-14 in Dockerfile.web):
- nss, freetype, harfbuzz, ca-certificates, ttf-freefont, chromium, chromium-chromedriver

The issue is likely that the Playwright browser binary itself isn't being installed in the container.

## Proposed Solutions

### Solution 1: Install Playwright Browsers in Dockerfile (Recommended)

Add browser installation to the Dockerfile:

```dockerfile
RUN npx playwright install chromium
```

| Aspect | Assessment |
|--------|------------|
| Pros | E2E tests work in Docker |
| Cons | Larger Docker image, slower build |
| Effort | Small |
| Risk | Low |

### Solution 2: Run Tests on Host

Run E2E tests from the host machine instead of Docker.

| Aspect | Assessment |
|--------|------------|
| Pros | Works without Docker changes |
| Cons | Requires host setup |
| Effort | Small |
| Risk | Low |

## Recommended Action

Solution 1 - Add `npx playwright install chromium` to Dockerfile

## Technical Details

**Files to modify:**
- `docker/Dockerfile.web`

## Acceptance Criteria

- [ ] E2E tests pass in Docker
- [ ] CI/CD pipeline runs E2E tests successfully

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-10 | Created from code review | Found when running npm run docker:test:e2e |
| 2026-03-11 | Updated todo | Dockerfile has deps, but browser binary likely missing |

## Resources

- Playwright Docker documentation
- https://playwright.dev/docs/browsers#docker-images
