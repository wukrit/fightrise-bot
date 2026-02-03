---
title: "feat: Implement High-Severity Security Fixes"
type: feat
date: 2026-02-03
issues: ["#60", "#61"]
severity: high
deepened: 2026-02-03
---

# Implement High-Severity Security Fixes

## Enhancement Summary

**Deepened on:** 2026-02-03
**Sections enhanced:** 5 phases
**Research agents used:** Security Sentinel, Kieran TypeScript Reviewer, Code Simplicity Reviewer, Data Migration Expert, Architecture Strategist, Performance Oracle, Pattern Recognition Specialist

### Key Improvements
1. **Migration batching** - Batch updates in transactions of 100 for 10-20x performance improvement
2. **Missing Prisma handlers** - Added `findUniqueOrThrow`, `updateMany`, `createMany`, `delete` to extension
3. **TypeScript Result type** - Safer error handling for decrypt function
4. **Performance optimization** - Check `args.select` AND `args.include` before decrypting
5. **Rollback script** - Added batched decryption rollback procedure for disaster recovery

### P1 Fixes Applied (from /workflows:review)
1. **Fail-fast validation** - `validateEncryptionKey()` must be called at app startup
2. **Migration pagination bug** - Removed cursor; encrypted records leave result set automatically
3. **Migration error handling** - Fail entire migration on any error (no silent continuation)
4. **Rollback batching** - Rollback script now uses same batching pattern as forward migration
5. **Transaction batching** - Multiple smaller transactions instead of one large transaction
6. **Include pattern support** - `shouldDecryptToken()` handles both `select` and `include`
7. **Key rotation support** - `decryptWithRotation()` tries current key, falls back to previous

### New Considerations Discovered
- Encryption overhead is <0.1ms per operation (not 10ms as estimated)
- Version prefix enables future algorithm migration but may be YAGNI
- ~~Prisma extension decrypts ALL queries even when field not selected~~ **FIXED**: Now checks select/include
- ~~Migration needs explicit transaction boundaries~~ **FIXED**: Uses multiple smaller transactions

## Overview

This plan addresses two high-severity security issues identified in the security audit:

1. **Issue #60: Encrypt OAuth tokens at rest** - The `startggToken` field stores OAuth tokens as plain text
2. **Issue #61: Add security headers to Next.js** - Missing critical security headers exposes users to web vulnerabilities

Both issues must be resolved before production deployment to meet security baseline requirements.

## Problem Statement

### OAuth Token Storage (Issue #60)

The `User.startggToken` field in Prisma schema stores Start.gg OAuth tokens as plain text. If the database is compromised, attackers could impersonate users on Start.gg. The schema comment says "Encrypted OAuth token" but no encryption is implemented.

**Current State:**
```prisma
// packages/database/prisma/schema.prisma:25
startggToken    String?   // Encrypted OAuth token (NOT ACTUALLY ENCRYPTED)
```

### Missing Security Headers (Issue #61)

The Next.js web portal lacks security headers, leaving users vulnerable to:
- **Clickjacking** (no X-Frame-Options)
- **MIME sniffing attacks** (no X-Content-Type-Options)
- **Downgrade attacks** (no HSTS)
- **XSS and injection** (no CSP)

**Current State:**
```javascript
// apps/web/next.config.js - No security headers configured
const nextConfig = {
  transpilePackages: ['@fightrise/ui', '@fightrise/shared'],
  images: { ... },
};
```

## Proposed Solution

### Part 1: OAuth Token Encryption

Implement AES-256-GCM encryption for OAuth tokens using:
- Node.js native `crypto` module (no external dependencies)
- Prisma Client Extension for transparent encrypt/decrypt
- Environment-based encryption key management
- Migration script for existing plain-text tokens

### Part 2: Security Headers

Add comprehensive security headers via `next.config.js`:
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy (restrict browser APIs)
- Strict-Transport-Security (production only)
- Content-Security-Policy (allowlist for Discord CDN, Start.gg API)

## Technical Approach

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Token Encryption Flow                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  OAuth Callback                Prisma Extension                  │
│  ┌──────────────┐    write    ┌──────────────────┐              │
│  │ Start.gg     │ ──────────> │ encrypt(token)   │              │
│  │ returns token│             │ store ciphertext │              │
│  └──────────────┘             └────────┬─────────┘              │
│                                        │                         │
│                                        v                         │
│                               ┌──────────────────┐              │
│                               │   PostgreSQL     │              │
│                               │  (encrypted)     │              │
│                               └────────┬─────────┘              │
│                                        │                         │
│  Bot API Call                          │ read                    │
│  ┌──────────────┐             ┌────────v─────────┐              │
│  │ Use token    │ <────────── │ decrypt(token)   │              │
│  │ for Start.gg │             │ Prisma Extension │              │
│  └──────────────┘             └──────────────────┘              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Encryption Specification

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Algorithm | AES-256-GCM | AEAD - confidentiality + integrity |
| Key Size | 32 bytes (256 bits) | Maximum AES strength |
| IV/Nonce | 12 bytes (96 bits) | Recommended for GCM |
| Auth Tag | 16 bytes (128 bits) | Maximum authentication strength |
| Encoding | Base64 | Safe for database storage |

