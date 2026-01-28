# Agent Instructions

These instructions are for AI assistants working in this project.

## Development Workflow

This project uses the **compound-engineering** plugin for development workflows. The core philosophy is that each unit of engineering work should make subsequent units easier.

### Available Workflows

| Command | Purpose |
|---------|---------|
| `/workflows:plan` | Create detailed implementation plans from feature ideas |
| `/workflows:work` | Execute plans with task tracking |
| `/workflows:review` | Multi-agent code review before merging |
| `/workflows:compound` | Document learnings to compound team knowledge |

### When to Plan

Use `/workflows:plan` when:
- Adding new features or functionality
- Making breaking changes (API, schema)
- Changing architecture or patterns
- Optimizing performance
- Updating security patterns

Skip planning for:
- Bug fixes that restore intended behavior
- Typos, formatting, comments
- Non-breaking dependency updates
- Configuration changes
- Tests for existing behavior

### Project Context

Review the following for project conventions:
- `CLAUDE.md` - Full development workflow and commands
- `openspec/project.md` - Tech stack, patterns, and domain context
- `openspec/specs/` - Historical specifications (reference only)

### Best Practices

- **Simplicity First**: Default to minimal implementations, add complexity only when needed
- **Thorough Planning**: Spend 80% on planning, 20% on implementation
- **Incremental Commits**: Commit frequently with clear messages
- **Test Coverage**: Write tests before creating PRs
- **Document Learnings**: Use `/workflows:compound` after completing work
