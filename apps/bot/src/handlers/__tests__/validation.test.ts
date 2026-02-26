/**
 * Unit tests for handler validation functions (isValidCuid).
 * Tests the CUID format validation used by handlers.
 */

import { describe, it, expect } from 'vitest';
import { isValidCuid, CUID_REGEX } from '../validation.js';

describe('isValidCuid', () => {
  describe('valid CUIDs', () => {
    it('should return true for valid CUID with correct prefix and length (25 chars)', () => {
      // CUID format: 'c' + 24 lowercase alphanumeric = 25 total
      expect(isValidCuid('c123456789012345678901234')).toBe(true);
    });

    it('should return true for another valid CUID', () => {
      // 24 chars after c: abcdefghijklmnopqrstuvwx
      expect(isValidCuid('cabcdefghijklmnopqrstuvwx')).toBe(true);
    });

    it('should return true for CUID with all numbers after prefix', () => {
      // 24 numbers after c = 25 total
      expect(isValidCuid('c000000000000000000000000')).toBe(true);
    });

    it('should return true for CUID with mixed letters and numbers', () => {
      // 24 chars after c = 25 total
      expect(isValidCuid('c1a2b3c4d5e6f7g8h9i0j1k2l')).toBe(true);
    });
  });

  describe('invalid CUIDs - wrong prefix', () => {
    it('should return false for wrong prefix (x)', () => {
      expect(isValidCuid('x12345678901234567890123')).toBe(false);
    });

    it('should return false for wrong prefix (m)', () => {
      expect(isValidCuid('m12345678901234567890123')).toBe(false);
    });

    it('should return false for empty prefix', () => {
      expect(isValidCuid('12345678901234567890123')).toBe(false);
    });

    it('should return false for uppercase prefix (C)', () => {
      expect(isValidCuid('C12345678901234567890123')).toBe(false);
    });
  });

  describe('invalid CUIDs - wrong length', () => {
    it('should return false for too short CUID', () => {
      expect(isValidCuid('c123')).toBe(false);
    });

    it('should return false for too long CUID', () => {
      // 26 chars after c: 25 + 1 extra = 26 total
      expect(isValidCuid('c1234567890123456789012345')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidCuid('')).toBe(false);
    });
  });

  describe('invalid CUIDs - special characters', () => {
    it('should return false for CUID with special characters', () => {
      expect(isValidCuid('c12345678901234567890!@#')).toBe(false);
    });

    it('should return false for CUID with spaces', () => {
      expect(isValidCuid('c123 45678901234567890')).toBe(false);
    });

    it('should return false for CUID with uppercase letters', () => {
      expect(isValidCuid('c12345678901234567890ABC')).toBe(false);
    });
  });

  describe('invalid CUIDs - undefined/null', () => {
    it('should return false for undefined', () => {
      expect(isValidCuid(undefined)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isValidCuid(null as unknown as undefined)).toBe(false);
    });
  });
});

describe('CUID_REGEX', () => {
  it('should match valid CUID format', () => {
    expect(CUID_REGEX.test('c123456789012345678901234')).toBe(true);
  });

  it('should not match invalid CUID format', () => {
    expect(CUID_REGEX.test('invalid-id')).toBe(false);
  });

  it('should not match empty string', () => {
    expect(CUID_REGEX.test('')).toBe(false);
  });
});
