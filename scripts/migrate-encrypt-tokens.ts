#!/usr/bin/env npx tsx
/**
 * Migration script to encrypt existing plain-text OAuth tokens
 *
 * P1 FIXES APPLIED:
 * - Removed cursor pagination (records leave result set after encryption)
 * - Multiple smaller transactions instead of one large transaction
 * - Fail-fast on any error (no silent continuation)
 * - Progress with ETA
 * - Backup verification prompt before running
 *
 * Usage:
 *   npx tsx scripts/migrate-encrypt-tokens.ts --dry-run         # Preview changes
 *   npx tsx scripts/migrate-encrypt-tokens.ts                   # Run migration (prompts for backup)
 *   npx tsx scripts/migrate-encrypt-tokens.ts --force           # Re-run even if some encrypted
 *   npx tsx scripts/migrate-encrypt-tokens.ts --skip-backup-check  # Skip backup prompt (for CI)
 */

import { PrismaClient, Prisma } from '@prisma/client';
import * as readline from 'readline';
import {
  encrypt,
  isEncrypted,
  validateEncryptionKey,
} from '@fightrise/shared';

const prisma = new PrismaClient();
const BATCH_SIZE = 100;

interface MigrationResult {
  migrated: number;
  skipped: number;
}

async function migrateTokens(dryRun: boolean): Promise<MigrationResult> {
  const encryptionKey = process.env.ENCRYPTION_KEY;

  // P1 FIX: Fail-fast validation
  validateEncryptionKey(encryptionKey);

  // Pre-migration verification: check for collision risk
  const alreadyEncryptedCount = await prisma.user.count({
    where: { startggToken: { startsWith: 'encrypted:' } },
  });

  if (alreadyEncryptedCount > 0 && !process.argv.includes('--force')) {
    console.log(`Found ${alreadyEncryptedCount} already-encrypted tokens.`);
    console.log('This is expected for re-runs. Use --force to continue anyway.');
    return { migrated: 0, skipped: alreadyEncryptedCount };
  }

  // Get total count for progress reporting
  const totalCount = await prisma.user.count({
    where: {
      startggToken: { not: null },
      NOT: { startggToken: { startsWith: 'encrypted:' } },
    },
  });

  if (totalCount === 0) {
    console.log('No unencrypted tokens found. Migration complete.');
    return { migrated: 0, skipped: alreadyEncryptedCount };
  }

  console.log(`Found ${totalCount} unencrypted tokens to migrate`);
  console.log(`Batch size: ${BATCH_SIZE}`);
  console.log(`Estimated batches: ${Math.ceil(totalCount / BATCH_SIZE)}`);
  console.log('');

  let migrated = 0;
  const startTime = Date.now();

  // P1 FIX: No cursor needed - encrypted records leave the WHERE result set
  // Simply fetch unencrypted records repeatedly until none remain
  while (true) {
    const users = await prisma.user.findMany({
      where: {
        startggToken: { not: null },
        NOT: { startggToken: { startsWith: 'encrypted:' } },
      },
      select: { id: true, startggToken: true },
      take: BATCH_SIZE,
      orderBy: { id: 'asc' },
    });

    if (users.length === 0) break;

    if (!dryRun) {
      // P1 FIX: Each batch is a separate transaction (not one huge transaction)
      // This prevents lock accumulation and timeout issues
      const updates = users
        .filter((u) => u.startggToken && !isEncrypted(u.startggToken))
        .map((user) =>
          prisma.user.update({
            where: { id: user.id },
            data: { startggToken: encrypt(user.startggToken!, encryptionKey) },
          })
        );

      await prisma.$transaction(updates, {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        timeout: 30000,
      });
      // P1 FIX: If transaction fails, exception bubbles up and stops migration
      // No silent continuation - we want to know immediately if something fails
    }

    migrated += users.length;

    // Progress with ETA
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = migrated / elapsed;
    const remaining = Math.round((totalCount - migrated) / rate);
    console.log(
      `Progress: ${migrated}/${totalCount} (${Math.round((migrated / totalCount) * 100)}%) - ` +
        `ETA: ${remaining}s`
    );

    // In dry-run mode, we'd loop forever since nothing changes
    // Break after first batch to show what would happen
    if (dryRun) {
      console.log(`[DRY-RUN] Would migrate ${users.length} users in this batch`);
      console.log('[DRY-RUN] Stopping after first batch preview');
      break;
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ Migration complete:`);
  console.log(`  Migrated: ${migrated}`);
  console.log(`  Already encrypted: ${alreadyEncryptedCount}`);
  console.log(`  Duration: ${duration}s`);

  return { migrated, skipped: alreadyEncryptedCount };
}

// P1 FIX: Prompt for backup confirmation before running migration
async function confirmBackup(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log('\n⚠️  IMPORTANT: Database Backup Required');
  console.log('━'.repeat(50));
  console.log('Before encrypting tokens, ensure you have a database backup.');
  console.log('If this migration fails mid-way, you will need the backup to recover.\n');
  console.log('Create a backup with:');
  console.log('  pg_dump "$DATABASE_URL" > backup-before-encryption-$(date +%Y%m%d).sql\n');

  return new Promise((resolve) => {
    rl.question('Have you created a database backup? (yes/no): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

// Parse arguments
const dryRun = process.argv.includes('--dry-run');
const skipBackupCheck = process.argv.includes('--skip-backup-check');
const force = process.argv.includes('--force');

console.log(
  dryRun ? '🔍 DRY RUN MODE - No changes will be made\n' : '🔒 ENCRYPTING TOKENS\n'
);

// P1 FIX: Require backup confirmation unless dry-run or explicitly skipped
async function main() {
  if (!dryRun && !skipBackupCheck) {
    const hasBackup = await confirmBackup();
    if (!hasBackup) {
      console.log('\n❌ Migration aborted. Please create a backup first.');
      console.log('Use --skip-backup-check to bypass this prompt (for CI/CD pipelines).\n');
      process.exit(1);
    }
    console.log('\n✅ Backup confirmed. Proceeding with migration...\n');
  }

  return migrateTokens(dryRun);
}

main()
  .then((result) => {
    if (result.migrated === 0 && result.skipped === 0) {
      process.exit(0);
    }
    console.log('\n📋 Post-migration verification:');
    console.log(
      'Run: SELECT COUNT(*) FROM "User" WHERE "startggToken" NOT LIKE \'encrypted:%\' AND "startggToken" IS NOT NULL;'
    );
    console.log('Expected result: 0');
    process.exit(0);
  })
  .catch((error) => {
    // P1 FIX: Any error stops the migration completely
    console.error('\n❌ Migration FAILED:', error);
    console.error(
      '\nThe migration has been stopped. The batch transaction was rolled back.'
    );
    console.error(
      'Fix the issue and re-run. The migration is idempotent (safe to re-run).'
    );
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
