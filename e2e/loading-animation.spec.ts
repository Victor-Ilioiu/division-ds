import { expect, test, type Page } from './fixtures'

// The WebGL path, in a real browser. jsdom has no WebGL, so the unit suite only ever sees the
// Conveyor fallback; these tests are the proof that the dials themselves draw, move, hold still
// under reduced motion, and follow the theme.

const PAGE = '/components/loading-animation'

async function openDocs(page: Page) {
  await page.goto(PAGE)
  await expect(page.getByRole('heading', { level: 1, name: 'Loading animation' })).toBeVisible()
  // The stage fades in once the scene chunk has loaded and drawn its first frame.
  await expect(page.locator('[data-variant] > [aria-hidden="true"].opacity-100')).toHaveCount(6)
  // Past the draw-on, so every element is on screen.
  await page.waitForTimeout(1200)
}

/** Share of the dial's box that differs from its top-left pixel (the panel behind it). */
async function inkCoverage(page: Page, index: number): Promise<number> {
  const dial = page.locator('[data-variant]').nth(index)
  // The render loop only runs while a dial is on screen, so a dial below the fold has not drawn
  // yet (and plays its draw-on when it arrives). Bring it in and let the draw-on finish.
  await dial.scrollIntoViewIfNeeded()
  await page.waitForTimeout(900)
  const png = await dial.screenshot()
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

test.describe('LoadingAnimation, WebGL', () => {
  test('every dial on the page draws: a canvas with real ink, not an empty box', async ({ page }) => {
    await openDocs(page)
    const count = await page.locator('[data-variant]').count()
    expect(count).toBe(6)
    for (let i = 0; i < count; i++) {
      await expect(page.locator('[data-variant]').nth(i).locator('canvas')).toHaveCount(1)
      // A drawn dial covers a real share of its box with lines; an empty canvas covers none.
      expect(await inkCoverage(page, i), `dial ${i} drew nothing`).toBeGreaterThan(0.04)
    }
  })

  test('the dials move', async ({ page }) => {
    await openDocs(page)
    for (let i = 0; i < 3; i++) {
      const dial = page.locator('[data-variant]').nth(i)
      const a = await dial.screenshot()
      await page.waitForTimeout(400)
      const b = await dial.screenshot()
      expect(Buffer.compare(a, b), `dial ${i} did not move in 400ms`).not.toBe(0)
    }
  })

  test('under reduced motion each dial is one still frame', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openDocs(page)
    for (let i = 0; i < 3; i++) {
      const dial = page.locator('[data-variant]').nth(i)
      const a = await dial.screenshot()
      await page.waitForTimeout(500)
      const b = await dial.screenshot()
      expect(Buffer.compare(a, b), `dial ${i} moved under reduced motion`).toBe(0)
      expect(await inkCoverage(page, i)).toBeGreaterThan(0.04)
    }
  })

  // The scene reads its colours from the tokens, and re-reads them when the theme flips. Held
  // still (reduced motion), so the only thing that can change the frame is the flip itself.
  test('a theme flip recolours a dial in place', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openDocs(page)
    const dial = page.locator('[data-variant]').first()
    const before = await dial.screenshot()
    const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
    await page.evaluate(t => document.documentElement.setAttribute('data-theme', t === 'light' ? 'dark' : 'light'), theme)
    await page.waitForTimeout(300)
    expect(Buffer.compare(before, await dial.screenshot())).not.toBe(0)
  })

  // Each dial holds a WebGL context and browsers cap them, so leaving the page must release them.
  test('navigating away removes every loader canvas', async ({ page }) => {
    await openDocs(page)
    await page.getByRole('navigation', { name: 'Documentation' }).getByRole('link', { name: 'All components', exact: true }).click()
    await expect(page).toHaveURL(/\/components$/)
    await expect(page.locator('canvas[data-engine]')).toHaveCount(0)
  })
})
