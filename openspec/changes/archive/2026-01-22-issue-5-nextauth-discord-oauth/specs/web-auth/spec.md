## ADDED Requirements

### Requirement: Discord OAuth Authentication

The web portal SHALL authenticate users via Discord OAuth using NextAuth.js.

#### Scenario: User initiates sign-in

- **WHEN** an unauthenticated user clicks the sign-in button
- **THEN** they are redirected to Discord's OAuth authorization page
- **AND** the requested scopes are `identify` and `guilds`

#### Scenario: Successful OAuth callback

- **WHEN** Discord redirects back with a valid authorization code
- **THEN** the system exchanges the code for access tokens
- **AND** fetches the user's Discord profile (id, username, avatar)
- **AND** creates or updates the User record in the database
- **AND** establishes a session for the user

#### Scenario: User already exists

- **WHEN** a returning user completes OAuth
- **AND** a User with matching discordId exists
- **THEN** the existing User record is updated with current Discord profile data
- **AND** a new session is established

### Requirement: Session Management

The web portal SHALL maintain user sessions across page loads using JWT strategy.

#### Scenario: Session persistence

- **WHEN** an authenticated user reloads the page
- **THEN** their session remains active
- **AND** they are not required to re-authenticate

#### Scenario: Session expiration

- **WHEN** a session JWT expires
- **THEN** the user is redirected to sign in again
- **AND** their previous session data is cleared

### Requirement: Sign-out Functionality

The web portal SHALL allow users to sign out.

#### Scenario: User signs out

- **WHEN** an authenticated user clicks sign out
- **THEN** their session is terminated
- **AND** they are redirected to the home page
- **AND** protected resources are no longer accessible

### Requirement: Protected Routes

The web portal SHALL protect certain routes from unauthenticated access.

#### Scenario: Unauthenticated access to protected route

- **WHEN** an unauthenticated user attempts to access a protected route
- **THEN** they are redirected to the sign-in page
- **AND** the original URL is preserved for post-login redirect

#### Scenario: Authenticated access to protected route

- **WHEN** an authenticated user accesses a protected route
- **THEN** the page renders normally with user context available

### Requirement: Auth UI Components

The web portal SHALL provide authentication UI components.

#### Scenario: Sign-in button display

- **WHEN** an unauthenticated user views a page with auth components
- **THEN** a sign-in button with Discord branding is displayed

#### Scenario: User menu display

- **WHEN** an authenticated user views a page with auth components
- **THEN** their Discord avatar and username are displayed
- **AND** a sign-out option is available
