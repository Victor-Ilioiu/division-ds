import type { Page } from '@playwright/test'
import { PRODUCT_VIEWER } from '../src/demo/content'
import { PRODUCT_MODELS } from '../src/demo/scene/products.js'
import { applyTheme, expect, expectAxeClean, settleAnimations, test, THEMES } from './fixtures'

// The product page's 3D viewer, in a real browser. jsdom has no WebGL, so ProductMedia.test.tsx
// drives a stand-in scene; this is the file where the real one runs: it starts by itself over
// the cutout without moving anything or taking focus, it lands where the cutout was, it draws,
// the keyboard turns it, a plain wheel still scrolls the page, and walking through products
// never leaves more than one canvas alive. Under reduced motion nothing of it is fetched. The
// `consoleErrors` fixture fails any test here that logs an error, the scene's own included.

// The same flags e2e/hero.spec.ts launches with: a real GPU where the machine has one, software
// rendering where it does not. File-level because launch options belong to the worker.
test.use({
  launchOptions: {
    args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'],
  },
})

const MEDIA = '[data-product-view]'
const STAGE = '[data-product-stage]'
const VIEWER_ENTRY = '**/src/demo/scene/viewer.js*'

/** Requests for the viewer's entry module and for three.js, as the dev server serves them, so a
 *  test can say neither was ever fetched. */
function sceneRequests(page: Page): string[] {
  const seen: string[] = []
  page.on('request', request => {
    if (/\/src\/demo\/scene\/(viewer|hero)\.js|\/src\/demo\/scene\/models\/|[/_]three(\.module)?(\.js|_)|deps\/three/.test(request.url())) {
      seen.push(request.url())
    }
  })
  return seen
}

const frame = (page: Page) => page.getByRole('application')

type View = { az: number; el: number; zoom: number; idle: boolean }
type Limits = { elMin: number; elMax: number; zoomMin: number; zoomMax: number }

/** What the running scene says its view is (`window.__productViewer`, set by viewer.js). */
async function view(page: Page): Promise<View> {
  return page.evaluate(() => (window as any).__productViewer.view)
}

/** The limits the running scene clamps to: the elevation ceiling is the stage's, not VIEW_LIMITS'. */
async function limits(page: Page): Promise<Limits> {
  return page.evaluate(() => (window as any).__productViewer.limits)
}

/** Waits for the model to have landed. */
async function landed(page: Page) {
  await expect(page.locator(MEDIA)).toHaveAttribute('data-product-view', 'viewer', { timeout: 120_000 })
}

async function rect(page: Page, selector: string) {
  return page.locator(selector).first().evaluate(el => {
    const { top, left, width, height } = el.getBoundingClientRect()
    return { top: Math.round(top + window.scrollY), left: Math.round(left), width: Math.round(width), height: Math.round(height) }
  })
}

/** Shows only one layer of the stage over a flat box: the cutout (`'cutout'`), the canvas
 *  (`'model'`), or both as the page has them (`null`). The plinth's SVG is hidden for the first
 *  two, so what differs from the corner pixel is the product and nothing under it. */
async function only(page: Page, layer: 'cutout' | 'model' | null) {
  await page.locator(STAGE).evaluate((stage, which) => {
    const svg = stage.querySelector('svg') as unknown as HTMLElement
    const img = stage.querySelector('img') as HTMLElement
    const app = stage.querySelector('[role="application"]') as HTMLElement | null
    svg.style.visibility = which ? 'hidden' : ''
    img.style.transition = which ? 'none' : ''
    img.style.opacity = which === 'cutout' ? '1' : ''
    img.style.visibility = which === 'model' ? 'hidden' : ''
    if (app) app.style.visibility = which === 'cutout' ? 'hidden' : ''
  }, layer)
}

/** The stage as a screenshot, read back as: the share of pixels that differ from the top-left
 *  one, and the box round them, in CSS px. */
