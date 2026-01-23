import { describe, it, expect } from 'vitest';
import {
  TournamentConfigSchema,
  InteractionIdSchema,
  PartialTournamentConfigSchema,
} from './schemas.js';

describe('TournamentConfigSchema', () => {
  it('should validate a valid tournament config', () => {
    const config = {
      autoCreateThreads: true,
      requireCheckIn: true,
      checkInWindowMinutes: 10,
      allowSelfReporting: true,
    };

    const result = TournamentConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(config);
    }
  });

  it('should reject config with missing fields', () => {
    const config = {
      autoCreateThreads: true,
      // missing other fields
    };

    const result = TournamentConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('should reject config with invalid checkInWindowMinutes', () => {
    const config = {
      autoCreateThreads: true,
      requireCheckIn: true,
      checkInWindowMinutes: -5, // negative not allowed
      allowSelfReporting: true,
    };

    const result = TournamentConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('should reject config with zero checkInWindowMinutes', () => {
    const config = {
      autoCreateThreads: true,
      requireCheckIn: true,
      checkInWindowMinutes: 0,
      allowSelfReporting: true,
    };

    const result = TournamentConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('should reject config with wrong types', () => {
    const config = {
      autoCreateThreads: 'yes', // should be boolean
      requireCheckIn: true,
      checkInWindowMinutes: 10,
      allowSelfReporting: true,
    };

    const result = TournamentConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });
});

describe('PartialTournamentConfigSchema', () => {
  it('should validate partial config with some fields', () => {
    const config = {
      autoCreateThreads: false,
    };

    const result = PartialTournamentConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('should validate empty object', () => {
    const result = PartialTournamentConfigSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe('InteractionIdSchema', () => {
  it('should validate valid interaction IDs', () => {
    const validIds = [
      'checkin:123:456',
      'report:match-1',
      'confirm:abc',
      'dispute:test',
      'register:tournament',
      'score:1:2:3',
    ];

    for (const id of validIds) {
      const result = InteractionIdSchema.safeParse(id);
      expect(result.success).toBe(true);
    }
  });

  it('should reject empty string', () => {
    const result = InteractionIdSchema.safeParse('');
    expect(result.success).toBe(false);
  });

  it('should reject invalid prefix', () => {
    const result = InteractionIdSchema.safeParse('invalid:123');
    expect(result.success).toBe(false);
  });

  it('should accept prefix-only IDs', () => {
    const result = InteractionIdSchema.safeParse('checkin');
    expect(result.success).toBe(true);
  });
});
