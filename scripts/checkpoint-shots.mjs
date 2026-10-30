#!/usr/bin/env node
// Shoots every page the Hexline demo registers (src/demo/routes.ts's DEMO_PAGES, the same list
// e2e/demo.spec.ts iterates) plus the docs shell's home, one component page and its 404, and a
// handful of states a bare route list can never reach on its own: a cart with a line, checkout's
// first step, a placed order, and the error boundary's own fallback. Output is review material for
// a milestone checkpoint, not a golden-image regression suite -- docs/g4-checkpoint/ is gitignored
// and nothing here asserts anything.
//
// Starts its own Vite dev server on a free port and stops it again when the run ends, success or
// failure. Not part of the test suite: run it by hand with `npm run checkpoint:shots`.
import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const OUT_DIR = path.join(ROOT, 'docs', 'g4-checkpoint')

// `DEMO_PAGES` is read through Vite's own SSR module loader (via the dev server this script
// starts anyway, in `main()`), not Node's native import: Home's route entry became a plain,
// eager `import` once the homepage stopped being lazy-loaded, and Node's resolver -- unlike
// Vite's -- does not fill in a missing `.tsx` extension. Every page component behind a
// `lazy(() => import(...))` callback is still never called just by loading the module, so this
// still pulls in the route list alone, not the whole app.

const CART_LINE = {
  id: 'bump-helmet:S/M:black',
  productId: 'bump-helmet',
  name: 'Bump helmet',
  href: '/store/shop/bump-helmet',
  detail: 'Size S/M · Black',
  unitPrice: 6900,
  quantity: 1,
  maxQuantity: 10,
  size: 'S/M',
  colourId: 'black',
}

function seedSession() {
  sessionStorage.setItem(
    'hexline-session',
    JSON.stringify({ user: { name: 'Alex', email: 'alex@hexline.test' }, pendingEmail: null })
  )
}

async function seedCart(page) {
  await page.evaluate(line => {
    sessionStorage.setItem('hexline-cart', JSON.stringify([line]))
  }, CART_LINE)
}

async function setupCartSheetOpen(page) {
  await page.goto('/store')
  await seedCart(page)
  await page.reload()
  await page.getByRole('button', { name: 'Cart, 1 item' }).click()
  await page.getByRole('heading', { name: 'Items' }).waitFor()
}

async function setupCheckoutStep1(page) {
  await page.goto('/store')
  await seedCart(page)
  await page.goto('/store/checkout')
  await page.getByRole('heading', { name: /Shipping/ }).first().waitFor()
}

async function setupCheckoutConfirmation(page) {
  await page.addInitScript(() => {
    window.__hexlineLatency = 0
  })
  await page.goto('/store')
  await seedCart(page)
  await page.goto('/store/checkout')
  await page.getByLabel('Email').fill('rae@hexline.test')
  await page.getByLabel('Full name').fill('Rae Hexline')
  await page.getByLabel('Address line 1').fill('1 Field Lane')
  await page.getByLabel('Town or city').fill('Cork')
  await page.getByLabel('Postal code').fill('T12 X285')
  await page.getByRole('combobox', { name: 'Country' }).click()
  await page.getByRole('option', { name: 'Ireland', exact: true }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('radio', { name: /Standard/ }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByLabel('Name on card').fill('Rae Hexline')
  await page.getByLabel('Card number').fill('4242 4242 4242 4242')
  await page.getByLabel('Expiry date').fill('12/29')
  await page.getByLabel('Security code').fill('123')
  await page.getByRole('button', { name: 'Place order' }).click()
  await page.waitForURL(/\/store\/checkout\/confirmation$/)
  await page.getByRole('heading', { level: 1, name: 'Order placed' }).waitFor()
}

async function setupCrash(page) {
  await page.goto('/store/status/error')
  await page.getByRole('button', { name: 'Show the full-page error' }).click()
  await page.getByRole('heading', { level: 1, name: 'Something went wrong' }).waitFor()
}

function slugify(routePath) {
  if (routePath === '/components') return 'docs'
  return routePath.replace(/^\//, '').replace(/\//g, '-')
}

/** A bare `goto`, then the page's own top-level heading -- the one wait every ordinary route
 *  shares, whether it is the Hexline shell or the docs shell. The four states below each have
 *  their own primary content to wait for instead (a sheet, a step heading, a placed order, a
 *  crash fallback), some of which sit in front of a `main` this same check would otherwise also
 *  have to wait on, so they build their own `setup` rather than compose this one. */
function gotoAndWaitForHeading(routePath) {
  return async page => {
    await page.goto(routePath)
    await page.getByRole('heading', { level: 1 }).first().waitFor({ state: 'visible', timeout: 15000 })
  }
}

function buildEntries(DEMO_PAGES) {
  const demoEntries = DEMO_PAGES.map(page => {
    const routePath = page.samplePath ?? page.path
    return {
      slug: slugify(routePath),
      seedSession: routePath.startsWith('/store/account'),
      setup: gotoAndWaitForHeading(routePath),
    }
  })
  const docsEntries = [
    { slug: 'docs', setup: gotoAndWaitForHeading('/components') },
    { slug: 'components-button', setup: gotoAndWaitForHeading('/components/button') },
    { slug: 'components-nope', setup: gotoAndWaitForHeading('/components/nope') },
  ]
  // Distinct from DEMO_PAGES' own '/store/checkout/confirmation' entry (`demo-checkout-confirmation`,
  // a direct load with no order to show) -- this one is the same URL reached by an actual purchase,
  // so it needs a name of its own rather than overwriting that entry's files.
  const stateEntries = [
    { slug: 'demo-cart-sheet-open', setup: setupCartSheetOpen },
    { slug: 'demo-checkout-step1', setup: setupCheckoutStep1 },
    { slug: 'demo-order-placed', setup: setupCheckoutConfirmation },
    { slug: 'demo-status-error-crash', setup: setupCrash },
  ]
  return [...demoEntries, ...docsEntries, ...stateEntries]
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.unref()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      server.close(() => resolve(port))
    })
  })
}

