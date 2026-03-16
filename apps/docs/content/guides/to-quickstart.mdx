---
layout: default
title: "Tournament Organizer Quickstart Guide"
---

# Tournament Organizer Quickstart Guide

This guide walks tournament organizers through setting up and running a tournament with FightRise.

## Prerequisites

Before you begin, make sure you have:

- **Discord account** with a server where you have admin permissions
- **Start.gg account** with access to the tournament you want to run
- **FightRise bot** invited to your server (see [Discord Setup](./Discord-Setup))

**Estimated time:** 10-15 minutes

## Related Documentation

| Document | Description |
|----------|-------------|
| [Discord Setup](./Discord-Setup) | Bot installation |
| [Start.gg Setup](./StartGG-Setup) | Start.gg API configuration |
| [Player Quickstart](./Player-Quickstart) | Guide for players |

---

## Table of Contents

1. [Linking Your Server](#1-linking-your-server)
2. [Configuring Tournament Channels](#2-configuring-tournament-channels)
3. [Managing Registrations](#3-managing-registrations)
4. [Running the Tournament](#4-running-the-tournament)
5. [Common Issues](#5-common-issues)

---

## 1. Linking Your Server

### Step 1: Run the Setup Command

In any text channel, type:

```
/tournament setup
```

The bot will respond with instructions to link your Start.gg tournament.

### Step 2: Enter Tournament URL

Provide your Start.gg tournament URL (e.g., `https://start.gg/your-tournament`)

The bot will fetch tournament details and confirm the link.

### Step 3: Configure Discord Channels

The bot will ask you to configure:

| Channel | Purpose |
|---------|---------|
| **Match Threads** | Where match threads are created |
| **Announcements** | Tournament updates and alerts |
| **Check-in** | Player check-in notifications |

You can configure these using the `/tournament link-discord` command or during setup.

---

## 2. Configuring Tournament Channels

### Setting Up Match Thread Channel

Choose a category or channel where match threads will be created:

```
/tournament link-discord thread #tournament-matches
```

### Setting Up Announcement Channel

Configure where the bot posts updates:

```
/tournament link-discord announce #tournament-announcements
```

---

## 3. Managing Registrations

### Viewing Registrations

See all registered players:

```
/admin registrations
```

This shows:
- Player names and Discord accounts
- Registration status (confirmed/pending)
- Check-in status

### Confirming Registrations

Players can register themselves using `/register`. You can also manually add registrations:

```
/admin register @player --event "Street Fighter 6"
```

### Managing Check-in

The bot automatically handles check-in when matches are ready. You can:

- View check-in status: `/admin checkins`
- Extend check-in window: `/admin extend-checkin --minutes 5`

---

## 4. Running the Tournament

### Phase 1: Registration

1. Announce the tournament in your Discord
2. Players run `/link-startgg` to connect their accounts
3. Players run `/register` to sign up
4. Monitor registrations with `/admin registrations`

### Phase 2: Check-in

When the tournament is about to start:

1. The bot will post in the announcement channel
2. Players have 10 minutes (default) to check in
3. Use `/admin checkins` to see who's checked in
4. Missing players can be prodded or DQ'd

### Phase 3: Match Play

For each match:

1. Bot creates a thread in the match channel
2. Both players are pinged with a check-in button
3. Players check in using the button
4. Once both check in, the match is ready
5. Winner reports score with `/report`
6. Loser confirms (or auto-confirms after timeout)
7. Results sync to Start.gg

### Phase 4: Completion

When all matches are done:

- Bot posts final standings
- Thread can be archived
- Results are saved to Start.gg

---

## 5. Common Issues

### Bot Not Responding

**Solution:** Check that the bot has permissions to:
- Read messages
- Send messages
- Create threads
- Mention @everyone (for match alerts)

### Players Can't Register

**Possible causes:**
- Player hasn't linked Start.gg: Run `/link-startgg` first
- Registration not open: Check tournament status
- Player already registered: Show error message

### Match Thread Not Created

**Check:**
- Tournament is in progress state on Start.gg
- Both players have linked accounts
- Bot has thread creation permissions

### Score Not Reporting to Start.gg

**Common causes:**
- Wrong winner reported (must be confirmed by loser)
- API issues with Start.gg
- Check bot logs for errors

### Need Help

If you encounter issues:

1. Check `/tournament status` for current state
2. Review bot logs in Discord server settings
3. Report issues in the support channel or GitHub

---

## Admin Commands Reference

| Command | Description |
|---------|-------------|
| `/tournament setup` | Configure tournament |
| `/tournament status` | View tournament status |
| `/admin registrations` | List all registrations |
| `/admin checkins` | View check-in status |
| `/admin dq` | Disqualify a player |
| `/admin extend-checkin` | Extend check-in window |

---

**Need more help?** See the [Architecture](./Architecture) doc or create a GitHub issue.
