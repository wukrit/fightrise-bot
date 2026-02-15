import { describe, it, expect } from 'vitest';
import {
  TOURNAMENT_SLUG_REGEX,
  MAX_SLUG_LENGTH,
  isValidTournamentSlug,
  validateTournamentSlug,
} from './validation.js';

describe('validation', () => {
  describe('TOURNAMENT_SLUG_REGEX', () => {
    it('should match valid slugs', () => {
      expect('my-tournament'.match(TOURNAMENT_SLUG_REGEX)).not.toBeNull();
      expect('tournament2024'.match(TOURNAMENT_SLUG_REGEX)).not.toBeNull();
      expect('a'.match(TOURNAMENT_SLUG_REGEX)).not.toBeNull();
      expect('my-tournament-2024'.match(TOURNAMENT_SLUG_REGEX)).not.toBeNull();
    });

    it('should not match invalid slugs', () => {
      expect('-starts-with-hyphen'.match(TOURNAMENT_SLUG_REGEX)).toBeNull();
      expect('ends-with-hyphen-'.match(TOURNAMENT_SLUG_REGEX)).toBeNull();
      expect('has_underscore'.match(TOURNAMENT_SLUG_REGEX)).toBeNull();
      expect('has!special'.match(TOURNAMENT_SLUG_REGEX)).toBeNull();
      expect('has spaces'.match(TOURNAMENT_SLUG_REGEX)).toBeNull();
    });
  });

  describe('isValidTournamentSlug', () => {
    it('should return true for valid slugs', () => {
      expect(isValidTournamentSlug('my-tournament')).toBe(true);
      expect(isValidTournamentSlug('tournament2024')).toBe(true);
      expect(isValidTournamentSlug('a')).toBe(true);
      expect(isValidTournamentSlug('my-tournament-2024')).toBe(true);
    });

    it('should return false for invalid slugs', () => {
      expect(isValidTournamentSlug('')).toBe(false);
      expect(isValidTournamentSlug('-starts-hyphen')).toBe(false);
      expect(isValidTournamentSlug('ends-hyphen-')).toBe(false);
      expect(isValidTournamentSlug('has_underscore')).toBe(false);
      expect(isValidTournamentSlug('has special')).toBe(false);
    });

    it('should return false for slugs exceeding max length', () => {
      const longSlug = 'a'.repeat(MAX_SLUG_LENGTH + 1);
      expect(isValidTournamentSlug(longSlug)).toBe(false);

      const maxLengthSlug = 'a'.repeat(MAX_SLUG_LENGTH);
      expect(isValidTournamentSlug(maxLengthSlug)).toBe(true);
    });
  });

  describe('validateTournamentSlug', () => {
    it('should return valid for valid slugs', () => {
      const result = validateTournamentSlug('my-tournament-2024');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return error for empty slug', () => {
      const result = validateTournamentSlug('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Tournament slug cannot be empty');
    });

    it('should return error for slug starting with hyphen', () => {
      const result = validateTournamentSlug('-tournament');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid tournament slug format');
    });

    it('should return error for slug ending with hyphen', () => {
      const result = validateTournamentSlug('tournament-');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid tournament slug format');
    });

    it('should return error for slug with special characters', () => {
      const result = validateTournamentSlug('tournament_2024');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid tournament slug format');
    });

    it('should return error for slug exceeding max length', () => {
      const longSlug = 'a'.repeat(MAX_SLUG_LENGTH + 1);
      const result = validateTournamentSlug(longSlug);
      expect(result.valid).toBe(false);
      expect(result.error).toContain(`exceeds maximum length of ${MAX_SLUG_LENGTH}`);
    });
  });
});
