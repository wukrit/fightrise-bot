# Work on GitHub Issue

Work on a GitHub issue following the compound-engineering workflow.

## Usage
```
/issue <issue-number-or-url>
```

## Arguments
- `$ARGUMENTS` - GitHub issue number (e.g., `42`) or full URL (e.g., `https://github.com/owner/repo/issues/42`)

## Workflow

You MUST complete each step fully before proceeding to the next.

### Step 1: Setup & Branch Creation

1. Parse the issue reference from: $ARGUMENTS
2. Fetch issue details:
   ```bash
   gh issue view <number> --json title,body,labels,assignees
   ```
3. Create a short description from the issue title (kebab-case, max 5 words)
4. Create and checkout a new branch:
   ```bash
   git checkout main && git pull origin main
   git checkout -b issue-<number>-<short-description>
   ```
5. Summarize the issue to the user and confirm understanding

**Checkpoint:** Confirm branch created and issue understood before proceeding.

---

### Step 2: Planning with `/workflows:plan`

1. Run `/workflows:plan` to create an implementation plan
2. The plan should include:
   - Problem statement and goals from the issue
   - Technical approach and design decisions
   - Task breakdown with testable items
   - Risk assessment and edge cases
3. Present the plan to the user and **STOP for approval**

**CRITICAL:** Do NOT proceed to implementation until the user approves the plan.

---

### Step 3: Implementation with `/workflows:work`

Only proceed after user approval of the plan.

1. Run `/workflows:work` to execute the plan
2. For each task:
   - Implement the change
   - Commit with a descriptive message referencing the issue
3. Keep commits atomic and focused

**Checkpoint:** All implementation tasks must be complete.

---

### Step 4: Testing

1. Write tests for all new code:
   - Unit tests in `*.test.ts` files alongside source
   - Integration tests for API/command handlers

2. Run the test suite:
   ```bash
   npm run test
   ```

3. Run linting:
   ```bash
   npm run lint
   ```

4. Fix any failures before proceeding

**CRITICAL:** Do NOT proceed if any tests fail. Fix them first.

---

### Step 5: End-to-End Verification

Verify the implementation works in a realistic environment.

#### For Web Features (Next.js):
1. Start the dev server if needed: `npm run dev -- --filter=@fightrise/web`
2. Use Playwright MCP to verify:
   ```
   mcp__playwright__browser_navigate to http://localhost:3000/<route>
   mcp__playwright__browser_snapshot to capture page state
   mcp__playwright__browser_click to test interactions
   mcp__playwright__browser_fill_form to test forms
   ```
3. Verify expected content appears and interactions work

#### For Bot Features (Discord):
1. Verify command/interaction handler structure
2. Test with mock Discord client if available
3. Verify slash command definitions are valid

#### For Database Changes:
1. Verify Prisma schema is valid: `npm run db:generate`
2. Test migration: `npm run db:push` (on dev database)
3. Verify queries work as expected

#### For API/Service Changes:
1. Write or run integration tests
2. Verify error handling

Document what was verified and any issues found.

**Checkpoint:** All verification complete.

---

### Step 6: Code Review with `/workflows:review`

1. Run `/workflows:review` for multi-agent code review
2. Address any issues identified

---

### Step 7: Pull Request

1. Ensure all changes are committed
2. Push the branch:
   ```bash
   git push -u origin <branch-name>
   ```

3. Create the PR:
   ```bash
   gh pr create --title "<Title> #<issue-number>" --body "$(cat <<'EOF'
   ## Summary

   Closes #<issue-number>

   ## Changes

   - <Key change 1>
   - <Key change 2>

   ## Testing

   - Unit tests: <what was tested>
   - Integration tests: <what was tested>
   - E2E verification: <what was verified>

   ## Checklist

   - [x] Plan created and approved
   - [x] Implementation complete
   - [x] All tests passing
   - [x] Linting passing
   - [x] E2E verification complete
   - [x] Code review complete

   ---
   Generated with Claude Code
   EOF
   )"
   ```

4. Report the PR URL to the user

---

## Error Handling

- **Issue not found:** Ask user to verify the issue number/URL
- **Branch already exists:** Ask user if they want to continue on existing branch or create new
- **Tests fail:** Report failures, fix them, do not proceed until green
- **Blocked on approval:** Wait for explicit user approval, do not assume

## Final Output

After completing all steps, provide a summary:
- Issue: #<number> - <title>
- Branch: <branch-name>
- PR: <pr-url>
- Status: Ready for review
