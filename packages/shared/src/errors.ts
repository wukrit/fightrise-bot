// Standardized error codes for FightRise
export const ErrorCode = {
  // General errors
  UNKNOWN: 'UNKNOWN',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',

  // Discord-specific errors
  DISCORD_API_ERROR: 'DISCORD_API_ERROR',
  DISCORD_INTERACTION_EXPIRED: 'DISCORD_INTERACTION_EXPIRED',
  DISCORD_THREAD_ERROR: 'DISCORD_THREAD_ERROR',

  // Tournament/Match errors
  MATCH_NOT_READY: 'MATCH_NOT_READY',
  CHECK_IN_EXPIRED: 'CHECK_IN_EXPIRED',
  SCORE_CONFLICT: 'SCORE_CONFLICT',
  TOURNAMENT_NOT_ACTIVE: 'TOURNAMENT_NOT_ACTIVE',

  // External API errors
  STARTGG_ERROR: 'STARTGG_ERROR',
  RATE_LIMIT: 'RATE_LIMIT',
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

// Base error class for all FightRise errors
export class FightRiseError extends Error {
  public readonly code: ErrorCodeType;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: ErrorCodeType = ErrorCode.UNKNOWN,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'FightRiseError';
    this.code = code;
    this.details = details;

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
    };
  }
}

// Validation error - for schema/input validation failures
export class ValidationError extends FightRiseError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, ErrorCode.VALIDATION_ERROR, details);
    this.name = 'ValidationError';
  }
}

// Not found error - for missing resources
export class NotFoundError extends FightRiseError {
  constructor(
    resource: string,
    identifier?: string | number,
    details?: Record<string, unknown>
  ) {
    const message = identifier
      ? `${resource} not found: ${identifier}`
      : `${resource} not found`;
    super(message, ErrorCode.NOT_FOUND, { resource, identifier, ...details });
    this.name = 'NotFoundError';
  }
}

// Permission error - for authorization failures
export class PermissionError extends FightRiseError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, ErrorCode.PERMISSION_DENIED, details);
    this.name = 'PermissionError';
  }
}

// Discord error - for Discord API/interaction failures
export class DiscordError extends FightRiseError {
  constructor(
    message: string,
    code: ErrorCodeType = ErrorCode.DISCORD_API_ERROR,
    details?: Record<string, unknown>
  ) {
    super(message, code, details);
    this.name = 'DiscordError';
  }
}

// Configuration error - for missing/invalid configuration
export class ConfigurationError extends FightRiseError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, ErrorCode.CONFIGURATION_ERROR, details);
    this.name = 'ConfigurationError';
  }
}

// Match error - for match-related failures
export class MatchError extends FightRiseError {
  constructor(
    message: string,
    code: ErrorCodeType = ErrorCode.MATCH_NOT_READY,
    details?: Record<string, unknown>
  ) {
    super(message, code, details);
    this.name = 'MatchError';
  }
}

// Helper to check if an error is a FightRise error
export function isFightRiseError(error: unknown): error is FightRiseError {
  return error instanceof FightRiseError;
}

// Helper to check error code
export function hasErrorCode(
  error: unknown,
  code: ErrorCodeType
): error is FightRiseError {
  return isFightRiseError(error) && error.code === code;
}
