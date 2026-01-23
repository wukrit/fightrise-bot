import { describe, it, expect } from 'vitest';
import {
  formatTournamentDate,
  formatTournamentDateTz,
  formatDuration,
  isWithinWindow,
  getWindowRemaining,
  getRelativeTime,
  toUnixSeconds,
  fromUnixSeconds,
} from './datetime.js';

describe('formatTournamentDate', () => {
  it('should format a Unix timestamp', () => {
    // January 15, 2024 12:00:00 UTC
    const timestamp = 1705320000;
    const result = formatTournamentDate(timestamp);

    // Result will vary by timezone, but should contain date parts
    expect(result).toContain('Jan');
    expect(result).toContain('15');
  });

  it('should accept custom formatting options', () => {
    const timestamp = 1705320000;
    const result = formatTournamentDate(timestamp, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    expect(result).toContain('January');
    expect(result).toContain('2024');
  });
});

describe('formatTournamentDateTz', () => {
  it('should format in specified timezone', () => {
    // January 15, 2024 12:00:00 UTC
    const timestamp = 1705320000;
    const result = formatTournamentDateTz(timestamp, 'America/New_York');

    // Should contain timezone indicator
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });
});

describe('formatDuration', () => {
  it('should format seconds', () => {
    expect(formatDuration(1000)).toBe('1 second');
    expect(formatDuration(5000)).toBe('5 seconds');
    expect(formatDuration(0)).toBe('0 seconds');
  });

  it('should format minutes', () => {
    expect(formatDuration(60 * 1000)).toBe('1 minute');
    expect(formatDuration(5 * 60 * 1000)).toBe('5 minutes');
  });

  it('should format hours', () => {
    expect(formatDuration(60 * 60 * 1000)).toBe('1 hour');
    expect(formatDuration(2 * 60 * 60 * 1000)).toBe('2 hours');
  });

  it('should format hours and minutes', () => {
    expect(formatDuration(90 * 60 * 1000)).toBe('1 hour 30 minutes');
    expect(formatDuration(150 * 60 * 1000)).toBe('2 hours 30 minutes');
  });

  it('should format days', () => {
    expect(formatDuration(24 * 60 * 60 * 1000)).toBe('1 day');
    expect(formatDuration(48 * 60 * 60 * 1000)).toBe('2 days');
  });

  it('should format days and hours', () => {
    expect(formatDuration(30 * 60 * 60 * 1000)).toBe('1 day 6 hours');
  });

  it('should handle invalid duration', () => {
    expect(formatDuration(-1000)).toBe('invalid duration');
  });
});

describe('isWithinWindow', () => {
  it('should return true when within window', () => {
    const windowStart = 1000;
    const windowMinutes = 10;
    const now = 1000 + 5 * 60 * 1000; // 5 minutes in

    expect(isWithinWindow(windowStart, windowMinutes, now)).toBe(true);
  });

  it('should return true at window start', () => {
    const windowStart = 1000;
    const windowMinutes = 10;

    expect(isWithinWindow(windowStart, windowMinutes, windowStart)).toBe(true);
  });

  it('should return true at window end', () => {
    const windowStart = 1000;
    const windowMinutes = 10;
    const windowEnd = windowStart + 10 * 60 * 1000;

    expect(isWithinWindow(windowStart, windowMinutes, windowEnd)).toBe(true);
  });

  it('should return false before window', () => {
    const windowStart = 10000;
    const windowMinutes = 10;
    const now = 5000;

    expect(isWithinWindow(windowStart, windowMinutes, now)).toBe(false);
  });

  it('should return false after window', () => {
    const windowStart = 1000;
    const windowMinutes = 10;
    const now = windowStart + 15 * 60 * 1000; // 15 minutes later

    expect(isWithinWindow(windowStart, windowMinutes, now)).toBe(false);
  });
});

describe('getWindowRemaining', () => {
  it('should return active status with remaining time when in window', () => {
    const windowStart = 1000;
    const windowMinutes = 10;
    const now = windowStart + 5 * 60 * 1000; // 5 minutes in

    const result = getWindowRemaining(windowStart, windowMinutes, now);
    expect(result).toEqual({
      status: 'active',
      remainingMs: 5 * 60 * 1000, // 5 minutes remaining
    });
  });

  it('should return expired status when window has passed', () => {
    const windowStart = 1000;
    const windowMinutes = 10;
    const now = windowStart + 15 * 60 * 1000; // Past window

    const result = getWindowRemaining(windowStart, windowMinutes, now);
    expect(result).toEqual({ status: 'expired' });
  });

  it('should return not_started status with time until start when window has not started', () => {
    const windowStart = 10000;
    const windowMinutes = 10;
    const now = 5000;

    const result = getWindowRemaining(windowStart, windowMinutes, now);
    expect(result).toEqual({
      status: 'not_started',
      startsInMs: 5000, // 5 seconds until window starts
    });
  });
});

describe('getRelativeTime', () => {
  const baseTime = 1000000;

  it('should format future time in seconds', () => {
    const target = baseTime + 30 * 1000;
    expect(getRelativeTime(target, baseTime)).toBe('in 30 seconds');
  });

  it('should format future time in minutes', () => {
    const target = baseTime + 5 * 60 * 1000;
    expect(getRelativeTime(target, baseTime)).toBe('in 5 minutes');
  });

  it('should format future time in hours', () => {
    const target = baseTime + 2 * 60 * 60 * 1000;
    expect(getRelativeTime(target, baseTime)).toBe('in 2 hours');
  });

  it('should format future time in days', () => {
    const target = baseTime + 3 * 24 * 60 * 60 * 1000;
    expect(getRelativeTime(target, baseTime)).toBe('in 3 days');
  });

  it('should format past time in seconds', () => {
    const target = baseTime - 30 * 1000;
    expect(getRelativeTime(target, baseTime)).toBe('30 seconds ago');
  });

  it('should format past time in minutes', () => {
    const target = baseTime - 5 * 60 * 1000;
    expect(getRelativeTime(target, baseTime)).toBe('5 minutes ago');
  });

  it('should handle singular forms', () => {
    expect(getRelativeTime(baseTime + 60 * 1000, baseTime)).toBe('in 1 minute');
    expect(getRelativeTime(baseTime - 60 * 60 * 1000, baseTime)).toBe(
      '1 hour ago'
    );
    expect(getRelativeTime(baseTime + 24 * 60 * 60 * 1000, baseTime)).toBe(
      'in 1 day'
    );
  });
});

describe('toUnixSeconds', () => {
  it('should convert Date to Unix seconds', () => {
    const date = new Date('2024-01-15T12:00:00Z');
    expect(toUnixSeconds(date)).toBe(1705320000);
  });

  it('should convert milliseconds to Unix seconds', () => {
    expect(toUnixSeconds(1705320000000)).toBe(1705320000);
  });

  it('should floor partial seconds', () => {
    expect(toUnixSeconds(1705320000500)).toBe(1705320000);
  });
});

describe('fromUnixSeconds', () => {
  it('should convert Unix seconds to milliseconds', () => {
    expect(fromUnixSeconds(1705320000)).toBe(1705320000000);
  });
});
