/**
 * Utility to get DATABASE_URL for tests
 */

export function getTestDatabaseUrl(): string {
  return process.env.DATABASE_URL || '';
}
