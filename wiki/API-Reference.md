---
title: API Reference
---

# API Reference

This document describes all API endpoints in the FightRise web application.

## Base URL

```
https://your-domain.com/api
```

## Authentication

Most endpoints require authentication via NextAuth.js session. Include cookies from the NextAuth session in requests.

---

## Health Check

### GET /api/health

Health check endpoint for monitoring.

**Authentication:** None

**Response:**

```json
{
  "status": "ok"
}
```

---

## Tournaments

### GET /api/tournaments

Returns a list of all tournaments.

**Authentication:** None (public read)

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| state | string | Filter by tournament state |

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

**Response:**

```json
{
  "id": "...",
  "name": "Tournament Name",
  "startAt": "2024-01-15T18:00:00Z",
  "state": "IN_PROGRESS",
  "events": [
    {
      "id": "...",
      "name": "Street Fighter 6",
      "numEntrants": 64
    }
  ]
}
```

---

### GET /api/tournaments/me

Returns tournaments for the authenticated user.

**Authentication:** Required

**Response:**

```json
[
  {
    "id": "...",
    "name": "My Tournament",
    "state": "IN_PROGRESS",
    "userRole": "ADMIN"
  }
]
```

---

### POST /api/tournaments/[id]/register

Register the authenticated user for a tournament.

**Authentication:** Required

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

---

## Matches

### GET /api/matches

Returns matches for the authenticated user.

**Authentication:** Required

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
    }
  }
]
```

---

### GET /api/matches/[id]

Returns a single match by ID.

**Authentication:** Required

**Response:**

```json
{
  "id": "...",
  "tournamentId": "...",
  "round": 1,
  "bestOf": 3,
  "state": "IN_PROGRESS",
  "checkInDeadline": "2024-01-15T18:30:00Z",
  "player1": {
    "id": "...",
    "name": "Player1Name",
    "reportedScore": 2,
    "isWinner": true
  },
  "player2": {
    "id": "...",
    "name": "Player2Name",
    "reportedScore": 1,
    "isWinner": false
  }
}
```

---

### POST /api/matches/[id]/report

Report the score for a match.

**Authentication:** Required

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

---

### POST /api/matches/[id]/confirm

Confirm the result of a match.

**Authentication:** Required

**Requirements:**
- User must be a player in the match
- Match must be in `PENDING_CONFIRMATION` state

---

### POST /api/matches/[id]/dispute

Create a dispute for a match.

**Authentication:** Required

**Request Body:**

```json
{
  "reason": "Incorrect score reported"
}
```

---

## Error Responses

| Status | Description |
|--------|-------------|
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

---

## Related Documentation

- [Architecture](Architecture) - System design
- [Commands](Commands) - Discord commands
- [Getting Started](Getting-Started) - Quick start guide