async function applyTheme(page, theme) {
  await page.evaluate(async t => {
    document.documentElement.setAttribute('data-theme', t)
    const settling = document
      .getAnimations()
      .filter(animation => animation instanceof CSSTransition)
      .map(animation => animation.finished.catch(() => undefined))
    await Promise.all(settling)
  }, theme)
}

async function settleAnimations(page) {
  await page.evaluate(async () => {
    const finite = document
      .getAnimations()
      .filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity)
    await Promise.all(finite.map(animation => animation.finished.catch(() => undefined)))
  })
}

// Each entry's own `setup` already waited for that state's primary content (a heading, a sheet,
// a crash fallback) -- this settles what is left before a screenshot: fonts, a still-lazy chunk
// (the account Overview's chart panel is the one route this ever catches, App.tsx's own comment
// on `ChartPanelDocs` explains why it is the one deep import loaded lazily), and animations.
async function ready(page) {
  await page.evaluate(() => document.fonts.ready)
  await page
    .waitForFunction(() => !document.body.innerText.includes('Loading…'), { timeout: 5000 })
    .catch(() => undefined)
  await settleAnimations(page)
}

async function shoot(page, name) {
  const file = path.join(OUT_DIR, `${name}.webp`)
  await page.screenshot({ path: file, fullPage: true, type: 'webp', quality: 82 })
  return `${name}.webp`
}

async function shootEntry(browser, baseURL, entry) {
  const context = await browser.newContext({ baseURL })
  const page = await context.newPage()
  try {
    if (entry.seedSession) await page.addInitScript(seedSession)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 1280, height: 800 })
    await entry.setup(page)
    await ready(page)

    await applyTheme(page, 'dark')
    const dark1280 = await shoot(page, `${entry.slug}--dark--1280`)

    await applyTheme(page, 'light')
    const light1280 = await shoot(page, `${entry.slug}--light--1280`)

    await applyTheme(page, 'dark')
    await page.setViewportSize({ width: 390, height: 844 })
    await page.evaluate(() => document.fonts.ready)
    await settleAnimations(page)
    const dark390 = await shoot(page, `${entry.slug}--dark--390`)

    return { slug: entry.slug, files: [dark1280, light1280, dark390] }
  } finally {
    await context.close()
  }
}

function galleryHtml(shots) {
  const sections = shots
    .map(
      ({ slug, files }) => `
      <section>
        <h2>${slug}</h2>
        <div class="row">
          ${files
            .map(
              file => `
          <figure>
            <img src="${file}" alt="${slug}" loading="lazy" />
            <figcaption>${file}</figcaption>
          </figure>`
            )
            .join('')}
        </div>
      </section>`
    )
    .join('\n')
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>G4 checkpoint shots</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #111; color: #eee; margin: 0; padding: 24px; }
    h1 { font-size: 18px; }
    section { margin-bottom: 32px; border-top: 1px solid #333; padding-top: 12px; }
    h2 { font-family: monospace; font-size: 13px; font-weight: 600; color: #9cf; }
    .row { display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-start; }
    figure { margin: 0; max-width: 320px; }
    img { display: block; max-width: 320px; border: 1px solid #333; }
    figcaption { font-family: monospace; font-size: 11px; color: #999; margin-top: 4px; }
  </style>
</head>
<body>
  <h1>G4 checkpoint shots (${shots.length} pages/states, ${shots.reduce((n, s) => n + s.files.length, 0)} images)</h1>
  ${sections}
</body>
</html>
`
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const port = await getFreePort()
  const url = `http://127.0.0.1:${port}`

  // The Vite JS API rather than a spawned CLI: `server.close()` below tears down the exact
  // process this one is already running in, so there is no child process tree to hunt down and
  // kill on Windows if the run fails partway through. Off HMR the same way playwright.config.ts
  // does for e2e: a live reload firing between a navigation and a screenshot would date the
  // shot's own content out from under it mid-run.
  process.env.DIVISION_E2E = '1'
  const viteServer = await createServer({
    root: ROOT,
    configFile: path.join(ROOT, 'vite.config.ts'),
    server: { port, strictPort: true, host: '127.0.0.1' },
  })
  await viteServer.listen()

  let browser
  try {
    const { DEMO_PAGES } = await viteServer.ssrLoadModule('/src/demo/routes.ts')
    browser = await chromium.launch({ headless: true })

    const entries = buildEntries(DEMO_PAGES)
    const shots = []
    for (const entry of entries) {
      console.log(`shooting ${entry.slug}...`)
      shots.push(await shootEntry(browser, url, entry))
    }

    await writeFile(path.join(OUT_DIR, 'index.html'), galleryHtml(shots), 'utf8')
    const imageCount = shots.reduce((n, s) => n + s.files.length, 0)
    console.log(`\n${shots.length} pages/states, ${imageCount} images, written to ${path.relative(ROOT, OUT_DIR)}`)
  } finally {
    await browser?.close()
    await viteServer.close()
  }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