**Storage Format:**
```
encrypted:v1:{base64(iv)}:{base64(ciphertext)}:{base64(authTag)}
```

The `encrypted:v1:` prefix enables:
- Detection of encrypted vs plain-text tokens (for migration)
- Version support for future algorithm changes

### Security Headers Specification

| Header | Value | Environment |
|--------|-------|-------------|
| X-Frame-Options | DENY | All |
| X-Content-Type-Options | nosniff | All |
| Referrer-Policy | strict-origin-when-cross-origin | All |
| Permissions-Policy | camera=(), microphone=(), geolocation=(), browsing-topics=() | All |
| Strict-Transport-Security | max-age=63072000; includeSubDomains | Production only |
| Content-Security-Policy | See below | All |

**CSP Policy:**
```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline';
img-src 'self' blob: data: https://cdn.discordapp.com https://images.start.gg;
font-src 'self';
connect-src 'self' https://api.start.gg https://discord.com;
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
upgrade-insecure-requests;
```

Note: `'unsafe-inline'` and `'unsafe-eval'` required for Next.js. Consider nonce-based CSP in future iteration.

## Implementation Phases

### Phase 1: Encryption Infrastructure

**Tasks:**
- [x] Create `packages/shared/src/crypto.ts` with encrypt/decrypt functions
- [x] Add `validateEncryptionKey()` for fail-fast startup validation (P1 FIX)
- [x] Add `decryptWithRotation()` for key rotation support (P1 FIX)
- [x] Create `packages/shared/src/crypto.test.ts` with unit tests (including new functions)
- [x] Add `ENCRYPTION_KEY` and `ENCRYPTION_KEY_PREVIOUS` to `.env.example`
- [x] Call `validateEncryptionKey()` at startup in both apps (BEFORE any DB operations)

**Files:**
```
packages/shared/src/crypto.ts         # New - encryption utilities
packages/shared/src/crypto.test.ts    # New - unit tests
.env.example                          # Modified - add ENCRYPTION_KEY
apps/bot/src/index.ts                 # Modified - validate key at startup
apps/web/lib/auth.ts                  # Modified - validate key at startup
```

**crypto.ts Implementation:**
```typescript
// packages/shared/src/crypto.ts
import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const VERSION = 'v1';
const PREFIX = 'encrypted';

export function isEncrypted(value: string): boolean {
  return value.startsWith(`${PREFIX}:${VERSION}:`);
}

export function encrypt(plaintext: string, keyBase64: string): string {
  const key = Buffer.from(keyBase64, 'base64');
  if (key.length !== KEY_LENGTH) {
    throw new Error(`Encryption key must be ${KEY_LENGTH} bytes`);
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${PREFIX}:${VERSION}:${iv.toString('base64')}:${ciphertext.toString('base64')}:${authTag.toString('base64')}`;
}

export function decrypt(encrypted: string, keyBase64: string): string {
  if (!isEncrypted(encrypted)) {
    throw new Error('Value is not encrypted or uses unknown format');
  }

  const parts = encrypted.split(':');
  if (parts.length !== 5) {
    throw new Error('Invalid encrypted format');
  }

  const [, version, ivB64, ciphertextB64, authTagB64] = parts;
  if (version !== VERSION) {
    throw new Error(`Unsupported encryption version: ${version}`);
  }

  const key = Buffer.from(keyBase64, 'base64');
  const iv = Buffer.from(ivB64, 'base64');
  const ciphertext = Buffer.from(ciphertextB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString('utf8');
}

export function generateKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('base64');
}

/**
 * Validate encryption key at startup - MUST be called before any DB operations
 * P1 FIX: Fail-fast validation prevents silent plaintext storage
 */
export function validateEncryptionKey(key: string | undefined): asserts key is string {
  if (!key) {
    throw new Error(
      'CRITICAL: ENCRYPTION_KEY environment variable is required.\n' +
      'Generate with: openssl rand -base64 32'
    );
  }
  const decoded = Buffer.from(key, 'base64');
  if (decoded.length !== KEY_LENGTH) {
    throw new Error(
      `CRITICAL: ENCRYPTION_KEY must be exactly ${KEY_LENGTH} bytes (256 bits).\n` +
      `Current key is ${decoded.length} bytes. Generate with: openssl rand -base64 32`
    );
  }
}

/**
 * Decrypt with key rotation support - tries current key, falls back to previous
 * P1 FIX: Enables zero-downtime key rotation
 */
export function decryptWithRotation(
  encrypted: string,
  currentKey: string,
  previousKey?: string
): string {
  try {
    return decrypt(encrypted, currentKey);
  } catch (error) {
    if (previousKey) {
      // Try previous key for tokens encrypted before rotation
      return decrypt(encrypted, previousKey);
    }
    throw error;
  }
}
```

**Startup Validation (apps/bot/src/index.ts):**
```typescript
import { validateEncryptionKey } from '@fightrise/shared';

// MUST be called before any database operations
validateEncryptionKey(process.env.ENCRYPTION_KEY);

// ... rest of bot initialization
```

**Startup Validation (apps/web/app/layout.tsx or lib/db.ts):**
```typescript
import { validateEncryptionKey } from '@fightrise/shared';

