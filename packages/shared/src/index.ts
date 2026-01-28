// Shared types and utilities for FightRise
// Main entry point - re-exports all modules

// Types
export type { TournamentConfig } from './types.js';
export { DEFAULT_TOURNAMENT_CONFIG } from './types.js';

// Constants
export {
  POLL_INTERVALS,
  STARTGG_SET_STATE,
  INTERACTION_PREFIX,
  DISCORD_LIMITS,
  DISCORD_COLORS,
  TIME,
} from './constants.js';

// Interaction helpers
export { parseInteractionId, createInteractionId } from './interactions.js';

// Validation schemas
export {
  TournamentConfigSchema,
  InteractionIdSchema,
  PartialTournamentConfigSchema,
} from './schemas.js';
export type {
  ValidatedTournamentConfig,
  PartialTournamentConfig,
} from './schemas.js';

// Error types
export {
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
export type { ErrorCodeType } from './errors.js';

// Date/time utilities
export {
  formatTournamentDate,
  formatTournamentDateTz,
  formatDuration,
  isWithinWindow,
  getWindowRemaining,
  getRelativeTime,
  toUnixSeconds,
  fromUnixSeconds,
} from './datetime.js';
export type { WindowStatus } from './datetime.js';
