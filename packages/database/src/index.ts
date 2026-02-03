import { PrismaClient } from '@prisma/client';
import { createEncryptionExtension } from './extensions/encryption.js';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

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

  // If no encryption key, return base client (for migrations, testing, etc.)
  if (!encryptionKey) {
    if (process.env.NODE_ENV === 'production') {
      console.warn(
        '[Database] WARNING: ENCRYPTION_KEY not set - OAuth tokens will NOT be encrypted'
      );
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
