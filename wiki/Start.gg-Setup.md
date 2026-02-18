---
title: Start.gg Setup
---

# Start.gg API Setup Guide

This guide walks you through setting up Start.gg API access for FightRise.

## Prerequisites

- **Start.gg account** at [start.gg](https://start.gg)
- **Text editor** for managing `.env` files

**Estimated time:** 10-15 minutes

---

## Overview

Start.gg (formerly Smash.gg) provides a GraphQL API for accessing tournament data. FightRise uses this API to:

- Fetch tournament information and brackets
- Retrieve match/set data and player standings
- Report match results
- Sync registrations

### API Type

- **Protocol**: GraphQL
- **Endpoint**: `https://api.start.gg/gql/alpha`
- **Authentication**: Bearer token

---

## Getting an API Token

### Step 1: Access Developer Settings

1. Log in to [Start.gg](https://start.gg)
2. Click your profile icon in the top right
3. Select **Developer Settings** or go to:
   `https://start.gg/admin/profile/developer`

### Step 2: Create a New Token

1. Click **Create new token**
2. Enter a descriptive name (e.g., "FightRise Bot")
3. Click **Save**

### Step 3: Copy Your Token

> **CRITICAL**: Copy your token immediately after creation. You **cannot view it again** once you leave the page.

This is your `STARTGG_API_KEY` environment variable.

---

## API Basics

### Making Requests

All API requests must include the `Authorization` header:

```
Authorization: Bearer YOUR_TOKEN_HERE
```

### GraphQL Endpoint

```
POST https://api.start.gg/gql/alpha
```

### Example Query

```graphql
query GetTournament($slug: String!) {
  tournament(slug: $slug) {
    id
    name
    startAt
    events {
      id
      name
      numEntrants
    }
  }
}
```

---

## Rate Limits

Start.gg enforces strict rate limits:

| Limit Type | Threshold | Time Window |
|------------|-----------|-------------|
| Request frequency | 80 requests | 60 seconds |
| Objects per request | 1,000 objects | Per request |

### Best Practices

1. **Implement caching** - Don't fetch the same data repeatedly
2. **Use pagination** - Fetch large datasets in smaller chunks
3. **Add delays** - Space out requests during polling

FightRise's `@fightrise/startgg-client` package handles these automatically with:
- Response caching with TTL
- Automatic retry with exponential backoff
- Request queuing

---

## OAuth2 Setup (Advanced)

OAuth2 allows users to authorize FightRise to access their personal Start.gg data.

### Step 1: Create OAuth Application

1. Go to [Start.gg Developer Settings](https://start.gg/admin/profile/developer)
2. Navigate to **OAuth Applications**
3. Click **Create Application**

### Step 2: Configure Redirect URIs

Add these redirect URIs:

```
# Development (local only)
http://localhost:3000/api/auth/callback/startgg

# Development (with Cloudflare Tunnel)
https://fightrise-dev.yourdomain.com/api/auth/callback/startgg

# Production
https://your-domain.com/api/auth/callback/startgg
```

> **Note:** OAuth callbacks require publicly accessible URLs. For local development, use [Cloudflare Tunnel](/wiki/Tunnel-Setup).

### Step 3: Note OAuth Credentials

After creating the application, you'll receive:
- **Client ID** - Your OAuth application ID
- **Client Secret** - Keep this secure

### OAuth Scopes

| Scope | Description |
|-------|-------------|
| `user.identity` | Access user's basic profile |
| `tournament.manager` | Manage tournament seeding and brackets |
| `tournament.reporter` | Report match results |

---

## Environment Variables

```bash
# Start.gg API (Required)
STARTGG_API_KEY="your-api-token"

# Start.gg OAuth (Optional)
STARTGG_CLIENT_ID="your-oauth-client-id"
STARTGG_CLIENT_SECRET="your-oauth-client-secret"
STARTGG_REDIRECT_URI="http://localhost:3000/api/auth/callback/startgg"
```

---

## Testing Your Setup

### Quick Test with curl

```bash
curl -X POST https://api.start.gg/gql/alpha \
  -H "Authorization: Bearer $STARTGG_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ currentUser { id } }"}'
```

Expected response:
```json
{
  "data": {
    "currentUser": {
      "id": "12345"
    }
  }
}
```

---

## Common Queries

### Get Tournament by Slug

```graphql
query GetTournament($slug: String!) {
  tournament(slug: $slug) {
    id
    name
    slug
    startAt
    events {
      id
      name
      numEntrants
    }
  }
}
```

### Get Event Sets (Matches)

```graphql
query GetEventSets($eventId: ID!, $page: Int!, $perPage: Int!) {
  event(id: $eventId) {
    sets(page: $page, perPage: $perPage) {
      nodes {
        id
        state
        fullRoundText
        slots {
          entrant {
            id
            name
          }
        }
      }
    }
  }
}
```

### Report Match Result

```graphql
mutation ReportSet($setId: ID!, $winnerId: ID!) {
  reportBracketSet(setId: $setId, winnerId: $winnerId) {
    id
    state
  }
}
```

---

## Troubleshooting

### "Authentication failed"

1. **Token expired or invalid** - Create a new token
2. **Wrong header format** - Ensure it's `Authorization: Bearer TOKEN`

### "Rate limit exceeded"

1. **Too many requests** - Add delays between requests
2. **Request too large** - Use pagination

### Tournament Not Found

1. **Check the slug format** - Should be `tournament/slug-name`
2. **Tournament may be private** - May require authentication

---

## Additional Resources

- [Start.gg Developer Portal](https://developer.start.gg/)
- [GraphQL Schema Reference](https://smashgg-schema.netlify.app/)
- [Start.gg API Explorer](https://developer.start.gg/explorer)

---

## Related Documentation

- [Getting Started](/wiki/Getting-Started) - Quick start guide
- [Discord Setup](/wiki/Discord-Setup) - Discord bot configuration
- [Tunnel Setup](/wiki/Tunnel-Setup) - Cloudflare Tunnel for OAuth
