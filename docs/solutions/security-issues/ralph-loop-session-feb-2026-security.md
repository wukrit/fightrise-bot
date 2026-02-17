---
title: "Ralph Loop Session - Security & Validation Improvements"
date: "2026-02-15"
problem_type: "security-issues"
component:
  - web
  - bot
  - packages/shared
status: "completed"
issues_fixed: [60, 61, 62, 63, 66, 67]
tags:
  - security
  - validation
  - infrastructure
  - oauth
  - rate-limiting
  - input-validation
  - encryption
  - ralph-loop
---

# Ralph Loop Session - Security & Validation Improvements

Date: 2026-02-15
Status: Completed

## Overview

This document captures the security and validation improvements implemented during Ralph Loop iteration 1, which addressed multiple open GitHub issues related to security hardening across the FightRise platform.

## Issues Resolved

| Issue | Title | Status |
|-------|-------|--------|
| #60 | Encrypt OAuth tokens at rest | Implemented |
| #61 | Add security headers to Next.js | Implemented |
| #62 | Implement rate limiting on API routes | Implemented |
| #63 | Add strict input validation for tournament slug | Implemented |
| #66 | Start.gg OAuth callback route | Already implemented |
| #67 | Registration sync from Start.gg | Already implemented |

---

## Issue #60: OAuth Token Encryption at Rest

### Problem

OAuth tokens (access tokens and refresh tokens) were stored in the database with only base64 encoding, which provides no real security. If the database was compromised, attackers could easily decode tokens and gain access to users' Start.gg accounts.

### Root Cause

The initial implementation used simple base64 encoding as a placeholder with a comment indicating proper encryption should be added for production.

### Solution

Implemented AES-256-GCM encryption for OAuth tokens using a shared encryption module.

#### Key Files

- `packages/shared/src/crypto.ts` - Core encryption utilities
- `apps/web/app/api/auth/callback/startgg/route.ts` - OAuth callback handler
- `apps/web/lib/startgg.ts` - Token retrieval and refresh

#### Implementation

```typescript
// packages/shared/src/crypto.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;  // 96 bits for GCM
const KEY_LENGTH = 32; // 256 bits

/**
 * Get the encryption key from environment
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== KEY_LENGTH) {
    throw new Error(`ENCRYPTION_KEY must be ${KEY_LENGTH * 2} hex characters`);
  }
  return key;
}

/**
 * Encrypt plaintext using AES-256-GCM
 * Returns base64-encoded string containing IV + auth tag + ciphertext
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

/**
 * Decrypt ciphertext that was encrypted with encrypt()
 */
export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();
  const data = Buffer.from(ciphertext, 'base64');
  const iv = data.subarray(0, 12);
  const authTag = data.subarray(12, 28);
  const encrypted = data.subarray(28);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final('utf8');
}

export function isEncryptionConfigured(): boolean {
  return !!process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length === KEY_LENGTH * 2;
}
```

#### Environment Setup

To enable encryption, add to `.env`:
```
ENCRYPTION_KEY="<64-character hex string>"  # Generate: openssl rand -hex 32
```

#### Migration Strategy

The implementation handles both encrypted tokens and legacy base64-encoded tokens:
- New tokens are encrypted with AES-256-GCM
- Legacy tokens are detected and handled transparently
- No user action required for migration

---

## Issue #61: Security Headers in Next.js

### Problem

The Next.js application lacked important security headers that protect against common web vulnerabilities like clickjacking, MIME sniffing, and cross-site scripting.

### Root Cause

The `next.config.js` did not include any security headers configuration.

### Solution

Added comprehensive security headers to the Next.js configuration.

#### Key Files

- `apps/web/next.config.js`

#### Implementation

```javascript
// apps/web/next.config.js
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    },
    {
      // HSTS only for production (not localhost)
      source: '/:path*',
      headers: [
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
      ],
      has: [{ type: 'header', key: 'host', value: '(?<!localhost)(?::\\d+)?$' }],
    },
  ];
}
```

#### Headers Applied

| Header | Value | Purpose |
|--------|-------|---------|
| X-Frame-Options | DENY | Prevents clickjacking |
| X-Content-Type-Options | nosniff | Prevents MIME sniffing |
| Referrer-Policy | strict-origin-when-cross-origin | Controls referrer info |
| Permissions-Policy | camera=(), microphone=(), geolocation=() | Disables unused features |
| Strict-Transport-Security | max-age=31536000 | Enforces HTTPS (production only) |

---

## Issue #62: Rate Limiting on API Routes

### Problem

The web API endpoints had no protection against abuse or DoS attacks. Health checks and authentication routes were particularly vulnerable to rapid repeated requests.

### Root Cause

No rate limiting was implemented on any API routes.

### Solution

Implemented an in-memory Map-based sliding window rate limiter with tiered limits.

#### Key Files

- `apps/web/lib/ratelimit.ts` - Rate limiter implementation
- `apps/web/app/api/health/route.ts` - Health endpoint
- `apps/web/app/api/auth/[...nextauth]/route.ts` - NextAuth routes

#### Implementation

