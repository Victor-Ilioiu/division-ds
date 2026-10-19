import { test, expect } from './fixtures'
import type { Locator, Page } from '@playwright/test'

/**
 * The Switch thumb, measured in a real browser.
 *
 * Everything this file holds is geometry over time, and the unit test cannot see either: jsdom has
 * no layout, every class involved is a variant that sits inert in the DOM whatever the state is,
 * and the squash is a Web Animations call that jsdom does not implement.
 *
 * 1. FRAMING. The thumb is the same size on and off and sits the same distance inside a border
 *    that is visible in both. (The track once filled with the accent when on, which hid its own
 *    border; the thumb then sat in a wider-looking margin and read as smaller.)
 * 2. PRESS. Held, the thumb stretches 4px along the track from the edge it rests on: to the
 *    right when off, to the LEFT when on. Its far edge does not move on any frame of the press,
 *    which is the check that it never spills out of the track.
 * 3. SQUASH AND STRETCH, at its minimum. Flipped, the thumb's body is a little longer than
 *    itself in flight, a little shorter against the far edge, then its own shape, with no
 *    rebound. Under reduced motion it never changes shape.
 *
 * Two elements are measured. The Radix Thumb carries position and size; its child, the body,
 * carries the squash. A transform on the body does not change the Thumb's box, which is what lets
 * the first two groups read exact numbers while the third is in flight.
 */

const THUMB = 16
const STRETCH = 4

/** The page, once its web fonts are in. They swap after load and move everything below the title
 *  by a line; a press that straddles the swap goes down on the switch and comes up on the panel
 *  behind it, which is no click at all. organisms.spec.ts waits on the same promise. */
async function open(page: Page) {
  await page.goto('/components/switch')
  await page.evaluate(() => document.fonts.ready)
}

type Box = { state: string | undefined; width: number; height: number; left: number; right: number; top: number; bottom: number }

/** The Thumb's size and its distance from each outer edge of the track, in CSS pixels. */
async function thumbOf(control: Locator): Promise<Box> {
  return control.evaluate(root => {
    const track = root.getBoundingClientRect()
    const thumb = root.firstElementChild!.getBoundingClientRect()
    const round = (value: number) => Math.round(value * 100) / 100
    return {
      state: (root as HTMLElement).dataset.state,
      width: round(thumb.width),
      height: round(thumb.height),
      left: round(thumb.left - track.left),
      right: round(track.right - thumb.right),
      top: round(thumb.top - track.top),
      bottom: round(track.bottom - thumb.bottom),
    }
  })
}

/** Polls until the Thumb is `width` wide and in `state`, and its box has stopped changing.
 *  Waiting for "two equal reads" alone is not enough: the first two reads after a press can both
 *  land before the transition has moved at all. toBeCloseTo, to a twentieth of a pixel, because
 *  a read taken on the curve's last frame is the settled thumb, not a different result. */
async function settledAt(control: Locator, width: number, state: 'checked' | 'unchecked'): Promise<Box> {
  await expect.poll(async () => (await thumbOf(control)).state, `state ${state}`).toBe(state)
  await expect.poll(async () => (await thumbOf(control)).width, `thumb ${width}px wide`).toBeCloseTo(width, 1)
  let previous = await thumbOf(control)
  await expect
    .poll(async () => {
      const next = await thumbOf(control)
      const same = JSON.stringify(next) === JSON.stringify(previous)
      previous = next
      return same
    })
    .toBe(true)
  return previous
}

type Frames = { widths: number[]; heights: number[]; lefts: number[]; rights: number[] }

/** Starts sampling the BODY's box on every animation frame for `ms`, optionally clicking first.
 *  Sampled in the page: a round trip per frame from here would miss most of them. Returns a
 *  promise so a press can be made from the test while the sampling runs. */
function sampleBody(control: Locator, ms: number, click = false): Promise<Frames> {
  return control.evaluate(
    (root, [duration, doClick]) =>
      new Promise<Frames>(resolve => {
        const body = root.firstElementChild!.firstElementChild!
        const frames: Frames = { widths: [], heights: [], lefts: [], rights: [] }
        const started = performance.now()
        if (doClick) (root as HTMLElement).click()
        const tick = () => {
          const track = root.getBoundingClientRect()
          const box = body.getBoundingClientRect()
          frames.widths.push(box.width)
          frames.heights.push(box.height)
          frames.lefts.push(box.left - track.left)
          frames.rights.push(track.right - box.right)
          if (performance.now() - started < (duration as number)) requestAnimationFrame(tick)
          else resolve(frames)
        }
        requestAnimationFrame(tick)
      }),
    [ms, click] as const
  )
}

