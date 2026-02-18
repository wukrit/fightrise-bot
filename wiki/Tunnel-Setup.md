# Cloudflare Tunnel Setup Guide

This guide walks you through setting up Cloudflare Tunnel for local OAuth development.

## Prerequisites

- **Cloudflare account** at [cloudflare.com](https://cloudflare.com)
- **Domain** added to Cloudflare with nameservers pointed to Cloudflare
- **Homebrew** installed (macOS)

**Estimated time:** 10-15 minutes

---

## Why Use a Tunnel?

OAuth providers (Discord, Start.gg) require publicly accessible callback URLs. During local development, your `localhost:3000` isn't accessible from the internet.

**Options:**

| Approach | Pros | Cons |
|----------|------|------|
| Cloudflare Tunnel | Free, stable URL, secure | Requires Cloudflare account + domain |
| ngrok | Easy setup | Free tier has random URLs that change |
| localtunnel | Free, open source | Less stable |

---

## Setup Steps

### 1. Install cloudflared

```bash
brew install cloudflared
```

Verify installation:
```bash
cloudflared --version
```

### 2. Authenticate with Cloudflare

```bash
cloudflared tunnel login
```

This will:
1. Open your browser
2. Ask you to select your Cloudflare domain
3. Generate credentials at `~/.cloudflared/cert.pem`

### 3. Create a Tunnel

```bash
cloudflared tunnel create fightrise-dev
```

Output:
```
Tunnel credentials written to /Users/you/.cloudflared/<UUID>.json
Created tunnel fightrise-dev with id <UUID>
```

**Save the UUID** - you'll need it for the config file.

### 4. Create Configuration File

Create `~/.cloudflared/config.yml`:

```yaml
tunnel: <TUNNEL-UUID>
credentials-file: /Users/<your-username>/.cloudflared/<TUNNEL-UUID>.json

ingress:
  - hostname: fightrise-dev.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404
```

Replace:
- `<TUNNEL-UUID>` with your tunnel's UUID
- `<your-username>` with your username
- `yourdomain.com` with your Cloudflare domain

### 5. Create DNS Route

```bash
cloudflared tunnel route dns fightrise-dev fightrise-dev.yourdomain.com
```

This creates a CNAME record in your Cloudflare DNS.

### 6. Verify Setup

```bash
cloudflared tunnel list
```

You should see your `fightrise-dev` tunnel listed.

---

## Running the Tunnel

### Using npm script

```bash
npm run tunnel
```

Your local app will be accessible at `https://fightrise-dev.yourdomain.com`

---

## Update OAuth Providers

### Discord Developer Portal

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. Go to **OAuth2** → **General**
4. Add redirect URI:
   ```
   https://fightrise-dev.yourdomain.com/api/auth/callback/discord
   ```

### Start.gg Developer Settings

1. Go to [Start.gg Developer Settings](https://start.gg/admin/profile/developer)
2. Select your OAuth application
3. Add redirect URI:
   ```
   https://fightrise-dev.yourdomain.com/api/auth/callback/startgg
   ```

---

## Environment Variables

Update your `.env` for tunnel development:

```bash
# Use tunnel URL for OAuth callbacks
NEXTAUTH_URL="https://fightrise-dev.yourdomain.com"
DISCORD_REDIRECT_URI="https://fightrise-dev.yourdomain.com/api/auth/callback/discord"
STARTGG_REDIRECT_URI="https://fightrise-dev.yourdomain.com/api/auth/callback/startgg"
```

---

## Development Workflow

### Option A: Full Docker Stack with Tunnel (Recommended)

Run everything in Docker:

```bash
npm run docker:dev:tunnel
```

This starts PostgreSQL, Redis, bot, web, and the Cloudflare Tunnel together.

### Option B: Local Tunnel + Docker Infrastructure

**Terminal 1:** Start the tunnel
```bash
npm run tunnel
```

**Terminal 2:** Start infrastructure and apps
```bash
npm run docker:dev
```

---

## Troubleshooting

### "Tunnel not found"

```bash
# List available tunnels
cloudflared tunnel list
```

### "Connection refused"

Make sure your local web app is running on port 3000.

### "DNS record not found"

```bash
cloudflared tunnel route dns fightrise-dev fightrise-dev.yourdomain.com
```

---

## Managing the Tunnel

### List tunnels
```bash
cloudflared tunnel list
```

### Delete a tunnel
```bash
cloudflared tunnel delete fightrise-dev
```

---

## Additional Resources

- [Cloudflare Tunnel Documentation](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
- [cloudflared GitHub](https://github.com/cloudflare/cloudflared)

---

## Related Documentation

- [Getting Started](Getting-Started) - Quick start guide
- [Discord Setup](Discord-Setup) - Discord bot configuration
- [Start.gg Setup](Start.gg-Setup) - Start.gg API setup