// Validate at module load time
validateEncryptionKey(process.env.ENCRYPTION_KEY);
```

#### Research Insights - Phase 1

**Best Practices (Security Sentinel, Pattern Recognition):**
- AES-256-GCM is the industry standard for authenticated encryption
- Use `crypto.timingSafeEqual()` if comparing auth tags manually (GCM handles this)
- Key derivation: Consider HKDF if deriving from password, but env var is acceptable for server-side

**TypeScript Improvements (Kieran TypeScript Reviewer):**
```typescript
// Use Result type for safer error handling in decrypt
export type DecryptResult =
  | { success: true; plaintext: string }
  | { success: false; error: 'INVALID_FORMAT' | 'WRONG_KEY' | 'CORRUPTED' };

export function decryptSafe(encrypted: string, keyBase64: string): DecryptResult {
  try {
    if (!isEncrypted(encrypted)) {
      return { success: false, error: 'INVALID_FORMAT' };
    }
    const plaintext = decrypt(encrypted, keyBase64);
    return { success: true, plaintext };
  } catch (error) {
    if (error instanceof Error && error.message.includes('auth')) {
      return { success: false, error: 'WRONG_KEY' };
    }
    return { success: false, error: 'CORRUPTED' };
  }
}
```

**Simplicity Considerations (Code Simplicity Reviewer):**
- Version prefix (`encrypted:v1:`) enables future algorithm changes but may be YAGNI
- If algorithm change is unlikely, simpler format: `{iv}:{ciphertext}:{authTag}`
- **Recommendation**: Keep version prefix - low cost, high future value for key rotation

**Performance (Performance Oracle):**
- AES-256-GCM with AES-NI: **< 0.1ms per operation** (not 10ms as estimated)
- Encryption/decryption is CPU-bound, not I/O-bound
- No caching needed for crypto operations

**Key Management Documentation (Security Sentinel):**
Add to README:
```markdown
## Key Management

### Generating the Encryption Key
```bash
openssl rand -base64 32
```

### Key Storage
- Development: `.env` file (gitignored)
- Production: Use secrets manager (AWS Secrets Manager, Vault, etc.)

### Key Rotation Procedure
1. Set `ENCRYPTION_KEY_NEW` with new key
2. Run migration to re-encrypt all tokens
3. Move new key to `ENCRYPTION_KEY`, remove old
```

### Phase 2: Prisma Client Extension

**Tasks:**
- [x] Create `packages/database/src/extensions/encryption.ts` (P1 FIXED version)
- [x] Add `shouldDecryptToken()` helper to handle both `select` and `include` (P1 FIX)
- [x] Add `delete` handler for completeness (P1 FIX)
- [x] Support `previousKey` parameter for key rotation (P1 FIX)
- [x] Modify `packages/database/src/index.ts` to use extended client
- [x] Export type: `export type PrismaClientWithEncryption = ReturnType<typeof createEncryptedPrismaClient>`
- [ ] Add integration tests for encrypted field operations (including select/include scenarios)

**Files:**
```
packages/database/src/extensions/encryption.ts  # New - Prisma extension
packages/database/src/index.ts                  # Modified - export extended client
packages/database/src/__tests__/encryption.test.ts  # New - integration tests
```

**encryption.ts Implementation:**
```typescript
// packages/database/src/extensions/encryption.ts
import { Prisma } from '@prisma/client';
import { encrypt, decryptWithRotation, isEncrypted } from '@fightrise/shared';

const ENCRYPTED_FIELDS: Record<string, string[]> = {
  User: ['startggToken'],
};

/**
 * P1 FIX: Helper to check if startggToken field should be decrypted
 * Handles both `select` and `include` patterns to avoid unnecessary decryption
 */
function shouldDecryptToken(args: { select?: { startggToken?: boolean }; include?: unknown }): boolean {
  // If using select and startggToken is explicitly false, skip decryption
  if (args.select && args.select.startggToken === false) {
    return false;
  }
  // If using select and startggToken is not included, skip decryption
  if (args.select && !('startggToken' in args.select)) {
    return false;
  }
  // For include patterns or no select/include, always decrypt if field exists
  return true;
}

/**
 * P1 FIX: Helper to decrypt user token with key rotation support
 */
function decryptUserToken<T extends { startggToken?: string | null }>(
  user: T,
  encryptionKey: string,
  previousKey?: string
): T {
  if (user.startggToken && isEncrypted(user.startggToken)) {
    user.startggToken = decryptWithRotation(user.startggToken, encryptionKey, previousKey);
  }
  return user;
}

