---
status: completed
priority: p2
issue_id: "075"
tags: [code-review, agent-native, authentication]
dependencies: []
---

# No API Key Authentication for Agents

## Problem Statement

The system only supports Discord OAuth via browser session cookies. Agents cannot authenticate programmatically - they need a way to authenticate without browser-based OAuth flow.

**Why it matters:** Agents cannot access the API for programmatic tournament management.

## Findings

**Location:** `apps/web/lib/auth.ts`

Current: Only Discord OAuth supported. No API key or token-based authentication.

## Proposed Solutions

### Solution A: Add API Key Model (Recommended)
- **Description:** Add UserApiKey model to database, create endpoint to generate keys
- **Pros:** Enables agent authentication
- **Cons:** Additional complexity
- **Effort:** Medium
- **Risk:** Medium

Steps:
1. Add `ApiKey` model to schema
2. Add API key generation endpoint
3. Add API key validation to NextAuth callbacks

### Solution B: Bot-Use-Only Token
- **Description:** Add a fixed bot token for Discord bot's own API access
- **Pros:** Simpler, only for bot
- **Cons:** Not for general agents
- **Effort:** Small
- **Risk:** Low

## Recommended Action

Solution A - Add API key model for full agent support.

## Technical Details

**Affected Files:**
- `packages/database/prisma/schema.prisma`
- `apps/web/lib/auth.ts`
- New API route for key generation

## Acceptance Criteria

- [x] Agents can authenticate with API key

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-18 | Created | Found during PR #97 review |
| 2026-02-18 | Completed | Implemented API key authentication |

## Resources

- PR: #97
