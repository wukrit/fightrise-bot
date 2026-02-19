---
status: complete
priority: p1
issue_id: "code-review"
tags: [code-review, security, web, oauth]
dependencies: []
---

# Insecure Token Storage Fallback

## Problem Statement

When encryption is not configured, tokens are stored with base64 encoding instead of failing fast. Base64 is encoding, not encryption - tokens stored this way can be trivially decoded.

**Why it matters:** OAuth tokens could be exposed in plaintext if encryption is misconfigured in production.

## Findings

**Location:** `apps/web/app/api/auth/callback/startgg/route.ts:128-138`

```typescript
if (isEncryptionConfigured()) {
  encryptedToken = encrypt(tokenData);
} else {
  // Fallback to base64 if encryption not configured (development)
  console.warn('Encryption not configured - using base64 encoding (NOT SAFE FOR PRODUCTION)');
  const encodedAccessToken = Buffer.from(accessToken).toString('base64');
  // ... proceeds anyway!
}
```

## Proposed Solutions

### Solution A: Fail fast if encryption not configured
- **Description:** Throw error if ENCRYPTION_KEY not set instead of using base64
- **Pros:** Prevents accidental plaintext storage
- **Cons:** Breaks dev without env var
- **Effort:** Small
- **Risk:** Low

## Recommended Action

**Solution A** - Fail fast if encryption not configured.

## Technical Details

**Affected Files:**
- `apps/web/app/api/auth/callback/startgg/route.ts`

## Acceptance Criteria

- [x] Throws error if encryption not configured
- [x] No base64 fallback in production path

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-18 | Created | Found during code review |
| 2026-02-18 | Fixed | Replaced base64 fallback with error redirect |

## Resources

- Review: Web Portal Domain
