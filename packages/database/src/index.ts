import { PrismaClient } from '@prisma/client';
import { createEncryptionExtension } from './extensions/encryption.js';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaInitialized: boolean | undefined;
};

/**
 * Validates encryption key in production
 * Throws if missing/invalid in production, returns false in dev
 */
function validateProductionEncryption(): boolean {
  const encryptionKey = process.env.ENCRYPTION_KEY;

  if (!encryptionKey && process.env.NODE_ENV === 'production') {
    // P1 FIX: Fail-closed instead of fail-open in production
    // Only throw at runtime, not during build (Next.js builds with NODE_ENV=production)
    // Check for build-time indicators
    const isBuildTime =
      process.env.NEXT_PHASE === 'phase-production-build' ||
      process.env.BUILDING === 'true' ||
      process.argv.some((arg) => arg.includes('next') && arg.includes('build'));

    if (!isBuildTime) {
      throw new Error(
        '[Database] ENCRYPTION_KEY is required in production. ' +
          'OAuth tokens cannot be stored without encryption. ' +
          'Generate a key with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
      );
    }
    return false;
  }

  return !!encryptionKey;
}

/**
 * Create a PrismaClient, optionally with field-level encryption for OAuth tokens
 * Encryption is enabled when ENCRYPTION_KEY environment variable is set
 */
function createPrismaClient(): PrismaClient {
  const basePrisma = new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

  const encryptionKey = process.env.ENCRYPTION_KEY;
  const previousKey = process.env.ENCRYPTION_KEY_PREVIOUS;

  // Check if encryption should be enabled
  const shouldEncrypt = validateProductionEncryption();

  if (!shouldEncrypt || !encryptionKey) {
    if (process.env.NODE_ENV === 'development') {
      // Silent in development - encryption is optional
    } else if (process.env.NODE_ENV !== 'production') {
      // Test environment - also optional
    }
    return basePrisma;
  }

  // Extend with encryption - cast back to PrismaClient for type compatibility
  // The extension only modifies User model queries, all other functionality is preserved
  return basePrisma.$extends(
    createEncryptionExtension(encryptionKey, previousKey)
  ) as unknown as PrismaClient;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Re-export everything from Prisma client
export * from '@prisma/client';

// Export the encryption extension for advanced usage (scripts, testing)
export { createEncryptionExtension } from './extensions/encryption.js';

export default prisma;
