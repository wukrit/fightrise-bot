---
title: Add tournament creation from web portal
type: feat
status: active
date: 2026-02-15
---

# Add Tournament Creation from Web Portal

## Overview

Allow admins to create/import tournaments from the web portal by linking to Start.gg tournaments.

## Problem Statement

Currently, tournaments can only be created via Discord bot commands. Users want a web-based wizard to link Start.gg tournaments and configure Discord integration.

## Implementation Plan

### Phase 1: API Endpoint for Tournament Import

Create API endpoint to:
1. Validate Start.gg tournament slug exists
2. Fetch tournament data from Start.gg
3. Create tournament record in database

### Phase 2: Tournament Creation Wizard UI

Create multi-step wizard:
1. **Link Tournament**: Enter Start.gg URL/slug, verify access
2. **Discord Setup**: Select server and channels
3. **Settings**: Configure check-in, scoring
4. **Confirm**: Review and activate

### Phase 3: Integration with Dashboard

Add "Create Tournament" button to dashboard that opens the wizard.

## Files to Create/Modify

- `apps/web/app/tournaments/new/page.tsx` - Tournament creation wizard
- `apps/web/app/api/tournaments/route.ts` - POST endpoint to create tournament
- `apps/web/app/dashboard/page.tsx` - Add "Create Tournament" button

## Acceptance Criteria

- [ ] Users can enter Start.gg tournament URL/slug
- [ ] System validates tournament exists on Start.gg
- [ ] Multi-step wizard for configuration
- [ ] Tournament saved to database
- [ ] Redirect to tournament dashboard after creation
