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
 *   npx tsx scripts/rollback-encrypt-tokens.ts --json     # JSON output for CI/CD
 */

import { PrismaClient, Prisma } from '@prisma/client';
import {
  decryptWithRotation,
  isEncrypted,
  validateEncryptionKey,
} from '@fightrise/shared';

const prisma = new PrismaClient();
const BATCH_SIZE = 100;

// Conditional logging - set after arg parsing
let log: (message: string) => void = console.log;

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
    log('ℹ️  ENCRYPTION_KEY_PREVIOUS detected - will try both keys for decryption');
  }

  const totalCount = await prisma.user.count({
    where: { startggToken: { startsWith: 'encrypted:' } },
  });

  if (totalCount === 0) {
    log('No encrypted tokens found. Nothing to rollback.');
    return { rolledBack: 0 };
  }

  log(`Found ${totalCount} encrypted tokens to rollback`);
  log(`Batch size: ${BATCH_SIZE}`);
  log('');

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
    log(
      `Progress: ${rolledBack}/${totalCount} (${Math.round((rolledBack / totalCount) * 100)}%) - ` +
        `ETA: ${remaining}s`
    );

    // In dry-run mode, break after first batch
    if (dryRun) {
      log(`[DRY-RUN] Would rollback ${users.length} users in this batch`);
      log('[DRY-RUN] Stopping after first batch preview');
      break;
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  log(`\n✅ Rollback complete: ${rolledBack} tokens decrypted`);
  log(`  Duration: ${duration}s`);

  return { rolledBack };
}

const dryRun = process.argv.includes('--dry-run');
const jsonOutput = process.argv.includes('--json');

// P3 FIX: Support JSON output for CI/CD automation
// Override the module-level log function
log = jsonOutput ? () => {} : console.log;

function logError(message: string) {
  if (!jsonOutput) console.error(message);
}

log(
  dryRun ? '🔍 DRY RUN MODE\n' : '⚠️  ROLLING BACK ENCRYPTION - TOKENS WILL BE STORED IN PLAINTEXT\n'
);

rollbackTokens(dryRun)
  .then((result) => {
    // P3 FIX: Output JSON summary for automation
    if (jsonOutput) {
      console.log(
        JSON.stringify({
          success: true,
          rolledBack: result.rolledBack,
          dryRun,
        })
      );
    }
    process.exit(0);
  })
  .catch((error) => {
    // P3 FIX: Output JSON error for automation
    if (jsonOutput) {
      console.log(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        })
      );
      process.exit(1);
    }

    logError('\n❌ Rollback FAILED:');
    logError(error instanceof Error ? error.message : String(error));
    logError('The batch transaction was rolled back.');
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
