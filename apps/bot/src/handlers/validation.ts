// CUID format validation utilities for handlers
// CUID format: starts with 'c', followed by 24 lowercase alphanumeric chars

/** Regex pattern for validating CUID format */
export const CUID_REGEX = /^c[a-z0-9]{24}$/;

/**
 * Validates that a string is in valid CUID format.
 * Returns true if valid, false otherwise.
 */
export function isValidCuid(value: string | undefined): boolean {
	if (!value) return false;
	return CUID_REGEX.test(value);
}