```typescript
// apps/web/lib/ratelimit.ts

// Configurations
export const RATE_LIMIT_CONFIGS = {
  auth: { limit: 5, windowMs: 60000 },    // 5 per minute
  health: { limit: 10, windowMs: 1000 }, // 10 per second
  api: { limit: 100, windowMs: 60000 },  // 100 per minute
} as const;

// Simple in-memory rate limiter
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    const resetTime = now + config.windowMs;
    rateLimitStore.set(key, { count: 1, resetTime });
    return { allowed: true, limit: config.limit, remaining: config.limit - 1, resetTime };
  }

  if (entry.count >= config.limit) {
    return { allowed: false, limit: config.limit, remaining: 0, resetTime: entry.resetTime };
  }

  entry.count++;
  rateLimitStore.set(key, entry);
  return { allowed: true, limit: config.limit, remaining: config.limit - entry.count, resetTime: entry.resetTime };
}

// Headers helper
export function createRateLimitHeaders(result: RateLimitResult): Headers {
  const headers = new Headers();
  headers.set('X-RateLimit-Limit', result.limit.toString());
  headers.set('X-RateLimit-Remaining', result.remaining.toString());
  headers.set('X-RateLimit-Reset', result.resetTime.toString());
  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
    headers.set('Retry-After', retryAfter.toString());
  }
  return headers;
}
```

---

## Issue #63: Tournament Slug Validation

### Problem

The `normalizeSlug` function in the tournament service processed user input without validating the final slug against a strict pattern, potentially allowing malformed or malicious input.

### Root Cause

No validation was performed after slug normalization, allowing invalid slugs to be passed to the Start.gg API.

### Solution

Added validation module with regex pattern and integrated with the tournament service.

#### Key Files

- `packages/shared/src/validation.ts` - Validation utilities
- `packages/shared/src/validation.test.ts` - Unit tests
- `apps/bot/src/services/tournamentService.ts` - Tournament service

#### Implementation

```typescript
// packages/shared/src/validation.ts

// Valid tournament slug pattern
export const TOURNAMENT_SLUG_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,98}[a-zA-Z0-9])?$/;
export const MAX_SLUG_LENGTH = 100;

export function isValidTournamentSlug(slug: string): boolean {
  return (
    slug.length > 0 &&
    slug.length <= MAX_SLUG_LENGTH &&
    TOURNAMENT_SLUG_REGEX.test(slug)
  );
}

export function validateTournamentSlug(slug: string): { valid: boolean; error?: string } {
  if (slug.length === 0) {
    return { valid: false, error: 'Tournament slug cannot be empty' };
  }
  if (slug.length > MAX_SLUG_LENGTH) {
    return { valid: false, error: `Tournament slug exceeds maximum length of ${MAX_SLUG_LENGTH} characters` };
  }
  if (!TOURNAMENT_SLUG_REGEX.test(slug)) {
    return { valid: false, error: 'Invalid tournament slug format. Slugs must contain only letters, numbers, and hyphens, and cannot start or end with a hyphen.' };
  }
  return { valid: true };
}
```

#### Usage in Tournament Service

```typescript
// apps/bot/src/services/tournamentService.ts
normalizeSlug(input: string): string {
  let slug = input.trim();
  // URL extraction and normalization logic...

  // Validate final slug
  const validation = validateTournamentSlug(slug);
  if (!validation.valid) {
    throw new ValidationError(validation.error || 'Invalid tournament slug');
  }
  return slug;
}
```

---

## Prevention Strategies

### General Security Best Practices

1. **Input Validation**
   - Validate at API boundaries using centralized, reusable functions
   - Use strict allowlists over denylists
   - Fail-fast on invalid input

2. **Rate Limiting**
   - Apply tiered limits based on endpoint sensitivity
   - Return standard headers for client debugging
   - Plan for distributed systems (use Redis for multi-instance)

3. **Security Headers**
   - Configure at framework level
   - Enable HSTS in production only
   - Run security audits regularly

4. **Encryption**
   - Encrypt sensitive data at rest
   - Use strong algorithms (AES-256-GCM)
   - Never hardcode keys; use environment variables
   - Provide migration paths for legacy data

### Test Cases for Prevention

See inline test files for comprehensive test cases:
- `packages/shared/src/validation.test.ts`
- `apps/web/app/api/health/route.test.ts`

---

## Related Files

- `packages/shared/src/crypto.ts` - Encryption utilities
- `packages/shared/src/validation.ts` - Validation utilities
- `packages/shared/src/index.ts` - Shared package exports
- `apps/web/lib/ratelimit.ts` - Rate limiter
- `apps/web/next.config.js` - Security headers
- `apps/web/app/api/health/route.ts` - Health endpoint with rate limiting
- `apps/web/app/api/auth/[...nextauth]/route.ts` - NextAuth with rate limiting
- `apps/web/app/api/auth/callback/startgg/route.ts` - OAuth callback with encryption
- `apps/web/lib/startgg.ts` - Token handling
- `apps/bot/src/services/tournamentService.ts` - Tournament service with validation

---

## Related Issues

- #60 - Encrypt OAuth tokens at rest
- #61 - Add security headers to Next.js configuration
- #62 - Implement rate limiting on API routes
- #63 - Add strict input validation for tournament slug
- #66 - Implement Start.gg OAuth callback route (already implemented)
- #67 - Implement registration sync from Start.gg (already implemented)
