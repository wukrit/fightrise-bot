import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

interface StartggOAuthStatePayload {
  v: 1;
  discordId: string;
  discordUsername: string;
  nonce: string;
  iat: number;
  exp: number;
}

interface CreateStateInput {
  discordId: string;
  discordUsername: string;
  ttlSeconds?: number;
}

function getOAuthStateSecret(): string {
  const secret =
    process.env.STARTGG_OAUTH_STATE_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.STARTGG_CLIENT_SECRET;
  if (!secret) {
    throw new Error('Missing OAuth state secret: set STARTGG_OAUTH_STATE_SECRET, NEXTAUTH_SECRET, or STARTGG_CLIENT_SECRET');
  }
  return secret;
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, 'utf-8').toString('base64url');
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf-8');
}

function signPayload(payloadB64: string): string {
  return createHmac('sha256', getOAuthStateSecret()).update(payloadB64).digest('base64url');
}

/**
 * Create a signed OAuth state payload for Start.gg linking flow.
 */
export function createSignedStartggOAuthState(input: CreateStateInput): string {
  const ttlSeconds = input.ttlSeconds ?? 10 * 60;
  const now = Math.floor(Date.now() / 1000);

  const payload: StartggOAuthStatePayload = {
    v: 1,
    discordId: input.discordId,
    discordUsername: input.discordUsername,
    nonce: randomBytes(16).toString('hex'),
    iat: now,
    exp: now + ttlSeconds,
  };

  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(payloadB64);
  return `${payloadB64}.${signature}`;
}

/**
 * Verify and decode Start.gg OAuth state.
 */
export function verifySignedStartggOAuthState(state: string): StartggOAuthStatePayload | null {
  const [payloadB64, signature] = state.split('.');
  if (!payloadB64 || !signature) return null;

  const expectedSig = signPayload(payloadB64);
  const providedSig = Buffer.from(signature);
  const expectedSigBuf = Buffer.from(expectedSig);

  if (providedSig.length !== expectedSigBuf.length) {
    return null;
  }

  if (!timingSafeEqual(providedSig, expectedSigBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(payloadB64)) as StartggOAuthStatePayload;
    if (
      payload.v !== 1 ||
      typeof payload.discordId !== 'string' ||
      typeof payload.discordUsername !== 'string' ||
      typeof payload.nonce !== 'string' ||
      typeof payload.iat !== 'number' ||
      typeof payload.exp !== 'number'
    ) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now || payload.iat > now + 60) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
