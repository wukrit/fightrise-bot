import { prisma } from '@fightrise/database';
import { encrypt, decrypt, isEncryptionConfigured } from '@fightrise/shared';

interface StartggTokenData {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string;
}

interface TokenResult {
  accessToken: string;
  isExpired: boolean;
}

/**
 * Attempt to decrypt or decode a token string
 * Handles both encrypted tokens and legacy base64-encoded tokens
 */
function decodeToken(tokenString: string): StartggTokenData | null {
  try {
    // First, try to parse as JSON (both encrypted and unencrypted tokens are JSON)
    const tokenData = JSON.parse(tokenString);

    // Check if the accessToken looks encrypted (base64 but not plain JWT)
    // Encrypted tokens will decrypt to a JSON string
    if (isEncryptionConfigured()) {
      try {
        const decrypted = decrypt(tokenData.accessToken);
        return JSON.parse(decrypted);
      } catch {
        // Not encrypted, use as-is
      }
    }

    // Legacy base64 encoding
    return {
      accessToken: Buffer.from(tokenData.accessToken, 'base64').toString('utf-8'),
      refreshToken: tokenData.refreshToken
        ? Buffer.from(tokenData.refreshToken, 'base64').toString('utf-8')
        : null,
      expiresAt: tokenData.expiresAt,
    };
  } catch {
    console.error('Failed to decode token');
    return null;
  }
}

/**
 * Encode token for storage
 * Uses encryption if configured, otherwise falls back to base64
 */
function encodeToken(tokenData: StartggTokenData): string {
  if (isEncryptionConfigured()) {
    return JSON.stringify({
      accessToken: encrypt(JSON.stringify({
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
      })),
      expiresAt: tokenData.expiresAt,
    });
  }

  // Legacy base64 encoding
  return JSON.stringify({
    accessToken: Buffer.from(tokenData.accessToken).toString('base64'),
    refreshToken: tokenData.refreshToken
      ? Buffer.from(tokenData.refreshToken).toString('base64')
      : null,
    expiresAt: tokenData.expiresAt,
  });
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
    const tokenData = decodeToken(user.startggToken);
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
        startggToken: encodeToken(tokenData),
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
