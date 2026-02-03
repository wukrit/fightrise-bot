---
status: complete
priority: p1
issue_id: "023"
tags: [code-review, security, scripts, pr-64]
dependencies: []
---

# No Backup Verification Before Migration

## Problem Statement

The migration script (`scripts/migrate-encrypt-tokens.ts`) doesn't verify that a database backup exists before encrypting tokens. If the migration fails mid-way or corrupts data, there's no recovery path without a backup.

**Why it matters**: Encryption is a one-way operation on plaintext data. If something goes wrong, you need the backup to recover.

## Findings

**Identified by**: data-integrity-guardian, security-sentinel

**Location**: `scripts/migrate-encrypt-tokens.ts`

**Evidence**: The script has `--force` flag but doesn't check for or prompt about backups.

## Proposed Solutions

### Option A: Add Backup Prompt (Recommended)

Add an interactive prompt requiring user to confirm backup exists unless `--force` is used.

**Pros**: Prevents accidental data loss, standard migration practice
**Cons**: Requires user interaction (good for safety)
**Effort**: Small (20 min)
**Risk**: Low

```typescript
if (!force) {
  console.log('\n⚠️  IMPORTANT: Ensure you have a database backup before proceeding.');
  console.log('   Run: pg_dump $DATABASE_URL > backup-before-encryption.sql\n');

  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const answer = await new Promise<string>(resolve => {
    rl.question('Have you created a backup? (yes/no): ', resolve);
  });
  rl.close();

  if (answer.toLowerCase() !== 'yes') {
    console.log('Migration aborted. Please create a backup first.');
    process.exit(1);
  }
}
```

### Option B: Auto-Create Backup

Have the script create a backup before migration.

**Pros**: Foolproof, no user error
**Cons**: Requires pg_dump access, storage space, complexity
**Effort**: Medium (1 hour)
**Risk**: Medium (backup could fail)

## Recommended Action

Option A - Add interactive prompt. It's simpler and makes the user responsible for their backup strategy.

## Technical Details

**Affected files**:
- `scripts/migrate-encrypt-tokens.ts`

**New flags**:
- `--skip-backup-check` - For CI/CD pipelines where backup is handled externally

## Acceptance Criteria

- [x] Script prompts for backup confirmation before proceeding
- [x] `--force` or `--skip-backup-check` bypasses prompt
- [x] Clear instructions for creating backup shown
- [x] Dry-run mode doesn't require backup confirmation

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-02-03 | Identified during PR #64 security review | Always verify backup before destructive operations |
| 2026-02-03 | Fixed: Added interactive confirmBackup() prompt with --skip-backup-check flag | Prompts with pg_dump command example for users |

## Resources

- PR: https://github.com/wukrit/fightrise-bot/pull/64
