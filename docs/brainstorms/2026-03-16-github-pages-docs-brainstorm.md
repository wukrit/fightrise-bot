# Brainstorm: GitHub Pages Documentation Setup

**Date:** 2026-03-16
**Status:** Open

## What We're Building

Deploy documentation to GitHub Pages at `wukrit.github.io/fightrise-bot` using a static site generator. The docs will render markdown files from the `docs/` folder.

## Why This Approach

The user selected **Nextra** as the static site generator because:
- Fast and lightweight
- Built by the Shadcn/Next.js team (trusted ecosystem)
- Excellent TypeScript support
- Simple setup with Next.js projects
- MDX support for interactive content

The docs content will be **reorganized** into a clean hierarchy rather than including all files.

## Key Decisions

### 1. Static Site Generator: Nextra

**Options considered:**
- **Docusaurus**: React-based, excellent but heavier
- **Nextra**: Lightweight, shadcn team, simple config ✓
- **VitePress**: Fast but less Next.js integration

### 2. Content Structure

**Current structure:**
```
docs/
├── brainstorms/
├── plans/
├── solutions/
├── API_REFERENCE.md
├── Architecture.md
├── ... (root level guides)
```

**Proposed structure for Nextra:**
```
docs/
├── getting-started/
│   ├── index.md (landing)
│   ├── quickstart.md
│   └── setup.md
├── guides/
│   ├── player-quickstart.md
│   ├── to-quickstart.md
│   ├── discord-setup.md
│   ├── startgg-setup.md
│   └── tunnel-setup.md
├── reference/
│   ├── architecture.md
│   ├── codebase-reference.md
│   ├── api-reference.md
│   └── implementation-status.md
└── internal/ (excluded from production build)
    ├── brainstorms/
    ├── plans/
    └── solutions/
```

### 3. Deployment Strategy

**Option: Use GitHub Actions with `gh-pages` branch**

```yaml
# .github/workflows/docs.yml
name: Deploy Docs
on:
  push:
    branches: [main]
    paths: ['docs/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install
      - run: npm run docs:build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./docs/.next
```

### 4. Route Configuration

- Target URL: `https://wukrit.github.io/fightrise-bot/`
- Nextra config sets `docs` as base path
- Update repo homepageUrl to root (not /docs)

## Open Questions

1. **Content filtering**: Should brainstorms/plans/solutions be included in the public docs or kept as internal notes?
   - *Recommendation: Keep internal, only expose user-facing guides*

2. **Existing markdown files**: Several files like `Implementation-Status.md` and `skipped-tests-analysis.md` are internal. Should they be hidden from public docs?
   - *Recommendation: Move to internal/ folder*

3. **GitHub Pages branch**: Should we use the `gh-pages` branch approach or deploy from the `docs/.next` build output on main?
   - *Recommendation: Use `gh-pages` branch for clean separation*

4. **Versioning**: Is versioning needed (like Docusaurus has), or will a single version work for now?
   - *Recommendation: Single version for now (YAGNI)*

## Next Steps

1. Install Nextra dependencies
2. Create `docs/package.json` with Nextra config
3. Reorganize docs folder structure
4. Configure `next.config.mjs` for docs
5. Add GitHub Actions workflow for deployment
6. Update GitHub repo settings

## Resolved Questions

1. **Content filtering**: Keep internal docs (brainstorms/plans/solutions) private, only expose user-facing guides
2. **Internal markdown files**: Move Implementation-Status.md and skipped-tests-analysis.md to internal/
3. **GitHub Pages branch**: Deploy from main branch (simpler approach)
4. **Versioning**: Single version for now (YAGNI)