for (const theme of ['dark', 'light'] as const) {
  test(`Switch: the thumb is the same size in the same frame on and off, in ${theme} theme`, async ({ page }) => {
    await open(page)
    await page.evaluate(value => document.documentElement.setAttribute('data-theme', value), theme)
    const off = await settledAt(page.locator('#state-off'), THUMB, 'unchecked')
    const on = await settledAt(page.locator('#state-on'), THUMB, 'checked')

    expect([on.width, on.height]).toEqual([off.width, off.height])
    expect(on.right, 'gap beside the thumb').toBe(off.left)
    expect([on.top, on.bottom]).toEqual([off.top, off.bottom])

    // The frame is there to be measured against in both states: the track keeps one fill, and
    // the border is a different colour from it, on as well as off.
    const paint = (id: string) =>
      page.locator(id).evaluate(root => {
        const style = getComputedStyle(root)
        return { border: style.borderTopColor, fill: style.backgroundColor }
      })
    // Polled: the theme was set a moment ago and the fills are still fading to it.
    await expect
      .poll(async () => (await paint('#state-on')).fill === (await paint('#state-off')).fill, 'the track does not change fill')
      .toBe(true)
    const [offPaint, onPaint] = [await paint('#state-off'), await paint('#state-on')]
    expect(onPaint.border).not.toBe(onPaint.fill)
    expect(onPaint.border, 'the border is what changes').not.toBe(offPaint.border)
  })
}

test('Switch: on, the thumb takes the accent, and the border keeps it under the pointer', async ({ page }) => {
  await open(page)
  const on = page.locator('#state-on')
  await settledAt(on, THUMB, 'checked')
  const read = () =>
    on.evaluate(root => ({
      border: getComputedStyle(root).borderTopColor,
      thumb: getComputedStyle(root.firstElementChild!.firstElementChild!).backgroundColor,
    }))
  const rest = await read()
  expect(rest.thumb, 'thumb and border are one colour').toBe(rest.border)
  await on.hover()
  // The hover rule for an off switch is more specific than a bare data-state rule; without its
  // own on-and-hovered rule the accent border went grey for as long as the pointer stayed.
  await expect.poll(async () => (await read()).border).toBe(rest.border)
})

test('Switch: pressed, the thumb stretches away from the edge it rests on, and never past it', async ({ page }) => {
  await open(page)
  const control = page.locator('#state-on')
  const on = await settledAt(control, THUMB, 'checked')

  // `hover()` before every press, never coordinates read once at the top: a press aimed at where
  // the switch used to be lands on the panel behind it.
  await control.hover()
  const held = sampleBody(control, 400)
  await page.mouse.down()
  const pressing = await held
  const pressedOn = await settledAt(control, THUMB + STRETCH, 'checked')

  // On, it grows to the left. The right edge is where it was on every frame of the press, not
  // only at the end: with position and width on different curves it wandered out past the track
  // for a few frames and came back, and an assertion on the settled box never saw it.
  expect(pressedOn.right).toBeCloseTo(on.right, 1)
  expect(pressedOn.left).toBeCloseTo(on.left - STRETCH, 1)
  expect(Math.min(...pressing.rights), 'smallest gap to the right edge during the press').toBeGreaterThan(on.right - 0.05)
  expect(Math.max(...pressing.rights)).toBeLessThan(on.right + 0.05)

  // Released, it travels to the other side. Now the left edge is the one it is heading for.
  const releasing = sampleBody(control, 500)
  await page.mouse.up()
  const travel = await releasing
  const off = await settledAt(control, THUMB, 'unchecked')
  expect(off.left).toBe(on.right)
  expect(Math.min(...travel.lefts), 'never past the left edge').toBeGreaterThan(off.left - 0.05)
  expect(Math.min(...travel.rights), 'never past the right edge').toBeGreaterThan(on.right - 0.05)

  // And the other way: off, it grows to the right, and its left edge is the one that holds.
  await control.hover()
  const heldOff = sampleBody(control, 400)
  await page.mouse.down()
  const pressingOff = await heldOff
  const pressedOff = await settledAt(control, THUMB + STRETCH, 'unchecked')
  expect(pressedOff.left).toBeCloseTo(off.left, 1)
  expect(Math.min(...pressingOff.lefts)).toBeGreaterThan(off.left - 0.05)
  await page.mouse.up()
  expect((await settledAt(control, THUMB, 'checked')).right).toBe(on.right)
})

