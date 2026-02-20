---
status: complete
priority: p1
issue_id: "083"
tags: [code-review, web, security]
dependencies: []
---

# Mock Data Not Connected to Real APIs

## Problem Statement

Multiple pages in the web portal contain hardcoded mock data instead of fetching from actual APIs. This makes features appear functional but they don't actually work with real data.

## Findings

### Evidence

**Location 1**: `apps/web/app/account/page.tsx:33-54`
```typescript
const mockUser: UserProfile = {
  id: '1',
  discordUsername: 'fighter123',
  // ...
};
```

**Location 2**: `apps/web/app/tournaments/new/page.tsx:508-518`
```typescript
// Mock form submission
```

**Location 3**: `apps/web/app/tournaments/[id]/page.tsx:421-434`
```typescript
// Mock tournament data
```

### Risk Assessment

- **Severity**: 🔴 CRITICAL
- **Impact**: Users see broken functionality, trust issues
- **Likelihood**: High - currently deployed in this state

## Resolution

### Solution A: Connect to Real API Routes (Recommended)
Replace mock data with actual API calls:

```typescript
// Instead of mock data
const response = await fetch('/api/account');
const user = await response.json();
```

**Pros**: Real functionality, proper user experience
**Cons**: Requires API endpoints to exist
**Effort**: Medium
**Risk**: Low

### Solution B: Add Loading States and Error Handling
Ensure proper loading and error states while connecting:

**Pros**: Better UX during data fetching
**Cons**: More code
**Effort**: Medium
**Risk**: Low

## Action Taken

**Solution A** - Connected pages to real API routes with proper loading states.

## Technical Details

**Affected Files**:
- `apps/web/app/account/page.tsx`
- `apps/web/app/tournaments/new/page.tsx`
- `apps/web/app/tournaments/[id]/page.tsx`

**New API Endpoints Created**:
- `apps/web/app/api/tournaments/validate/route.ts` - Validates Start.gg tournament slugs
- `apps/web/app/api/discord/guilds/route.ts` - Returns Discord guilds/channels
- `apps/web/app/api/user/profile/route.ts` - Returns user profile
- `apps/web/app/api/user/tournaments/route.ts` - Returns user tournament history
- `apps/web/app/api/user/matches/route.ts` - Returns user match history

**API Endpoints Updated**:
- `apps/web/app/api/tournaments/[id]/route.ts` - Added PUT method for updating settings
- `apps/web/app/api/tournaments/route.ts` - Added POST method for creating tournaments

## Acceptance Criteria

- [x] Account page fetches real user data
- [x] Tournament pages fetch real data
- [x] Form submissions call real API endpoints
- [x] Loading states displayed during fetch

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-19 | Created | Code review finding |
| 2026-02-19 | Resolved | Connected all pages to real APIs |

## Resources

- [Next.js Server Components](https://nextjs.org/docs/app/building-your-application/data-fetching)
