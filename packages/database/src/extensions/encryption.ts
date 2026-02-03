// Prisma Client Extension for transparent field-level encryption
// Encrypts OAuth tokens on write, decrypts on read

import { Prisma } from '@prisma/client';
import {
  encrypt,
  decryptWithRotation,
  isEncrypted,
} from '@fightrise/shared';

/**
 * Helper to check if startggToken field should be decrypted
 * P1 FIX: Handles both `select` and `include` patterns to avoid unnecessary decryption
 */
function shouldDecryptToken(args: {
  select?: { startggToken?: boolean } | null | undefined;
  include?: unknown;
}): boolean {
  // If using select and it's defined
  if (args.select != null) {
    // If startggToken is explicitly false, skip decryption
    if (args.select.startggToken === false) {
      return false;
    }
    // If startggToken is not included in select, skip decryption
    if (!('startggToken' in args.select)) {
      return false;
    }
  }
  // For include patterns or no select/include, always decrypt if field exists
  return true;
}

/**
 * Helper to decrypt user token with key rotation support
 * P1 FIX: Enables zero-downtime key rotation
 */
function decryptUserToken<T extends { startggToken?: string | null }>(
  user: T,
  encryptionKey: string,
  previousKey?: string
): T {
  if (user.startggToken && isEncrypted(user.startggToken)) {
    user.startggToken = decryptWithRotation(
      user.startggToken,
      encryptionKey,
      previousKey
    );
  }
  return user;
}

/**
 * Create a Prisma extension that transparently encrypts/decrypts the startggToken field
 *
 * @param encryptionKey - The current encryption key (base64)
 * @param previousKey - Optional previous key for key rotation support
 */
export function createEncryptionExtension(
  encryptionKey: string,
  previousKey?: string
) {
  return Prisma.defineExtension({
    name: 'field-encryption',
    query: {
      user: {
        async create({ args, query }) {
          if (args.data.startggToken) {
            args.data.startggToken = encrypt(
              args.data.startggToken,
              encryptionKey
            );
          }
          const result = await query(args);
          if (result && shouldDecryptToken(args)) {
            return decryptUserToken(result, encryptionKey, previousKey);
          }
          return result;
        },

        async update({ args, query }) {
          if (args.data.startggToken && typeof args.data.startggToken === 'string') {
            args.data.startggToken = encrypt(
              args.data.startggToken,
              encryptionKey
            );
          }
          const result = await query(args);
          if (result && shouldDecryptToken(args)) {
            return decryptUserToken(result, encryptionKey, previousKey);
          }
          return result;
        },

        async upsert({ args, query }) {
          if (args.create.startggToken) {
            args.create.startggToken = encrypt(
              args.create.startggToken,
              encryptionKey
            );
          }
          if (
            args.update.startggToken &&
            typeof args.update.startggToken === 'string'
          ) {
            args.update.startggToken = encrypt(
              args.update.startggToken,
              encryptionKey
            );
          }
          const result = await query(args);
          if (result && shouldDecryptToken(args)) {
            return decryptUserToken(result, encryptionKey, previousKey);
          }
          return result;
        },

        async findUnique({ args, query }) {
          const result = await query(args);
          if (result && shouldDecryptToken(args)) {
            return decryptUserToken(result, encryptionKey, previousKey);
          }
          return result;
        },

        async findFirst({ args, query }) {
          const result = await query(args);
          if (result && shouldDecryptToken(args)) {
            return decryptUserToken(result, encryptionKey, previousKey);
          }
          return result;
        },

        async findMany({ args, query }) {
          const results = await query(args);
          if (shouldDecryptToken(args)) {
            return results.map((user) =>
              decryptUserToken(user, encryptionKey, previousKey)
            );
          }
          return results;
        },

        async findUniqueOrThrow({ args, query }) {
          const result = await query(args);
          if (shouldDecryptToken(args)) {
            return decryptUserToken(result, encryptionKey, previousKey);
          }
          return result;
        },

        async findFirstOrThrow({ args, query }) {
          const result = await query(args);
          if (shouldDecryptToken(args)) {
            return decryptUserToken(result, encryptionKey, previousKey);
          }
          return result;
        },

        async updateMany({ args, query }) {
          // Note: updateMany doesn't support field-level encryption
          // because we can't identify individual tokens. Log warning.
          if (args.data?.startggToken) {
            console.warn(
              '[Encryption] updateMany with startggToken not supported - use individual updates'
            );
          }
          return query(args);
        },

        async createMany({ args, query }) {
          // Encrypt all tokens in batch create
          if (Array.isArray(args.data)) {
            args.data = args.data.map((item) => ({
              ...item,
              startggToken: item.startggToken
                ? encrypt(item.startggToken, encryptionKey)
                : item.startggToken,
            }));
          } else if (args.data.startggToken) {
            args.data.startggToken = encrypt(
              args.data.startggToken,
              encryptionKey
            );
          }
          return query(args);
        },

        async delete({ args, query }) {
          const result = await query(args);
          // Return decrypted token for audit/logging purposes
          if (result && shouldDecryptToken(args)) {
            return decryptUserToken(result, encryptionKey, previousKey);
          }
          return result;
        },

        async deleteMany({ args, query }) {
          // deleteMany doesn't return records, just count
          return query(args);
        },
      },
    },
  });
}
