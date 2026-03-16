---
layout: default
title: "Beta Testing Readiness - March 2026"
---

# Brainstorm: Beta Testing with Real Tournaments

**Date:** 2026-03-16
**Status:** In Progress
**Related Issue:** #37

## What We're Building

Prepare the FightRise application for beta testing with real tournament organizers and players. This includes:
1. Setting up a separate beta environment (bot + database)
2. Creating documentation for TOs and players
3. Verifying core functionality works end-to-end

## Why This Approach

**Chosen: Same Postgres, New Discord Bot**
- Simpler than full Docker isolation
- Beta database: `fightrise_beta` in existing Postgres
- New Discord application for beta (separate token)
- Shared Redis for BullMQ jobs

This balances isolation with operational simplicity. Easier to maintain during beta.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Beta database | `fightrise_beta` in same Postgres | Simpler ops than separate container |
| Beta bot | New Discord application | Isolates from any production traffic |
| Docs format | Wiki-style Markdown in docs/ | Already using this pattern |
| First test size | 8-16 players | Issue #37 recommendation |

## Assumptions to Verify

| Item | Status | Notes |
|------|--------|-------|
| `.env.beta` pattern | ⚠️ Needs verification | May need custom script |
| `--env beta` deploy | ❌ Not supported | Deploy uses `dotenv -e .env` - needs update |
| Discord intents | ✅ Confirmed | Guilds, GuildMessages, MessageContent |

## Beta Environment Spec

### Database
```
postgresql://user:pass@localhost:5432/fightrise_beta
```

### Bot Configuration
```
DISCORD_TOKEN=beta_bot_token
DISCORD_CLIENT_ID=beta_client_id
DISCORD_CLIENT_SECRET=beta_client_secret
DATABASE_URL=postgresql://.../fightrise_beta
REDIS_URL=redis://localhost:6379
```

### Steps Required

1. **Create beta database**
   ```sql
   CREATE DATABASE fightrise_beta;
   ```

2. **Create Discord application**
   - Go to Discord Developer Portal
   - New application: "FightRise Beta"
   - Create bot user
   - Enable necessary intents (Guilds, GuildMessages, MessageContent)
   - Generate token

3. **Configure environment**
   - Copy `.env.example` to `.env.beta`
   - Update database URL to `fightrise_beta`
   - Add beta Discord credentials

4. **Run migrations**
   ```bash
   DATABASE_URL=postgresql://.../fightrise_beta npx prisma db push
   ```

5. **Deploy commands**
   ```bash
   # Option A: Copy .env.beta to .env temporarily
   cp .env.beta .env
   npm run deploy

   # Option B: Run directly in bot container
   docker compose exec -e DATABASE_URL=.../fightrise_beta bot npm run deploy
   ```

6. **Start beta bot**
   ```bash
   docker compose run -e DATABASE_URL=.../fightrise_beta bot npm run dev
   ```

## Documentation Requirements

### Tournament Organizer Quickstart
- How to invite beta bot
- `/tournament setup` walkthrough
- Linking Discord channels
- Managing registrations

### Player Quickstart
- How to link Start.gg account
- Using `/register`
- Checking in for matches
- Reporting scores

### FAQ
- Common issues and solutions

## Core Functionality to Verify

| Scenario | Test Method |
|----------|-------------|
| TO runs `/tournament setup` | Manual test |
| Player runs `/link-startgg` | Manual test |
| Player runs `/register` | Manual test |
| Match thread created | Manual test |
| Check-in works | Manual test |
| Score reporting works | Manual test |
| Results sync to Start.gg | Manual test |

## Next Steps

1. Create `.env.beta` template
2. Create TO quickstart guide
3. Create player quickstart guide
4. Set up beta Discord application
5. Test end-to-end flow

---

**Phase:** Ready for planning
