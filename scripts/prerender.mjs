#!/usr/bin/env node
/**
 * Pre-render the built docs site for crawlers (run after `npm run build`).
 *
 * Why: the site is a client-side React app, and crawlers that don't run JavaScript (GPTBot,
 * ClaudeBot, PerplexityBot, LinkedIn's preview bot) saw the same empty shell on every route: one
 * title, no description, about six words. This script serves `dist/`, crawls every route the app
 * links to in a real browser, and writes each route as its own HTML file:
 *
 *   - its own <title>, description, canonical, Open Graph tags and JSON-LD,
 *   - `noindex` on demo screens that aren't worth a search result (cart, checkout, sign-in...),
 *   - the page as it renders, inside #root. createRoot replaces it on mount, so the app runs
 *     exactly as before; a crawler reads the real content.
 *
 * It also writes `dist/sitemap.xml` with the indexable routes. Files land where Vercel's
 * cleanUrls serves them: `/components/tabs` is `dist/components/tabs.html`, the root is
 * `dist/index.html`. Paths with a parameter (`/store/shop/:id`) are rendered for every id the
 * app links to; the host keeps a fallback rewrite for those prefixes (see commands.md).
 *
 * Usage: node scripts/prerender.mjs [distDir]   (DIVISION_BASE must match the build's base)
 */
import { createServer } from 'node:http'
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from 'node:fs'
import { join, extname, dirname, resolve } from 'node:path'
import { chromium } from 'playwright'

const DIST = resolve(process.argv[2] ?? 'dist')
const BASE = (process.env.DIVISION_BASE ?? '/').replace(/\/?$/, '/')
// Canonicals always name the official site, whatever base a local or forked build uses.
const CANONICAL_ROOT = 'https://victorilioiu.com/systems/division-ds'
const MAX_PAGES = 400
const AUTHOR = { '@type': 'Person', name: 'Victor Ilioiu', url: 'https://victorilioiu.com/' }
const SOFTWARE_ID = `${CANONICAL_ROOT}/#software`

const template = readFileSync(join(DIST, 'index.html'), 'utf8')
// A second run would crawl with an already pre-rendered home page as its template.
if (template.includes('rel="canonical"')) {
  console.error('dist/index.html is already pre-rendered. Run `npm run build` again first.')
  process.exit(1)
}
const manifest = JSON.parse(readFileSync(join(DIST, 'manifest/components.json'), 'utf8'))
const bySlug = new Map(manifest.components.map((c) => [c.slug, c]))

const MIME = { '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary', '.txt': 'text/plain', '.md': 'text/markdown', '.mp4': 'video/mp4', '.webm': 'video/webm', '.avif': 'image/avif', '.wasm': 'application/wasm' }

// The SPA host, in miniature: a real file if there is one, the untouched template otherwise.
const server = createServer((req, res) => {
  const url = decodeURIComponent((req.url ?? '/').split('?')[0])
  if (!url.startsWith(BASE)) { res.writeHead(404).end(); return }
  const file = join(DIST, url.slice(BASE.length))
  if (existsSync(file) && statSync(file).isFile() && !file.endsWith('index.html')) {
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' })
    res.end(readFileSync(file))
    return
  }
  res.writeHead(200, { 'content-type': 'text/html' }).end(template)
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const ORIGIN = `http://127.0.0.1:${server.address().port}`

const norm = (p) => (p.length > 1 ? p.replace(/\/+$/, '') : p)
const indexable = (p) =>
  p === '/' || p === '/components' || p.startsWith('/components/') || p.startsWith('/guidelines/') ||
  ['/themes', '/store', '/crm', '/console', '/store/about', '/crm/about', '/console/about'].includes(p)

function clip(text, max = 155) {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  const cut = t.slice(0, max - 1)
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:.\s]+$/, '') + '…'
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, colorScheme: 'dark' })
const seen = new Set()
const queue = ['/', '/components']
const pages = []

