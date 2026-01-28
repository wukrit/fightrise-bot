// Shared constants for FightRise

// Poll intervals in milliseconds
export const POLL_INTERVALS = {
  INACTIVE: 5 * 60 * 1000, // 5 minutes when not active
  ACTIVE: 15 * 1000, // 15 seconds during active play
  MATCH_PENDING: 10 * 1000, // 10 seconds when matches are waiting
  REGISTRATION: 60 * 1000, // 1 minute during registration
} as const;

// Match state mappings from Start.gg
export const STARTGG_SET_STATE = {
  NOT_STARTED: 1,
  STARTED: 2,
  COMPLETED: 3,
  READY: 6, // Both players assigned, ready to call
  IN_PROGRESS: 7, // Alternative in-progress state
} as const;

export type StartGGSetState = (typeof STARTGG_SET_STATE)[keyof typeof STARTGG_SET_STATE];

// Discord custom ID prefixes
export const INTERACTION_PREFIX = {
  CHECK_IN: 'checkin',
  REPORT: 'report',
  CONFIRM: 'confirm',
  DISPUTE: 'dispute',
  REGISTER: 'register',
  SCORE: 'score',
} as const;

// Discord API limits and styling
export const DISCORD_LIMITS = {
  THREAD_NAME_MAX_LENGTH: 100,
} as const;

export const DISCORD_COLORS = {
  BLURPLE: 0x5865f2,
  SUCCESS: 0x57f287,
  WARNING: 0xfee75c,
  ERROR: 0xed4245,
} as const;

// Time conversion helpers
export const TIME = {
  MINUTES_TO_MS: 60 * 1000,
  SECONDS_TO_MS: 1000,
} as const;
