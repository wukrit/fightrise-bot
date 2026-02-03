#!/usr/bin/env npx tsx
/**
 * Rollback script to decrypt encrypted OAuth tokens
 * USE WITH CAUTION - Only for disaster recovery scenarios
 *
 * P1 FIX: Uses same batching pattern as forward migration for consistency
 *
 * Usage:
 *   npx tsx scripts/rollback-encrypt-tokens.ts --dry-run  # Preview changes
 *   npx tsx scripts/rollback-encrypt-tokens.ts            # Run rollback
 */

import { PrismaClient, Prisma } from '@prisma/client';
import {
  decryptWithRotation,
  isEncrypted,
  validateEncryptionKey,
} from '@fightrise/shared';

const prisma = new PrismaClient();
const BATCH_SIZE = 100;

interface RollbackResult {
  rolledBack: number;
}

async function rollbackTokens(dryRun: boolean): Promise<RollbackResult> {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  const previousKey = process.env.ENCRYPTION_KEY_PREVIOUS;

  validateEncryptionKey(encryptionKey);

  // P1 FIX: Support key rotation - if tokens were encrypted with a previous key,
  // we need to be able to decrypt them during rollback
  if (previousKey) {
    console.log('ℹ️  ENCRYPTION_KEY_PREVIOUS detected - will try both keys for decryption');
  }

  const totalCount = await prisma.user.count({
    where: { startggToken: { startsWith: 'encrypted:' } },
  });

  if (totalCount === 0) {
    console.log('No encrypted tokens found. Nothing to rollback.');
    return { rolledBack: 0 };
  }

  console.log(`Found ${totalCount} encrypted tokens to rollback`);
  console.log(`Batch size: ${BATCH_SIZE}`);
  console.log('');

  let rolledBack = 0;
  const startTime = Date.now();

  // Same pattern as forward migration - encrypted records leave result set after decryption
  while (true) {
    const users = await prisma.user.findMany({
      where: { startggToken: { startsWith: 'encrypted:' } },
      select: { id: true, startggToken: true },
      take: BATCH_SIZE,
      orderBy: { id: 'asc' },
    });

    if (users.length === 0) break;

    if (!dryRun) {
      // P1 FIX: Use decryptWithRotation to handle tokens encrypted with previous key
      const updates = users
        .filter((u) => u.startggToken && isEncrypted(u.startggToken))
        .map((user) => {
          const plaintext = decryptWithRotation(
            user.startggToken!,
            encryptionKey,
            previousKey
          );
          return prisma.user.update({
            where: { id: user.id },
            data: { startggToken: plaintext },
          });
        });

      await prisma.$transaction(updates, {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        timeout: 30000,
      });
    }

    rolledBack += users.length;

    const elapsed = (Date.now() - startTime) / 1000;
    const rate = rolledBack / elapsed;
    const remaining = Math.round((totalCount - rolledBack) / rate);
    console.log(
      `Progress: ${rolledBack}/${totalCount} (${Math.round((rolledBack / totalCount) * 100)}%) - ` +
        `ETA: ${remaining}s`
    );

    // In dry-run mode, break after first batch
    if (dryRun) {
      console.log(`[DRY-RUN] Would rollback ${users.length} users in this batch`);
      console.log('[DRY-RUN] Stopping after first batch preview');
      break;
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ Rollback complete: ${rolledBack} tokens decrypted`);
  console.log(`  Duration: ${duration}s`);

  return { rolledBack };
}

const dryRun = process.argv.includes('--dry-run');
console.log(
  dryRun ? '🔍 DRY RUN MODE\n' : '⚠️  ROLLING BACK ENCRYPTION - TOKENS WILL BE STORED IN PLAINTEXT\n'
);

rollbackTokens(dryRun)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Rollback FAILED:', error);
    console.error('The batch transaction was rolled back.');
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
