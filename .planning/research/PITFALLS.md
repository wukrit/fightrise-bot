# Domain Pitfalls

**Domain:** Admin Web Portal for Tournament Management (Next.js + Discord Bot)
**Researched:** 2026-02-25

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: Authorization Gap Between Discord and Web Admin

**What goes wrong:** Admins who have permissions in Discord cannot perform the same actions in the web portal, or vice versa. The authorization models are not aligned.

**Why it happens:** The Discord bot checks Discord guild permissions (e.g., manage channels, kick members) while the web API checks database `TournamentAdmin` roles. A user might be a Discord admin but not in the `TournamentAdmin` table, or have database admin rights but no Discord permissions.

**Consequences:**
- Admins cannot manage tournaments they own in one interface
- Security inconsistency: users can block actions in one place but not the other
- User confusion when permissions differ between channels

**Prevention:**
1. **Unified permission model**: Create a single source of truth for tournament admin permissions
2. **Sync Discord roles to database**: When a tournament is linked, import Discord guild roles as `TournamentAdmin` entries
3. **Add Discord permission check in API**: For operations that require Discord permissions (like thread creation), verify both database and Discord roles

**Detection:**
- Test: Create a user with Discord admin role but no database admin record - they should be blocked in web
- Warning sign: Users reporting "I can do X in Discord but not in web"

**Phase to address:** Authorization (Phase 1-2)

---

### Pitfall 2: Missing Audit Trail for Web Admin Actions

**What goes wrong:** Admin actions performed through the web portal are not logged, making it impossible to trace who made changes or investigate issues.

**Why it happens:** The Discord bot has `auditService.ts` that logs all admin actions, but the existing admin API endpoints don't call it. Web actions operate independently from the bot's audit system.

**Consequences:**
- No accountability for admin actions in web portal
- Cannot debug issues by tracing admin operations
- Compliance issues for tournament运行
- Inconsistent history between Discord and web admin actions

**Prevention:**
1. **Create unified audit logging function** that both Discord bot and web API call
2. **Wrap all admin mutations** with automatic audit logging
3. **Include admin API actions in existing audit queries**

**Detection:**
- Code review: Check every admin API endpoint for audit service calls
- Warning sign: `auditService.log()` not imported in admin route files

**Phase to address:** Core API Implementation (Phase 2)

---

### Pitfall 3: State Desync Between Discord and Web UI

**What goes wrong:** The web portal displays stale or incorrect tournament state because it doesn't reflect changes made through the Discord bot in real-time.

**Why it happens:**
- No WebSocket or real-time updates between Discord bot and web portal
- Cached data in web UI doesn't refresh after Discord-side changes
- Database reads might hit replica lag in production

**Consequences:**
- Admins make decisions based on outdated information
- Conflict: Admin approves registration in web while bot processes check-in
- User sees inconsistent tournament state across interfaces

**Prevention:**
1. **Always fetch fresh data for admin operations** - no caching for admin views
2. **Add revalidation to Next.js pages** after mutations
3. **Consider polling or SSE** for real-time updates (defer WebSocket complexity)
4. **Optimistic UI with rollback** - show expected state but revert on failure

**Detection:**
- Manual test: Open tournament page in web, make change in Discord, refresh - data should match
- Warning sign: `cache: 'no-store'` not used in admin data fetches

**Phase to address:** UI Implementation (Phase 3)

---

### Pitfall 4: Insufficient Permission Checks at API Layer

**What goes wrong:** The web UI hides admin buttons for unauthorized users, but the underlying API endpoints accept requests from any authenticated user who guesses the endpoint URL.

**Why it happens:** UI-only authorization is security theater. API endpoints might skip database permission checks, assuming the UI prevents access.

**Consequences:**
- Security vulnerability: Any authenticated user can perform admin operations by calling API directly
- Bypasses role-based access control

**Prevention:**
1. **Never trust client-side authorization** - always verify in API
2. **Copy the exact permission checks** from existing admin endpoints (like `/api/tournaments/[id]/admin/registrations`)
3. **Add integration tests** that call API endpoints with non-admin sessions

**Detection:**
- Security audit: Call admin API endpoints with non-admin OAuth token
- Warning sign: Admin routes without `tournamentAdmin` database query

**Phase to address:** Core API Implementation (Phase 2)

---

## Moderate Pitfalls

### Pitfall 5: No Pagination on Admin List Endpoints

**What goes wrong:** Admin pages attempt to load all registrations, matches, or players at once, causing slow page loads or timeouts with large tournaments.

**Why it happens:** Existing admin API returns `findMany()` without pagination (noted in CONCERNS.md). Frontend iterates over entire result set.

