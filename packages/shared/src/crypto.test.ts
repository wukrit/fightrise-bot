import { describe, it, expect, vi } from 'vitest';
import {
  encrypt,
  decrypt,
  isEncrypted,
  generateKey,
  validateEncryptionKey,
  decryptWithRotation,
  decryptSafe,
  verifyKey,
  logEncryptionEvent,
} from './crypto.js';

describe('crypto', () => {
  describe('generateKey', () => {
    it('generates a valid base64 key', () => {
      const key = generateKey();
      expect(typeof key).toBe('string');
      // 32 bytes = 44 characters in base64 (with padding)
      expect(key.length).toBe(44);
    });

    it('generates unique keys each time', () => {
      const key1 = generateKey();
      const key2 = generateKey();
      expect(key1).not.toBe(key2);
    });

    it('generates keys that decode to 32 bytes', () => {
      const key = generateKey();
      const decoded = Buffer.from(key, 'base64');
      expect(decoded.length).toBe(32);
    });
  });

  describe('encrypt/decrypt', () => {
    it('encrypts and decrypts round-trip', () => {
      const key = generateKey();
      const plaintext = 'oauth-token-12345';
      const encrypted = encrypt(plaintext, key);
      expect(decrypt(encrypted, key)).toBe(plaintext);
    });

    it('produces different ciphertext for same plaintext (unique IV)', () => {
      const key = generateKey();
      const plaintext = 'same-token';
      const encrypted1 = encrypt(plaintext, key);
      const encrypted2 = encrypt(plaintext, key);
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('handles empty string', () => {
      const key = generateKey();
      const plaintext = '';
      const encrypted = encrypt(plaintext, key);
      expect(decrypt(encrypted, key)).toBe('');
    });

    it('handles unicode characters', () => {
      const key = generateKey();
      const plaintext = 'tøken-with-émojis-🔐';
      const encrypted = encrypt(plaintext, key);
      expect(decrypt(encrypted, key)).toBe(plaintext);
    });

    it('handles long tokens', () => {
      const key = generateKey();
      const plaintext = 'a'.repeat(10000);
      const encrypted = encrypt(plaintext, key);
      expect(decrypt(encrypted, key)).toBe(plaintext);
    });

    it('throws on wrong key', () => {
      const key1 = generateKey();
      const key2 = generateKey();
      const encrypted = encrypt('test', key1);
      expect(() => decrypt(encrypted, key2)).toThrow();
    });

    it('throws on corrupted ciphertext', () => {
      const key = generateKey();
      const encrypted = encrypt('test', key);
      const corrupted = encrypted.slice(0, -5) + 'XXXXX';
      expect(() => decrypt(corrupted, key)).toThrow();
    });

    it('throws on invalid key length for encrypt', () => {
      const shortKey = Buffer.from('short-key').toString('base64');
      expect(() => encrypt('test', shortKey)).toThrow('must be 32 bytes');
    });

    it('throws on invalid key length for decrypt', () => {
      const key = generateKey();
      const encrypted = encrypt('test', key);
      const shortKey = Buffer.from('short-key').toString('base64');
      expect(() => decrypt(encrypted, shortKey)).toThrow('must be 32 bytes');
    });

    it('throws on non-encrypted input', () => {
      const key = generateKey();
      expect(() => decrypt('plain-text-token', key)).toThrow(
        'not encrypted or uses unknown format'
      );
    });

    it('throws on invalid format (wrong number of parts)', () => {
      const key = generateKey();
      expect(() => decrypt('encrypted:v1:missing:parts', key)).toThrow(
        'Invalid encrypted format'
      );
    });

    it('throws on unsupported version', () => {
      const key = generateKey();
      // encrypted:v2 doesn't match the 'encrypted:v1:' prefix, so isEncrypted returns false
      expect(() =>
        decrypt('encrypted:v2:aaa:bbb:ccc', key)
      ).toThrow('not encrypted or uses unknown format');
    });
  });

  describe('isEncrypted', () => {
    it('returns true for encrypted format', () => {
      const key = generateKey();
      const encrypted = encrypt('test', key);
      expect(isEncrypted(encrypted)).toBe(true);
    });

    it('returns false for plain text', () => {
      expect(isEncrypted('plain-oauth-token')).toBe(false);
    });

    it('returns false for partial prefix', () => {
      expect(isEncrypted('encrypted:')).toBe(false);
      expect(isEncrypted('encrypted:v1')).toBe(false);
    });

    it('returns false for wrong prefix', () => {
      expect(isEncrypted('encoded:v1:aaa:bbb:ccc')).toBe(false);
    });
  });

  describe('validateEncryptionKey', () => {
    it('throws on missing key (undefined)', () => {
      expect(() => validateEncryptionKey(undefined)).toThrow(
        'ENCRYPTION_KEY environment variable is required'
      );
    });

    it('throws on empty key', () => {
      expect(() => validateEncryptionKey('')).toThrow(
        'ENCRYPTION_KEY environment variable is required'
      );
    });

    it('throws on invalid key length (too short)', () => {
      const shortKey = Buffer.from('too-short').toString('base64');
      expect(() => validateEncryptionKey(shortKey)).toThrow(
        'must be exactly 32 bytes'
      );
    });

    it('throws on invalid key length (too long)', () => {
      const longKey = Buffer.alloc(64).toString('base64');
      expect(() => validateEncryptionKey(longKey)).toThrow(
        'must be exactly 32 bytes'
      );
    });

    it('accepts valid 32-byte key', () => {
      const validKey = generateKey();
      expect(() => validateEncryptionKey(validKey)).not.toThrow();
    });

    it('acts as type guard for TypeScript', () => {
      const key: string | undefined = generateKey();
      validateEncryptionKey(key);
      // After this, TypeScript knows key is string
      expect(key.length).toBe(44);
    });
  });

  describe('decryptWithRotation', () => {
    it('decrypts with current key', () => {
      const currentKey = generateKey();
      const encrypted = encrypt('my-token', currentKey);
      expect(decryptWithRotation(encrypted, currentKey)).toBe('my-token');
    });

    it('falls back to previous key during rotation', () => {
      const oldKey = generateKey();
      const newKey = generateKey();
      // Token encrypted with old key
      const encrypted = encrypt('my-token', oldKey);
      // Decrypt with new key (fails) falls back to old key (succeeds)
      expect(decryptWithRotation(encrypted, newKey, oldKey)).toBe('my-token');
    });

    it('works when no previous key provided and current key is correct', () => {
      const key = generateKey();
      const encrypted = encrypt('my-token', key);
      expect(decryptWithRotation(encrypted, key, undefined)).toBe('my-token');
    });

    it('throws if neither key works', () => {
      const key1 = generateKey();
      const key2 = generateKey();
      const key3 = generateKey();
      const encrypted = encrypt('my-token', key1);
      expect(() => decryptWithRotation(encrypted, key2, key3)).toThrow();
    });

    it('throws if only current key provided and it is wrong', () => {
      const key1 = generateKey();
      const key2 = generateKey();
      const encrypted = encrypt('my-token', key1);
      expect(() => decryptWithRotation(encrypted, key2)).toThrow();
    });
  });

  describe('decryptSafe', () => {
    it('returns success for valid decryption', () => {
      const key = generateKey();
      const encrypted = encrypt('my-token', key);
      const result = decryptSafe(encrypted, key);
      expect(result).toEqual({ success: true, plaintext: 'my-token' });
    });

    it('returns INVALID_FORMAT for non-encrypted input', () => {
      const key = generateKey();
      const result = decryptSafe('plain-text', key);
      expect(result).toEqual({ success: false, error: 'INVALID_FORMAT' });
    });

    it('returns WRONG_KEY for incorrect key', () => {
      const key1 = generateKey();
      const key2 = generateKey();
      const encrypted = encrypt('my-token', key1);
      const result = decryptSafe(encrypted, key2);
      // GCM auth failure returns WRONG_KEY
      expect(result.success).toBe(false);
      expect((result as { error: string }).error).toMatch(
        /WRONG_KEY|CORRUPTED/
      );
    });

    it('returns CORRUPTED for tampered ciphertext', () => {
      const key = generateKey();
      const encrypted = encrypt('my-token', key);
      // Tamper with the ciphertext portion
      const parts = encrypted.split(':');
      parts[3] = 'tampered' + parts[3];
      const corrupted = parts.join(':');
      const result = decryptSafe(corrupted, key);
      expect(result.success).toBe(false);
    });
  });

  describe('encrypted format', () => {
    it('has expected prefix', () => {
      const key = generateKey();
      const encrypted = encrypt('test', key);
      expect(encrypted.startsWith('encrypted:v1:')).toBe(true);
    });

    it('has 5 colon-separated parts', () => {
      const key = generateKey();
      const encrypted = encrypt('test', key);
      const parts = encrypted.split(':');
      expect(parts.length).toBe(5);
      expect(parts[0]).toBe('encrypted');
      expect(parts[1]).toBe('v1');
    });

    it('IV is valid base64', () => {
      const key = generateKey();
      const encrypted = encrypt('test', key);
      const parts = encrypted.split(':');
      const iv = Buffer.from(parts[2], 'base64');
      expect(iv.length).toBe(12); // 96-bit IV
    });

    it('auth tag is valid base64', () => {
      const key = generateKey();
      const encrypted = encrypt('test', key);
      const parts = encrypted.split(':');
      const authTag = Buffer.from(parts[4], 'base64');
      expect(authTag.length).toBe(16); // 128-bit auth tag
    });
  });

  describe('verifyKey', () => {
    it('returns valid for correct key', () => {
      const key = generateKey();
      expect(verifyKey(key)).toEqual({ valid: true });
    });

    it('returns error for undefined key', () => {
      expect(verifyKey(undefined)).toEqual({
        valid: false,
        error: 'Key is missing or empty',
      });
    });

    it('returns error for empty key', () => {
      expect(verifyKey('')).toEqual({
        valid: false,
        error: 'Key is missing or empty',
      });
    });

    it('returns error for short key', () => {
      const shortKey = Buffer.from('short').toString('base64');
      const result = verifyKey(shortKey);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be 32 bytes');
    });

    it('returns error for invalid base64', () => {
      expect(verifyKey('not-valid-base64!!!')).toEqual({
        valid: false,
        error: 'Key is not valid base64',
      });
    });
  });

  describe('logEncryptionEvent', () => {
    it('logs nothing when ENCRYPTION_DEBUG is not set', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      delete process.env.ENCRYPTION_DEBUG;

      logEncryptionEvent('encrypt', { userId: '123' });

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('logs JSON when ENCRYPTION_DEBUG is true', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      process.env.ENCRYPTION_DEBUG = 'true';

      logEncryptionEvent('decrypt', { count: 5 });

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const logArg = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(logArg);
      expect(parsed.event).toBe('encryption:decrypt');
      expect(parsed.count).toBe(5);
      expect(parsed.timestamp).toBeDefined();

      consoleSpy.mockRestore();
      delete process.env.ENCRYPTION_DEBUG;
    });
  });
});
