---
status: complete
priority: p2
issue_id: "006"
tags: [code-review, architecture, agent-native]
dependencies: []
---

# Agent-Native Accessibility Gaps

## Problem Statement

The polling service is designed for background execution only. There's no way for agents or automated systems to trigger polls on demand, inspect poll status, or query poll history.

**Why it matters:** In an agent-native architecture, capabilities should be accessible to both humans and agents. Currently, only the scheduled background system can interact with polling.

## Findings

**Agent-Native Review Score: 2/8**

Current limitations:
1. No API endpoint to trigger immediate poll
2. No way to query poll status or last poll time
3. No programmatic access to poll results
4. Poll scheduling only happens via internal calls

**Evidence from Agent-Native Reviewer:**
- Score 2/8 - needs significant work
- Key missing capabilities:
  - `GET /api/tournaments/:id/poll-status`
  - `POST /api/tournaments/:id/poll` (trigger immediate)
  - Events/webhooks for poll completion

## Proposed Solutions

### Solution 1: Export Query Functions (Recommended for now)

Export functions that agents can call to inspect poll state.

```typescript
// In pollingService.ts
export async function getPollStatus(tournamentId: string): Promise<{
  lastPolledAt: Date | null;
  nextPollAt: Date | null;
  state: TournamentState;
}> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { lastPolledAt: true, state: true },
  });

  if (!tournament) return null;

  const interval = calculatePollInterval(tournament.state);
  const nextPollAt = tournament.lastPolledAt && interval
    ? new Date(tournament.lastPolledAt.getTime() + interval)
    : null;

  return {
    lastPolledAt: tournament.lastPolledAt,
    nextPollAt,
    state: tournament.state,
  };
}

export async function triggerImmediatePoll(tournamentId: string): Promise<void> {
  await schedulePoll(tournamentId, 0); // Schedule with no delay
}
```

| Aspect | Assessment |
|--------|------------|
| Pros | Simple, reuses existing code |
| Cons | No HTTP API yet |
| Effort | Small |
| Risk | Low |

### Solution 2: Full API Endpoints

Add REST endpoints in the web app for agent access.

| Aspect | Assessment |
|--------|------------|
| Pros | Full agent accessibility via HTTP |
| Cons | Requires web app changes, auth handling |
| Effort | Large |
| Risk | Medium |

## Recommended Action

<!-- Filled during triage -->

## Technical Details

**Affected files:**
- `apps/bot/src/services/pollingService.ts` (export new functions)
- Future: `apps/web/app/api/tournaments/[id]/poll/route.ts`

## Acceptance Criteria

- [ ] `getPollStatus()` function exported and documented
- [ ] `triggerImmediatePoll()` function exported and documented
- [ ] Functions are accessible to other services/agents
- [ ] Consider future API endpoint needs

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-28 | Created from code review | Agent-native reviewer scored 2/8 |
| 2026-01-28 | Fixed: Added getPollStatus() and triggerImmediatePoll() exports | Agents can now query poll state and trigger immediate polls |

## Resources

- Agent-native architecture principles
- PR #52
