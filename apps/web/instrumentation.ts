/**
 * Next.js Instrumentation - runs once at server startup
 *
 * P1 FIX: Validates ENCRYPTION_KEY at startup to fail-fast instead of
 * having silent runtime failures when OAuth operations occur.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only validate in production - development can run without encryption
  if (process.env.NODE_ENV === 'production') {
    const key = process.env.ENCRYPTION_KEY;

    // Inline validation to avoid importing crypto module (causes webpack issues)
    // This mirrors the validation in @fightrise/shared validateEncryptionKey()
    if (!key) {
      throw new Error(
        '[Web] ENCRYPTION_KEY environment variable is required in production. ' +
          'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
      );
    }

    // Validate key is 32 bytes (256 bits) when decoded from base64
    const keyBytes = Buffer.from(key, 'base64');
    if (keyBytes.length !== 32) {
      throw new Error(
        `[Web] ENCRYPTION_KEY must be exactly 32 bytes (256 bits) for AES-256. ` +
          `Got ${keyBytes.length} bytes. Generate a valid key with: ` +
          `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
      );
    }

    console.log('[Web] Encryption key validated successfully');
  }
}
