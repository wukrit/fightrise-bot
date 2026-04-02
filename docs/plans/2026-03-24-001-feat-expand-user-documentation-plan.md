---
title: Expand user documentation for issue 38
type: feat
status: completed
date: 2026-03-24
---

# Expand User Documentation for Issue 38

## Enhancement Summary

**Deepened on:** 2026-03-24
**Sections enhanced:** Overview, Proposed Solution, Technical Approach, Acceptance Criteria
**Research agents used:** every-style-editor, document-review, pattern-recognition-specialist, best-practices-researcher

### Key Improvements
1. Clarified content architecture (content/ vs apps/docs/ vs docs/)
2. Fixed web portal assessment deliverable (now produces a markdown file)
3. Added documentation style standards (command formatting, role terminology, link patterns)
4. Fixed typo in sample content ("Organators" → "Organizers")
5. Corrected number formatting (spell out one through nine)
6. Fixed scope for review tasks (flag discrepancies, don't rewrite)

### New Considerations Discovered
- Existing docs have inconsistent command formatting (some with backticks, some without)
- Link paths in `content/getting-started/index.mdx` use `/fightrise-bot/` prefix incorrectly
- Role terminology varies ("TO" vs "tournament organizer" vs "admin")
- Troubleshooting should be organized by workflow phase, not category

---

## Overview

Expand FightRise user documentation to meet issue 38 requirements: Getting Started guide, Quick Start, Troubleshooting/FAQ, and web portal help assessment.

**Content Architecture:**
- `content/` — MDX source files (canonical source for editing)
- `apps/docs/` — Next.js static site that builds from `content/`
- `docs/` — Built static HTML output (do not edit directly)

**Important:** CI/CD does not auto-build when `content/` changes. The build must be triggered via `apps/docs/` build or manually.

## Problem Statement

Issue 38 (Write user documentation) requires:
- Getting Started guide
- Tournament Organizer guide (exists, but needs review)
- Player guide (exists, but needs review)
- Troubleshooting/FAQ (missing)
- Web portal help section (missing, needs assessment)

**Existing doc state:**
| File | Lines | Issues |
|------|-------|--------|
| `content/getting-started/index.mdx` | 27 | Sparse, uses `/fightrise-bot/` prefix in links |
| `content/getting-started/zero-to-beta.mdx` | 7.7K | Comprehensive but not linked |
| `content/guides/to-quickstart.mdx` | 218 | Review for accuracy |
| `content/guides/player-quickstart.mdx` | 195 | Review for accuracy |

## Proposed Solution

### Tasks

1. **Expand `content/getting-started/index.mdx`** — Replace sparse welcome page with proper getting started flow
2. **Create `content/getting-started/quickstart.mdx`** — TL;DR quick start for experienced users
3. **Create `content/getting-started/troubleshooting.mdx`** — FAQ and troubleshooting guide
4. **Verify `zero-to-beta.mdx`** — Ensure comprehensive setup guide is properly formatted and linked
5. **Document web portal help assessment** — Create `docs/web-portal-help-assessment.md` with recommendation

### File Structure

```
content/
├── getting-started/
│   ├── index.mdx              # TO EXPAND
│   ├── quickstart.mdx         # TO CREATE
│   ├── troubleshooting.mdx    # TO CREATE
│   └── zero-to-beta.mdx       # VERIFY (exists, comprehensive)
└── guides/
    ├── to-quickstart.mdx      # REVIEW (flag discrepancies)
    └── player-quickstart.mdx  # REVIEW (flag discrepancies)
```

## Documentation Style Standards

Apply consistently across all new and updated content:

### Command Formatting
- Use backticks with leading `/`: `` `/link-startgg` ``
- Never show bare commands without formatting
- Tables should format commands consistently

### Role Terminology
- Use "tournament organizer" or "TO" consistently (pick one, recommend "tournament organizer" for clarity)
- Avoid "admin" unless referring specifically to Discord admin permissions
- Never mix "TO" and "tournament organizer" in the same document

### Number Formatting
- Spell out one through nine in prose: "five minutes", "two steps"
- Use numerals for 10 and above

### Link Patterns
- Internal links: `../guides/guide-name/` (relative paths)
- External links: Full URLs
- **Do not use** `/fightrise-bot/` prefix in links within `content/`

### Heading Case
- H1: Title case ("Getting Started with FightRise")
- H2: Sentence case ("How FightRise works")
- H3: Sentence case ("Checking in for matches")

## Content Approach

### 1. Expand `getting-started/index.mdx`

Replace current 27-line welcome page with structured getting started content:

```mdx
---
title: Getting Started
description: Get started with FightRise - Discord bot for Start.gg tournaments
---

# Getting Started with FightRise

FightRise is a Discord bot and web portal for running Start.gg fighting game tournaments entirely within Discord.

## Three Ways to Get Started

| I'm a... | Guide | Time |
|----------|-------|------|
| Tournament organizer | [TO Quickstart](../guides/to-quickstart/) | 10-15 min |
| Player | [Player Quickstart](../guides/player-quickstart/) | 5 min |
| Developer | [Architecture](../reference/architecture/) | — |

## How FightRise Works

1. Tournament organizer links Start.gg tournament to Discord
2. Players register via `/register`
3. Bot creates match threads when matches are ready
4. Players check in via buttons in the thread
5. Winner reports score, loser confirms
6. Results sync to Start.gg automatically

## First Time Setup

### For tournament organizers

1. [Set up Discord](../guides/discord-setup/)
2. [Configure Start.gg](../guides/startgg-setup/)
3. [Set up Cloudflare Tunnel](../guides/tunnel-setup/) (for OAuth)
4. [Run your first tournament](../guides/to-quickstart/)

### For players

1. [Link your Start.gg account](../guides/player-quickstart/#linking-accounts)
2. [Register for a tournament](../guides/player-quickstart/#registering)
3. [Check in and play](../guides/player-quickstart/#checking-in)

## Troubleshooting

See the [Troubleshooting](./troubleshooting/) guide for common problems and solutions.

## Need Help?

- [Tournament Organizer Guide](../guides/to-quickstart/)
- [Player Guide](../guides/player-quickstart/)
- [Troubleshooting FAQ](./troubleshooting/)
- [Report an issue](https://github.com/wukrit/issues)
```

### 2. Create `content/getting-started/quickstart.mdx`

TL;DR version for experienced users:

```mdx
---
title: Quick Start
description: Get up and running with FightRise in 10 minutes
---

# Quick Start Guide

Need to get running fast? Here's the minimum you need.

## Tournament organizers (five minutes)

1. Invite the bot — see the [Discord setup guide](../guides/discord-setup/)
2. Link tournament: `/tournament setup`
3. Configure channels: `/tournament link-discord #channel-name`
4. Open registration: `/admin registrations`

## Players (two minutes)

1. Link account: `/link-startgg`
2. Register: `/register`
3. Wait for your match thread

## Commands Reference

| Command | Use |
|---------|-----|
| `/tournament setup` | Link Start.gg tournament |
| `/register` | Sign up for tournament |
| `/link-startgg` | Connect Start.gg account |
| `/report` | Report match score (winner only) |
| `/my-matches` | View upcoming matches |

## Full Documentation

- [Full TO Guide](../guides/to-quickstart/)
- [Full Player Guide](../guides/player-quickstart/)
- [Troubleshooting](./troubleshooting/)
```

### 3. Create `content/getting-started/troubleshooting.mdx`

Structure troubleshooting by workflow phase:

```mdx
---
title: Troubleshooting
description: Common issues and solutions for FightRise
---

# Troubleshooting Guide

Common issues and their solutions.

## Before the Tournament

### Bot not responding to commands

1. Check bot is online (green status in Discord server)
2. Verify commands deployed: try `/tournament status`
3. Check bot has required permissions (Send Messages, Create Threads)

### Can't invite bot to server

- Generate invite URL in Discord Developer Portal
- Ensure you have Manage Server permission
- Check bot doesn't have server limit restrictions

## Registration Problems

### "Registration not open"

- Tournament hasn't enabled registration
- Contact the tournament organizer to open registration

### "Already registered"

- You're already registered for this tournament
- Use `/my-matches` to check your registrations

### "Start.gg account not linked"

- Run `/link-startgg` first to connect your account
- Complete the OAuth flow with Start.gg

## Match Day Issues

### Check-in button not working

- Make sure you're clicking the button in the correct match thread
- Try refreshing Discord (Ctrl+Shift+R or Cmd+Shift+R)
- Check if the check-in deadline has passed

### Match thread not created

- Both players must have linked Start.gg accounts
- Tournament must be in progress state on Start.gg
- Bot needs thread creation permissions in the channel

### Score reporting failed

- Only the winner can report
- Opponent must confirm for the report to submit
- Check that bot has permissions to edit the thread

## OAuth Issues

### "Link Start.gg failed"

- Local dev: Ensure Cloudflare Tunnel is running
- Check redirect URI matches exactly in Start.gg developer settings
- Verify Start.gg OAuth is configured correctly

### "OAuth callback error"

- The redirect URI must be publicly accessible
- For local development, use Cloudflare Tunnel
- Check browser console for specific error details

## Getting More Help

- [Discord Setup Guide](../guides/discord-setup/)
- [Start.gg Setup Guide](../guides/startgg-setup/)
- [Report an issue](https://github.com/wukrit/issues)
```

### 4. Verify `zero-to-beta.mdx`

Check `content/getting-started/zero-to-beta.mdx`:
- Has correct frontmatter (`title`, `description`)
- Links use relative paths (not `/fightrise-bot/` prefix)
- Accessible from `index.mdx` navigation

### 5. Document Web Portal Help Assessment

Create `docs/plans/web-portal-help-assessment.md` (since `docs/` is gitignored as build output):

```markdown
# Web Portal Help Assessment

## Pages in `apps/web/app/`

| Page | Path | Complexity |
|------|------|------------|
| Dashboard | `/dashboard/` | Low |
| Tournaments | `/tournaments/` | Low |
| Tournament Detail | `/tournaments/[id]/` | Medium |
| Admin - Registrations | `/tournaments/[id]/admin/registrations/` | Medium |
| Admin - Matches | `/tournaments/[id]/admin/matches/` | Medium |
| Account | `/account/` | Low |

## Assessment

[Evaluate complexity of each page and recommend: docs suffice OR inline help needed]

## Recommendation

[a] Help content belongs in docs — add links from web pages
[b] Build help page in web app — add `apps/web/app/help/page.tsx`
```

## Technical Approach

### Build Process

1. Edit source files in `content/` (MDX source)
2. Build: `npm run build` from `apps/docs/` (or `npm run build` from root via turbo)
3. Output goes to `docs/` folder
4. Commit built output for GitHub Pages

**Note:** CI/CD does not auto-build when `content/` changes. Build must be triggered manually or as part of this work.

### Frontmatter Standard

```yaml
---
title: Page Title
description: Page description for SEO
---
```

## Acceptance Criteria

- [x] `content/getting-started/index.mdx` expanded with three audience entry points
- [x] `content/getting-started/quickstart.mdx` created (under 100 lines)
- [x] `content/getting-started/troubleshooting.mdx` created with workflow-phase organization
- [x] `content/getting-started/zero-to-beta.mdx` verified with correct frontmatter and links
- [x] `content/guides/to-quickstart.mdx` reviewed — discrepancies flagged in PR, not rewritten
- [x] `content/guides/player-quickstart.mdx` reviewed — discrepancies flagged in PR, not rewritten
- [x] `docs/web-portal-help-assessment.md` created with recommendation
- [x] All new content follows style standards (command formatting, numbers, link patterns)
- [x] Build passes: `npm run build` succeeds in `apps/docs/`
- [x] Links verified in built output

## Success Metrics

- Getting Started index: >80 lines with clear navigation
- Quickstart: <100 lines
- Troubleshooting: 10+ common issues organized by workflow phase
- Web portal assessment: Documented recommendation

## Dependencies

- None (pure documentation work)

## Sources

- **Issue:** #38 (Write user documentation)
- **Content source:** `content/` at repository root
- **Build output:** `docs/` static HTML folder
- **CI/CD:** `.github/workflows/docs.yml`
