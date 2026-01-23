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
} as const;

// Discord custom ID prefixes
export const INTERACTION_PREFIX = {
  CHECK_IN: 'checkin',
  REPORT: 'report',
  CONFIRM: 'confirm',
  DISPUTE: 'dispute',
  REGISTER: 'register',
  SCORE: 'score',
} as const;
