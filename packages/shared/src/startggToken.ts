import { encrypt, decrypt, isEncryptionConfigured } from './crypto.js';

export interface StartggTokenData {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string;
}

function decodeBase64(value: string): string {
  return Buffer.from(value, 'base64').toString('utf-8');
}

function encodeBase64(value: string): string {
  return Buffer.from(value, 'utf-8').toString('base64');
}

function isStartggTokenData(value: unknown): value is StartggTokenData {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.accessToken === 'string' &&
    typeof obj.expiresAt === 'string' &&
    (typeof obj.refreshToken === 'string' || obj.refreshToken === null)
  );
}

/**
 * Canonical encoder for Start.gg token payloads.
 * Uses authenticated encryption when ENCRYPTION_KEY is configured.
 */
export function encodeStartggToken(tokenData: StartggTokenData): string {
  if (isEncryptionConfigured()) {
    return encrypt(JSON.stringify(tokenData));
  }

  // Backward-compatible plaintext payload when encryption is unavailable.
  return JSON.stringify(tokenData);
}

/**
 * Decode Start.gg token payload from storage.
 * Supports:
 * 1) Canonical encrypted blob: encrypt(JSON.stringify(tokenData))
 * 2) Plain JSON tokenData
 * 3) Legacy wrapper with encrypted nested accessToken
 * 4) Legacy wrapper with base64 encoded access/refresh tokens
 */
export function decodeStartggToken(storedToken: string): StartggTokenData | null {
  if (!storedToken) return null;

  // Canonical encrypted blob.
  if (isEncryptionConfigured()) {
    try {
      const decrypted = decrypt(storedToken);
      const parsed = JSON.parse(decrypted);
      if (isStartggTokenData(parsed)) {
        return parsed;
      }
    } catch {
      // Continue with legacy decoders.
    }
  }

  // Plain JSON token data (unencrypted fallback).
  try {
    const parsed = JSON.parse(storedToken);
    if (isStartggTokenData(parsed)) {
      return parsed;
    }

    // Legacy format:
    // {
    //   accessToken: "<encrypted-json>" OR "<base64-access-token>",
    //   refreshToken: "<base64-refresh-token>" | null,
    //   expiresAt: "<iso-string>"
    // }
    const obj = parsed as Record<string, unknown>;
    if (typeof obj.accessToken === 'string' && typeof obj.expiresAt === 'string') {
      if (isEncryptionConfigured()) {
        try {
          const decryptedInner = decrypt(obj.accessToken);
          const innerParsed = JSON.parse(decryptedInner);
          if (
            innerParsed &&
            typeof innerParsed === 'object' &&
            typeof (innerParsed as Record<string, unknown>).accessToken === 'string'
          ) {
            return {
              accessToken: (innerParsed as Record<string, unknown>).accessToken as string,
              refreshToken: ((innerParsed as Record<string, unknown>).refreshToken as string | null) ?? null,
              expiresAt: obj.expiresAt,
            };
          }
        } catch {
          // Continue to base64 legacy handling.
        }
      }

      try {
        return {
          accessToken: decodeBase64(obj.accessToken),
          refreshToken: typeof obj.refreshToken === 'string' ? decodeBase64(obj.refreshToken) : null,
          expiresAt: obj.expiresAt,
        };
      } catch {
        return null;
      }
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Legacy storage writer kept for explicit backward compatibility migrations.
 * Prefer encodeStartggToken() for all new writes.
 */
export function encodeStartggTokenLegacyBase64(tokenData: StartggTokenData): string {
  return JSON.stringify({
    accessToken: encodeBase64(tokenData.accessToken),
    refreshToken: tokenData.refreshToken ? encodeBase64(tokenData.refreshToken) : null,
    expiresAt: tokenData.expiresAt,
  });
}
