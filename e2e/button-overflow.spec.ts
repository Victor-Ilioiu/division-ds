import { test, expect } from './fixtures'
import type { Page } from '@playwright/test'

/**
 * Hovering a Button never makes the box around it scroll.
 *
 * The bug: a command center's scrolling <nav> showed both scrollbars while its bottom-left button
 * was hovered, because the hover brackets were a box positioned outside the button, and every such
 * box counts as scrollable overflow. Nothing about the nav was wrong, so this builds the plainest
 * possible scroller and asks no opt-in class of it. Only a real browser computes scrollable
 * overflow, so this cannot be a unit test.
 */

/** Moves a real Button from the docs page into a scroller it exactly fills, flush on every edge,
 *  so any overflow at all shows up as scrollWidth > clientWidth. Returns nothing: the box is
 *  #overflow-box and the button is its only control. */
async function buttonFlushInScroller(page: Page, name: string) {
  await page.goto('/components/button')
  const source = page.getByRole('button', { name, exact: true }).first()
  await source.waitFor()
  await page.evaluate(() => document.fonts.ready)
  await source.evaluate(button => {
    const wrap = button.parentElement!
    const box = document.createElement('nav')
    box.id = 'overflow-box'
    box.style.cssText = 'position:fixed;left:100px;top:100px;overflow:auto;z-index:9999;line-height:0'
    box.appendChild(wrap)
    document.body.appendChild(box)
    box.style.width = `${wrap.getBoundingClientRect().width}px`
    box.style.height = `${wrap.getBoundingClientRect().height}px`
  })
  return page.locator('#overflow-box button')
}

for (const name of ['Dispatch team', 'Save draft', 'Cancel']) {
  test(`hovering "${name}" flush in a scroller adds no overflow on any frame`, async ({ page }) => {
    const button = await buttonFlushInScroller(page, name)

    // Sampled every frame from before the pointer arrives until well after it settles: the old
    // bracket overflowed most during the close-in, so a single reading at the end could miss it.
    const sampling = page.evaluate(
      () =>
        new Promise<{ x: number; y: number; frames: number }>(resolve => {
          const box = document.getElementById('overflow-box')!
          const worst = { x: 0, y: 0, frames: 0 }
          const t0 = performance.now()
          const tick = () => {
            worst.x = Math.max(worst.x, box.scrollWidth - box.clientWidth)
            worst.y = Math.max(worst.y, box.scrollHeight - box.clientHeight)
            worst.frames += 1
            if (performance.now() - t0 < 700) requestAnimationFrame(tick)
            else resolve(worst)
          }
          tick()
        })
    )
    await button.hover()
    const worst = await sampling

    expect(worst.frames, 'too few frames sampled to catch a transient').toBeGreaterThan(8)
    expect(worst, 'scrollable overflow while hovered, in px').toMatchObject({ x: 0, y: 0 })
  })
}

/** Counts pixels of the bracket colour in a band around the button. A guard on the fix: brackets
 *  that stopped overflowing because they stopped painting would pass the test above. */
test('the brackets still paint on all four corners, 5px out, and only at the corners', async ({ page }) => {
  await page.goto('/components/button')
  const button = page.getByRole('button', { name: 'Save draft', exact: true }).first()
  await button.waitFor()
  await page.evaluate(() => document.fonts.ready)
  await button.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }))
  await button.hover()
  await page.waitForTimeout(500)
  // The wrapper, not the button: the brackets are placed against it, and it can stand taller.
  const b = (await button.locator('..').boundingBox())!
  const reach = 5
  const png = await page.screenshot({
    clip: { x: b.x - reach, y: b.y - reach, width: b.width + reach * 2, height: b.height + reach * 2 },
  })

  const lit = await page.evaluate(async base64 => {
    const image = new Image()
    image.src = `data:image/png;base64,${base64}`
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = image.width
    canvas.height = image.height
    const context = canvas.getContext('2d')!
    context.drawImage(image, 0, 0)
    // The probe paints the token and reads it back, so this holds in either theme.
    const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
    probe.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-accent-signal-fill')
    probe.fillRect(0, 0, 1, 1)
    const [r, g, b] = probe.getImageData(0, 0, 1, 1).data
    const isBracket = (x: number, y: number) => {
      const p = context.getImageData(x, y, 1, 1).data
      return Math.abs(p[0] - r) + Math.abs(p[1] - g) + Math.abs(p[2] - b) < 30
    }
    const w = image.width
    const h = image.height
    return {
      // In the middle of each 2px arm, on both arms of each corner.
      corners: [
        isBracket(4, 1), isBracket(1, 4),
        isBracket(w - 5, 1), isBracket(w - 2, 4),
        isBracket(4, h - 2), isBracket(1, h - 5),
        isBracket(w - 5, h - 2), isBracket(w - 2, h - 5),
      ],
      // Past the 10px arm along the top and left edges: must be empty, or it is a box, not brackets.
      gaps: [isBracket(14, 1), isBracket(1, Math.floor(h / 2)), isBracket(Math.floor(w / 2), 1)],
    }
  }, png.toString('base64'))

  expect(lit.corners, 'each corner paints both arms').toEqual(Array(8).fill(true))
  expect(lit.gaps, 'nothing paints between the corners').toEqual([false, false, false])
})