while (queue.length && seen.size < MAX_PAGES) {
  const path = queue.shift()
  if (seen.has(path)) continue
  seen.add(path)
  await page.goto(ORIGIN + BASE + path.slice(1), { waitUntil: 'load' })
  await page.waitForSelector('h1', { timeout: 8000 }).catch(() => {})
  await page.waitForTimeout(400)
  const finalPath = norm(new URL(page.url()).pathname.slice(BASE.length - 1) || '/')
  const snap = await page.evaluate((base) => {
    const root = document.getElementById('root').cloneNode(true)
    root.querySelectorAll('canvas, script, iframe').forEach((n) => n.remove())
    const main = document.querySelector('main') ?? document.body
    const lead = [...main.querySelectorAll('p')].map((p) => p.textContent.trim()).find((t) => t.length > 60) ?? ''
    const links = [...document.querySelectorAll('a[href]')]
      .map((a) => new URL(a.href, location.href))
      .filter((u) => u.origin === location.origin && u.pathname.startsWith(base))
      .map((u) => u.pathname.slice(base.length - 1) || '/')
    return { title: document.title, h1: document.querySelector('h1')?.textContent.trim() ?? '', lead, html: root.innerHTML, links }
  }, BASE)
  for (const l of snap.links) { const n = norm(l); if (!seen.has(n) && !/\.[a-z0-9]+$/i.test(n)) queue.push(n) }
  // A redirect (legacy paths) or a not-found screen is not a page of its own.
  if (finalPath !== path || /not found/i.test(snap.title)) continue
  pages.push({ path, ...snap })
}
await browser.close()
server.close()

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
const ld = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`

function meta(p) {
  const slug = p.path.split('/')[2]
  const comp = p.path.startsWith('/components/') ? bySlug.get(slug) : undefined
  const url = CANONICAL_ROOT + (p.path === '/' ? '/' : p.path)
  if (p.path === '/') {
    return {
      url,
      title: 'Division DS · the React design system your coding agent can read, use and check',
      description: `Open-source React design system: ${manifest.components.length} components, an MCP server, an agent skill and llms.txt, so coding agents build with it and check their own work. WCAG 2.2 AA.`,
      graph: [
        { '@type': 'WebSite', '@id': `${CANONICAL_ROOT}/#site`, name: 'Division DS', url },
        { '@type': 'SoftwareSourceCode', '@id': SOFTWARE_ID, name: 'Division DS', url, codeRepository: 'https://github.com/Victor-Ilioiu/division-ds', programmingLanguage: ['TypeScript', 'React'], license: 'https://opensource.org/licenses/MIT', author: AUTHOR, sameAs: ['https://www.npmjs.com/package/division-ds', 'https://github.com/Victor-Ilioiu/division-ds'] },
      ],
    }
  }
  const name = comp?.title ?? p.h1 ?? p.title
  const title = comp
    ? `${name} component · Division DS`
    : p.path.startsWith('/guidelines/') ? `${name} · Division DS guidelines`
    : p.path === '/components' ? 'Components · Division DS'
    : `${p.title}`
  const description = clip(comp?.summary ?? p.lead ?? title)
  const crumbs = [{ name: 'Division DS', item: `${CANONICAL_ROOT}/` }]
  if (comp) crumbs.push({ name: 'Components', item: `${CANONICAL_ROOT}/components` })
  crumbs.push({ name, item: url })
  const graph = [{ '@type': 'BreadcrumbList', itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, ...c })) }]
  if (comp || p.path.startsWith('/guidelines/')) {
    graph.push({ '@type': 'TechArticle', headline: title, description, url, author: AUTHOR, isPartOf: { '@id': SOFTWARE_ID }, ...(comp ? { about: name } : {}) })
  }
  return { url, title, description, graph }
}

function render(p) {
  const m = meta(p)
  let html = template
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(m.title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*/, `$1${esc(m.description)}`)
    .replace(/(<meta property="og:title" content=")[^"]*/, `$1${esc(m.title)}`)
    .replace(/(<meta property="og:description" content=")[^"]*/, `$1${esc(m.description)}`)
    .replace(/(<meta property="og:url" content=")[^"]*/, `$1${m.url}`)
  const head = [`<link rel="canonical" href="${m.url}" />`]
  if (!indexable(p.path)) head.push('<meta name="robots" content="noindex, follow" />')
  head.push(ld({ '@context': 'https://schema.org', '@graph': m.graph }))
  html = html.replace('</head>', `    ${head.join('\n    ')}\n  </head>`)
  return html.replace(/<div id="root"><\/div>/, `<div id="root">${p.html}</div>`)
}

let written = 0
for (const p of pages) {
  const out = p.path === '/' ? join(DIST, 'index.html') : join(DIST, `${p.path.slice(1)}.html`)
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, render(p))
  written++
}

// The fallback for paths with a parameter the crawl never reached (an unlinked product id): the
// bare app, so it doesn't flash the home page's snapshot first. noindex: it is a shell, not a page.
writeFileSync(
  join(DIST, 'app.html'),
  template.replace('</head>', '    <meta name="robots" content="noindex, follow" />\n  </head>')
)

const today = new Date().toISOString().slice(0, 10)
const urls = pages.filter((p) => indexable(p.path)).map((p) => meta(p).url)
writeFileSync(
  join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`
)

const indexed = urls.length
console.log(`Pre-rendered ${written} routes (${indexed} indexable, ${written - indexed} noindex) and sitemap.xml with ${indexed} URLs.`)
if (!pages.some((p) => p.path.startsWith('/components/'))) {
  console.error('No component page was rendered: the crawl found nothing to follow. Failing.')
  process.exit(1)
}
