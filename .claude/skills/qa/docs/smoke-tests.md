# Smoke Tests

Smoke tests run against real APIs to verify integration.

## Requirements

- `SMOKE_DISCORD_TOKEN` - Discord bot token
- `SMOKE_STARTGG_API_KEY` - Start.gg API key
- `SMOKE_DISCORD_GUILD_ID` - Test server ID

## What They Test

- Start.gg API authentication and responses
- Discord bot connection and message sending
- Thread creation and management

## Error Handling

Gracefully skips if credentials are missing.