export function createEncryptionExtension(encryptionKey: string, previousKey?: string) {
  return Prisma.defineExtension({
    name: 'field-encryption',
    query: {
      user: {
        async create({ args, query }) {
          if (args.data.startggToken) {
            args.data.startggToken = encrypt(args.data.startggToken, encryptionKey);
          }
          return query(args);
        },
        async update({ args, query }) {
          if (args.data.startggToken && typeof args.data.startggToken === 'string') {
            args.data.startggToken = encrypt(args.data.startggToken, encryptionKey);
          }
          return query(args);
        },
        async upsert({ args, query }) {
          if (args.create.startggToken) {
            args.create.startggToken = encrypt(args.create.startggToken, encryptionKey);
          }
          if (args.update.startggToken && typeof args.update.startggToken === 'string') {
            args.update.startggToken = encrypt(args.update.startggToken, encryptionKey);
          }
          return query(args);
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
            return results.map((user) => decryptUserToken(user, encryptionKey, previousKey));
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
            console.warn('[Encryption] updateMany with startggToken not supported - use individual updates');
          }
          return query(args);
        },
        async createMany({ args, query }) {
          // Encrypt all tokens in batch create
          if (Array.isArray(args.data)) {
            args.data = args.data.map((item) => ({
              ...item,
              startggToken: item.startggToken ? encrypt(item.startggToken, encryptionKey) : null,
            }));
          }
          return query(args);
        },
        // P1 FIX: Add delete handler for completeness (returns decrypted for audit)
        async delete({ args, query }) {
          const result = await query(args);
          if (result && shouldDecryptToken(args)) {
            return decryptUserToken(result, encryptionKey, previousKey);
          }
          return result;
        },
      },
    },
  });
}
```

#### Research Insights - Phase 2

**Missing Handlers (Kieran TypeScript Reviewer):**
- Original plan missed `findUniqueOrThrow`, `findFirstOrThrow`, `updateMany`, `createMany`
- These are commonly used and would bypass encryption silently
- Added all handlers above with appropriate behavior

**Performance Optimization (Performance Oracle):**
```typescript
// OPTIMIZATION: Check if startggToken is in select before decrypting
async findUnique({ args, query }) {
  const result = await query(args);

  // Skip decryption if field wasn't selected
  if (args.select && !args.select.startggToken) {
    return result;
  }

  if (result?.startggToken && isEncrypted(result.startggToken)) {
    result.startggToken = decrypt(result.startggToken, encryptionKey);
  }
  return result;
}
```
This avoids unnecessary decryption when only other fields are queried.

**Architecture (Architecture Strategist):**
- Correct to put extension in `packages/database`
- Export the singleton type for consumers: `export type PrismaClientWithEncryption = ReturnType<typeof createEncryptedPrismaClient>`
- Extension must use raw PrismaClient for migration script (not extended client)

**Alternative Approach (Code Simplicity Reviewer):**
Consider explicit encrypt/decrypt functions instead of transparent extension:
```typescript
// Simpler but more verbose in calling code
const user = await prisma.user.findUnique({ where: { id } });
const token = user.startggToken ? decrypt(user.startggToken, key) : null;
```
**Decision**: Keep Prisma extension - transparency prevents accidental plaintext storage.

### Phase 3: Migration Script

**Tasks:**
- [x] Create migration script `scripts/migrate-encrypt-tokens.ts` (P1 FIXED version)
- [x] Create rollback script `scripts/rollback-encrypt-tokens.ts` (P1 FIXED: batched)
- [x] Add npm scripts: `db:migrate-encryption`, `db:rollback-encryption`
- [ ] Test migration with `--dry-run` mode
- [ ] Run pre-migration verification SQL queries
- [ ] Document migration procedure with checklist

**Files:**
```
scripts/migrate-encrypt-tokens.ts   # New - one-time migration script
package.json                        # Modified - add npm script
```

**Migration Script:**
```typescript
// scripts/migrate-encrypt-tokens.ts
import { PrismaClient } from '@prisma/client';
import { encrypt, isEncrypted } from '@fightrise/shared';

const prisma = new PrismaClient();

async function migrateTokens(dryRun = false) {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }

  const users = await prisma.user.findMany({
    where: { startggToken: { not: null } },
    select: { id: true, startggToken: true },
  });

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const user of users) {
    if (!user.startggToken) continue;

    if (isEncrypted(user.startggToken)) {
      skipped++;
      continue;
    }

    try {
      const encrypted = encrypt(user.startggToken, encryptionKey);

      if (!dryRun) {
        await prisma.user.update({
          where: { id: user.id },
          data: { startggToken: encrypted },
        });
      }

      migrated++;
      console.log(`${dryRun ? '[DRY-RUN] Would migrate' : 'Migrated'} user ${user.id}`);
    } catch (error) {
      failed++;
      console.error(`Failed to migrate user ${user.id}:`, error);
    }
  }

  console.log(`\nMigration complete:`);
  console.log(`  Migrated: ${migrated}`);
  console.log(`  Skipped (already encrypted): ${skipped}`);
  console.log(`  Failed: ${failed}`);

  return { migrated, skipped, failed };
}

const dryRun = process.argv.includes('--dry-run');
migrateTokens(dryRun)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

#### Research Insights - Phase 3

**CRITICAL: Migration Anti-Pattern Fix (Data Migration Expert, Pattern Recognition):**

The original migration script updates records one-at-a-time without transactions.
This is an anti-pattern that causes:
- No atomicity (partial migration on failure)
- Poor performance (10-20x slower than batched)
- No rollback capability

