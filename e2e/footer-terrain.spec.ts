import type { Page } from '@playwright/test'
import { applyTheme, expect, test } from './fixtures'

// The terrain at the foot of the Hexline demo (src/demo/terrain), in a real browser. jsdom has
// no canvas and no WebGL, so the unit suite only sees an empty stage; and e2e/fixtures.ts keeps
// the live scene from starting everywhere else in this suite (`footerTerrain: 'still'`). This is
// the one file that lets it run: it draws, it moves on its own, the pointer does nothing to it,
// nothing on the page moves when it arrives, and leaving gives the WebGL context back. The
// `consoleErrors` fixture fails any test here that logs an error, the scene's own included.

// The same flags hero.spec.ts launches with: a real GPU where the machine has one, software
// rendering where it does not. File-level because launch options belong to the worker.
test.use({
  launchOptions: {
    args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'],
  },
  viewport: { width: 1280, height: 800 },
})

const LAYER = '[data-footer-backdrop]'
const CLOSING = '[data-footer-closing]'
const WORDMARK = '[data-footer-wordmark]'
const TERRAIN = '[data-terrain]'
const LIVE = 'canvas[data-terrain-canvas="live"]'
const STILL = 'canvas[data-terrain-canvas="still"]'

/** A page with no hero on it, so the terrain is the only scene. */
const QUIET_PAGE = '/store/care'

function sceneRequests(page: Page): string[] {
  const seen: string[] = []
  page.on('request', request => {
    if (/\/src\/demo\/terrain\/scene\.ts/.test(request.url())) seen.push(request.url())
  })
  return seen
}

/** Scrolls to the end of the page and waits until it has stopped there. The demo scrolls
 *  smoothly (Lenis), so the position is still changing after the call returns, and a box
 *  measured before it settles is somewhere else by the time it is used. */
async function toFooter(page: Page) {
  // The routed page first: until its chunk lands the document is one line tall.
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.locator(CLOSING).scrollIntoViewIfNeeded()
  await expect(page.locator(CLOSING)).toBeInViewport({ ratio: 0.9 })
  let last = -1
  await expect
    .poll(
      async () => {
        const y = await page.evaluate(() => Math.round(window.scrollY))
        const settled = y === last
        last = y
        return settled
      },
      { intervals: [150] }
    )
    .toBe(true)
}

/** The strip of the closing block above the wordmark: the terrain with nothing over it. */
async function headroom(page: Page) {
  return page.evaluate(
    ([closing, wordmark]) => {
      const c = document.querySelector(closing)!.getBoundingClientRect()
      const m = document.querySelector(wordmark)!.getBoundingClientRect()
      return { x: c.left, y: c.top, width: c.width, height: m.top - c.top }
    },
    [CLOSING, WORDMARK]
  )
}

/** A picture of that strip. */
async function look(page: Page): Promise<Buffer> {
  return page.screenshot({ clip: await headroom(page) })
}

/** Share of that strip whose pixels differ from its top-left one. A drawn terrain is about a
 *  fifth of it (0.21 measured, still and live, both themes, 2026-10-02); an empty canvas is
 *  none of it. */
async function inkCoverage(page: Page): Promise<number> {
  const png = await look(page)
  return page.evaluate(async (b64: string) => {
    const img = new Image()
    img.src = `data:image/png;base64,${b64}`
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.width
    c.height = img.height
    const ctx = c.getContext('2d')!
    ctx.drawImage(img, 0, 0)
    const { data } = ctx.getImageData(0, 0, c.width, c.height)
    const [r0, g0, b0] = data
    let ink = 0
    for (let i = 0; i < data.length; i += 4) {
      if (Math.abs(data[i] - r0) + Math.abs(data[i + 1] - g0) + Math.abs(data[i + 2] - b0) > 30) ink++
    }
    return ink / (data.length / 4)
  }, png.toString('base64'))
}

/** Where the footer starts and how tall the document is: the two numbers a late-arriving
 *  backdrop would change if its space were not reserved. */
async function layout(page: Page) {
  return page.evaluate(() => ({
    footerTop: Math.round(document.querySelector('body footer:last-of-type')!.getBoundingClientRect().top + window.scrollY),
    height: document.documentElement.scrollHeight,
  }))
}

