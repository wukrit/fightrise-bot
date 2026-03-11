---
status: pending
priority: p3
issue_id: "108"
tags: [code-review, bot, features]
dependencies: []
---

# Stub Commands - Checkin and Report

## Problem Statement

The `/checkin` and `/report` commands have stub implementations that return "pending implementation" messages.

**Why it matters:** These are core features that appear to exist but don't work.

## Findings

**Locations:**
- `apps/bot/src/commands/checkin.ts:9-14`
- `apps/bot/src/commands/report.ts:9-14`

## Proposed Solutions

### Solution 1: Implement or Remove

Either implement the full commands or remove them if handled via buttons.

| Aspect | Assessment |
|--------|------------|
| Pros | Clear feature set |
| Cons | Development time if implementing |
| Effort | Medium |
| Risk | Low |

## Recommended Action

<!-- Filled during triage -->

## Technical Details

**Affected files:**
- `apps/bot/src/commands/checkin.ts`
- `apps/bot/src/commands/report.ts`

## Acceptance Criteria

- [ ] Commands fully implemented OR removed
- [ ] No stub implementations

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-10 | Created from bot review | Found in bot-code-reviewer agent |