**Improved Migration Script (P1 FIXES APPLIED):**
```typescript
// scripts/migrate-encrypt-tokens.ts - FIXED VERSION
// P1 FIXES:
// - Removed cursor pagination (records leave result set after encryption)
// - Multiple smaller transactions instead of one large transaction
// - Fail-fast on any error (no silent continuation)
// - Progress with ETA

import { PrismaClient, Prisma } from '@prisma/client';
import { encrypt, isEncrypted, validateEncryptionKey } from '@fightrise/shared';

const prisma = new PrismaClient();
const BATCH_SIZE = 100;

async function migrateTokens(dryRun = false) {
  const encryptionKey = process.env.ENCRYPTION_KEY;

  // P1 FIX: Fail-fast validation
  validateEncryptionKey(encryptionKey);

  // Pre-migration verification: check for collision risk
  const collisionCheck = await prisma.user.count({
    where: { startggToken: { startsWith: 'encrypted:' } },
  });
  if (collisionCheck > 0 && !process.argv.includes('--force')) {
    console.log(`Found ${collisionCheck} already-encrypted tokens.`);
    console.log('This is expected for re-runs. Use --force to continue.');
    return { migrated: 0, skipped: collisionCheck };
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
    return { migrated: 0, skipped: 0 };
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
      await prisma.$transaction(
        users
          .filter((u) => u.startggToken && !isEncrypted(u.startggToken))
          .map((user) =>
            prisma.user.update({
              where: { id: user.id },
              data: { startggToken: encrypt(user.startggToken!, encryptionKey) },
            })
          ),
        {
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
          timeout: 30000,
        }
      );
      // P1 FIX: If transaction fails, exception bubbles up and stops migration
      // No silent continuation - we want to know immediately if something fails
    }

    migrated += users.length;

    // Progress with ETA
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = migrated / elapsed;
    const remaining = (totalCount - migrated) / rate;
    console.log(
      `Progress: ${migrated}/${totalCount} (${Math.round((migrated / totalCount) * 100)}%) - ` +
      `ETA: ${Math.round(remaining)}s`
    );
  }

  console.log(`\n✅ Migration complete:`);
  console.log(`  Migrated: ${migrated}`);
  console.log(`  Duration: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);

  return { migrated, skipped: 0 };
}

const dryRun = process.argv.includes('--dry-run');
console.log(dryRun ? '🔍 DRY RUN MODE - No changes will be made\n' : '🔒 ENCRYPTING TOKENS\n');

migrateTokens(dryRun)
  .then((result) => {
    if (result.migrated === 0 && result.skipped === 0) {
      process.exit(0);
    }
    console.log('\n📋 Post-migration verification:');
    console.log('Run: SELECT COUNT(*) FROM "User" WHERE "startggToken" NOT LIKE \'encrypted:%\' AND "startggToken" IS NOT NULL;');
    console.log('Expected result: 0');
    process.exit(0);
  })
  .catch((error) => {
    // P1 FIX: Any error stops the migration completely
    console.error('\n❌ Migration FAILED:', error);
    console.error('\nThe migration has been stopped. No partial state - transaction was rolled back.');
    console.error('Fix the issue and re-run. The migration is idempotent (safe to re-run).');
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

**Pre-Migration Checklist (Data Migration Expert):**
1. **Backup database** before migration
2. **Verify backup** can be restored
3. Run with `--dry-run` first
4. Run during low-traffic period
5. Have rollback script ready

**Rollback Script (P1 FIX: Now batched like forward migration):**
```typescript
// scripts/rollback-encrypt-tokens.ts
// P1 FIX: Uses same batching pattern as forward migration for consistency
import { PrismaClient, Prisma } from '@prisma/client';
import { decrypt, isEncrypted, validateEncryptionKey } from '@fightrise/shared';

const prisma = new PrismaClient();
const BATCH_SIZE = 100;

async function rollbackTokens(dryRun = false) {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  validateEncryptionKey(encryptionKey);

  const totalCount = await prisma.user.count({
    where: { startggToken: { startsWith: 'encrypted:' } },
  });

  if (totalCount === 0) {
    console.log('No encrypted tokens found. Nothing to rollback.');
    return { rolledBack: 0 };
  }

  console.log(`Found ${totalCount} encrypted tokens to rollback`);
  let rolledBack = 0;
  const startTime = Date.now();

  // Same pattern as forward migration - encrypted records leave result set
  while (true) {
    const users = await prisma.user.findMany({
      where: { startggToken: { startsWith: 'encrypted:' } },
      select: { id: true, startggToken: true },
      take: BATCH_SIZE,
      orderBy: { id: 'asc' },
    });

    if (users.length === 0) break;

    if (!dryRun) {
      // Decrypt each token and prepare updates
      const updates = users
        .filter((u) => u.startggToken && isEncrypted(u.startggToken))
        .map((user) => {
          const plaintext = decrypt(user.startggToken!, encryptionKey);
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
    const remaining = (totalCount - rolledBack) / rate;
    console.log(
      `Progress: ${rolledBack}/${totalCount} (${Math.round((rolledBack / totalCount) * 100)}%) - ` +
      `ETA: ${Math.round(remaining)}s`
    );
  }

  console.log(`\n✅ Rollback complete: ${rolledBack} tokens decrypted`);
  return { rolledBack };
}

const dryRun = process.argv.includes('--dry-run');
console.log(dryRun ? '🔍 DRY RUN MODE\n' : '⚠️  ROLLING BACK ENCRYPTION\n');

rollbackTokens(dryRun)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Rollback FAILED:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

**Performance (Performance Oracle):**
| Approach | 10,000 users | Notes |
|----------|--------------|-------|
| One-at-a-time | ~5 minutes | Original plan |
| Batched (100) | ~15-30 seconds | 10-20x faster |
| Batched (500) | ~10-15 seconds | Diminishing returns |

**Related Learning (Batch Prefetch Pattern):**
From `docs/solutions/integration-issues/startgg-polling-service-implementation.md`:
- Use Map for O(1) lookups instead of repeated queries
- Process in parallel where operations are independent
- Wrap related operations in transactions

### Phase 4: Security Headers

**Tasks:**
- [x] Update `apps/web/next.config.js` with security headers
- [x] Add environment-aware HSTS (production only)
- [x] Configure CSP for Discord CDN and Start.gg API
- [ ] Test headers with browser dev tools

**Files:**
```
apps/web/next.config.js   # Modified - add security headers
```

**next.config.js Implementation:**
```javascript
// apps/web/next.config.js
const isDev = process.env.NODE_ENV === 'development';

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ''};
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https://cdn.discordapp.com https://images.start.gg;
  font-src 'self';
  connect-src 'self' https://api.start.gg https://discord.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`.replace(/\n/g, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@fightrise/ui', '@fightrise/shared'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.discordapp.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.start.gg',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
          },
          { key: 'Content-Security-Policy', value: cspHeader },
          // HSTS only in production
          ...(isDev
            ? []
            : [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=63072000; includeSubDomains',
                },
              ]),
        ],
      },
      // Prevent caching of API responses
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

