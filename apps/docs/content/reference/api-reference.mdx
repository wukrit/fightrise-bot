---
layout: default
title: "FightRise Web API Documentation"
---

# FightRise Web API Documentation

This document describes all API endpoints in the FightRise web application.

## Base URL

```text
https://your-domain.com/api
```

## Authentication

Most endpoints require authentication via NextAuth.js session.
Include cookies from the NextAuth session in requests.

---

## Health Check

### GET /api/health

Health check endpoint for monitoring.

**Authentication:** None (rate limited)

**Response:**

```json
{
  "status": "ok"
}
```

**Rate Limit:** Configured via `RATE_LIMIT_CONFIGS.health`

---

## Authentication (NextAuth)

### GET/POST /api/auth/[...nextauth]

NextAuth.js handler for all authentication operations:
sign in, sign out, session management.

**Authentication:** None (handles auth)

**Rate Limit:** Configured via `RATE_LIMIT_CONFIGS.auth`

---

## OAuth Callbacks

### GET /api/auth/callback/startgg

Handles OAuth callback from Start.gg after user authorizes the application.

**Authentication:** None (OAuth callback)

**Query Parameters:**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| code | string | Yes | Authorization code from Start.gg |
| state | string | Yes | Base64-encoded state containing Discord user info |
| error | string | No | OAuth error if any |

**State Parameter Format:**

```json
{
  "discordId": "123456789",
  "discordUsername": "username"
}
```

**Flow:**

1. Exchanges authorization code for access/refresh tokens
2. Fetches user info from Start.gg GraphQL API
3. Links Start.gg account to existing Discord user
4. Redirects to `/auth/success?message=startgg_linked` or `/auth/error?error=...`

---

### GET /api/auth/callback/bot

Handles OAuth callback when adding the Discord bot to a server.

**Authentication:** None (OAuth callback)

**Query Parameters:**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| guild_id | string | Yes | Discord server ID |
| permissions | string | No | Permissions granted to bot |
| state | string | Yes | CSRF protection state (min 8 characters) |
| error | string | No | OAuth error if any |

**Validation:**

- `guild_id` must be a valid Discord snowflake (17-19 digits)
- `permissions` must be a valid Discord permissions integer
- `state` must be at least 8 characters

**Flow:**

1. Validates all parameters
2. Logs successful authorization
3. Redirects to `/auth/success?message=bot_installed` or `/auth/error?error=...`

---

## Tournaments

### GET /api/tournaments

Returns a list of all tournaments.

**Authentication:** None (public read)

**Query Parameters:**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| state | string | No | Filter by tournament state |

**State Values:**

- `CREATED`
- `REGISTRATION_OPEN`
- `REGISTRATION_CLOSED`
- `IN_PROGRESS`
- `COMPLETED`
- `CANCELLED`

**Response:**

```json
{
  "tournaments": [
    {
      "id": "...",
      "name": "Tournament Name",
      "startAt": "2024-01-15T18:00:00Z",
      "state": "REGISTRATION_OPEN",
      "discordGuildId": "...",
      "settings": {},
      "events": [],
      "_count": {
        "registrations": 32
      }
    }
  ],
  "total": 10,
  "page": 1,
  "perPage": 10
}
```

---

### GET /api/tournaments/[id]

Returns a single tournament by ID.

**Authentication:** None (public read)

**Path Parameters:**

| Parameter | Type | Description |
| --- | --- | --- |
| id | string | Tournament ID |

**Response:**

```json
{
  "id": "...",
  "name": "Tournament Name",
  "startAt": "2024-01-15T18:00:00Z",
  "state": "IN_PROGRESS",
  "discordGuildId": "...",
  "settings": {},
  "events": [
    {
      "id": "...",
      "name": "Street Fighter 6",
      "numEntrants": 64
    }
  ],
  "_count": {
    "registrations": 32
  }
}
```

**Errors:** 404 if tournament not found

---

### GET /api/tournaments/me

Returns tournaments for the authenticated user (both admin and participant roles).

**Authentication:** Required (NextAuth session)

**Query Parameters:**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| state | string | No | Filter by tournament state |

**Response:**

```json
[
  {
    "id": "...",
    "name": "My Tournament",
    "state": "IN_PROGRESS",
    "userRole": "ADMIN",
    "_count": {
      "registrations": 32
    }
  },
  {
    "id": "...",
    "name": "Other Tournament",
    "state": "REGISTRATION_OPEN",
    "userRole": null,
    "registrationStatus": "CONFIRMED"
  }
]
```

**Errors:** 401 if not authenticated

---

### POST /api/tournaments/[id]/register

Register the authenticated user for a tournament.

**Authentication:** Required (NextAuth session)

**Path Parameters:**

| Parameter | Type | Description |
| --- | --- | --- |
| id | string | Tournament ID |

**Response:** 201 Created

```json
{
  "id": "...",
  "userId": "...",
  "tournamentId": "...",
  "source": "DISCORD",
  "status": "CONFIRMED"
}
```

**Errors:**

- 401 if not authenticated
- 404 if tournament or user not found
- 400 if already registered

---

## Matches

### GET /api/matches

Returns matches for the authenticated user.

**Authentication:** Required (NextAuth session)

**Response:**

