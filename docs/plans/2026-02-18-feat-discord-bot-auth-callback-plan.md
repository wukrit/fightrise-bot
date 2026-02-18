---
title: Add handler for Discord bot authorization callback
type: feat
status: completed
date: 2026-02-18
---

# Add Handler for Discord Bot Authorization Callback

## Overview

Create a separate callback handler for Discord bot authorization to fix the "State cookie was missing" error that occurs when users add the bot to their server.

## Problem Statement

When authorizing the Discord bot to join a server, Discord requires a redirect URI. Currently, the only redirect URI configured is the NextAuth callback (`/api/auth/callback/discord`), which causes a "State cookie was missing" error because NextAuth tries to handle it as a user sign-in flow.

The bot authorization flow uses different query parameters (`guild_id`, `permissions`) than user OAuth, requiring a separate callback handler.

## Proposed Solution

Create a dedicated callback route at `/api/auth/callback/bot` that:
1. Handles Discord's bot authorization callback parameters (`code`, `guild_id`, `permissions`)
2. Validates all inputs including CSRF state parameter
3. Displays a success page confirming the bot was added
4. Optionally stores guild configuration (see note below)

## Technical Approach

### Architecture

```
/api/auth/callback/bot/route.ts → Callback handler (new) - consistent with /api/auth/callback/startgg
/auth/success/page.tsx          → Already exists, add bot_installed message
GuildConfig (Prisma)            → Optional storage (see note below)
```

### Callback Parameters from Discord

Discord sends these query parameters to the redirect URI:
- `code` - Authorization code (for potential token exchange)
- `guild_id` - The server the bot was added to
- `permissions` - The permissions integer granted

### Implementation Phases

#### Phase 1: Create Callback Handler

Create `apps/web/app/api/auth/callback/bot/route.ts`:

1. Extract `code`, `guild_id`, `permissions`, and `state` from query params
2. **Validate CSRF state parameter** (required - follow Start.gg pattern):
   - Decode state from base64
   - Validate state matches signed cookie
   - Reject if state missing or invalid
3. **Validate guild_id format** as Discord snowflake (17-19 digits):
   ```typescript
   const GUILD_ID_REGEX = /^\d{17,19}$/;
   if (!guild_id || !GUILD_ID_REGEX.test(guild_id)) {
     return NextResponse.redirect(new URL('/auth/error?error=invalid_guild_id', request.url));
   }
   ```
4. Validate permissions is a valid integer (if provided)
5. **Do NOT store in database** - Just show success page (see note below)
6. Redirect to success page with `?message=bot_installed`

#### Phase 2: Update Success Page

Add new message type to `apps/web/app/auth/success/page.tsx`:
- `bot_installed`: "FightRise bot has been successfully added to your server!"

#### Phase 3: Documentation

1. Update `docs/DISCORD_SETUP.md` with new redirect URI
2. Document required Discord Developer Portal configuration

### Security Considerations

- **CSRF State Parameter (REQUIRED)**: Must validate state parameter to prevent CSRF attacks. Follow Start.gg callback pattern:
  - Generate cryptographically random state when initiating install
  - Store in signed cookie with SameSite=Strict
  - Validate state matches on callback (reject if missing/invalid)
- **Input Validation**: Validate guild_id as valid Discord snowflake (17-19 digit numeric string)
- **Permissions**: Discord sends permissions as integer - validate it's within valid range
- The `guild_id` from callback is a hint - the bot will actually join via GATEWAY event (more reliable)

### Database Schema

**Note: We will NOT store guild_id in the database.** The callback simply confirms installation succeeded. The bot automatically joins the server via Discord's gateway, and we can track actual guilds through `GUILD_CREATE` events (more reliable than OAuth callback).

If we later need guild configuration, it will be created when an admin runs `/tournament setup` - no need to pre-create records.

Reference - GuildConfig model (for potential future use):
```prisma
model GuildConfig {
  id              String    @id @default(cuid())
  discordGuildId  String    @unique
  announcementChannelId String?
  matchChannelId  String?
  prefix          String    @default("!")
  locale          String    @default("en")
  timezone        String    @default("UTC")
}
```

## Alternative Approaches Considered

1. **No callback (direct bot add)**: Not viable because users need confirmation that installation succeeded
2. **Use existing NextAuth callback**: Would require significant customization to distinguish bot vs user auth
3. **Store in separate table**: Unnecessary - GuildConfig already exists

## Acceptance Criteria

### Functional Requirements

- [x] Callback route `/api/auth/callback/bot` handles GET requests
- [x] Validates CSRF state parameter (required)
- [x] Validates `guild_id` as valid Discord snowflake format
- [x] Redirects to success page with `?message=bot_installed`
- [x] Handles error cases (missing params, invalid guild, invalid state)
- [x] No database writes - just confirmation page

### Technical Requirements

- [x] Follows existing API route patterns from `/api/auth/callback/startgg`
- [x] CSRF state validation using signed cookies (SameSite=Strict)
- [x] guild_id validated against Discord snowflake regex
- [x] Environment variable for redirect URI configured
- [x] Error handling with appropriate redirects to error page
- [x] No database operations needed

### Documentation Requirements

- [x] New redirect URI added to Discord Developer Portal (documented)
- [x] Updated `docs/DISCORD_SETUP.md` with callback URL

### Testing Requirements

- [ ] Unit test for CSRF state validation
- [ ] Unit test for guild_id format validation
- [ ] Unit test for error redirects

## Success Metrics

- Bot installation callback returns 302 redirect to success page with valid state
- Invalid guild_id or state redirects to `/auth/error` with appropriate error codes
- No database records created (just confirmation flow)

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Discord API changes | Low | Discord OAuth API is stable |
| GuildConfig model | Low | Already exists, just use it |

## References

- **Discord OAuth2 Documentation**: https://discord.com/developers/docs/topics/oauth2
- **Existing OAuth callback**: `apps/web/app/api/auth/callback/startgg/route.ts`
- **Success page pattern**: `apps/web/app/auth/success/page.tsx`
- **GuildConfig model**: `packages/database/prisma/schema.prisma:333`
- **Issue**: #57

## Implementation Notes

### Environment Variables

Add to `.env.example`:
```bash
DISCORD_BOT_REDIRECT_URI="http://localhost:3000/api/auth/callback/bot"
```

### Discord Developer Portal Settings

When enabling OAuth2 in Discord Developer Portal, add:
- Redirect URI: `{NEXTAUTH_URL}/api/auth/callback/bot`
- (Requires enabling "OAuth2 Code Grant" for callback with code parameter)

### Authorization Code Handling

For bot authorization with `scope=bot`, no token exchange is needed - the bot token is configured separately in Discord Developer Portal. The `code` parameter is not used; it simply confirms the user completed the OAuth flow.

### Future Considerations

1. **Bot Gateway Events**: Listen for `GUILD_CREATE` to verify bot actually joined
2. **Guild Deletion**: Handle `GUILD_DELETE` event to clean up configs
3. **Permissions Updates**: Track when permissions change