**Consequences:**
- Page hangs or crashes with 500+ entries
- Poor UX on large tournaments
- Database performance degradation

**Prevention:**
1. **Add cursor-based pagination** to all list endpoints
2. **Implement infinite scroll or pagination UI** in admin pages
3. **Default limit of 50 items** per page

**Phase to address:** Core API Implementation (Phase 2)

---

### Pitfall 6: Race Conditions in Check-in and Score Operations

**What goes wrong:** A player checks in through both Discord and web simultaneously, or an admin confirms a match while a player reports a score, causing inconsistent state.

**Why it happens:** No optimistic locking or atomic operations. Concurrent requests can overwrite each other's changes.

**Consequences:**
- Duplicate check-ins
- Lost score reports
- Match state corruption (e.g., marked complete but has pending scores)

**Prevention:**
1. **Use database transactions** with `where` clauses that verify current state
2. **Implement idempotency keys** for all write operations
3. **Add state validation** before mutations (match must be in correct state)

**Phase to address:** Core API Implementation (Phase 2)

---

### Pitfall 7: Inconsistent Validation Between Discord and Web

**What goes wrong:** An action allowed through the Discord bot is blocked in the web portal, or vice versa, due to different validation logic.

**Why it happens:** Validation rules are implemented separately in bot handlers and API routes without sharing validation code.

**Consequences:**
- User confusion when same operation fails differently
- Bugs: one interface allows invalid state that other rejects
- Maintenance burden: fixes need to be applied in two places

**Prevention:**
1. **Extract validation to shared package** (`@fightrise/shared`)
2. **Use shared Zod schemas** for all tournament operations
3. **Test that both interfaces accept/reject same inputs**

**Phase to address:** API Implementation + Integration (Phase 2-3)

---

### Pitfall 8: Poor Error Messages to End Users

**What goes wrong:** API returns generic 500 errors or raw database errors, leaving admins confused about why their action failed.

**Why it happens:** Error handling catches exceptions but doesn't provide actionable messages. Database constraint violations leak implementation details.

**Consequences:**
- Admins cannot fix issues without developer help
- Security risk: stack traces or internal error details exposed

**Prevention:**
1. **Map database errors to user-friendly messages**
2. **Handle specific error types**: not found, already exists, permission denied, invalid state
3. **Return actionable guidance**: "Cannot register player - tournament registration is closed"

**Phase to address:** Core API Implementation (Phase 2)

---

## Minor Pitfalls

### Pitfall 9: Missing CSRF Protection on Admin Actions

**What goes wrong:** Admin actions via web forms could be vulnerable to cross-site request forgery.

**Why it happens:** Next.js API routes might not validate CSRF tokens for state-changing operations.

**Prevention:**
- Use NextAuth's built-in CSRF protection
- Ensure `dangerouslyAllowMutations` is not used without understanding implications

---

### Pitfall 10: No Rate Limiting on Admin Endpoints

**What goes wrong:** Admin endpoints (especially write operations) lack rate limiting, allowing potential abuse.

**Why it happens:** Some admin endpoints use `RATE_LIMIT_CONFIGS.write` which might be too permissive for admin operations.

**Prevention:**
- Use stricter rate limits for admin endpoints
- Consider per-user rate limits in addition to IP-based

---

### Pitfall 11: Admin UI Not Reflecting Permission Levels

**What goes wrong:** UI shows all admin features to any admin user, even though they have different permission levels (OWNER, ADMIN, MODERATOR).

**Why it happens:** Frontend doesn't differentiate between admin roles when rendering UI.

**Prevention:**
- Pass admin role to frontend
- Conditionally render features based on role level

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Authorization Design | Pitfall 1 (Authorization Gap) | Design unified permission model early |
| Core Admin API | Pitfall 4 (API Authorization) | Add permission checks to every endpoint |
| Admin API Development | Pitfall 2 (Audit Logging) | Build audit logging into API scaffold |
| Admin API Development | Pitfall 5 (Pagination) | Add pagination from the start |
| Admin API Development | Pitfall 6 (Race Conditions) | Use transactions with state validation |
| Web Admin UI | Pitfall 3 (State Sync) | Design with fresh data fetching |
| Web Admin UI | Pitfall 7 (Validation Inconsistency) | Share validation code between interfaces |
| Testing | All pitfalls | Integration tests cover Discord + Web flows |

---

## Sources

- Existing codebase analysis: `/apps/web/app/api/tournaments/[id]/admin/` endpoints
- CONCERNS.md: Pagination, authorization, and sync issues already identified
- PROJECT.md: Admin API and UI are active requirements
