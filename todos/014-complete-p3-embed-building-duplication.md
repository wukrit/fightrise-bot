---
status: pending
priority: p3
issue_id: "54"
tags: [code-review, architecture, dry]
dependencies: []
---

# Embed Building Duplication Between Service and Handler

## Problem Statement

Match embed building logic exists in two places:
1. `buildMatchEmbed()` in matchService.ts for initial thread creation
2. Inline embed building in checkinHandler for check-in updates

While these embeds serve different purposes (initial vs updated state), there's duplication in structure and some fields.

**Why it matters:** Duplicated code can drift over time, leading to inconsistent embed appearances. However, the current duplication is minor and the embeds have different requirements.

## Findings

**Location 1:** `apps/bot/src/services/matchService.ts:194-226`
```typescript
function buildMatchEmbed(match, requireCheckIn, checkInDeadline): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(match.roundText)
    .setDescription(`${p1Mention} vs ${p2Mention}`)
    .addFields({ name: 'Match ID', value: match.identifier, inline: true })
    .setColor(DISCORD_COLORS.BLURPLE);
  // ... status and deadline fields
}
```

**Location 2:** `apps/bot/src/handlers/checkin.ts:71-106`
```typescript
const embed = new EmbedBuilder()
  .setTitle(match.roundText)
  .setDescription(`${p1Mention} vs ${p2Mention}`)
  .addFields({ name: 'Match ID', value: match.identifier, inline: true });
// ... status field with checkmarks
```

The key differences:
- Service version uses match player user data (includes `player.user?.discordId`)
- Handler version uses match status data (includes `p.discordId` directly)
- Handler version adds checkmarks for checked-in players
- Different status messages and deadline handling

## Proposed Solutions

### Solution A: Accept current duplication
- **Description:** Keep the code as-is, document the intentional differences
- **Pros:** Simple, each location is self-contained
- **Cons:** Minor duplication persists
- **Effort:** None
- **Risk:** None

### Solution B: Extract shared helper with options
- **Description:** Create `buildMatchEmbed(match, options)` that handles all cases
- **Pros:** Single source of truth
- **Cons:** More complex function, options object needed
- **Effort:** Medium
- **Risk:** Low

```typescript
interface EmbedOptions {
  showCheckmarks?: boolean;
  showDeadline?: boolean;
  statusOverride?: string;
}

function buildMatchEmbed(match: MatchStatus, options?: EmbedOptions): EmbedBuilder {
  // Unified embed building
}
```

### Solution C: Refactor when pattern repeats
- **Description:** Wait until a third embed use case appears before abstracting
- **Pros:** Follows Rule of Three
- **Cons:** Delays potential improvement
- **Effort:** None now
- **Risk:** None

## Recommended Action

**Solution A** or **Solution C** - The current duplication is minor and the embeds serve different purposes with different data sources. Abstracting now would add complexity without significant benefit. Revisit if a third embed use case emerges.

## Technical Details

**Affected Files:**
- `apps/bot/src/services/matchService.ts` - `buildMatchEmbed()`
- `apps/bot/src/handlers/checkin.ts` - inline embed building

## Acceptance Criteria

- [ ] (If implementing Solution B) Single embed building function exists
- [ ] All embed instances maintain consistent styling
- [ ] Tests cover both embed scenarios

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-01-28 | Created | Identified during code review of PR #54 |
| 2026-01-28 | Resolved | Accepted current duplication per Rule of Three - revisit if third use case emerges |

## Resources

- PR #54: https://github.com/sukritwalia/fightrise-bot/pull/54
- Rule of Three: https://en.wikipedia.org/wiki/Rule_of_three_(computer_programming)
