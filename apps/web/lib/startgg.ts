import { prisma } from '@fightrise/database';
import {
  encodeStartggToken,
  decodeStartggToken,
} from '@fightrise/shared';
import type { StartggTokenData } from '@fightrise/shared';

interface TokenResult {
  accessToken: string;
  isExpired: boolean;
}

/**
 * Get a valid Start.gg access token for a user, refreshing if necessary.
 * Returns null if the user doesn't have a linked Start.gg account.
 */
export async function getStartggToken(userId: string): Promise<TokenResult | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { startggToken: true },
  });

  if (!user?.startggToken) {
    return null;
  }

  try {
    const tokenData = decodeStartggToken(user.startggToken);
    if (!tokenData) {
      return null;
    }

    const accessToken = tokenData.accessToken;
    const expiresAt = new Date(tokenData.expiresAt);
    const isExpired = expiresAt <= new Date();

    if (isExpired && tokenData.refreshToken) {
      // Token is expired, try to refresh
      return await refreshStartggToken(userId, tokenData.refreshToken);
    }

    return { accessToken, isExpired };
  } catch (error) {
    console.error('Error parsing Start.gg token:', error);
    return null;
  }
}

/**
 * Refresh the Start.gg access token.
 */
async function refreshStartggToken(
  userId: string,
  refreshToken: string
): Promise<TokenResult | null> {
  const clientId = process.env.STARTGG_CLIENT_ID;
  const clientSecret = process.env.STARTGG_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('Start.gg OAuth credentials not configured');
    return null;
  }

  try {
    const response = await fetch('https://start.gg/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      console.error('Token refresh failed:', await response.text());
      return null;
    }

    const tokens = await response.json();
    const newAccessToken = tokens.access_token;
    const newRefreshToken = tokens.refresh_token || refreshToken;
    const expiresIn = tokens.expires_in;

    // Store new tokens with proper encoding
    const tokenData: StartggTokenData = {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    };

    await prisma.user.update({
      where: { id: userId },
      data: {
        startggToken: encodeStartggToken(tokenData),
      },
    });

    return { accessToken: newAccessToken, isExpired: false };
  } catch (error) {
    console.error('Error refreshing Start.gg token:', error);
    return null;
  }
}

/**
 * Make an authenticated request to the Start.gg GraphQL API.
 */
export async function startggQuery<T>(
  userId: string,
  query: string,
  variables?: Record<string, unknown>
): Promise<T | null> {
  const tokenResult = await getStartggToken(userId);

  if (!tokenResult) {
    return null;
  }

  const response = await fetch('https://api.start.gg/gql/alpha', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenResult.accessToken}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    console.error('Start.gg API request failed:', await response.text());
    return null;
  }

  const data = await response.json();
  return data.data as T;
}
