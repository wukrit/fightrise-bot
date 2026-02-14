import { describe, it, expect } from 'vitest';
import {
  TournamentConfig,
  DEFAULT_TOURNAMENT_CONFIG,
} from './types.js';

describe('TournamentConfig', () => {
  it('has correct default values', () => {
    expect(DEFAULT_TOURNAMENT_CONFIG.autoCreateThreads).toBe(true);
    expect(DEFAULT_TOURNAMENT_CONFIG.requireCheckIn).toBe(true);
    expect(DEFAULT_TOURNAMENT_CONFIG.checkInWindowMinutes).toBe(10);
    expect(DEFAULT_TOURNAMENT_CONFIG.allowSelfReporting).toBe(true);
  });

  it('can create custom config', () => {
    const customConfig: TournamentConfig = {
      autoCreateThreads: false,
      requireCheckIn: false,
      checkInWindowMinutes: 5,
      allowSelfReporting: false,
    };

    expect(customConfig.autoCreateThreads).toBe(false);
    expect(customConfig.requireCheckIn).toBe(false);
    expect(customConfig.checkInWindowMinutes).toBe(5);
    expect(customConfig.allowSelfReporting).toBe(false);
  });

  it('default config matches type requirements', () => {
    // Verify all required fields are present
    const config: TournamentConfig = DEFAULT_TOURNAMENT_CONFIG;
    expect(typeof config.autoCreateThreads).toBe('boolean');
    expect(typeof config.requireCheckIn).toBe('boolean');
    expect(typeof config.checkInWindowMinutes).toBe('number');
    expect(typeof config.allowSelfReporting).toBe('boolean');
  });
});

describe('DEFAULT_TOURNAMENT_CONFIG', () => {
  it('is a valid TournamentConfig', () => {
    const keys: (keyof TournamentConfig)[] = [
      'autoCreateThreads',
      'requireCheckIn',
      'checkInWindowMinutes',
      'allowSelfReporting',
    ];

    keys.forEach((key) => {
      expect(DEFAULT_TOURNAMENT_CONFIG).toHaveProperty(key);
    });
  });

  it('has numeric checkInWindowMinutes', () => {
    expect(Number.isFinite(DEFAULT_TOURNAMENT_CONFIG.checkInWindowMinutes)).toBe(
      true
    );
    expect(DEFAULT_TOURNAMENT_CONFIG.checkInWindowMinutes).toBeGreaterThan(0);
  });
});