test.describe('the terrain with the suite default: the live scene switched off', () => {
  // The guard on the fixture itself. If scene.ts is renamed or moved, the route in fixtures.ts
  // stops matching and every demo test in the suite starts opening a WebGL context.
  // Mutation: change TERRAIN_SCENE_ENTRY in fixtures.ts to a path that matches nothing -> the
  // stage reads data-terrain="live" and this fails.
  test('stays on its still, which is drawn, with motion allowed and WebGL available', async ({ page }) => {
    await page.goto(QUIET_PAGE)
    await toFooter(page)
    await page.waitForTimeout(800)
    await expect(page.locator(TERRAIN)).toHaveAttribute('data-terrain', 'still')
    await expect(page.locator(LIVE)).toHaveCount(0)
    await expect(page.locator(STILL)).toBeVisible()
    expect(await inkCoverage(page)).toBeGreaterThan(0.05)
  })
})

test.describe('the terrain with the live scene allowed', () => {
  test.use({ footerTerrain: 'live' })
  // One scene at a time: these run in order in one worker.
  test.describe.configure({ mode: 'default', timeout: 120_000 })

  // The gate says no before anything is fetched: the still is there and the scene module is
  // never requested, let alone three.js.
  // Mutation: drop `!allowed ||` from the live effect's guard in Terrain.tsx -> the module is
  // requested, the stage goes live, and both assertions fail.
  test('reduced motion gets the still, drawn, and never fetches the scene', async ({ page }) => {
    const requests = sceneRequests(page)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(QUIET_PAGE)
    await toFooter(page)
    await page.waitForTimeout(1200)
    await expect(page.locator(TERRAIN)).toHaveAttribute('data-terrain', 'still')
    await expect(page.locator(LIVE)).toHaveCount(0)
    expect(await inkCoverage(page)).toBeGreaterThan(0.05)
    expect(requests).toEqual([])
    // One still frame: nothing on the stage changes.
    const a = await look(page)
    await page.waitForTimeout(500)
    expect(Buffer.compare(a, await look(page))).toBe(0)
  })

  // Lazy: on the long homepage the footer starts thousands of pixels below the fold, and nothing
  // of the scene is requested until it is near. Mutation: change NEAR in Terrain.tsx to
  // '100000px 0px' -> the module is requested on load and the first assertion fails.
  test('nothing loads until the footer is near, then it draws without moving the page', async ({ page }) => {
    const requests = sceneRequests(page)
    await page.goto('/store')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(1500)
    expect(requests).toEqual([])
    await expect(page.locator(TERRAIN)).toHaveAttribute('data-terrain', 'still')
    const before = await layout(page)

    await toFooter(page)
    await expect(page.locator(TERRAIN)).toHaveAttribute('data-terrain', 'live', { timeout: 30_000 })
    expect(requests.length).toBeGreaterThan(0)
    const canvas = page.locator(LIVE)
    await expect(canvas).toHaveCount(1)

    // Decoration: inside a node hidden from assistive technology, and not a tab stop.
    expect(await canvas.evaluate(el => el.closest('[aria-hidden="true"]') !== null)).toBe(true)
    expect(await page.locator(`${LAYER} :is(a, button, input, [tabindex])`).count()).toBe(0)

    // The same on a lazy route. Its chunk takes a moment, and for that moment `<main>` is one
    // screen tall with the Footer right at the fold; that must not count as "near".
    // Mutation: pass `hold={false}` in DemoLayout.tsx -> the module is requested while Care loads.
    const lazyPage = await page.context().newPage()
    const lazyRequests = sceneRequests(lazyPage)
    await lazyPage.route('**/src/demo/pages/Pricing.tsx*', async route => {
      await new Promise(resolve => setTimeout(resolve, 600))
      await route.continue()
    })
    await lazyPage.goto(QUIET_PAGE)
    await expect(lazyPage.getByRole('heading', { level: 1 })).toBeVisible()
    await lazyPage.waitForTimeout(1200)
    expect(lazyRequests).toEqual([])
    await lazyPage.close()

    // Something is drawn, by WebGL, and it is a real context.
    expect(await canvas.evaluate((el: HTMLCanvasElement) => !!el.getContext('webgl2') && !el.getContext('webgl2')!.isContextLost())).toBe(true)
    expect(await inkCoverage(page)).toBeGreaterThan(0.05)

    // It fills the layer, which fills the closing block, which is the footer's full width.
    const boxes = await page.evaluate(
      ([live, closing]) => {
        const c = document.querySelector(live)!.getBoundingClientRect()
        const b = document.querySelector(closing)!.getBoundingClientRect()
        return { canvas: [c.left, c.top, c.width, c.height].map(Math.round), closing: [b.left, b.top, b.width, b.height].map(Math.round), viewport: document.documentElement.clientWidth }
      },
      [LIVE, CLOSING]
    )
    expect(boxes.canvas).toEqual(boxes.closing)
    expect(boxes.closing[0]).toBe(0)
    expect(boxes.closing[2]).toBe(boxes.viewport)

    // The space was reserved: the footer starts where it did and the page is as tall as it was.
    expect(await layout(page)).toEqual(before)

    // It moves on its own, slowly: two looks, a second and a half apart, differ.
    const a = await look(page)
    await page.waitForTimeout(1500)
    expect(Buffer.compare(a, await look(page))).not.toBe(0)
  })

  // The owner asked for no interaction, and there is none: the layer takes no pointer input, so
  // what is under the pointer is the footer, and a click there is a click on nothing.
  // Mutation: remove `pointer-events-none` from the backdrop layer in Footer.tsx and from the
  // stage in Terrain.tsx -> the element under the pointer is the canvas and the first assertion
  // fails.
  test('the pointer passes through it, a click does nothing, and it is not a tab stop', async ({ page }) => {
    await page.goto(QUIET_PAGE)
    await toFooter(page)
    await expect(page.locator(TERRAIN)).toHaveAttribute('data-terrain', 'live', { timeout: 30_000 })
    const strip = await headroom(page)
    const point = { x: strip.x + strip.width / 2, y: strip.y + strip.height / 2 }
    const under = await page.evaluate(({ x, y }) => {
      const el = document.elementFromPoint(x, y)!
      return { tag: el.tagName, inLayer: el.closest('[data-footer-backdrop]') !== null }
    }, point)
    expect(under.inLayer).toBe(false)
    expect(under.tag).not.toBe('CANVAS')
    await page.mouse.move(point.x, point.y)
    await page.mouse.click(point.x, point.y)
    await expect(page.locator(TERRAIN)).toHaveAttribute('data-terrain', 'live')
    await expect(page).toHaveURL(/\/store\/care$/)
    expect(await page.evaluate(() => document.activeElement?.closest('[data-footer-closing]') ?? null)).toBeNull()

    // The keyboard walks past it: the footer's last tab stop is the sign-up's button, and Tab
    // from there leaves the document. Nothing in the closing block takes focus.
    const last = page.getByRole('contentinfo').locator('button[type="submit"]')
    await last.focus()
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => document.activeElement?.closest('[data-footer-closing]') ?? null)).toBeNull()
    expect(await page.evaluate(() => document.activeElement === document.body || document.activeElement === null)).toBe(true)
  })

  // The colours are read from the theme, and so is how they are laid on: added on the dark page,
  // painted on the light one. A flip needs no reload and loses nothing.
  test('a theme flip keeps it live and drawn in both themes', async ({ page }) => {
    await page.goto(QUIET_PAGE)
    await toFooter(page)
    await expect(page.locator(TERRAIN)).toHaveAttribute('data-terrain', 'live', { timeout: 30_000 })
    for (const theme of ['light', 'dark'] as const) {
      await applyTheme(page, theme)
      await page.waitForTimeout(300)
      await expect(page.locator(TERRAIN)).toHaveAttribute('data-terrain', 'live')
      expect(await inkCoverage(page), theme).toBeGreaterThan(0.05)
    }
  })

  // Leaving the demo unmounts its shell, and the terrain with it: the canvas goes and the context
  // is given back, not left to the garbage collector.
  // Mutation: remove `renderer.forceContextLoss()` from scene.ts -> the last assertion fails.
  test('leaving the demo removes the canvas and releases its WebGL context', async ({ page }) => {
    await page.goto(QUIET_PAGE)
    await toFooter(page)
    await expect(page.locator(TERRAIN)).toHaveAttribute('data-terrain', 'live', { timeout: 30_000 })
    const canvas = await page.locator(LIVE).elementHandle()
    expect(await canvas!.evaluate((el: HTMLCanvasElement) => el.getContext('webgl2')!.isContextLost())).toBe(false)
    // A client-side move to the docs shell, by the footer's own link.
    await page.getByRole('contentinfo').getByRole('link', { name: 'Documentation', exact: true }).click()
    await expect(page).toHaveURL(/\/components$/)
    await expect(page.locator(TERRAIN)).toHaveCount(0)
    expect(await canvas!.evaluate((el: HTMLCanvasElement) => el.isConnected)).toBe(false)
    expect(await canvas!.evaluate((el: HTMLCanvasElement) => el.getContext('webgl2')!.isContextLost())).toBe(true)
  })
})