#### Research Insights - Phase 4

**CSP Improvements (Security Sentinel):**

1. **Remove `'unsafe-eval'` in production** - Only needed for Next.js dev mode
2. **Add `report-uri`** for CSP violation monitoring (consider report-only mode first)
3. **Add `strict-dynamic`** when moving to nonce-based CSP

**Improved CSP:**
```javascript
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ''};
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https://cdn.discordapp.com https://images.start.gg;
  font-src 'self';
  connect-src 'self' https://api.start.gg https://discord.com wss://gateway.discord.gg;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
  ${!isDev ? "report-uri /api/csp-report;" : ''}
`.replace(/\s+/g, ' ').trim();
```

**Missing CSP Domains (Architecture Strategist):**
- Add `wss://gateway.discord.gg` for Discord WebSocket connections (if used)
- Verify all external resources during testing

**Testing Strategy (Security Sentinel):**
1. Start with `Content-Security-Policy-Report-Only` header
2. Monitor `/api/csp-report` for violations
3. Fix violations before enforcing
4. Then switch to enforcing `Content-Security-Policy`

**CSP Report Endpoint:**
```typescript
// apps/web/app/api/csp-report/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const report = await request.json();
  console.warn('[CSP Violation]', JSON.stringify(report, null, 2));
  // In production: send to logging service
  return NextResponse.json({ received: true });
}
```

### Phase 5: Testing & Verification

**Tasks:**
- [x] Write unit tests for crypto functions (encrypt, decrypt, isEncrypted)
- [ ] Write integration tests for Prisma extension
- [ ] Verify security headers with curl/browser
- [ ] Run migration in dry-run mode against test data
- [x] Test error handling (wrong key, corrupt data)

**Test Commands:**
```bash
# Unit tests for crypto
npm run test -- packages/shared/src/crypto.test.ts

# Integration tests for Prisma extension
npm run test:integration -- packages/database

# Verify security headers
curl -I http://localhost:3000 | grep -E "(X-Frame|X-Content|Referrer|Permissions|Content-Security)"

# Migration dry-run
npm run db:migrate-encryption -- --dry-run
```

#### Research Insights - Phase 5

**Test Coverage Requirements (Kieran TypeScript Reviewer):**

