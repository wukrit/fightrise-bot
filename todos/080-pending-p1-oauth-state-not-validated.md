---
status: complete
priority: p1
issue_id: "080"
tags: [code-review, security, bot]
dependencies: []
---

# OAuth State Parameter Not Validated

## Problem Statement

The OAuth state parameter created in `/link-startgg` command contains `{discordId, discordUsername}` but has no CSRF protection or expiration validation when handling the callback. This allows potential CSRF attacks where an attacker could trick a user into linking their Start.gg account to the attacker's Discord account.

## Findings

### Evidence

**Location**: `apps/bot/src/commands/link-startgg.ts:72`

```typescript
const state = Buffer.from(JSON.stringify({ discordId, discordUsername })).toString('base64');
```

The state:
- Contains no nonce or timestamp
- Has no expiration
- Is not validated on callback

**Location**: No callback validation found in the codebase for the OAuth state.

### Risk Assessment

- **Severity**: 🔴 CRITICAL
- **Impact**: Attacker could hijack another user's Start.gg account linkage
- **Likelihood**: Medium - requires user to click malicious link

## Proposed Solutions

### Solution A: Add Nonce + Expiration to State (Recommended)
Add a timestamp and cryptographically secure random nonce to the state parameter:

```typescript
import { randomBytes } from 'crypto';

// When creating state
const state = Buffer.from(JSON.stringify({
  discordId,
  discordUsername,
  nonce: randomBytes(32).toString('hex'),
  expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
})).toString('base64');

// On callback - validate
const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
if (stateData.expiresAt < Date.now()) {
  throw new Error('OAuth state expired');
}
```

**Pros**: Simple, effective, short expiration window
**Cons**: None
**Effort**: Small
**Risk**: Low

### Solution B: Use Session-based State
Store state in Redis session with server-side validation:

**Pros**: More control, can invalidate sessions
**Cons**: Additional infrastructure needed
**Effort**: Medium
**Risk**: Low

## Recommended Action

**Solution A** - Add nonce and timestamp to state parameter with 10-minute expiration.

## Technical Details

**Affected Files**:
- `apps/bot/src/commands/link-startgg.ts`

**Related Security**: OAuth 2.0 CSRF protection

## Acceptance Criteria

- [x] State parameter includes timestamp
- [x] State parameter includes random nonce
- [x] State expiration is validated on callback
- [x] Invalid/expired states are rejected with clear error

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-19 | Created | Code review finding |
| 2026-02-19 | Completed | Added nonce + timestamp to state and validation on callback |

## Resources

- [OAuth 2.0 Security Best Practices](https://datatracker.ietf.org/doc/html/rfc8252)
- [Start.gg OAuth Documentation](https://developer.start.gg/docs/intro)
