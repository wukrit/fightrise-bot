// Single source of truth for credential sanitization
export const SENSITIVE_KEY_PATTERN = /TOKEN|SECRET|KEY|PASSWORD|CLIENT_SECRET/i;

/**
 * Sanitize environment variables by replacing sensitive values with redaction markers
 */
export function sanitizeEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const sanitized: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(env)) {
    sanitized[key] = SENSITIVE_KEY_PATTERN.test(key)
      ? '***REDACTED***'
      : (value ?? '');
  }
  return sanitized;
}
