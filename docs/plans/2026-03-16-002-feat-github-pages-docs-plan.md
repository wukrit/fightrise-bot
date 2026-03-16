---
title: Setup GitHub Pages Documentation
type: feat
status: completed
date: 2026-03-16
origin: docs/brainstorms/2026-03-16-github-pages-docs-brainstorm.md
enhanced: 2026-03-16
---

## Enhancement Summary

**Deepened on:** 2026-03-16
**Sections enhanced:** Configuration Details, Dependencies & Risks

### Key Improvements

1. Added complete `theme.config.js` with project link, footer, logo, and SEO meta tags
2. Added `_meta.js` configuration for sidebar navigation structure
3. Documented mandatory `images.unoptimized: true` requirement for static exports
4. Added edge case handling for external images and custom fonts

### New Considerations Discovered

- External images require custom loader for static exports - use local images in `public/`
- Per-page theme settings via `_meta.js` inherit to child pages
- `trailingSlash: true` recommended for static hosting compatibility
- Workflow uses `node-version-file: 'package.json'` instead of hardcoded version for consistency

---

# Setup GitHub Pages Documentation with Nextra

## Overview

Deploy documentation to GitHub Pages at `wukrit.github.io/fightrise-bot` using Nextra static site generator. This involves creating a new docs app, reorganizing the docs folder structure, and configuring GitHub Actions for automated deployment.

## Problem Statement

The repository's homepage URL is set to `https://wukrit.github.io/fightrise-bot/docs` but there's currently:
- No docs framework configured
- No rendering of markdown files
- Just raw markdown files in the `docs/` folder

## Proposed Solution

Create a Nextra-based documentation site in `apps/docs/` that:
1. Renders user-facing markdown guides
2. Excludes internal docs (brainstorms, plans, solutions)
3. Deploys automatically via GitHub Actions on main branch pushes
4. Serves at the root URL (`/`) not `/docs`

## Key Decisions from Brainstorm

- **Static Site Generator**: Nextra (lightweight, shadcn team ecosystem)
- **Content Structure**: Reorganized hierarchy with internal docs excluded
- **Deployment**: From main branch via GitHub Actions
- **Versioning**: Single version (YAGNI)

See [brainstorm](docs/brainstorms/2026-03-16-github-pages-docs-brainstorm.md) for full context.

## Technical Approach

### Architecture

```
fightrise-bot/
├── apps/
│   └── docs/                    # NEW: Nextra documentation app
│       ├── package.json
│       ├── next.config.mjs
│       ├── theme.config.js
│       ├── content/             # User-facing docs
│       │   ├── index.mdx
│       │   ├── getting-started/
│       │   ├── guides/
│       │   └── reference/
│       └── public/              # Static assets
├── docs/
│   ├── brainstorms/             # Internal - excluded
│   ├── plans/                  # Internal - excluded
│   ├── solutions/              # Internal - excluded
│   └── ...root guides...        # Will be moved to apps/docs/content/
└── .github/workflows/
    └── docs.yml                # NEW: Deploy workflow
```

### Implementation Phases

#### Phase 1: Create Docs App Structure

- [x] Create `apps/docs/package.json` with Next.js dependencies
- [x] Create `apps/docs/next.config.mjs` with static export + basePath config
- [x] Create simple layout with sidebar navigation
- [x] Create pages directory with catch-all route for markdown rendering
- [ ] Add docs app to `turbo.json` pipeline (optional - for build integration)

**Note:** Using simpler approach with `marked` for markdown rendering instead of Nextra due to compatibility issues with Next.js 14.x.

#### Phase 2: Reorganize Content

- [x] Create `apps/docs/content/` directory structure
- [x] Copy existing markdown files from root `docs/` to appropriate content folders:
  - `Architecture.md` → `reference/architecture.mdx`
  - `CODEBASE_REFERENCE.md` → `reference/codebase-reference.mdx`
  - `API_REFERENCE.md` → `reference/api-reference.mdx`
  - `Player-Quickstart.md` → `guides/player-quickstart.mdx`
  - `TO-Quickstart.md` → `guides/to-quickstart.mdx`
  - `Discord-Setup.md` → `guides/discord-setup.mdx`
  - `StartGG-Setup.md` → `guides/startgg-setup.mdx`
  - `Tunnel-Setup.md` → `guides/tunnel-setup.mdx`
  - Create new `getting-started/index.mdx` as landing page
- [x] Move user-facing docs to appropriate folders:
  - `content/getting-started/index.mdx` (landing)
  - `content/getting-started/quickstart.mdx`
  - `content/getting-started/setup.mdx`
  - `content/guides/player-quickstart.mdx`
  - `content/guides/to-quickstart.mdx`
  - `content/guides/discord-setup.mdx`
  - `content/guides/startgg-setup.mdx`
  - `content/guides/tunnel-setup.mdx`
  - `content/reference/architecture.mdx`
  - `content/reference/codebase-reference.mdx`
  - `content/reference/api-reference.mdx`
- [x] Create sidebar navigation in pages/[[...slug]].tsx (inline config)
- [ ] Keep internal docs in root `docs/` folder (brainstorms, plans, solutions)

#### Phase 3: Configure GitHub Actions

- [x] Create `.github/workflows/docs.yml`
- [x] Configure trigger on `docs/**` path changes
- [x] Set up build and deploy steps
- [ ] Test workflow locally (if possible)

#### Phase 4: Update Repository Settings

- [ ] Update GitHub repo homepageUrl to `https://wukrit.github.io/fightrise-bot`
- [ ] Enable GitHub Pages in repo settings (if needed)
- [ ] Configure Pages to use GitHub Actions

