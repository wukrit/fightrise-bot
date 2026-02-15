import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@fightrise/database';
import { encrypt, isEncryptionConfigured } from '@fightrise/shared';

// Start.gg OAuth endpoints
const STARTGG_TOKEN_URL = 'https://start.gg/oauth/token';
const STARTGG_API_URL = 'https://api.start.gg/gql/alpha';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Handle OAuth errors
  if (error) {
    console.error('Start.gg OAuth error:', error);
    return NextResponse.redirect(new URL('/auth/error?error=startgg_oauth_error', request.url));
  }

  if (!code || !state) {
    console.error('Missing code or state in OAuth callback');
    return NextResponse.redirect(new URL('/auth/error?error=missing_params', request.url));
  }

  try {
    // Decode state to get Discord user info
    let discordId: string;
    let discordUsername: string;
    try {
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
      discordId = stateData.discordId;
      discordUsername = stateData.discordUsername;
    } catch {
      console.error('Invalid state parameter');
      return NextResponse.redirect(new URL('/auth/error?error=invalid_state', request.url));
    }

    // Exchange code for tokens
    const clientId = process.env.STARTGG_CLIENT_ID;
    const clientSecret = process.env.STARTGG_CLIENT_SECRET;
    const redirectUri = process.env.STARTGG_REDIRECT_URI || 'http://localhost:3000/api/auth/callback/startgg';

    if (!clientId || !clientSecret) {
      console.error('Start.gg OAuth credentials not configured');
      return NextResponse.redirect(new URL('/auth/error?error=oauth_not_configured', request.url));
    }

    const tokenResponse = await fetch(STARTGG_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      return NextResponse.redirect(new URL('/auth/error?error=token_exchange_failed', request.url));
    }

    const tokens = await tokenResponse.json();
    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token;
    const expiresIn = tokens.expires_in;

    // Fetch user info from Start.gg GraphQL API
    const userQuery = `
      query {
        currentUser {
          id
          slug
          gamerTag
          name
        }
      }
    `;

    const userResponse = await fetch(STARTGG_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ query: userQuery }),
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error('User info fetch failed:', errorText);
      return NextResponse.redirect(new URL('/auth/error?error=user_fetch_failed', request.url));
    }

    const userData = await userResponse.json();
    const startggUser = userData.data?.currentUser;

    if (!startggUser) {
      console.error('No user data returned from Start.gg');
      return NextResponse.redirect(new URL('/auth/error?error=no_user_data', request.url));
    }

    // Find user by Discord ID and update with Start.gg info
    const user = await prisma.user.findUnique({
      where: { discordId },
    });

    if (!user) {
      console.error('User not found for Discord ID:', discordId);
      return NextResponse.redirect(new URL('/auth/error?error=user_not_found', request.url));
    }

    // Encrypt tokens before storing
    let encryptedToken: string;
    if (isEncryptionConfigured()) {
      const tokenData = JSON.stringify({
        accessToken,
        refreshToken,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      });
      encryptedToken = encrypt(tokenData);
    } else {
      // Fallback to base64 if encryption not configured (development)
      console.warn('Encryption not configured - using base64 encoding (NOT SAFE FOR PRODUCTION)');
      const encodedAccessToken = Buffer.from(accessToken).toString('base64');
      const encodedRefreshToken = refreshToken ? Buffer.from(refreshToken).toString('base64') : null;
      encryptedToken = JSON.stringify({
        accessToken: encodedAccessToken,
        refreshToken: encodedRefreshToken,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      });
    }

    // Update user with Start.gg info and tokens
    await prisma.user.update({
      where: { id: user.id },
      data: {
        startggId: startggUser.id,
        startggSlug: startggUser.slug,
        startggGamerTag: startggUser.gamerTag || startggUser.name,
        startggToken: encryptedToken,
      },
    });

    console.log(`Linked Start.gg account ${startggUser.gamerTag} to Discord user ${discordUsername}`);

    // Redirect to success page
    return NextResponse.redirect(new URL('/auth/success?message=startgg_linked', request.url));
  } catch (error) {
    console.error('Error in Start.gg OAuth callback:', error);
    return NextResponse.redirect(new URL('/auth/error?error=unknown', request.url));
  }
}
