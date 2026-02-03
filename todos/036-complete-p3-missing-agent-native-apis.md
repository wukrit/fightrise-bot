---
status: complete
priority: p3
issue_id: "036"
tags: [code-review, agent-native, shared, pr-64]
dependencies: []
---

# Missing Agent-Native APIs for Encryption Status

## Problem Statement

There's no programmatic way for agents to check encryption status, verify key validity, or get migration progress. All operations require running scripts or reading logs.

**Why it matters**: Agent-native architecture means agents should be able to observe and interact with system state.

## Findings

**Identified by**: agent-native-reviewer

**Location**: General architecture

**Missing APIs**:
- Check if token is encrypted: `isEncrypted()` exists but no bulk check
- Verify key works: No `verifyKey()` function
- Migration progress: No API, only console output
- Key rotation status: No way to check if old-key tokens exist

## Proposed Solutions

### Option A: Add Status API

Create a status module for encryption state queries.

**Pros**: Full agent observability
**Cons**: More code, may not be needed
**Effort**: Medium (1-2 hours)
**Risk**: Low

```typescript
// packages/shared/src/encryption-status.ts
export async function getEncryptionStatus(prisma: PrismaClient): Promise<{
  totalUsers: number;
  encryptedTokens: number;
  plaintextTokens: number;
  keyValid: boolean;
}>;
```

### Option B: Accept Current State

Keep current state - scripts provide the functionality needed.

**Pros**: No change
**Cons**: Not agent-native
**Effort**: None
**Risk**: Low

## Recommended Action

Option B - Accept current state. Add APIs if agent use cases emerge.

## Technical Details

**Affected files**:
- `packages/shared/src/encryption-status.ts` (new)

## Acceptance Criteria

- [ ] Add status APIs
- [ ] Or document as future improvement

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-02-03 | Identified during PR #64 review | Consider agent-native from start |

## Resources

- PR: https://github.com/wukrit/fightrise-bot/pull/64
