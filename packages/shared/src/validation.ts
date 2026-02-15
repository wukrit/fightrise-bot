// Validation utilities for FightRise

// Valid tournament slug pattern: alphanumeric, hyphens, reasonable length
// - Must start and end with alphanumeric
// - Can contain hyphens in the middle
// - Max 100 characters
export const TOURNAMENT_SLUG_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,98}[a-zA-Z0-9])?$/;
export const MAX_SLUG_LENGTH = 100;

/**
 * Validate a tournament slug format
 */
export function isValidTournamentSlug(slug: string): boolean {
  return (
    slug.length > 0 &&
    slug.length <= MAX_SLUG_LENGTH &&
    TOURNAMENT_SLUG_REGEX.test(slug)
  );
}

/**
 * Validate tournament slug and return detailed error message if invalid
 */
export function validateTournamentSlug(slug: string): { valid: boolean; error?: string } {
  if (slug.length === 0) {
    return { valid: false, error: 'Tournament slug cannot be empty' };
  }

  if (slug.length > MAX_SLUG_LENGTH) {
    return {
      valid: false,
      error: `Tournament slug exceeds maximum length of ${MAX_SLUG_LENGTH} characters`,
    };
  }

  if (!TOURNAMENT_SLUG_REGEX.test(slug)) {
    return {
      valid: false,
      error:
        'Invalid tournament slug format. Slugs must contain only letters, numbers, and hyphens, and cannot start or end with a hyphen.',
    };
  }

  return { valid: true };
}
