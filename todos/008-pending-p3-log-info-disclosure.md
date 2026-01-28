---
status: pending
priority: p3
issue_id: "008"
tags: [code-review, security]
dependencies: []
---

# Log Information Disclosure

## Problem Statement

Log messages include tournament IDs which could be considered sensitive in some contexts. While not a major security issue, it's worth reviewing what information is logged.

**Why it matters:** Logs may be stored in third-party services and could reveal internal IDs.

## Findings

**Location:** Various log statements in `pollingService.ts`

```typescript
console.log(`[Poll] Tournament ${tournamentId} completed`);
console.error(`[Poll] CRITICAL: Auth error for tournament ${tournamentId}`);
console.log(`[Poll] Match ready: ${set.fullRoundText} - ${player1.name} vs ${player2.name}`);
```

**Evidence from Security Sentinel review:**
- Severity: LOW
- Player names and tournament IDs logged
- Consider structured logging with redaction options

## Proposed Solutions

### Solution 1: Accept Current Logging (Recommended)

The current logging is appropriate for debugging and operational visibility. Internal IDs and player names are not highly sensitive in this context.

| Aspect | Assessment |
|--------|------------|
| Pros | No change needed |
| Cons | None significant |
| Effort | None |
| Risk | Low |

### Solution 2: Structured Logging with Levels

Use a proper logging library with configurable verbosity.

| Aspect | Assessment |
|--------|------------|
| Pros | More control over log output |
| Cons | Adds dependency, more complex |
| Effort | Medium |
| Risk | Low |

## Recommended Action

<!-- Filled during triage - likely accept current state -->

## Acceptance Criteria

- [ ] Review and confirm logging is appropriate
- [ ] No credentials or API keys logged
- [ ] Sensitive data (if any) not exposed

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-28 | Created from code review | Security sentinel flagged as LOW |

## Resources

- PR #52