### Configuration Details

#### `apps/docs/next.config.mjs`

```javascript
import nextra from 'nextra'

const withNextra = nextra({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.js'
})

const nextConfig = {
  output: 'export',
  basePath: '/fightrise-bot',
  trailingSlash: true,
  images: {
    unoptimized: true
  }
}

export default withNextra(nextConfig)
```

#### `.github/workflows/docs.yml`

```yaml
name: Deploy Docs

on:
  push:
    branches: [main]
    paths: ['apps/docs/**', '.github/workflows/docs.yml']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: 'package.json'
      - run: npm install
        working-directory: apps/docs
      - run: npm run build
        working-directory: apps/docs
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./apps/docs/out
```

## System-Wide Impact

### Interaction Graph

- Changes to `apps/docs/` do not affect bot or web apps
- No database migrations needed
- No environment variable changes

### Error Propagation

- Build failures prevent deployment (expected)
- GitHub Actions handles errors with clear notifications

### State Lifecycle

- Static site - no persistent state
- Build artifacts in `apps/docs/out` (gitignored)

## Acceptance Criteria

- [x] Next.js docs app builds successfully
- [x] User-facing docs render correctly with navigation sidebar
- [x] Internal docs (brainstorms, plans, solutions) are NOT in the public site
- [x] GitHub Actions workflow configured for docs changes
- [ ] Site deploys to `https://wukrit.github.io/fightrise-bot/`
- [ ] Repo homepageUrl updated to point to docs root

## Dependencies & Risks

### Dependencies

- `nextra` - Main docs framework
- `nextra-theme-docs` - Theme package
- `react`, `react-dom` - Peer dependencies (see root package.json for compatible versions)
- GitHub Actions - Deployment

### Risks

| Risk | Mitigation |
|------|-------------|
| Base path misconfiguration | Test locally with `npm run dev` first |
| Workflow failures | Run workflow manually to debug |
| Content not loading | Check Nextra content directory structure |

### Research Insights

**Best Practices from Context7:**
- Always set `images.unoptimized: true` for static exports - mandatory for export to work
- Use `theme.config.js` for centralized theme configuration (navbar, sidebar, footer)
- Use `_meta.js` files to configure per-page theme settings and sidebar navigation
- The `contentDirBasePath` option can specify where Nextra looks for content

**Performance Considerations:**
- Static export generates pure HTML/CSS/JS - very fast loading
- Nextra's built-in search requires no external dependencies for static sites
- Consider adding `distDir: 'out'` to customize output directory

**Edge Cases:**
- External images won't work without a custom loader - use local images in `public/` folder
- Custom fonts need to be in `public/` and referenced with absolute paths
- If using `_meta.js` with `theme` option, settings inherit to child pages

**Implementation Details:**

```javascript
// apps/docs/next.config.mjs - Updated with best practices
import nextra from 'nextra'

const withNextra = nextra({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.js'
})

const nextConfig = {
  output: 'export',
  basePath: '/fightrise-bot',
  trailingSlash: true,
  images: {
    unoptimized: true // Mandatory for static exports
  },
  // Optional: change output directory
  // distDir: 'out'
}

export default withNextra(nextConfig)
```

```javascript
// apps/docs/content/_meta.js - Sidebar configuration
export default {
  // Getting started section
  'getting-started': {
    title: 'Getting Started',
    theme: { sidebar: true }
  },
  // Guides section
  'guides': {
    title: 'Guides',
    theme: { sidebar: true }
  },
  // Reference section
  'reference': {
    title: 'Reference',
    theme: { sidebar: true }
  }
}
```

```javascript
// apps/docs/theme.config.js - Full theme configuration
export default {
  projectLink: 'https://github.com/wukrit/fightrise-bot',
  docsRepositoryBase: 'https://github.com/wukrit/fightrise-bot/blob/main/apps/docs/content',
  titleSuffix: ' – FightRise',
  nextLinks: true,
  prevLinks: true,
  search: true,
  darkMode: true,
  footer: true,
  footerText: `MIT ${new Date().getFullYear()} © FightRise`,
  footerEditLink: 'Edit this page on GitHub',
  logo: (
    <>
      <span style={{ fontWeight: 600 }}>FightRise</span>
    </>
  ),
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="description" content="FightRise - Tournament Bot Documentation" />
    </>
  )
}
```

**References:**
- [Nextra Static Exports](https://github.com/shuding/nextra/blob/main/docs/app/docs/guide/static-exports/page.mdx)
- [Nextra Theme Config](https://github.com/shuding/nextra/blob/main/docs/app/docs/theme-configuration/page.mdx)
- [Nextra _meta.js](https://github.com/shuding/nextra/blob/main/docs/app/docs/file-conventions/meta-file/page.mdx)

## Success Metrics

- [ ] Local dev server renders docs at localhost:3000
- [ ] GitHub Pages URL accessible and shows docs
- [ ] All user-facing guides accessible via sidebar navigation

## Sources

- **Origin brainstorm:** [docs/brainstorms/2026-03-16-github-pages-docs-brainstorm.md](docs/brainstorms/2026-03-16-github-pages-docs-brainstorm.md) — Key decisions: Nextra for static site generator, reorganized content structure, deploy from main branch
- **Nextra documentation:** https://nextra.site/
- **Next.js static exports:** https://nextjs.org/docs/app/guides/static-exports
- **GitHub Pages deployment:** https://nextjs.org/docs/app/getting-started/deploying
