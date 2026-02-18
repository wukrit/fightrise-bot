---
title: Discord Setup
---

# Discord Setup Guide

This guide walks you through setting up a Discord application and bot for FightRise.

## Prerequisites

Before you begin, make sure you have:
- **Discord account** with verified email address
- **Administrator access** to a Discord server (for testing the bot)
- **Node.js 18+** installed

**Estimated time:** 15-20 minutes

---

## Creating a Discord Application

### Step 1: Access the Developer Portal

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Sign in with your Discord account
3. Click the **New Application** button in the top right

### Step 2: Create the Application

1. Enter a name for your application (e.g., "FightRise Bot")
2. Agree to the Discord Developer Terms of Service
3. Click **Create**

### Step 3: Note Your Application Credentials

On the **General Information** tab, you'll find:
- **Application ID** - This is your `DISCORD_CLIENT_ID`
- **Public Key** - Used for interaction verification

---

## Configuring the Bot

### Step 1: Create the Bot User

1. Navigate to the **Bot** tab in the left sidebar
2. A bot user is created automatically with your application

### Step 2: Get the Bot Token

1. Under the **Token** section, click **Reset Token**
2. Confirm the action
3. **Copy the token immediately** - you cannot view it again
4. This is your `DISCORD_TOKEN` environment variable

> **WARNING**: Never share your bot token. If compromised, regenerate it immediately.

### Step 3: Configure Bot Settings

| Setting | Recommended | Description |
|---------|-------------|-------------|
| **Public Bot** | Enabled | Allows others to invite your bot |
| **Requires OAuth2 Code Grant** | Disabled | Not needed for FightRise |
| **Message Content Intent** | Enabled | Required for reading messages in threads |

---

## Gateway Intents

### Required Intents

| Intent | Why It's Needed |
|--------|-----------------|
| `Guilds` | Access to guild/server information |
| `GuildMessages` | Receive message events in guild channels |
| `MessageContent` | Read message content in match threads |

### Enabling Privileged Intents

1. Go to **Bot** tab in Developer Portal
2. Scroll to **Privileged Gateway Intents**
3. Enable **Message Content Intent**
4. Save changes

---

## OAuth2 Configuration

### Required OAuth2 Scopes

| Scope | Purpose |
|-------|---------|
| `bot` | Adds the bot user to a guild with permissions |
| `applications.commands` | Enables slash commands |
| `identify` | Web portal: Access user's Discord ID and username |
| `guilds` | Web portal: Access user's guild list |

### Configuring OAuth2 for Web Portal

1. Go to **OAuth2** → **General** in Developer Portal
2. Add your redirect URIs:
   - Development: `http://localhost:3000/api/auth/callback/discord`
   - Production: `https://your-domain.com/api/auth/callback/discord`
3. Note your **Client Secret** - This is your `DISCORD_CLIENT_SECRET`

---

## Generating the Bot Invite URL

1. Go to **OAuth2** → **URL Generator**
2. Select scopes:
   - ✅ `bot`
   - ✅ `applications.commands`

3. Select these **Bot Permissions**:

| Permission | Bit |
|------------|-----|
| Send Messages | `2048` |
| Send Messages in Threads | `274877906944` |
| Create Public Threads | `34359738368` |
| Manage Threads | `17179869184` |
| Embed Links | `16384` |
| Read Message History | `65536` |
| Mention Everyone | `131072` |
| Use Application Commands | `2147483648` |
| View Channels | `1024` |

### Recommended Permission Integer

Use: `397284690944`

### Generated Invite URL Format

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=397284690944&scope=bot%20applications.commands
```

---

## Environment Variables

Add these to your `.env` file:

```bash
# Discord Bot Configuration
DISCORD_TOKEN="your-bot-token"
DISCORD_CLIENT_ID="your-application-id"
DISCORD_CLIENT_SECRET="your-client-secret"

# OAuth Redirect URIs
DISCORD_REDIRECT_URI="http://localhost:3000/api/auth/callback/discord"
DISCORD_BOT_REDIRECT_URI="http://localhost:3000/api/auth/callback/bot"
```

---

## Troubleshooting

### Bot Not Responding to Commands

1. **Check the bot is online** - Look for green status indicator
2. **Verify commands are deployed** - Run `npm run deploy`
3. **Check bot has permissions** - Ensure bot role has required permissions

### OAuth Login Fails

1. **Verify redirect URI matches exactly** - Including trailing slashes
2. **Check client secret** - Ensure it hasn't been rotated

---

## Related Documentation

- [Getting Started](/fightrise-bot/wiki/Getting-Started) - Quick start guide
- [Start.gg Setup](/fightrise-bot/wiki/Start.gg-Setup) - Start.gg API setup
- [Tunnel Setup](/fightrise-bot/wiki/Tunnel-Setup) - Cloudflare Tunnel for OAuth