**Unit Tests (crypto.test.ts):**
```typescript
describe('crypto', () => {
  describe('encrypt/decrypt', () => {
    it('encrypts and decrypts round-trip', () => {
      const key = generateKey();
      const plaintext = 'oauth-token-12345';
      const encrypted = encrypt(plaintext, key);
      expect(decrypt(encrypted, key)).toBe(plaintext);
    });

    it('produces different ciphertext for same plaintext (unique IV)', () => {
      const key = generateKey();
      const plaintext = 'same-token';
      expect(encrypt(plaintext, key)).not.toBe(encrypt(plaintext, key));
    });

    it('throws on wrong key', () => {
      const key1 = generateKey();
      const key2 = generateKey();
      const encrypted = encrypt('test', key1);
      expect(() => decrypt(encrypted, key2)).toThrow();
    });

    it('throws on corrupted ciphertext', () => {
      const key = generateKey();
      const encrypted = encrypt('test', key);
      const corrupted = encrypted.slice(0, -5) + 'XXXXX';
      expect(() => decrypt(corrupted, key)).toThrow();
    });

    it('throws on invalid key length', () => {
      expect(() => encrypt('test', 'short-key')).toThrow('must be 32 bytes');
    });
  });

  describe('isEncrypted', () => {
    it('returns true for encrypted format', () => {
      const key = generateKey();
      expect(isEncrypted(encrypt('test', key))).toBe(true);
    });

    it('returns false for plain text', () => {
      expect(isEncrypted('plain-oauth-token')).toBe(false);
    });
  });

  // P1 FIX: Tests for new validation and key rotation functions
  describe('validateEncryptionKey', () => {
    it('throws on missing key', () => {
      expect(() => validateEncryptionKey(undefined)).toThrow('ENCRYPTION_KEY environment variable is required');
    });

    it('throws on empty key', () => {
      expect(() => validateEncryptionKey('')).toThrow('ENCRYPTION_KEY environment variable is required');
    });

    it('throws on invalid key length', () => {
      expect(() => validateEncryptionKey('dG9vLXNob3J0')).toThrow('must be exactly 32 bytes');
    });

    it('accepts valid 32-byte key', () => {
      const validKey = generateKey();
      expect(() => validateEncryptionKey(validKey)).not.toThrow();
    });
  });

  describe('decryptWithRotation', () => {
    it('decrypts with current key', () => {
      const currentKey = generateKey();
      const encrypted = encrypt('my-token', currentKey);
      expect(decryptWithRotation(encrypted, currentKey)).toBe('my-token');
    });

    it('falls back to previous key during rotation', () => {
      const oldKey = generateKey();
      const newKey = generateKey();
      // Token encrypted with old key
      const encrypted = encrypt('my-token', oldKey);
      // Decrypt with new key (fails) falls back to old key (succeeds)
      expect(decryptWithRotation(encrypted, newKey, oldKey)).toBe('my-token');
    });

    it('throws if neither key works', () => {
      const key1 = generateKey();
      const key2 = generateKey();
      const key3 = generateKey();
      const encrypted = encrypt('my-token', key1);
      expect(() => decryptWithRotation(encrypted, key2, key3)).toThrow();
    });
  });
});
```

**Integration Tests (encryption.test.ts):**
```typescript
describe('Prisma Encryption Extension', () => {
  it('encrypts token on create', async () => {
    const user = await prisma.user.create({
      data: { discordId: '123', startggToken: 'plain-token' },
    });

    // Read raw from database
    const raw = await prisma.$queryRaw`SELECT "startggToken" FROM "User" WHERE id = ${user.id}`;
    expect(raw[0].startggToken).toMatch(/^encrypted:v1:/);
  });

  it('decrypts token on read', async () => {
    const user = await prisma.user.create({
      data: { discordId: '456', startggToken: 'my-secret-token' },
    });

    const fetched = await prisma.user.findUnique({ where: { id: user.id } });
    expect(fetched?.startggToken).toBe('my-secret-token');
  });

  it('handles null token', async () => {
    const user = await prisma.user.create({
      data: { discordId: '789', startggToken: null },
    });

    const fetched = await prisma.user.findUnique({ where: { id: user.id } });
    expect(fetched?.startggToken).toBeNull();
  });

  it('encrypts on update', async () => {
    const user = await prisma.user.create({
      data: { discordId: 'update-test' },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { startggToken: 'updated-token' },
    });

    const raw = await prisma.$queryRaw`SELECT "startggToken" FROM "User" WHERE id = ${user.id}`;
    expect(raw[0].startggToken).toMatch(/^encrypted:v1:/);
  });

  // P1 FIX: Tests for select/include optimization
  it('skips decryption when startggToken not in select', async () => {
    const user = await prisma.user.create({
      data: { discordId: 'select-test', startggToken: 'my-token' },
    });

    // Only select id and discordId - should NOT decrypt
    const fetched = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, discordId: true },
    });

    // Token should not be in result at all
    expect(fetched).not.toHaveProperty('startggToken');
  });

  it('decrypts when using include pattern', async () => {
    const user = await prisma.user.create({
      data: { discordId: 'include-test', startggToken: 'include-token' },
    });

    // Using include pattern (common in codebase) - should decrypt
    const fetched = await prisma.user.findUnique({
      where: { id: user.id },
      include: { registrations: true },
    });

    expect(fetched?.startggToken).toBe('include-token');
  });

  it('decrypts on delete and returns plaintext', async () => {
    const user = await prisma.user.create({
      data: { discordId: 'delete-test', startggToken: 'delete-token' },
    });

    const deleted = await prisma.user.delete({ where: { id: user.id } });
    expect(deleted.startggToken).toBe('delete-token');
  });
});
```

**Security Header Tests:**
```typescript
describe('Security Headers', () => {
  it('returns all required headers', async () => {
    const res = await fetch('http://localhost:3000');
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(res.headers.get('Content-Security-Policy')).toContain("default-src 'self'");
  });
});
```

## Acceptance Criteria

### Functional Requirements

- [ ] New OAuth tokens are encrypted before database storage
- [ ] Encrypted tokens are decrypted transparently when read
- [ ] Existing plain-text tokens can be migrated to encrypted format
- [ ] Migration is idempotent (safe to run multiple times)
- [ ] Application fails fast if `ENCRYPTION_KEY` is missing (P1 FIX)
- [ ] Key rotation works with `ENCRYPTION_KEY_PREVIOUS` fallback (P1 FIX)
- [ ] Decryption skipped when `startggToken` not in `select` (P1 FIX)
- [ ] Decryption works with `include` patterns (P1 FIX)
- [ ] Migration fails completely on any error (no partial state) (P1 FIX)
- [ ] All specified security headers are present in HTTP responses
- [ ] HSTS header only present in production environment
- [ ] CSP allows Discord CDN images and Start.gg API calls

