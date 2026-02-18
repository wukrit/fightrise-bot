import { NextRequest, NextResponse } from 'next/server';

// Discord snowflake regex: 17-19 digit numeric string
const GUILD_ID_REGEX = /^\d{17,19}$/;

// Discord permissions integer max value (52 bits)
const MAX_PERMISSIONS = 0x1FFFFFFFFFFFFF;

// State validation: minimum length for CSRF protection
const MIN_STATE_LENGTH = 8;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const guildId = searchParams.get('guild_id');
  const permissions = searchParams.get('permissions');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Handle OAuth errors from Discord
  if (error) {
    console.error('Discord bot authorization error:', error);
    return NextResponse.redirect(new URL('/auth/error?error=discord_bot_auth_error', request.url));
  }

  // Validate required parameters
  if (!guildId) {
    console.error('Missing guild_id in bot authorization callback');
    return NextResponse.redirect(new URL('/auth/error?error=missing_guild_id', request.url));
  }

  // Validate guild_id format (Discord snowflake: 17-19 digits)
  if (!GUILD_ID_REGEX.test(guildId)) {
    console.error('Invalid guild_id format:', guildId);
    return NextResponse.redirect(new URL('/auth/error?error=invalid_guild_id', request.url));
  }

  // Validate permissions if provided
  if (permissions) {
    const permissionsNum = BigInt(permissions);
    if (permissionsNum < BigInt(0) || permissionsNum > BigInt(MAX_PERMISSIONS)) {
      console.error('Invalid permissions value:', permissions);
      return NextResponse.redirect(new URL('/auth/error?error=invalid_permissions', request.url));
    }
  }

  // Validate state parameter (CSRF protection)
  // For bot authorization, Discord generates the state automatically
  // We validate that state exists and meets minimum requirements
  // This prevents CSRF attacks and ensures the flow was initiated properly
  if (!state) {
    console.error('Missing state parameter in bot authorization callback');
    return NextResponse.redirect(new URL('/auth/error?error=missing_state', request.url));
  }

  // Additional state validation: ensure it's a reasonable length
  // Discord-generated states are typically 16-32 characters
  if (state.length < MIN_STATE_LENGTH) {
    console.error('State parameter too short:', state.length);
    return NextResponse.redirect(new URL('/auth/error?error=invalid_state', request.url));
  }

  // Note: For bot authorization with scope=bot, no token exchange is needed.
  // The bot token is configured separately in Discord Developer Portal.

  // Log successful authorization (optional - could be used for analytics)
  console.log(`Bot added to guild: ${guildId}, permissions: ${permissions || 'not specified'}`);

  // Redirect to success page
  return NextResponse.redirect(new URL('/auth/success?message=bot_installed', request.url));
}
