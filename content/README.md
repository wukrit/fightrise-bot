# FightRise Documentation Source

This folder contains the markdown/MDX source files for the FightRise documentation.

## Structure

```
content/
├── getting-started/     # Getting started guides
│   ├── index.mdx       # Main landing page
│   └── zero-to-beta.mdx # Complete setup guide
├── guides/             # How-to guides
│   ├── dmno-setup.mdx  # Environment management
│   ├── discord-setup.mdx
│   ├── startgg-setup.mdx
│   ├── tunnel-setup.mdx
│   ├── to-quickstart.mdx
│   └── player-quickstart.mdx
└── reference/          # Reference documentation
    ├── architecture.mdx
    ├── codebase-reference.mdx
    └── api-reference.mdx
```

## Building the Docs

The docs are built using Next.js static export. To rebuild:

```bash
cd apps/web
npm run build
# Output goes to docs/ folder
```

## Adding New Docs

1. Create a new `.mdx` file in the appropriate folder
2. Add frontmatter with `title` and `description`
3. Rebuild the docs with `npm run build`

## Note

This is the **source** for the documentation. The `docs/` folder in the repository root contains the built static HTML output and should not be edited directly.
