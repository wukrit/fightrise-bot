## ADDED Requirements

### Requirement: Typed API Responses

The client MUST return strongly-typed responses for all queries and mutations.

#### Scenario: Tournament query returns typed response
- **WHEN** `getTournament(slug)` is called
- **THEN** the response includes typed Tournament with id, name, startAt, endAt, state, and events array

#### Scenario: Event sets query returns typed response
- **WHEN** `getEventSets(eventId)` is called
- **THEN** the response includes typed Set objects with entrant and participant information

### Requirement: Get Tournaments By Owner Query

The client MUST provide a method to fetch tournaments administered by a specific user.

#### Scenario: Fetch admin tournaments
- **WHEN** `getTournamentsByOwner(userId)` is called with a valid user ID
- **THEN** the response includes an array of tournaments where the user is an admin

#### Scenario: Empty tournaments list
- **WHEN** `getTournamentsByOwner(userId)` is called for a user with no tournaments
- **THEN** the response includes an empty array

### Requirement: Rate Limiting

The client MUST handle Start.gg API rate limits gracefully.

#### Scenario: Rate limit exceeded
- **WHEN** the API returns a 429 rate limit error
- **THEN** the client waits with exponential backoff and retries the request

#### Scenario: Max retries exceeded
- **WHEN** the maximum number of retries is reached
- **THEN** the client throws a RateLimitError with details

### Requirement: Response Caching

The client MUST support optional response caching to reduce API calls.

#### Scenario: Cache hit
- **WHEN** a cached response exists and has not expired
- **THEN** the client returns the cached response without making an API call

#### Scenario: Cache miss
- **WHEN** no cached response exists or the cache has expired
- **THEN** the client makes an API call and caches the response

#### Scenario: Cache disabled
- **WHEN** caching is disabled in the client configuration
- **THEN** all requests go directly to the API

### Requirement: Error Handling

The client MUST provide typed error responses for common failure scenarios.

#### Scenario: Authentication error
- **WHEN** the API returns a 401 or invalid token error
- **THEN** the client throws an AuthError with the error message

#### Scenario: GraphQL error
- **WHEN** the API returns GraphQL errors in the response
- **THEN** the client throws a GraphQLError with error details
