---
title: CI npm Install Network Resilience
category: build-errors
date: 2026-03-12
tags: [ci, github-actions, npm, network]
---

# CI npm Install Network Resilience

## Problem

CI builds failing due to transient npm network errors:
```
npm error code ECONNRESET
npm error network Invalid response body while trying to fetch https://registry.npmjs.org/...
```

## Root Cause

GitHub Actions runners can experience temporary network connectivity issues with npm registry. Default npm retry behavior wasn't sufficient.

## Solution

Added npm retry configuration to all CI jobs:

```yaml
- name: Install dependencies
  run: |
    npm config set fetch-retries 5
    npm config set fetch-retry-mintimeout 20000
    npm config set fetch-retry-maxtimeout 120000
    npm config set fetch-retry-factor 2
    npm install
```

## Configuration Explained

| Config | Value | Description |
|--------|-------|-------------|
| fetch-retries | 5 | Retry up to 5 times |
| fetch-retry-mintimeout | 20000 | 20s minimum timeout |
| fetch-retry-maxtimeout | 120000 | 2min maximum timeout |
| fetch-retry-factor | 2 | Exponential backoff |

## Prevention

- Always add retry config to npm install in CI
- Consider using `npm ci` for faster, more reliable installs
- Cache node_modules to reduce network calls
- Use GitHub's built-in caching with actions/setup-node

## Related

- PR #118: fix: resolve Docker web image build failure
- Applies to: lint, typecheck, test, integration-test, build jobs
