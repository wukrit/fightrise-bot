---
status: complete
priority: p2
issue_id: "090"
tags: [code-review, startgg-client, architecture]
dependencies: []
---

# Queries Not Extracted to Separate Files

## Problem Statement

The Start.gg GraphQL queries and mutations are embedded inline in the client rather than in separate query files. This violates the architecture in CLAUDE.md and makes maintenance harder.

## Findings

### Evidence

**Location**: `packages/startgg-client/src/index.ts:118-301`

GraphQL queries are hardcoded inline instead of in separate files under `queries/` and `mutations/` directories.

### Risk Assessment

- **Severity**: 🟡 IMPORTANT
- **Impact**: Difficult maintenance, no query sharing
- **Likelihood**: High

## Proposed Solutions

### Solution A: Extract to Query Files (Recommended)
```
src/
  queries/
    getTournament.ts
    getEventSets.ts
    getEventEntrants.ts
  mutations/
    reportSet.ts
```

**Pros**: Better maintainability, query sharing
**Cons**: Refactoring needed
**Effort**: Medium
**Risk**: Low

## Recommended Action

**Solution A** - Extract queries/mutations to separate files in queries/ and mutations/ directories.

## Technical Details

**Affected Files**:
- `packages/startgg-client/src/index.ts`

**Related**: CLAUDE.md architecture section

## Acceptance Criteria

- [x] Queries extracted to separate files
- [x] Mutations extracted to separate files

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-19 | Created | Code review finding |
| 2026-02-19 | Completed | Extracted queries to queries/ and mutations/ directories |