async function ink(page: Page): Promise<{ share: number; x0: number; y0: number; x1: number; y1: number }> {
  const png = await page.locator(STAGE).screenshot()
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
    let count = 0
    let x0 = Infinity
    let y0 = Infinity
    let x1 = -1
    let y1 = -1
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < c.width; x++) {
        const i = (y * c.width + x) * 4
        if (Math.abs(data[i] - r0) + Math.abs(data[i + 1] - g0) + Math.abs(data[i + 2] - b0) <= 40) continue
        count++
        x0 = Math.min(x0, x)
        y0 = Math.min(y0, y)
        x1 = Math.max(x1, x)
        y1 = Math.max(y1, y)
      }
    }
    return { share: count / (c.width * c.height), x0, y0, x1, y1 }
  }, png.toString('base64'))
}

test.describe('the product page: the cutout first, then the model, unasked', () => {
  // Mutation: add `frame.current?.focus()` when the viewer starts or lands -> the focus checks fail.
  test('starts the 3D view by itself, with no button, and leaves focus where the page put it', async ({ page }) => {
    await page.goto('/store/shop/kestrel-c')
    await expect(page.getByRole('heading', { level: 1, name: 'Kestrel C carbine replica' })).toBeVisible()
    const cutout = page.locator(`${STAGE} img`)
    await expect(cutout).toHaveAttribute('src', '/media/products/cutout/kestrel-c.webp')
    await expect.poll(() => cutout.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth)).toBeGreaterThan(0)
    await expect(page.getByRole('button', { name: /view in 3d|back to photo/i })).toHaveCount(0)
    await landed(page)
    // `main canvas`, here and below: the demo Footer holds a canvas of its own on every page (the
    // terrain's still), and it is not the viewer's.
    await expect(page.locator('main canvas')).toHaveCount(1)
    expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true)
    await expect(frame(page)).not.toBeFocused()
    // It is a control like any other: reached by Tab.
    await frame(page).focus()
    await expect(frame(page)).toHaveAccessibleName(PRODUCT_VIEWER.label('Kestrel C carbine replica'))
  })

  // Under reduced motion the viewer does not start at all: the cutout, still, and nothing fetched.
  // Mutation: drop `allowed &&` from `viewing` in ProductMedia.tsx -> the scene is requested.
  test('reduced motion gets the still cutout and requests neither the viewer, a model, nor three.js', async ({ page }) => {
    const requests = sceneRequests(page)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/store/shop/kestrel-c')
    await expect(page.locator(`${STAGE} img`)).toBeVisible()
    await page.waitForTimeout(2500)
    await expect(frame(page)).toHaveCount(0)
    await expect(page.getByRole('group', { name: PRODUCT_VIEWER.controls })).toHaveCount(0)
    await expect(page.locator(MEDIA)).toHaveAttribute('data-product-view', 'cutout')
    await expect(page.locator('main canvas')).toHaveCount(0)
    expect(requests).toEqual([])
  })

  // The failure path with the real component and a real chunk request: the entry module is
  // answered with one that refuses to start, the way e2e/fixtures.ts switches the hero off.
  test('a viewer that will not start leaves the cutout, says so without taking focus, and logs no error', async ({ page }) => {
    await page.route(VIEWER_ENTRY, route =>
      route.fulfill({
        status: 200,
        contentType: 'text/javascript',
        body: `export async function startViewer() { throw new Error('The viewer is switched off for this test.') }\n`,
      })
    )
    await page.goto('/store/shop/dummy-radio')
    const notice = page.getByText(PRODUCT_VIEWER.unavailable)
    await expect(notice).toBeVisible()
    // Focus was never in the viewer, so the message does not take it.
    await expect(notice).not.toBeFocused()
    await expect(page.locator(MEDIA)).toHaveAttribute('data-product-view', 'cutout')
    await expect(page.locator(`${STAGE} img`)).toBeVisible()
    await expect(frame(page)).toHaveCount(0)
    await expect(page.locator('main canvas')).toHaveCount(0)
    for (const theme of THEMES) {
      await applyTheme(page, theme)
      await expectAxeClean(page)
    }
  })
})