test('Switch: holding Space stretches the thumb too', async ({ page }) => {
  await open(page)
  const control = page.locator('#state-off')
  await settledAt(control, THUMB, 'unchecked')
  await control.focus()
  await page.keyboard.down('Space')
  await settledAt(control, THUMB + STRETCH, 'unchecked')
  await page.keyboard.up('Space')
  await settledAt(control, THUMB, 'checked')
})

test('Switch: a disabled switch does not stretch', async ({ page }) => {
  await open(page)
  const control = page.locator('button[role="switch"][disabled]').first()
  const rest = await thumbOf(control)
  await control.hover({ force: true })
  await page.mouse.down()
  // Long enough for a stretch to have run, had there been one: the transition is 180ms.
  await page.waitForTimeout(400)
  expect((await thumbOf(control)).width).toBe(rest.width)
  await page.mouse.up()
})

test('Switch: flipped, the body gives once against the far edge and does not bounce', async ({ page }) => {
  await open(page)
  // 320ms is the settle (`--duration-slow`); the margin lets the last frames land.
  const { widths, heights, rights } = await sampleBody(page.locator('#state-off'), 600, true)
  const longest = Math.max(...widths)
  const shortest = Math.min(...widths)
  const squashAt = widths.indexOf(shortest)

  // There is a squash and stretch at all...
  expect(longest, 'a little longer in flight').toBeGreaterThan(THUMB * 1.04)
  expect(shortest, 'a little shorter against the edge').toBeLessThan(THUMB * 0.97)
  expect(widths.indexOf(longest), 'the stretch comes before the squash').toBeLessThan(squashAt)
  // ...in which longer is thinner and shorter is taller: a change of shape, not of size...
  expect(heights[widths.indexOf(longest)]).toBeLessThan(THUMB)
  expect(heights[squashAt]).toBeGreaterThan(THUMB)
  // ...and it is small. "Too bouncy" was the review of a version that reached 1.26 and 0.76.
  expect(longest).toBeLessThan(THUMB * 1.12)
  expect(shortest).toBeGreaterThan(THUMB * 0.9)

  // No rebound: after the squash the width only comes back up to its own, and never passes it.
  const afterSquash = widths.slice(squashAt)
  expect(Math.max(...afterSquash), 'widest frame after the squash').toBeLessThan(THUMB + 0.05)
  for (let index = 1; index < afterSquash.length; index++) {
    expect(afterSquash[index], `frame ${index} after the squash`).toBeGreaterThan(afterSquash[index - 1] - 0.05)
  }
  expect(widths.at(-1)).toBeCloseTo(THUMB, 1)
  expect(heights.at(-1)).toBeCloseTo(THUMB, 1)

  // Smooth: no frame differs from the one before it by more than a pixel or so.
  const steps = widths.slice(1).map((width, index) => Math.abs(width - widths[index]))
  expect(Math.max(...steps), 'largest change in width between two frames').toBeLessThan(1.5)

  // It never leaves the track: the body's right edge never passes where it comes to rest.
  expect(Math.min(...rights)).toBeGreaterThan(rights.at(-1)! - 0.05)
})

test('Switch: the thumb changes colour over the travel, not in one frame', async ({ page }) => {
  await open(page)
  const control = page.locator('#state-off')
  const colours = await control.evaluate(
    root =>
      new Promise<string[]>(resolve => {
        const body = root.firstElementChild!.firstElementChild!
        const seen: string[] = []
        const started = performance.now()
        ;(root as HTMLElement).click()
        const tick = () => {
          seen.push(getComputedStyle(body).backgroundColor)
          if (performance.now() - started < 400) requestAnimationFrame(tick)
          else resolve(seen)
        }
        requestAnimationFrame(tick)
      })
  )
  // A hard swap is two values. A fade is those two and the ones in between.
  expect(new Set(colours).size, 'distinct thumb colours seen across the flip').toBeGreaterThan(4)
})

test('Switch: under reduced motion the thumb moves and keeps its shape', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await open(page)
  const control = page.locator('#state-off')
  const { widths, heights } = await sampleBody(control, 600, true)
  expect(widths.every(width => width === THUMB), `widths seen: ${[...new Set(widths)].join(', ')}`).toBe(true)
  expect(heights.every(height => height === THUMB)).toBe(true)
  expect((await thumbOf(control)).state).toBe('checked')
})
