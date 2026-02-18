---
title: FightRise
permalink: /
---

# FightRise

A Discord bot and web portal for running Start.gg fighting game tournaments entirely within Discord.

## Overview

FightRise syncs tournament data from Start.gg's GraphQL API, creates match threads in Discord, handles player check-ins, and allows score reporting through Discord interactions.

## Features

- **Tournament Sync** - Automatically fetch tournament data from Start.gg
- **Match Threads** - Create Discord threads for each match when players are called
- **Check-in Flow** - Handle player check-ins via Discord button interactions
- **Score Reporting** - Report scores directly in Discord with confirmation flow
- **Web Portal** - Tournament configuration and admin management via web UI

## Quick Links

- [Getting Started](/wiki/Getting-Started) - Installation and setup
- [Architecture](/wiki/Architecture) - System design and data flow
- [Discord Setup](/wiki/Discord-Setup) - Discord bot configuration
- [Start.gg Setup](/wiki/Start.gg-Setup) - Start.gg API configuration
- [Commands](/wiki/Commands) - Discord slash commands reference
- [API Reference](/wiki/API-Reference) - Web API documentation
- [Development](/wiki/Development) - Development workflow

## Tech Stack

| Layer | Technology |
|-------|------------|
| Discord Bot | discord.js v14, BullMQ |
| Web Portal | Next.js 14 (App Router), NextAuth.js |
| Database | PostgreSQL, Prisma ORM |
| Cache/Queue | Redis |
| API | Start.gg GraphQL |

## Related Documentation

- [GitHub Repository](https://github.com/wukrit/fightrise-bot)
- [Architecture Plan](https://github.com/wukrit/fightrise-bot/blob/main/docs/ARCHITECTURE.md)
- [Codebase Reference](https://github.com/wukrit/fightrise-bot/blob/main/docs/CODEBASE_REFERENCE.md)
- [Implementation Status](https://github.com/wukrit/fightrise-bot/blob/main/docs/IMPLEMENTATION_STATUS.md)
