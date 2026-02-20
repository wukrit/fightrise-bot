// Encryption utilities for sensitive data

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { ConfigurationError } from './errors.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

/**
 * Get the encryption key from environment
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex) {
    throw new ConfigurationError('ENCRYPTION_KEY environment variable is not set');
  }

  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== KEY_LENGTH) {
    throw new ConfigurationError(`ENCRYPTION_KEY must be ${KEY_LENGTH * 2} hex characters (${KEY_LENGTH} bytes)`);
  }

  return key;
}

/**
 * Encrypt plaintext using AES-256-GCM
 * Returns base64-encoded string containing IV + auth tag + ciphertext
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Combine IV + authTag + encrypted data
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString('base64');
}

/**
 * Decrypt ciphertext that was encrypted with encrypt()
 * Input is base64-encoded string containing IV + auth tag + ciphertext
 */
export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();
  const combined = Buffer.from(ciphertext, 'base64');

  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

/**
 * Check if encryption is configured
 */
export function isEncryptionConfigured(): boolean {
  return !!process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length === KEY_LENGTH * 2;
}
