import { readFileSync, readdirSync, existsSync } from 'fs'
import { join, basename } from 'path'
import { marked, Renderer } from 'marked'
import Link from 'next/link'

// basePath: '/fightrise-bot' in next.config.mjs — renderer must prefix content links
const BASE_PATH = '/fightrise-bot'
const SIDEBAR = {
  'getting-started': [
    { title: 'Index', href: '/' },
  ],
  guides: [
    { title: 'Player Quickstart', href: '/guides/player-quickstart/' },
    { title: 'TO Quickstart', href: '/guides/to-quickstart/' },
    { title: 'Discord Setup', href: '/guides/discord-setup/' },
    { title: 'Start.gg Setup', href: '/guides/startgg-setup/' },
    { title: 'Tunnel Setup', href: '/guides/tunnel-setup/' },
  ],
  reference: [
    { title: 'Architecture', href: '/reference/architecture/' },
    { title: 'Codebase Reference', href: '/reference/codebase-reference/' },
    { title: 'API Reference', href: '/reference/api-reference/' },
  ],
}

// Strip trailing slashes for consistent comparison
function stripSlash(path: string) {
  return path.replace(/\/$/, '')
}

const DOCS_DIR = join(process.cwd(), 'content')

// Custom renderer: prefix all internal links with basePath for static export
const renderer = new Renderer()
renderer.link = function ({ href, title, text }: { href: string; title?: string | null; text: string }) {
  // Skip external links and anchors
  if (
    !href ||
    href.startsWith('http') ||
    href.startsWith('https') ||
    href.startsWith('mailto:') ||
    href.startsWith('#') ||
    href.startsWith(BASE_PATH)
  ) {
    const titleAttr = title ? ` title="${title}"` : ''
    return `<a href="${href}"${titleAttr}>${text}</a>`
  }

  // Handle relative links (starting with ./ or ../)
  if (!href.startsWith('/')) {
    let cleanHref = href.replace(/^\.\//, '')
    if (cleanHref.startsWith('../')) {
      cleanHref = 'guides/' + cleanHref.replace(/\.\.\//g, '')
    }
    href = BASE_PATH + '/' + cleanHref
  } else {
    // Absolute path like /guides/... — prefix with basePath
    href = BASE_PATH + href
  }

  const titleAttr = title ? ` title="${title}"` : ''
  return `<a href="${href}"${titleAttr}>${text}</a>`
}

marked.setOptions({ renderer })

function getContent(slug: string[]) {
  const path = slug?.length ? slug.join('/') : 'index'
  const filePath = join(DOCS_DIR, `${path}.mdx`)

  if (!existsSync(filePath)) {
    return null
  }

  const content = readFileSync(filePath, 'utf-8')
  return marked.parse(content)
}

export async function getStaticPaths() {
  const paths: { params: { slug: string[] } }[] = []

  // Add index path
  paths.push({ params: { slug: [] } })

  // Walk through content directory
  function walk(dir: string, prefix: string[] = []) {
    const items = readdirSync(dir)
    for (const item of items) {
      const fullPath = join(dir, item)
      const stat = require('fs').statSync(fullPath)

      if (stat.isDirectory()) {
        walk(fullPath, [...prefix, item])
      } else if (item.endsWith('.mdx')) {
        const slug = [...prefix, item.replace('.mdx', '')]
        paths.push({ params: { slug } })
      }
    }
  }

  if (existsSync(DOCS_DIR)) {
    walk(DOCS_DIR)
  }

  return {
    paths,
    fallback: false,
  }
}

export async function getStaticProps({ params }: { params: { slug?: string[] } }) {
  const slug = params?.slug || []
  const content = getContent(slug)

  if (!content) {
    return { notFound: true }
  }

  return {
    props: {
      content,
      slug: slug.join('/'),
    },
  }
}

import ThemeToggle from '../components/ThemeToggle'

export default function DocPage({ content, slug }: { content: string; slug: string }) {
  // Determine which section to show in sidebar
  let currentSection = 'getting-started'
  if (slug.startsWith('guides/')) currentSection = 'guides'
  if (slug.startsWith('reference/')) currentSection = 'reference'

  const links = SIDEBAR[currentSection as keyof typeof SIDEBAR] || []

  return (
    <div className="docs-layout">
      <aside className="docs-sidebar">
        <div className="docs-sidebar-header">
          <h2 className="docs-logo">
            <Link href="/">FightRise</Link>
          </h2>
          <ThemeToggle />
        </div>
        <nav className="docs-nav">
          <div className="docs-nav-section">
            <Link href="/" className="docs-nav-link docs-nav-link--section">Getting Started</Link>
          </div>
          <div className="docs-nav-section">
            <span className="docs-nav-section-label">Guides</span>
            {SIDEBAR.guides.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`docs-nav-link${slug === stripSlash(link.href) ? ' active' : ''}`}
              >
                {link.title}
              </Link>
            ))}
          </div>
          <div className="docs-nav-section">
            <span className="docs-nav-section-label">Reference</span>
            {SIDEBAR.reference.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`docs-nav-link${slug === stripSlash(link.href) ? ' active' : ''}`}
              >
                {link.title}
              </Link>
            ))}
          </div>
        </nav>
      </aside>
      <main className="docs-main">
        <article
          className="docs-content"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </main>
    </div>
  )
}