test.describe('the terrain and the hero on one page', () => {
  test.use({ footerTerrain: 'live', heroScene: 'live' })
  test.describe.configure({ timeout: 240_000 })

  // `/store` holds two WebGL scenes. Browsers cap live contexts per page and drop the oldest past
  // the cap, so what matters is that both are alive together and that walking round the demo
  // does not leave contexts behind. Every WebGL context the page creates is recorded as it is
  // made; "live" is the ones not yet lost.
  test('both scenes run together, and moving round the demo does not pile up contexts', async ({ page }) => {
    await page.addInitScript(() => {
      const made: { ctx: WebGL2RenderingContext; canvas: HTMLCanvasElement }[] = []
      ;(window as any).__gl = made
      const original = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
        const ctx = (original as any).call(this, type, ...rest)
        if (ctx && /webgl/.test(type) && !made.some(entry => entry.ctx === ctx)) made.push({ ctx, canvas: this })
        return ctx
      } as any
    })
    const live = () =>
      page.evaluate(() => ((window as any).__gl as { ctx: WebGL2RenderingContext }[]).filter(entry => !entry.ctx.isContextLost()).length)
    const terrainContexts = () =>
      page.evaluate(
        () => ((window as any).__gl as { canvas: HTMLCanvasElement }[]).filter(entry => entry.canvas.dataset.terrainCanvas === 'live').length
      )

    await page.goto('/store')
    const heroCanvas = page.locator('[data-hero-stage] canvas')
    await expect(heroCanvas).toHaveCount(1, { timeout: 60_000 })
    await expect(page.locator('[data-loader]')).toHaveCount(0, { timeout: 150_000 })
    await toFooter(page)
    await expect(page.locator(TERRAIN)).toHaveAttribute('data-terrain', 'live', { timeout: 30_000 })

    // Both alive: the hero's context was not dropped to make room for the terrain's.
    const alive = (canvas: typeof heroCanvas) =>
      canvas.evaluate((el: HTMLCanvasElement) => {
        const gl = el.getContext('webgl2')
        return !!gl && !gl.isContextLost()
      })
    expect(await alive(page.locator(LIVE))).toBe(true)
    expect(await alive(heroCanvas)).toBe(true)
    await expect(page.locator('[data-hero]')).toHaveAttribute('data-hero', 'live')
    expect(await live()).toBe(2)

    // Round the demo, twice. The shell persists across demo routes, so the terrain is never
    // rebuilt; the hero is, on each return home, and has to hand its old context back.
    const nav = page.getByRole('navigation', { name: 'Hexline', exact: true })
    for (let lap = 0; lap < 2; lap++) {
      await nav.getByRole('link', { name: 'Care' }).click()
      await expect(page).toHaveURL(/\/store\/care$/)
      await expect(page.locator('[data-hero-stage] canvas')).toHaveCount(0)
      expect(await live()).toBe(1)
      await nav.getByRole('link', { name: 'Home' }).click()
      await expect(page).toHaveURL(/\/store$/)
      await expect(heroCanvas).toHaveCount(1, { timeout: 60_000 })
      await expect(page.locator('[data-loader]')).toHaveCount(0, { timeout: 150_000 })
      expect(await live()).toBe(2)
    }
    expect(await terrainContexts()).toBe(1)
    await toFooter(page)
    expect(await alive(page.locator(LIVE))).toBe(true)
  })
})