```json
[
  {
    "id": "...",
    "tournamentId": "...",
    "tournamentName": "Weekly Tournament",
    "round": 1,
    "bestOf": 3,
    "state": "CALLED",
    "opponent": {
      "id": "...",
      "name": "OpponentName",
      "discordId": "123456789"
    },
    "myReportedScore": null,
    "isWinner": null
  }
]
```

**Errors:** 401 if not authenticated

---

### GET /api/matches/[id]

Returns a single match by ID for the authenticated user.

**Authentication:** Required (NextAuth session)

**Path Parameters:**

| Parameter | Type | Description |
| --- | --- | --- |
| id | string | Match ID |

**Response:**

```json
{
  "id": "...",
  "tournamentId": "...",
  "tournamentName": "Weekly Tournament",
  "round": 1,
  "bestOf": 3,
  "state": "IN_PROGRESS",
  "checkInDeadline": "2024-01-15T18:30:00Z",
  "player1": {
    "id": "...",
    "name": "Player1Name",
    "discordId": "123456789",
    "reportedScore": 2,
    "isWinner": true
  },
  "player2": {
    "id": "...",
    "name": "Player2Name",
    "discordId": "987654321",
    "reportedScore": 1,
    "isWinner": false
  },
  "myReportedScore": 2,
  "myIsWinner": true
}
```

**Match States:**

- `NOT_STARTED`
- `CALLED`
- `CHECKED_IN`
- `IN_PROGRESS`
- `PENDING_CONFIRMATION`
- `COMPLETED`
- `DISPUTED`
- `DQ`

**Errors:**

- 401 if not authenticated
- 403 if user is not a player in this match
- 404 if match not found

---

### POST /api/matches/[id]/report

Report the score for a match.

**Authentication:** Required (NextAuth session)

**Path Parameters:**

| Parameter | Type | Description |
| --- | --- | --- |
| id | string | Match ID |

**Request Body:**

```json
{
  "winnerId": "player-user-id",
  "player1Score": 2,
  "player2Score": 1
}
```

**Response:**

```json
{
  "success": true
}
```

**Logic:**

- Only a player in the match can report
- If both players report matching results, match is marked `COMPLETED`
- If results conflict, match is marked `DISPUTED`
- If only one player reports, match is marked `PENDING_CONFIRMATION`

**Valid Match States for Reporting:** `CALLED`, `CHECKED_IN`, `IN_PROGRESS`, `PENDING_CONFIRMATION`

**Errors:**

- 401 if not authenticated
- 403 if user is not a player in this match
- 400 if match is not in a reportable state
- 404 if match or user not found

---

### POST /api/matches/[id]/confirm

Confirm the result of a match (after score is reported by opponent).

**Authentication:** Required (NextAuth session)

**Path Parameters:**

| Parameter | Type | Description |
| --- | --- | --- |
| id | string | Match ID |

**Response:**

```json
{
  "success": true
}
```

**Requirements:**

- User must be a player in the match
- Match must be in `PENDING_CONFIRMATION` state

**Errors:**

- 401 if not authenticated
- 403 if user is not a player in this match
- 400 if match is not waiting for confirmation

---

### POST /api/matches/[id]/dispute

Create a dispute for a match.

**Authentication:** Required (NextAuth session)

**Path Parameters:**

| Parameter | Type | Description |
| --- | --- | --- |
| id | string | Match ID |

**Request Body:**

```json
{
  "reason": "Incorrect score reported"
}
```

**Response:** 201 Created

```json
{
  "success": true,
  "message": "Dispute filed"
}
```

**Side Effects:** Sets match state to `DISPUTED`

**Errors:**

- 401 if not authenticated
- 403 if user is not a player in this match
- 404 if match or user not found

---

## Error Responses

All endpoints may return standard error responses:

| Status | Description |
| --- | --- |
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Not authenticated |
| 403 | Forbidden - Not authorized |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

**Error Format:**

```json
{
  "error": "Error message"
}
```

---

## Rate Limiting

API endpoints use rate limiting with headers:

- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Unix timestamp when limit resets

Different endpoints have different rate limit configurations defined in `RATE_LIMIT_CONFIGS`.

---

## Data Models

### Tournament State Enum

- `CREATED` - Tournament created but registration not open
- `REGISTRATION_OPEN` - Registration is open
- `REGISTRATION_CLOSED` - Registration closed
- `IN_PROGRESS` - Tournament is active
- `COMPLETED` - Tournament finished
- `CANCELLED` - Tournament cancelled

### Match State Enum

- `NOT_STARTED` - Match not started
- `CALLED` - Players notified to report
- `CHECKED_IN` - Both players checked in
- `IN_PROGRESS` - Match in progress
- `PENDING_CONFIRMATION` - Score reported, awaiting confirmation
- `COMPLETED` - Match finished
- `DISPUTED` - Score disputed
- `DQ` - Player disqualified

### Registration Source Enum

- `STARTGG` - From Start.gg sync
- `DISCORD` - From Discord command
- `MANUAL` - Manual admin entry

### Registration Status Enum

- `PENDING` - Awaiting confirmation
- `CONFIRMED` - Registered
- `CANCELLED` - Cancelled
- `DQ` - Disqualified
