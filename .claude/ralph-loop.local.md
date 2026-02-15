---
active: true
iteration: 1
max_iterations: 0
completion_promise: null
started_at: "2026-02-15T17:54:16Z"
---

# Ralph Loop: Work Through All Open Issues

You are working through ALL open GitHub issues in this repository. For each issue, follow this autonomous workflow:

## Process for Each Issue

1. **Ensure you're on main with latest changes**:
   ```bash
   git checkout main
   git pull origin main
   ```

   **Also check for unmerged PRs from previous runs**:
   ```bash
   # List any open PRs from this branch pattern
   gh pr list --state open --head "issue-" --json number,title
   ```
   - If there are unmerged PRs, try to merge them first (step 13) before starting new work
   - If merge fails due to required approvals, proceed but note which issues are pending merge

2. **Fetch the issue** using `gh issue view <number>` to get full details

3. **Create a feature branch** from main:
    ```bash
    git checkout -b "issue-<number>-<short-description>"
    ```

4. **Assess complexity and consider using an agent team**:
   - For complex issues involving multiple components, consider spawning parallel agents to speed up implementation:
     ```bash
     # Use Task tool to spawn parallel agents for different components
     # e.g., one agent for bot, one for web, one for tests
     ```
   - For simpler issues, implement directly

5. **Implement the feature/fix**:
   - Write the code
   - Add unit tests
   - Add integration tests if applicable
   - Add smoke tests if the feature involves external integrations (Discord API, Start.gg API, Redis, database)

6. **Run full test suite**:
   ```bash
   npm run docker:infra    # Ensure infra is running
   npm run docker:db:push  # Ensure schema is synced
   npm run docker:test              # Unit tests
   npm run docker:test:integration # Integration tests
   npm run docker:test:e2e         # E2E tests (if applicable)
   npm run docker:lint             # Linting
   ```

7. **Run smoke tests** (if applicable):
   ```bash
   # Requires credentials in .env - skip if not available
   npm run qa:smoke               # All smoke tests
   npm run docker:test:smoke      # Docker-based smoke tests
   npm run docker:test:smoke:bot  # Discord bot smoke tests
   npm run docker:test:smoke:startgg  # Start.gg API smoke tests
   ```
   - If smoke tests fail, investigate and fix or document the issue

8. **Write additional smoke tests** if needed:
   - For new external integrations (APIs, services), add smoke tests in:
     - `apps/bot/src/__tests__/smoke/` for bot-related tests
     - `apps/web/__tests__/smoke/` for web-related tests
     - `packages/*/src/__tests__/smoke/` for package tests
   - Follow existing smoke test patterns

9. **Run code review**:
   - Run `/workflows:review` to get multi-agent code review
   - Fix any issues found
   - **Tip**: The review workflow spawns multiple specialized agents in parallel - leverage this for thorough review

10. **Check for follow-ups**:
   - Review any feedback from the code review
   - For each follow-up task identified, check if an issue already exists:
     ```bash
     gh issue list --search "<follow-up description>" --state open
     ```
   - If no issue exists, create one:
     ```bash
     gh issue create --title "<title>" --body "<description>" --label "follow-up"
     ```

11. **Push branch and create PR**:
    ```bash
    git add -A
    git commit -m "feat/fix: <issue title> (#<number>)"
    git push -u origin "issue-<number>-<short-description>"
    gh pr create --title "<title> (#<number>)" --body "## Summary\n<1-3 bullet points>\n\n## Changes\n<key implementation details>\n\n## Testing\n<what was tested>\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)"
    ```

12. **Wait for CI to pass**:
    ```bash
    # Get the latest workflow run
    gh run list --limit 1
    # Wait for it to complete
    gh run watch <run-id>
    # Check the result
    gh run view <run-id>
    ```
    - If CI fails, fix the issues and push updates (go back to step 10)
    - Only proceed when CI passes

13. **Merge the PR and close the issue**:
    ```bash
    # Get the PR number first
    PR_NUMBER=$(gh pr list --state open --head "issue-<number>" --json number -q '.[0].number')
    # Check if PR can be merged (may fail if requires approval or has conflicts)
    gh pr merge --squash --delete-branch $PR_NUMBER || {
      echo "Merge failed - may need manual review or have conflicts"
      # If CI passed but merge failed due to required reviews, note this and proceed
      # Otherwise, fix conflicts and push updates
      exit 1
    }
    # Immediately close the issue after successful merge
    gh issue close <number> --comment "Fixed in PR #$PR_NUMBER (merged)"
    ```
    - If merge fails due to required approvals, note the issue and proceed to next (PR remains open for manual merge)
    - If merge fails due to conflicts, fix and push updates, then retry merge
    - **Always close the issue immediately after successful merge**

14. **Document learnings**:
    - Run `/workflows:compound` to document the solution and make future work easier

15. **Repeat** for the next open issue

## Using Agent Teams for Speed

For complex issues, spawn parallel agents to work on different aspects:

```bash
# Example: Spawn agents for bot, web, and tests in parallel
Task(description="Implement bot component", prompt="...", subagent_type="general-purpose")
Task(description="Implement web component", prompt="...", subagent_type="general-purpose")
Task(description="Write tests", prompt="...", subagent_type="general-purpose")
```

Use the TeamCreate/Task tools for coordinated multi-agent work on larger issues.

## Important Rules

- **DO create feature branches** - name them `issue-<number>-<short-description>`
- **DO create PRs** - push branch and create PR for review
- **DO merge PRs** - squash merge after CI passes and delete branch
- **DO close issues** - always close the issue after PR is merged
- **DO NOT skip testing** - All tests must pass before pushing (unit, integration, E2E, lint)
- **DO run smoke tests** - Test external integrations when applicable
- **DO write smoke tests** - For new external integrations, add smoke tests
- **DO NOT ask for human approval** - Proceed autonomously
- **DO create issues for follow-ups** - Any feedback from review that needs tracking should become an issue
- **Use /frontend-design skill** for any UI components
- **Handle errors gracefully** - If an issue is blocked, note it and move to the next
- **Consider agent teams** - For complex issues, spawn parallel agents to speed up work

## Issue Queue

Start with the oldest open issues first (lowest numbers):
- #19, #20, #21, #22, #23, #24, #25, #26, #27, #28
- #29, #30, #31, #32, #33, #34, #35, #36, #37, #38
- #39, #40, #41, #57, #58, #59, #60, #61, #62, #63
- #66, #67

## Completion Signal

When all issues are complete or you've processed 10 issues, output:

<promise>RALPH_COMPLETE: Processed X issues, pushed X commits, closed X issues, created X follow-up issues</promise>

Start by fetching issue #19 and begin the workflow
