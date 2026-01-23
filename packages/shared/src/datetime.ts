// Date/time utilities for tournament scheduling and display

/**
 * Format a Unix timestamp (seconds) for display
 * @param timestamp Unix timestamp in seconds
 * @param options Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export function formatTournamentDate(
  timestamp: number,
  options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }
): string {
  // Start.gg uses Unix timestamps in seconds
  const date = new Date(timestamp * 1000);
  return date.toLocaleString(undefined, options);
}

/**
 * Format a Unix timestamp for a specific timezone
 * @param timestamp Unix timestamp in seconds
 * @param timeZone IANA timezone identifier (e.g., 'America/New_York')
 * @param options Additional formatting options
 * @returns Formatted date string in the specified timezone
 */
export function formatTournamentDateTz(
  timestamp: number,
  timeZone: string,
  options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }
): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleString(undefined, { ...options, timeZone });
}

/**
 * Format a duration in milliseconds to human-readable string
 * @param ms Duration in milliseconds
 * @returns Human-readable duration string
 */
export function formatDuration(ms: number): string {
  if (ms < 0) {
    return 'invalid duration';
  }

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remainingHours = hours % 24;
    if (remainingHours > 0) {
      return `${days} day${days !== 1 ? 's' : ''} ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`;
    }
    return `${days} day${days !== 1 ? 's' : ''}`;
  }

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    if (remainingMinutes > 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
    }
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }

  if (minutes > 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }

  return `${seconds} second${seconds !== 1 ? 's' : ''}`;
}

/**
 * Check if the current time is within a time window
 * @param windowStartMs Window start time in milliseconds (Unix epoch)
 * @param windowMinutes Window duration in minutes
 * @param nowMs Current time in milliseconds (defaults to Date.now())
 * @returns true if within window, false otherwise
 */
export function isWithinWindow(
  windowStartMs: number,
  windowMinutes: number,
  nowMs: number = Date.now()
): boolean {
  const windowEndMs = windowStartMs + windowMinutes * 60 * 1000;
  return nowMs >= windowStartMs && nowMs <= windowEndMs;
}

/**
 * Window status for getWindowRemaining
 */
export type WindowStatus =
  | { status: 'not_started'; startsInMs: number }
  | { status: 'active'; remainingMs: number }
  | { status: 'expired' };

/**
 * Get remaining time in a window with explicit status
 * @param windowStartMs Window start time in milliseconds
 * @param windowMinutes Window duration in minutes
 * @param nowMs Current time in milliseconds
 * @returns WindowStatus object with explicit state
 */
export function getWindowRemaining(
  windowStartMs: number,
  windowMinutes: number,
  nowMs: number = Date.now()
): WindowStatus {
  if (nowMs < windowStartMs) {
    return { status: 'not_started', startsInMs: windowStartMs - nowMs };
  }

  const windowEndMs = windowStartMs + windowMinutes * 60 * 1000;
  const remaining = windowEndMs - nowMs;

  if (remaining <= 0) {
    return { status: 'expired' };
  }

  return { status: 'active', remainingMs: remaining };
}

/**
 * Get a relative time string (e.g., "in 5 minutes", "2 hours ago")
 * @param targetMs Target time in milliseconds
 * @param nowMs Current time in milliseconds
 * @returns Relative time string
 */
export function getRelativeTime(
  targetMs: number,
  nowMs: number = Date.now()
): string {
  const diffMs = targetMs - nowMs;
  const absDiffMs = Math.abs(diffMs);
  const isFuture = diffMs > 0;

  const seconds = Math.floor(absDiffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  let unit: string;
  let value: number;

  if (days > 0) {
    unit = 'day';
    value = days;
  } else if (hours > 0) {
    unit = 'hour';
    value = hours;
  } else if (minutes > 0) {
    unit = 'minute';
    value = minutes;
  } else {
    unit = 'second';
    value = seconds;
  }

  const plural = value !== 1 ? 's' : '';

  if (isFuture) {
    return `in ${value} ${unit}${plural}`;
  } else {
    return `${value} ${unit}${plural} ago`;
  }
}

/**
 * Convert a Date or timestamp to Unix seconds (for Start.gg API)
 * @param date Date object or millisecond timestamp
 * @returns Unix timestamp in seconds
 */
export function toUnixSeconds(date: Date | number): number {
  const ms = date instanceof Date ? date.getTime() : date;
  return Math.floor(ms / 1000);
}

/**
 * Convert Unix seconds to milliseconds
 * @param unixSeconds Unix timestamp in seconds
 * @returns Timestamp in milliseconds
 */
export function fromUnixSeconds(unixSeconds: number): number {
  return unixSeconds * 1000;
}
