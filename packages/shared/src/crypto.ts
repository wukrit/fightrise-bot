// Encryption utilities for OAuth tokens using AES-256-GCM
// Uses Node.js native crypto module - no external dependencies

import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12; // 96 bits - recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits - maximum authentication strength
const VERSION = 'v1';
const PREFIX = 'encrypted';

/**
 * Check if a value is in the encrypted format
 */
export function isEncrypted(value: string): boolean {
  return value.startsWith(`${PREFIX}:${VERSION}:`);
}

/**
 * Encrypt a plaintext string using AES-256-GCM
 *
 * @param plaintext - The value to encrypt
 * @param keyBase64 - 32-byte encryption key encoded as base64
 * @returns Encrypted string in format: encrypted:v1:{iv}:{ciphertext}:{authTag}
 */
export function encrypt(plaintext: string, keyBase64: string): string {
  const key = Buffer.from(keyBase64, 'base64');
  if (key.length !== KEY_LENGTH) {
    throw new Error(`Encryption key must be ${KEY_LENGTH} bytes (256 bits)`);
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${PREFIX}:${VERSION}:${iv.toString('base64')}:${ciphertext.toString('base64')}:${authTag.toString('base64')}`;
}

/**
 * Decrypt an encrypted string using AES-256-GCM
 *
 * @param encrypted - The encrypted string to decrypt
 * @param keyBase64 - 32-byte encryption key encoded as base64
 * @returns Decrypted plaintext
 * @throws Error if decryption fails (wrong key, corrupted data, invalid format)
 */
export function decrypt(encrypted: string, keyBase64: string): string {
  if (!isEncrypted(encrypted)) {
    throw new Error('Value is not encrypted or uses unknown format');
  }

  const parts = encrypted.split(':');
  if (parts.length !== 5) {
    throw new Error('Invalid encrypted format');
  }

  const [, version, ivB64, ciphertextB64, authTagB64] = parts;
  if (version !== VERSION) {
    throw new Error(`Unsupported encryption version: ${version}`);
  }

  const key = Buffer.from(keyBase64, 'base64');
  if (key.length !== KEY_LENGTH) {
    throw new Error(`Encryption key must be ${KEY_LENGTH} bytes (256 bits)`);
  }

  const iv = Buffer.from(ivB64, 'base64');
  const ciphertext = Buffer.from(ciphertextB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
    'utf8'
  );
}

/**
 * Generate a cryptographically secure encryption key
 *
 * @returns 32-byte key encoded as base64
 */
export function generateKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('base64');
}

/**
 * Validate encryption key at startup - MUST be called before any DB operations
 * P1 FIX: Fail-fast validation prevents silent plaintext storage
 *
 * @param key - The encryption key from environment variable
 * @throws Error if key is missing or invalid
 */
export function validateEncryptionKey(
  key: string | undefined
): asserts key is string {
  if (!key) {
    throw new Error(
      'CRITICAL: ENCRYPTION_KEY environment variable is required.\n' +
        'Generate with: openssl rand -base64 32'
    );
  }

  let decoded: Buffer;
  try {
    decoded = Buffer.from(key, 'base64');
  } catch {
    throw new Error(
      'CRITICAL: ENCRYPTION_KEY is not valid base64.\n' +
        'Generate with: openssl rand -base64 32'
    );
  }

  if (decoded.length !== KEY_LENGTH) {
    throw new Error(
      `CRITICAL: ENCRYPTION_KEY must be exactly ${KEY_LENGTH} bytes (256 bits).\n` +
        `Current key is ${decoded.length} bytes. Generate with: openssl rand -base64 32`
    );
  }
}

/**
 * Decrypt with key rotation support - tries current key, falls back to previous
 * P1 FIX: Enables zero-downtime key rotation
 *
 * @param encrypted - The encrypted string to decrypt
 * @param currentKey - The current encryption key
 * @param previousKey - Optional previous key for rotation period
 * @returns Decrypted plaintext
 * @throws Error if neither key works
 */
export function decryptWithRotation(
  encrypted: string,
  currentKey: string,
  previousKey?: string
): string {
  try {
    return decrypt(encrypted, currentKey);
  } catch (error) {
    if (previousKey) {
      // Try previous key for tokens encrypted before rotation
      return decrypt(encrypted, previousKey);
    }
    throw error;
  }
}

// Result type for safer error handling
export type DecryptResult =
  | { success: true; plaintext: string }
  | { success: false; error: 'INVALID_FORMAT' | 'WRONG_KEY' | 'CORRUPTED' };

/**
 * Safe decrypt that returns a result type instead of throwing
 *
 * P3 DOCUMENTED USE CASES:
 * - Batch validation of encrypted tokens (check which are corrupted/invalid)
 * - Graceful degradation when token might be invalid
 * - Migration scripts that need to handle mixed encryption states
 * - Agent-native status checks without exception handling overhead
 *
 * @example
 * const result = decryptSafe(token, key);
 * if (result.success) {
 *   console.log('Token:', result.plaintext);
 * } else {
 *   console.log('Failed:', result.error);
 *   // Handle INVALID_FORMAT, WRONG_KEY, or CORRUPTED differently
 * }
 */
export function decryptSafe(
  encrypted: string,
  keyBase64: string
): DecryptResult {
  try {
    if (!isEncrypted(encrypted)) {
      return { success: false, error: 'INVALID_FORMAT' };
    }
    const plaintext = decrypt(encrypted, keyBase64);
    return { success: true, plaintext };
  } catch (error) {
    // GCM auth failure indicates wrong key or corrupted data
    if (
      error instanceof Error &&
      (error.message.includes('auth') ||
        error.message.includes('authentication'))
    ) {
      return { success: false, error: 'WRONG_KEY' };
    }
    return { success: false, error: 'CORRUPTED' };
  }
}

/**
 * Verify that an encryption key is valid (correct format and length)
 * P3 FIX: Agent-native API for key verification without throwing
 *
 * @param key - The key to verify
 * @returns Object with valid flag and optional error message
 */
export function verifyKey(key: string | undefined): {
  valid: boolean;
  error?: string;
} {
  if (!key) {
    return { valid: false, error: 'Key is missing or empty' };
  }

  // Check for valid base64 format (Buffer.from doesn't throw for invalid base64)
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  if (!base64Regex.test(key)) {
    return { valid: false, error: 'Key is not valid base64' };
  }

  const decoded = Buffer.from(key, 'base64');
  if (decoded.length !== KEY_LENGTH) {
    return {
      valid: false,
      error: `Key must be ${KEY_LENGTH} bytes, got ${decoded.length}`,
    };
  }
  return { valid: true };
}

/**
 * Debug logging for encryption operations (opt-in via ENCRYPTION_DEBUG env var)
 * P3 FIX: Optional audit logging without adding overhead by default
 */
export function logEncryptionEvent(
  event: 'encrypt' | 'decrypt' | 'rotation_fallback' | 'key_verify',
  details?: Record<string, unknown>
): void {
  if (process.env.ENCRYPTION_DEBUG === 'true') {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        event: `encryption:${event}`,
        ...details,
      })
    );
  }
}
