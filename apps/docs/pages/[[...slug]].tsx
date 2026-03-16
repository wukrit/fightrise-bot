import { readFileSync, readdirSync, existsSync } from 'fs'
import { join, basename } from 'path'
import { marked, Renderer } from 'marked'
import Link from 'next/link'

// Define sidebar structure
const BASE_PATH = '/fightrise-bot'
const SIDEBAR = {
  'getting-started': [
    { title: 'Index', href: BASE_PATH + '/' },
  ],
  guides: [
    { title: 'Player Quickstart', href: BASE_PATH + '/guides/player-quickstart/' },
    { title: 'TO Quickstart', href: BASE_PATH + '/guides/to-quickstart/' },
    { title: 'Discord Setup', href: BASE_PATH + '/guides/discord-setup/' },
    { title: 'Start.gg Setup', href: BASE_PATH + '/guides/startgg-setup/' },
    { title: 'Tunnel Setup', href: BASE_PATH + '/guides/tunnel-setup/' },
  ],
  reference: [
    { title: 'Architecture', href: BASE_PATH + '/reference/architecture/' },
    { title: 'Codebase Reference', href: BASE_PATH + '/reference/codebase-reference/' },
    { title: 'API Reference', href: BASE_PATH + '/reference/api-reference/' },
  ],
}

const DOCS_DIR = join(process.cwd(), 'content')

// Custom renderer to fix relative links
const renderer = new Renderer()
const originalLink = renderer.link.bind(renderer)
renderer.link = function (href: string, title: string | null | undefined, text: string) {
  // Only fix relative links (not starting with http, https, mailto, or #)
  if (href && !href.startsWith('http') && !href.startsWith('https') && !href.startsWith('mailto:') && !href.startsWith('#')) {
    // Add trailing slash and basePath
    const normalizedPath = href.endsWith('/') ? href : href + '/'
    href = BASE_PATH + '/' + normalizedPath
  }
  return originalLink(href, title, text)
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

export default function DocPage({ content, slug }: { content: string; slug: string }) {
  // Determine which section to show in sidebar
  let currentSection = 'getting-started'
  if (slug.startsWith('guides/')) currentSection = 'guides'
  if (slug.startsWith('reference/')) currentSection = 'reference'

  const links = SIDEBAR[currentSection as keyof typeof SIDEBAR] || []

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: 260, borderRight: '1px solid #e5e5e5', padding: '1.5rem', background: '#fafafa', flexShrink: 0 }}>
        <h2 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.25rem' }}>
          <Link href="/" style={{ textDecoration: 'none', color: '#333' }}>FightRise</Link>
        </h2>
        <nav>
          <div style={{ marginBottom: '1rem' }}>
            <Link href="/" style={{ fontWeight: 600, color: '#666', textDecoration: 'none' }}>Getting Started</Link>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontWeight: 600, color: '#666', marginBottom: '0.5rem' }}>Guides</div>
            {SIDEBAR.guides.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  display: 'block',
                  padding: '0.25rem 0',
                  color: slug === link.href.replace('/fightrise-bot', '') ? '#0066cc' : '#333',
                  textDecoration: 'none',
                  fontSize: '0.9rem'
                }}
              >
                {link.title}
              </Link>
            ))}
          </div>
          <div>
            <div style={{ fontWeight: 600, color: '#666', marginBottom: '0.5rem' }}>Reference</div>
            {SIDEBAR.reference.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  display: 'block',
                  padding: '0.25rem 0',
                  color: slug === link.href.replace('/fightrise-bot', '') ? '#0066cc' : '#333',
                  textDecoration: 'none',
                  fontSize: '0.9rem'
                }}
              >
                {link.title}
              </Link>
            ))}
          </div>
        </nav>
      </aside>
      <main style={{ flex: 1, padding: '2rem', maxWidth: 800 }}>
        <article
          dangerouslySetInnerHTML={{ __html: content }}
          style={{ lineHeight: 1.7 }}
        />
      </main>
    </div>
  )
}