test.describe('the viewer, up', () => {
  // One scene at a time: these run in order in one worker, whatever the config's parallelism.
  test.describe.configure({ mode: 'default', timeout: 180_000 })

  test('lands where the cutout was, draws, and moves nothing on the page', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.addInitScript(() => {
      ;(window as any).__cls = 0
      const po = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          const e = entry as unknown as { hadRecentInput: boolean; value: number }
          if (!e.hadRecentInput) (window as any).__cls += e.value
        }
      })
      po.observe({ type: 'layout-shift', buffered: true })
    })
    // Held still (reduced motion, forced on), so the model is compared at the cutout's own angle,
    // not a few degrees into its idle turn.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/store/shop/harrier-lr?fx=force')
    await page.evaluate(() => document.fonts.ready)
    // The toolbar and the instructions are there from the start, so the model landing adds none.
    await expect(page.getByText(PRODUCT_VIEWER.instructions)).toBeVisible()
    await expect(page.getByRole('group', { name: PRODUCT_VIEWER.controls })).toBeVisible()
    const boxBefore = await rect(page, STAGE)
    const formBefore = await rect(page, 'form')
    const tabsBefore = await rect(page, '[role="tablist"]')
    // The layout-shift total so far. A direct load of this lazy route has shifts of its own (the
    // Footer moves when the page's chunk lands), which are not what this test is about.
    const shiftBefore: number = await page.evaluate(() => (window as any).__cls)

    await landed(page)
    await expect(page.locator(STAGE).getByRole('status')).toHaveCount(0)
    const canvas = page.locator(`${STAGE} canvas`)
    await expect(canvas).toHaveCount(1)
    expect(await canvas.evaluate(el => el.closest('[aria-hidden="true"]') !== null)).toBe(true)
    await settleAnimations(page)
    // Once faded in, the model is what shows: the cutout under it is hidden.
    expect(await page.locator(`${STAGE} img`).evaluate(img => getComputedStyle(img).opacity)).toBe('0')

    // Nothing moved when the model landed.
    expect(await rect(page, STAGE)).toEqual(boxBefore)
    expect(await rect(page, 'form')).toEqual(formBefore)
    // Allowed to move by the loading line's going only if it had wrapped: at 1280 it does not.
    expect(await rect(page, '[role="tablist"]')).toEqual(tabsBefore)
    expect((await page.evaluate(() => (window as any).__cls)) - shiftBefore).toBeLessThan(0.01)

    // Where it landed: the model's own box against the cutout's, each drawn alone over a flat
    // stage, within 3 CSS px on every side. The same camera shot the cutout (`renders.mjs
    // --cutout`), and the view offset applies the stage's placement (`cutoutPlacement`).
    // Mutation: drop `options.place` from `frameTo` in viewer.js -> the model fills the box and
    // overshoots the cutout's box by tens of pixels.
    await only(page, 'cutout')
    const still = await ink(page)
    await only(page, 'model')
    const live = await ink(page)
    await only(page, null)
    // Something is drawn, and about as much of it as the cutout shows (a rifle is a thin thing:
    // about 5% of the box).
    expect(live.share).toBeGreaterThan(still.share * 0.8)
    expect(live.share).toBeLessThan(still.share * 1.25)
    for (const side of ['x0', 'y0', 'x1', 'y1'] as const) {
      expect(Math.abs(live[side] - still[side]), `${side}: model ${live[side]}, cutout ${still[side]}`).toBeLessThanOrEqual(3)
    }
  })

  test('the keyboard turns, tilts, zooms and resets, inside the limits', async ({ page }) => {
    // Held still, so the starting view can be read exactly; the idle turn has its own test.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/store/shop/kestrel-c?fx=force')
    await landed(page)
    const start = PRODUCT_MODELS['kestrel-c']
    const bounds = await limits(page)
    await frame(page).focus()

    // Held still by reduced motion; the starting view is the cutout's own angle, which is the
    // row in the table.
    let now = await view(page)
    expect(now.idle).toBe(false)
    expect(now.az).toBeCloseTo(start.az, 5)
    expect(now.el).toBeCloseTo(start.el, 5)
    expect(now.zoom).toBeCloseTo(start.zoom, 5)
    await page.waitForTimeout(300)
    const before = await page.locator(STAGE).screenshot()

    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    now = await view(page)
    expect(now.az).toBeCloseTo(start.az + 30, 5)
    await page.keyboard.press('ArrowLeft')
    expect((await view(page)).az).toBeCloseTo(start.az + 15, 5)
    await page.keyboard.press('ArrowUp')
    expect((await view(page)).el).toBeCloseTo(start.el + 10, 5)
    await page.keyboard.press('+')
    expect((await view(page)).zoom).toBeLessThan(start.zoom)
    await page.keyboard.press('-')
    await page.keyboard.press('-')
    expect((await view(page)).zoom).toBeGreaterThan(start.zoom)
    // The picture really changed: not only the numbers.
    await page.waitForTimeout(300)
    expect(Buffer.compare(before, await page.locator(STAGE).screenshot())).not.toBe(0)

    // The limits hold however long a key is leaned on. The ceiling is the stage's: the plinth is
    // drawn, and does not tilt with the model (STAGE_EL_MAX in viewer.js).
    expect(bounds.elMax).toBe(40)
    for (let i = 0; i < 12; i++) await page.keyboard.press('ArrowUp')
    expect((await view(page)).el).toBe(bounds.elMax)
    for (let i = 0; i < 12; i++) await page.keyboard.press('ArrowDown')
    expect((await view(page)).el).toBe(bounds.elMin)
    for (let i = 0; i < 12; i++) await page.keyboard.press('+')
    expect((await view(page)).zoom).toBeCloseTo(bounds.zoomMin, 5)
    for (let i = 0; i < 16; i++) await page.keyboard.press('-')
    expect((await view(page)).zoom).toBeCloseTo(bounds.zoomMax, 5)
    await page.keyboard.press('Home')
    expect((await view(page)).el).toBeCloseTo(start.el, 5)

    // Focus is not trapped: Tab goes on to the toolbar's first button.
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: PRODUCT_VIEWER.rotateLeft })).toBeFocused()
  })

  // "A page that stops scrolling when the cursor crosses a canvas is a bug."
  // Mutation: remove `if (!e.ctrlKey && !e.metaKey) return` from the wheel listener in viewer.js
  // -> the plain wheel zooms and the page does not scroll.
  test('Ctrl and wheel zooms the model and leaves the page; a plain wheel over the model scrolls the page', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 600 })
    await page.goto('/store/shop/kestrel-c')
    await landed(page)
    const start = await view(page)
    const scrollStart = await page.evaluate(() => window.scrollY)
    const box = (await page.locator(STAGE).boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + Math.min(box.height / 2, 200))

    // Ctrl held: the model zooms out and the page stays where it is.
    await page.keyboard.down('Control')
    await page.mouse.wheel(0, 300)
    await page.keyboard.up('Control')
    await expect.poll(async () => (await view(page)).zoom).toBeGreaterThan(start.zoom)
    const zoomed = (await view(page)).zoom
    await page.waitForTimeout(500)
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollStart)

    // No key held: the page scrolls and the model does not zoom.
    await page.mouse.wheel(0, 300)
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(scrollStart + 100)
    expect((await view(page)).zoom).toBe(zoomed)
  })

  test('the model turns slowly by itself once it has landed, and stops for good at a key press', async ({ page }) => {
    await page.goto('/store/shop/kestrel-c')
    await landed(page)
    const first = await view(page)
    expect(first.idle).toBe(true)
    await expect.poll(async () => (await view(page)).az).toBeGreaterThan(first.az + 1)
    await frame(page).focus()
    await page.keyboard.press('ArrowRight')
    const settled = await view(page)
    expect(settled.idle).toBe(false)
    await page.waitForTimeout(500)
    expect((await view(page)).az).toBe(settled.az)
  })

  test('a drag turns the model, and the toolbar does what the keys do', async ({ page }) => {
    await page.goto('/store/shop/bbs-028')
    await landed(page)
    const start = await view(page)
    const box = (await page.locator(STAGE).boundingBox())!
    await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.5)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.6, { steps: 8 })
    await page.mouse.up()
    const dragged = await view(page)
    expect(dragged.az).toBeGreaterThan(start.az + 10)
    expect(dragged.el).toBeGreaterThan(start.el)

    await page.getByRole('button', { name: PRODUCT_VIEWER.rotateLeft }).click()
    expect((await view(page)).az).toBeCloseTo(dragged.az - 15, 5)
    await page.getByRole('button', { name: PRODUCT_VIEWER.zoomIn }).click()
    expect((await view(page)).zoom).toBeLessThan(dragged.zoom)
    // Reset goes back to the cutout's own angle, the row in the table; `start` was read a moment
    // into the idle turn.
    await page.getByRole('button', { name: PRODUCT_VIEWER.reset }).click()
    expect((await view(page)).az).toBeCloseTo(PRODUCT_MODELS['bbs-028'].az, 5)
  })

  // Browsers allow a page about sixteen WebGL contexts and drop the oldest past that, with a
  // console warning. A walk of twenty client-side navigations, each starting a viewer, stays
  // silent only if every product gives its context back when the visitor leaves it.
  // Mutation: remove `renderer?.forceContextLoss()` from `release` in viewer.js -> Chromium warns
  // "Too many active WebGL contexts" before the walk ends and the last assertion fails.
  test('walking across products never holds more than one canvas or leaks a context', async ({ page }) => {
    const tooMany: string[] = []
    page.on('console', message => {
      if (/too many active webgl contexts/i.test(message.text())) tooMany.push(message.text())
    })
    const productId = () => page.evaluate(() => ((window as any).__productViewer?.productId ?? null) as string | null)
    const canvases = page.locator('main canvas')

    await page.goto('/store/shop/bbs-028')
    await landed(page)
    expect(await productId()).toBe('bbs-028')
    // Through the related grid: the old canvas goes with the old product.
    await page.getByRole('link', { name: 'Green gas, 600 ml' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Green gas, 600 ml' })).toBeVisible()
    await landed(page)
    await expect(canvases).toHaveCount(1)
    expect(await productId()).toBe('green-gas')
    await only(page, 'model')
    expect((await ink(page)).share).toBeGreaterThan(0.02)
    await only(page, null)

    // Back and forward through history, twenty times, each landing on a running viewer.
    for (let i = 0; i < 20; i++) {
      const back = i % 2 === 0
      if (back) await page.goBack()
      else await page.goForward()
      const id = back ? 'bbs-028' : 'green-gas'
      await expect.poll(productId, { timeout: 120_000 }).toBe(id)
      await landed(page)
      await expect(canvases).toHaveCount(1)
    }
    expect(tooMany).toEqual([])
  })

  // A context taken away while the viewer is up (a driver reset, the browser reclaiming one).
  test('a lost WebGL context goes back to the cutout and says so, with no console error', async ({ page }) => {
    await page.goto('/store/shop/dummy-radio')
    await landed(page)
    await page.evaluate(() => (window as any).__productViewer.renderer.forceContextLoss())
    await expect(page.getByText(PRODUCT_VIEWER.unavailable)).toBeVisible()
    await expect(page.locator(MEDIA)).toHaveAttribute('data-product-view', 'cutout')
    await expect(page.locator('main canvas')).toHaveCount(0)
    await expect(page.locator(`${STAGE} img`)).toBeVisible()
    await expect(frame(page)).toHaveCount(0)
  })

  // `?fx=force` is the reviewer's switch (src/fx/core/gate.ts): the viewer starts although the OS
  // asks for reduced motion. It also holds the rest of the page still for axe.
  test('with the viewer up the page is axe clean in both themes, and the model does not turn by itself', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/store/shop/kestrel-c-kit?fx=force')
    await landed(page)
    const first = await view(page)
    expect(first.idle).toBe(false)
    await page.waitForTimeout(600)
    expect((await view(page)).az).toBe(first.az)
    expect(first.az).toBeCloseTo(PRODUCT_MODELS['kestrel-c-kit'].az, 5)
    for (const theme of THEMES) {
      await applyTheme(page, theme)
      await settleAnimations(page)
      await expectAxeClean(page)
    }
  })
})
