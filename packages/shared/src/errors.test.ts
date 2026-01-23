import { describe, it, expect } from 'vitest';
import {
  ErrorCode,
  FightRiseError,
  ValidationError,
  NotFoundError,
  PermissionError,
  DiscordError,
  ConfigurationError,
  MatchError,
  isFightRiseError,
  hasErrorCode,
} from './errors.js';

describe('FightRiseError', () => {
  it('should create error with message and default code', () => {
    const error = new FightRiseError('Something went wrong');
    expect(error.message).toBe('Something went wrong');
    expect(error.code).toBe(ErrorCode.UNKNOWN);
    expect(error.name).toBe('FightRiseError');
  });

  it('should create error with custom code', () => {
    const error = new FightRiseError('Rate limited', ErrorCode.RATE_LIMIT);
    expect(error.code).toBe(ErrorCode.RATE_LIMIT);
  });

  it('should include details', () => {
    const error = new FightRiseError('Error', ErrorCode.UNKNOWN, {
      userId: '123',
    });
    expect(error.details).toEqual({ userId: '123' });
  });

  it('should serialize to JSON', () => {
    const error = new FightRiseError('Test error', ErrorCode.VALIDATION_ERROR, {
      field: 'name',
    });
    const json = error.toJSON();
    expect(json).toEqual({
      name: 'FightRiseError',
      message: 'Test error',
      code: ErrorCode.VALIDATION_ERROR,
      details: { field: 'name' },
    });
  });

  it('should be an instance of Error', () => {
    const error = new FightRiseError('Test');
    expect(error).toBeInstanceOf(Error);
  });
});

describe('ValidationError', () => {
  it('should create with VALIDATION_ERROR code', () => {
    const error = new ValidationError('Invalid input');
    expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(error.name).toBe('ValidationError');
  });

  it('should include details about validation failure', () => {
    const error = new ValidationError('Invalid email', {
      field: 'email',
      value: 'not-an-email',
    });
    expect(error.details).toEqual({
      field: 'email',
      value: 'not-an-email',
    });
  });
});

describe('NotFoundError', () => {
  it('should create error with resource name', () => {
    const error = new NotFoundError('Tournament');
    expect(error.message).toBe('Tournament not found');
    expect(error.code).toBe(ErrorCode.NOT_FOUND);
    expect(error.name).toBe('NotFoundError');
  });

  it('should create error with resource and identifier', () => {
    const error = new NotFoundError('Match', '12345');
    expect(error.message).toBe('Match not found: 12345');
    expect(error.details).toMatchObject({
      resource: 'Match',
      identifier: '12345',
    });
  });

  it('should handle numeric identifiers', () => {
    const error = new NotFoundError('User', 42);
    expect(error.message).toBe('User not found: 42');
  });
});

describe('PermissionError', () => {
  it('should create with PERMISSION_DENIED code', () => {
    const error = new PermissionError('You cannot edit this match');
    expect(error.code).toBe(ErrorCode.PERMISSION_DENIED);
    expect(error.name).toBe('PermissionError');
  });
});

describe('DiscordError', () => {
  it('should create with default DISCORD_API_ERROR code', () => {
    const error = new DiscordError('Failed to send message');
    expect(error.code).toBe(ErrorCode.DISCORD_API_ERROR);
    expect(error.name).toBe('DiscordError');
  });

  it('should accept custom Discord error codes', () => {
    const error = new DiscordError(
      'Interaction expired',
      ErrorCode.DISCORD_INTERACTION_EXPIRED
    );
    expect(error.code).toBe(ErrorCode.DISCORD_INTERACTION_EXPIRED);
  });
});

describe('ConfigurationError', () => {
  it('should create with CONFIGURATION_ERROR code', () => {
    const error = new ConfigurationError('Missing DISCORD_TOKEN');
    expect(error.code).toBe(ErrorCode.CONFIGURATION_ERROR);
    expect(error.name).toBe('ConfigurationError');
  });
});

describe('MatchError', () => {
  it('should create with default MATCH_NOT_READY code', () => {
    const error = new MatchError('Match players not determined');
    expect(error.code).toBe(ErrorCode.MATCH_NOT_READY);
    expect(error.name).toBe('MatchError');
  });

  it('should accept custom match error codes', () => {
    const error = new MatchError('Check-in window closed', ErrorCode.CHECK_IN_EXPIRED);
    expect(error.code).toBe(ErrorCode.CHECK_IN_EXPIRED);
  });
});

describe('isFightRiseError', () => {
  it('should return true for FightRiseError instances', () => {
    expect(isFightRiseError(new FightRiseError('test'))).toBe(true);
    expect(isFightRiseError(new ValidationError('test'))).toBe(true);
    expect(isFightRiseError(new NotFoundError('Test'))).toBe(true);
  });

  it('should return false for regular errors', () => {
    expect(isFightRiseError(new Error('test'))).toBe(false);
  });

  it('should return false for non-errors', () => {
    expect(isFightRiseError('error')).toBe(false);
    expect(isFightRiseError(null)).toBe(false);
    expect(isFightRiseError(undefined)).toBe(false);
  });
});

describe('hasErrorCode', () => {
  it('should return true when error has matching code', () => {
    const error = new ValidationError('test');
    expect(hasErrorCode(error, ErrorCode.VALIDATION_ERROR)).toBe(true);
  });

  it('should return false when error has different code', () => {
    const error = new ValidationError('test');
    expect(hasErrorCode(error, ErrorCode.NOT_FOUND)).toBe(false);
  });

  it('should return false for non-FightRise errors', () => {
    const error = new Error('test');
    expect(hasErrorCode(error, ErrorCode.UNKNOWN)).toBe(false);
  });
});
