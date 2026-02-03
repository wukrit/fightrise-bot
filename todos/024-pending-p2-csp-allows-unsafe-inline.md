---
status: pending
priority: p2
issue_id: "024"
tags: [code-review, security, web, pr-64]
dependencies: []
---

# CSP Allows 'unsafe-inline' for Scripts

## Problem Statement

The Content Security Policy in `apps/web/next.config.js` allows `'unsafe-inline'` for scripts and styles. This weakens XSS protection as inline scripts can still execute.

**Why it matters**: CSP is defense-in-depth against XSS. `'unsafe-inline'` reduces its effectiveness significantly.

## Findings

**Identified by**: security-sentinel

**Location**: `apps/web/next.config.js:7-8`

**Evidence**:
```javascript
"default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
```

## Proposed Solutions

### Option A: Use Nonces for Inline Scripts (Recommended)

Configure Next.js to use nonce-based CSP which allows specific inline scripts while blocking others.

**Pros**: Best security, blocks arbitrary inline scripts
**Cons**: More complex setup, requires middleware
**Effort**: Medium (2 hours)
**Risk**: Low

### Option B: Remove Inline Scripts

Refactor to eliminate inline scripts entirely and remove `'unsafe-inline'`.

**Pros**: Simplest CSP, best security
**Cons**: May require significant refactoring
**Effort**: Large (varies by codebase)
**Risk**: Medium

### Option C: Accept Current State (Temporary)

Document the limitation and address in future security hardening phase.

**Pros**: No immediate work
**Cons**: Weaker XSS protection
**Effort**: Minimal
**Risk**: Low (acceptable for early stage)

## Recommended Action

Option C for now - Document as future improvement. The current CSP is still better than no CSP.

## Technical Details

**Affected files**:
- `apps/web/next.config.js`
- `apps/web/middleware.ts` (for nonce approach)

## Acceptance Criteria

- [ ] Document CSP limitation in security docs
- [ ] Create follow-up issue for CSP hardening
- [ ] Or implement nonces if time permits

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-02-03 | Identified during PR #64 security review | CSP nonces are best practice for Next.js |

## Resources

- PR: https://github.com/wukrit/fightrise-bot/pull/64
- Next.js CSP: https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy
