#!/usr/bin/env node
// Screenshots for an agent PR (.github/workflows/agent-runner.yml). Trusted code: the workflow
// runs main's copy, never the agent's. It serves an already-built dist/ and shoots the docs page
// of every component folder the change touches, in light and dark, at 1280px and 320px: the
// whole page, plus a crop of each <Example> the change adds. Review material, asserts nothing.
//
//   node scripts/agent-screens.mjs --dist dist --out <dir> --files <files.json> [--base <sha>]
//     files.json: the runner's change list ([{ filename }], as agent-runner.mjs `files` writes it)
//     --base: the commit to diff the docs pages against, to find the added examples
//   -> <dir>/<slug>/*.png and <dir>/manifest.json ([{ slug, caption, theme, width, file, overflow }])
//
// Uses the machine's Chrome when there is one (GitHub's ubuntu image has it, so CI downloads no
// browser), else Playwright's own Chromium. By hand: npm run build, then the command above.
import { chromium } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'
import { addedCaptions, componentSlugs, docsRoutes } from './agent-runner.mjs'

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > 0 ? process.argv[i + 1] : fallback
}
const DIST = path.resolve(arg('dist', 'dist'))
const OUT = path.resolve(arg('out', 'agent-screens'))
const FILES = arg('files')
const BASE = arg('base')
const WIDTHS = [1280, 320]
const THEMES = ['light', 'dark']
const MAX_PAGE_HEIGHT = 6000

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain', '.md': 'text/markdown', '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.webm': 'video/webm' }

/** dist/ as the deployed site serves it: a real file if there is one, else the SPA's index.html. */
function serve(root) {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(new URL(req.url, 'http://x').pathname)
    let file = path.join(root, url)
    if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) file = path.join(root, 'index.html')
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' })
    createReadStream(file).pipe(res)
  })
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)))
}

async function launch() {
  try {
    return await chromium.launch({ channel: 'chrome' })
  } catch {
    return chromium.launch()
  }
}

/** Finite animations and colour transitions done, fonts loaded: colours and layout at rest. */
async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready
    const finite = document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
    await Promise.all(finite.map((a) => a.finished.catch(() => undefined)))
  })
}

const safe = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'example'

async function main() {
  if (!existsSync(path.join(DIST, 'index.html'))) throw new Error(`No build at ${DIST}: run npm run build first.`)
  const filenames = FILES ? JSON.parse(readFileSync(FILES, 'utf8')).map((f) => f.filename) : []
  const routes = docsRoutes(readFileSync('src/docsPages.ts', 'utf8'))
  const slugs = componentSlugs(filenames, routes)
  const manifest = []
  await mkdir(OUT, { recursive: true })
  if (!slugs.length) {
    await writeFile(path.join(OUT, 'manifest.json'), '[]\n')
    console.log('No component docs page touched; nothing to shoot.')
    return
  }
  const server = await serve(DIST)
  const origin = `http://127.0.0.1:${server.address().port}`
  const browser = await launch()
  try {
    for (const slug of slugs) {
      const docs = filenames.filter((f) => new RegExp(`^src/components/[^/]+/${slug}/[^/]+Docs\\.tsx$`).test(f))
      const captions = BASE && docs.length ? addedCaptions(execFileSync('git', ['diff', BASE, '--', ...docs], { encoding: 'utf8' })) : []
      await mkdir(path.join(OUT, slug), { recursive: true })
      for (const theme of THEMES) {
        for (const width of WIDTHS) {
          const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme, reducedMotion: 'reduce', deviceScaleFactor: width < 600 ? 2 : 1 })
          await context.addInitScript((t) => {
            try { localStorage.setItem('division-ds-theme', t) } catch { /* the attribute below still applies */ }
            document.documentElement.setAttribute('data-theme', t)
          }, theme)
          const page = await context.newPage()
          await page.goto(`${origin}/components/${slug}`, { waitUntil: 'networkidle' })
          await page.locator('h1').first().waitFor({ timeout: 15000 })
          await settle(page)
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
          const height = await page.evaluate(() => document.documentElement.scrollHeight)
          const pageFile = `${slug}/page-${theme}-${width}.png`
          await page.screenshot({ path: path.join(OUT, pageFile), fullPage: true, ...(height > MAX_PAGE_HEIGHT ? { clip: { x: 0, y: 0, width, height: MAX_PAGE_HEIGHT } } : {}) })
          manifest.push({ slug, caption: null, theme, width, file: pageFile, overflow })
          for (const caption of captions) {
            const heading = page.getByRole('heading', { level: 3, name: caption, exact: true }).first()
            if (!(await heading.count())) { console.warn(`${slug}: no example captioned "${caption}"`); continue }
            const file = `${slug}/example-${safe(caption)}-${theme}-${width}.png`
            await heading.locator('xpath=..').screenshot({ path: path.join(OUT, file) })
            manifest.push({ slug, caption, theme, width, file, overflow })
          }
          await context.close()
        }
      }
    }
  } finally {
    await browser.close()
    server.close()
  }
  await writeFile(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
  console.log(`${manifest.length} screenshot(s) of ${slugs.join(', ')} in ${OUT}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
