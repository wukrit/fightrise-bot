# Ralph Loop: Work Through All Open Issues

You are working through ALL open GitHub issues in this repository. For each issue, follow this autonomous workflow:

## Process for Each Issue

1. **Fetch the issue** using `gh issue view <number>` to get full details

2. **Work directly on main branch** - no need to create feature branches

3. **Implement the feature/fix**:
   - Write the code
   - Add unit tests
   - Add integration tests if applicable

4. **Run full test suite**:
   ```bash
   npm run docker:infra    # Ensure infra is running
   npm run docker:db:push  # Ensure schema is synced
   npm run docker:test              # Unit tests
   npm run docker:test:integration # Integration tests
   npm run docker:test:e2e         # E2E tests (if applicable)
   npm run docker:lint             # Linting
   ```

5. **Run code review**:
   - Run `/workflows:review` to get multi-agent code review
   - Fix any issues found

6. **Check for follow-ups**:
   - Review any feedback from the code review
   - For each follow-up task identified, check if an issue already exists:
     ```bash
     gh issue list --search "<follow-up description>" --state open
     ```
   - If no issue exists, create one:
     ```bash
     gh issue create --title "<title>" --body "<description>" --label "follow-up"
     ```

7. **Push changes directly** to main:
   ```bash
   git add -A
   git commit -m "feat/fix: <issue title> (#<number>)"
   git push
   ```

8. **Wait for CI to pass**:
   ```bash
   # Get the latest workflow run
   gh run list --limit 1
   # Wait for it to complete
   gh run watch <run-id>
   # Check the result
   gh run view <run-id>
   ```
   - If CI fails, fix the issues and retry step 7
   - Only proceed when CI passes

9. **Close the resolved issue**:
   ```bash
   gh issue close <number> --comment "Implemented in <commit-sha>"
   ```

10. **Document learnings**:
    - Run `/workflows:compound` to document the solution and make future work easier

11. **Repeat** for the next open issue

## Important Rules

- **DO NOT create branches** - work directly on main
- **DO NOT create PRs** - push directly to main after review
- **DO NOT skip testing** - All tests must pass before pushing
- **DO NOT ask for human approval** - Proceed autonomously
- **DO create issues for follow-ups** - Any feedback from review that needs tracking should become an issue
- **Use /frontend-design skill** for any UI components
- **Handle errors gracefully** - If an issue is blocked, note it and move to the next

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
