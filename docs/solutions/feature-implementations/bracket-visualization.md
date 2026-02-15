---
title: Add bracket visualization to web portal
date: 2026-02-15
problem_type: Feature implementation
component: apps/web
status: completed
issues_fixed: [30]
prs_merged: [83]
---

# Bracket Visualization Feature

## Problem

Users needed a way to view tournament brackets directly within the FightRise web portal rather than being redirected to Start.gg. This was particularly important for:
- Players wanting to see their position in the bracket
- Tracking ongoing matches in real-time
- Following tournament progress without leaving the FightRise platform

Multi-game tournaments (e.g., Street Fighter 6, Tekken 8, Guilty Gear Strive) required a way to select between different events within the same tournament.

## Solution

Created a dedicated bracket visualization page at `/tournaments/[id]/bracket` with the following features:

### 1. Start.gg Embed Integration

Used Start.gg's standalone bracket embed iframe rather than building a custom bracket renderer:

```typescript
function getBracketEmbedUrl(tournamentSlug: string, eventSlug: string): string {
  return `https://start.gg/tournament/${tournamentSlug}/event/${eventSlug}/standalone-bracket`;
}

// Usage in iframe
<iframe
  src={embedUrl}
  className="w-full h-full"
  title="Tournament Bracket"
  allow="clipboard-write"
  sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
/>
```

**Why embed over custom bracket:**
- No maintenance - Start.gg handles rendering, updates, edge cases
- Live updates - Embed automatically reflects real-time bracket changes
- Full feature set - Includes match details, streaming info, bracket navigation
- Faster development - Reduced implementation time vs. building from scratch

### 2. Event Selector

Dropdown for selecting between multiple games in a tournament:

```typescript
function EventSelector({
  events,
  selectedEventId,
  onSelect,
}: {
  events: Event[];
  selectedEventId: string;
  onSelect: (eventId: string) => void;
}) {
  // Shows event name + entrant count
  return (
    <select value={selectedEventId} onChange={(e) => onSelect(e.target.value)}>
      {events.map((event) => (
        <option key={event.id} value={event.slug}>
          {event.name} ({event.entrantCount} entrants)
        </option>
      ))}
    </select>
  );
}
```

### 3. View Toggle

Toggle between "Bracket View" (embed) and "List View" (fallback):

```typescript
type ViewMode = 'embed' | 'list';

function ViewToggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  return (
    <div className="flex items-center gap-1 bg-zinc-900/50 border border-zinc-800 rounded-lg p-1">
      <button onClick={() => onChange('embed')} className={mode === 'embed' ? 'active' : ''}>
        Bracket View
      </button>
      <button onClick={() => onChange('list')} className={mode === 'list' ? 'active' : ''}>
        List View
      </button>
    </div>
  );
}
```

### 4. List View (Mobile Fallback)

Simplified bracket showing matches grouped by round:

```typescript
interface BracketMatch {
  id: string;
  round: string;
  player1: string;
  player2: string;
  score: string | null;
  winner: string | null;
  isUserMatch: boolean;
}
```

### 5. User Match Highlighting

Matches where the current user is a participant get special styling:

```typescript
<div className={`${
  match.isUserMatch
    ? 'border-emerald-800/50 bg-emerald-900/10'  // Highlighted
    : 'border-zinc-800/50'
}`}>
  {match.isUserMatch && <span className="text-emerald-400">Your match</span>}
</div>
```

## Files Created/Modified

| File | Change |
|------|--------|
| `apps/web/app/tournaments/[id]/bracket/page.tsx` | New - bracket visualization page |
| `apps/web/app/tournaments/[id]/matches/page.tsx` | Modified - added navigation tabs |

## Key Components

- **`BracketEmbed`** - Iframe wrapper with responsive sizing
- **`BracketListView`** - Simplified match list grouped by round
- **`EventSelector`** - Dropdown for multi-game tournaments
- **`ViewToggle`** - Toggle between embed and list modes
- **`EmptyState`** - Fallback when bracket unavailable

## Design Decisions

1. **Embed-first approach**: Start.gg embed provides full functionality with zero maintenance
2. **List view fallback**: Mobile-friendly alternative when embed isn't suitable
3. **Event selector**: Essential for multi-game tournaments common in fighting game scenes
4. **User highlighting**: Helps players quickly find their matches

## Acceptance Criteria

- [x] Brackets viewable in web portal
- [x] User's matches highlighted (in list view)
- [x] Updates reflect via Start.gg embed
- [x] Works on mobile (list view fallback)

## Related Documentation

- [Start.gg API Setup Guide](../../STARTGG_SETUP.md)
- [Start.gg Polling Service](../integration-issues/startgg-polling-service-implementation.md)
- [Score Reporting with Discord Threads](../discord-patterns/automatic-match-thread-creation.md)