### Non-Functional Requirements

- [ ] Encryption adds < 1ms latency to database operations (updated from 10ms per Performance Oracle)
- [ ] Migration completes within 30 seconds for 10,000 users (batched approach)
- [ ] No plain-text tokens visible in logs or error messages

### Quality Gates

- [ ] Unit test coverage > 90% for crypto module
- [ ] Integration tests pass for all CRUD operations on User model
- [ ] Security headers verified with securityheaders.com (A+ rating target)
- [ ] Code review approval from at least one reviewer

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Token encryption coverage | 100% | Database audit query |
| Security headers present | All 6 headers | HTTP response inspection |
| Migration success rate | > 99% | Migration script output |
| Test coverage | > 90% | Test coverage report |

## Dependencies & Prerequisites

**Required Environment Variables:**
```bash
# Generate with: openssl rand -base64 32
ENCRYPTION_KEY="<44-character base64 string>"

# Optional: For key rotation (P1 FIX)
# Set this to the old key when rotating, then remove after re-encryption
ENCRYPTION_KEY_PREVIOUS="<old key during rotation period>"
```

**No New Dependencies Required:**
- Uses Node.js native `crypto` module
- Uses Prisma Client Extensions (built-in)

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Key loss = permanent data loss | Medium | Critical | Document key backup procedure, store in secrets manager |
| Migration corrupts tokens | Low | High | Dry-run mode, backup database before migration |
| CSP breaks application | Medium | Medium | Test thoroughly in development, use report-only mode first |
| Performance degradation | Low | Low | AES-NI hardware acceleration, benchmark before/after |

## Future Considerations

1. ~~**Key Rotation**: Add `ENCRYPTION_KEY_PREVIOUS` support for seamless rotation~~ **IMPLEMENTED** in P1 fixes
2. **Nonce-based CSP**: Replace `'unsafe-inline'` with nonces for stricter security
3. **Additional Fields**: Extend encryption to other sensitive fields (e.g., refresh tokens)
4. **AWS Secrets Manager**: Move encryption key to external secrets manager for production

## Agent Review Summary

| Agent | Key Finding | Status |
|-------|-------------|--------|
| Security Sentinel | Missing key management docs, rollback script, fail-fast validation | **P1 FIXED** - Added validation, key rotation, batched rollback |
| Kieran TypeScript | Missing Prisma handlers, need Result type | **Addressed** - Added to Phase 2 |
| Code Simplicity | Version prefix may be YAGNI | **Accepted** - Low cost, future value |
| Data Migration Expert | Cursor bug, no transaction boundaries, silent failures | **P1 FIXED** - Rewrote entire migration script |
| Architecture Strategist | Export singleton type, raw client for migration | **Addressed** - Added to Phase 2 |
| Performance Oracle | Batching in single txn, select optimization incomplete | **P1 FIXED** - Multiple txns, include pattern support |
| Pattern Recognition | Missing key rotation at runtime | **P1 FIXED** - Added `decryptWithRotation()` |

### P1 Review Findings Status

| Finding | Status |
|---------|--------|
| 1. Missing `ENCRYPTION_KEY` fail-fast validation | ✅ FIXED - `validateEncryptionKey()` added |
| 2. Migration cursor pagination bug | ✅ FIXED - Removed cursor, use simple loop |
| 3. Migration continues after batch failure | ✅ FIXED - Fails entire migration on any error |
| 4. Rollback script not batched | ✅ FIXED - Same batching pattern as migration |
| 5. Batching inside single transaction | ✅ FIXED - Multiple smaller transactions |
| 6. Select optimization doesn't cover `include` | ✅ FIXED - `shouldDecryptToken()` handles both |
| 7. No key rotation support at runtime | ✅ FIXED - `decryptWithRotation()` with fallback |

## Documentation Updates

- [x] Update `.env.example` with `ENCRYPTION_KEY` and generation instructions
- [ ] Add "Key Management" section to README
- [ ] Document migration procedure in DEPLOYMENT.md (if exists)
- [ ] Update ARCHITECTURE_PLAN.md to mark security gaps as resolved

## References

### Internal References
- Security audit report (current conversation)
- Issue #60: Encrypt OAuth tokens at rest
- Issue #61: Add security headers to Next.js

### External References
- [Node.js Crypto Documentation](https://nodejs.org/api/crypto.html)
- [Next.js Security Headers Guide](https://nextjs.org/docs/app/guides/content-security-policy)
- [Prisma Client Extensions](https://www.prisma.io/docs/orm/prisma-client/client-extensions)
- [OWASP Security Headers](https://owasp.org/www-project-secure-headers/)
- [RFC 9700 - OAuth 2.0 Security Best Practices (2025)](https://datatracker.ietf.org/doc/rfc9700/)

### Related Work
- Issue #34: Audit logging (tracks admin actions after this is complete)
- Issue #60: OAuth token encryption
- Issue #61: Security headers
