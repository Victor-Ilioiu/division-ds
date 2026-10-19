import { test, expect } from './fixtures'
import type { Locator, Page } from '@playwright/test'

/**
 * M5, the stepped hover arrival on Button and IconButton, gated on what renders.
 *
 * The reason this file exists at all, rather than a unit test asserting a class string: every
 * class that carries this behaviour is either a Tailwind variant (`hover:brightness-110`), which
 * sits inert in the DOM whatever the pointer is doing, or a plain class name (`transition-stepped`)
 * that proves only that somebody typed it. Neither can tell a stepped arrival from a smooth one,
 * and neither notices if the rule it keys to stops existing. design.md, "Four assertion shapes
 * that cannot fail", already names that pattern. So everything below reads computed values out of
 * a real browser, sampled once per animation frame across the live transition.
 *
 * The distinguishing measurement is the count of DISTINCT intermediate values: values seen after
 * the pointer arrives that are neither the rest value nor the settled hover value.
 *
 *   stepped, steps(3)     ->  exactly 2, on all four variants
 *   smooth, var(--ease-snap)  ->  11 / 8 / 11 / 7 (primary / secondary / danger / ghost),
 *                                 roughly one per sampled frame
 *   no transition at all  ->  0
 *
 * Those are measured numbers, not estimates: the smooth row comes from putting `var(--ease-snap)`
 * back and running this file, and the zero row from setting `transition-property: none`. The
 * separation is wide and the assertion is an equality rather than a threshold, so the test is red
 * in both directions rather than only against a slower tween.
 */

/** Which property actually carries each variant's hover change. Not interchangeable: `primary`
 *  and `danger` hover with `brightness()`, so their change lands on `filter` while their
 *  `background-color` never moves; sampling background-color on those two would observe a
 *  constant and pass with zero intermediates forever. */
const VARIANTS = [
  { name: 'primary', label: 'Dispatch team', property: 'filter' },
  { name: 'secondary', label: 'Save draft', property: 'backgroundColor' },
  { name: 'danger', label: 'Abort', property: 'filter' },
  { name: 'ghost', label: 'Cancel', property: 'color' },
] as const

/** Every sampled frame within the transition window, as [msSinceMouseover, computedValue]. */
type Sample = [number, string]

/** Below this many samples the frame rate was too low to tell a staircase from a ramp, and a step
 *  count read off the samples would be measuring the machine rather than the CSS. Fail saying so
 *  instead of flaking. 180ms at 60fps yields about 11. */
const MIN_SAMPLES = 8

/** The shortest plateau that reads as a discrete state rather than as a ramp, in milliseconds.
 *  This is M5's design rule, not a tolerance: at 180ms over 6 steps each plateau is 30ms, one or
 *  two frames, which is indistinguishable from smooth to a viewer and to this test. */
const MIN_PLATEAU_MS = 50

/** Fonts land late enough to shift the examples out from under an already-placed cursor, which
 *  reads as a pointer-leave and reverses the transition mid-flight. Cost one confusing trace. */
async function settle(page: Page, locator: Locator) {
  await page.waitForSelector('#main button')
  await page.evaluate(() => document.fonts.ready)
  await locator.scrollIntoViewIfNeeded()
  await page.waitForTimeout(200)
}

/** Arms a per-frame sampler that starts on the element's own `mouseover`, so the clock starts when
 *  the browser says the pointer arrived rather than when the test thinks it did. */
async function sampleOnHover(locator: Locator, property: string, windowMs: number) {
  await locator.evaluate(
    (el, { property, windowMs }) => {
      const store = window as unknown as { __hoverSamples: Sample[] }
      type Sample = [number, string]
      store.__hoverSamples = []
      el.addEventListener(
        'mouseover',
        () => {
          const t0 = performance.now()
          const tick = () => {
            const now = performance.now() - t0
            const style = getComputedStyle(el) as unknown as Record<string, string>
            store.__hoverSamples.push([now, style[property]])
            if (now < windowMs) requestAnimationFrame(tick)
          }
          tick()
        },
        { once: true }
      )
    },
    { property, windowMs }
  )
}

async function computed(locator: Locator, property: string) {
  return locator.evaluate(
    (el, p) => (getComputedStyle(el) as unknown as Record<string, string>)[p],
    property
  )
}

/** Hovers, samples one animation frame at a time until the transition has settled, and returns the
 *  trace plus the rest and settled values it is measured against. */
async function traceHover(page: Page, locator: Locator, property: string) {
  await settle(page, locator)
  const rest = await computed(locator, property)
  const durationMs = Math.round(
    parseFloat(await computed(locator, 'transitionDuration').then(v => v.split(',')[0])) * 1000
  )
  // A little past the declared duration so the settled value is always in the trace.
  await sampleOnHover(locator, property, durationMs + 80)
  await locator.hover()
  await page.waitForTimeout(durationMs + 400)
  const samples: Sample[] = await page.evaluate(
    () => (window as unknown as { __hoverSamples: Sample[] }).__hoverSamples
  )
  const settled = await computed(locator, property)
  return { rest, settled, durationMs, samples }
}

/** Consecutive runs of one value, as {value, ms, frames}. A smooth tween produces runs of one
 *  frame; a staircase produces runs as long as its plateau. */
function plateaus(samples: Sample[]) {
  const runs: { value: string; start: number; end: number; frames: number }[] = []
  for (const [at, value] of samples) {
    const last = runs[runs.length - 1]
    if (last && last.value === value) {
      last.end = at
      last.frames += 1
    } else {
      runs.push({ value, start: at, end: at, frames: 1 })
    }
  }
  return runs
}

test.describe('M5: the hover colour arrives in discrete steps', () => {
  for (const variant of VARIANTS) {
    test(`${variant.name} steps its ${variant.property} rather than sliding it`, async ({
      page,
    }) => {
      await page.goto('/components/button')
      const button = page.getByRole('button', { name: variant.label, exact: true }).first()

      const timing = await computed(button, 'transitionTimingFunction')
      const stepCount = /^steps\((\d+)[,)]/.exec(timing)
      expect(
        stepCount,
        `transition-timing-function computes to "${timing}". M5 requires a stepped function; a ` +
          `cubic-bezier here means the arrival slides, whatever the class names say.`
      ).not.toBeNull()
      const steps = Number(stepCount![1])

      const { rest, settled, durationMs, samples } = await traceHover(page, button, variant.property)

      expect(
        settled,
        `hovering changed nothing: ${variant.property} is "${rest}" at rest and after hover too. ` +
          `Either the hover rule was removed or this variant changes a different property.`
      ).not.toBe(rest)

      const inWindow = samples.filter(([at]) => at <= durationMs)
      expect(
        inWindow.length,
        `only ${inWindow.length} frames sampled across the ${durationMs}ms transition. Below ` +
          `${MIN_SAMPLES} this measures the frame rate, not the timing function.`
      ).toBeGreaterThanOrEqual(MIN_SAMPLES)

      expect(
        durationMs / steps,
        `${durationMs}ms over ${steps} steps is a ${(durationMs / steps).toFixed(0)}ms plateau. ` +
          `Under ${MIN_PLATEAU_MS}ms a step lasts one or two frames and reads as a ramp, which ` +
          `is the failure M5 exists to avoid.`
      ).toBeGreaterThanOrEqual(MIN_PLATEAU_MS)

      const intermediates = [...new Set(samples.map(([, value]) => value))].filter(
        value => value !== rest && value !== settled
      )
      expect(
        intermediates.length,
        `${intermediates.length} distinct intermediate values between "${rest}" and "${settled}": ` +
          `${JSON.stringify(intermediates)}. A steps(${steps}) staircase shows exactly ` +
          `${steps - 1}. Many more means a smooth curve; zero means no transition at all.\n` +
          `  plateaus: ${plateaus(samples)
            .slice(0, 8)
            .map(r => `${r.value} x${r.frames}f`)
            .join(' | ')}`
      ).toBe(steps - 1)
    })
  }

  test('IconButton inherits the same stepped arrival, with no styling of its own', async ({
    page,
  }) => {
    await page.goto('/components/icon-button')
    const button = page.getByRole('button', { name: 'Delete', exact: true }).first()
    await expect(button).toBeVisible()

    const timing = await computed(button, 'transitionTimingFunction')
    expect(
      timing,
      `IconButton composes buttonVariants, so one change to Button covers both. If this diverges ` +
        `from Button's computed timing function, the styling was duplicated somewhere.`
    ).toMatch(/^steps\(\d+/)

    const { rest, settled, samples } = await traceHover(page, button, 'filter')
    expect(settled).not.toBe(rest)
    const intermediates = [...new Set(samples.map(([, value]) => value))].filter(
      value => value !== rest && value !== settled
    )
    const steps = Number(/^steps\((\d+)/.exec(timing)![1])
    expect(intermediates.length, `intermediates: ${JSON.stringify(intermediates)}`).toBe(steps - 1)
  })
})

test.describe('M5: the arrival happens once and stays put', () => {
  test('the value holds while the pointer rests, and nothing is animating it', async ({ page }) => {
    await page.goto('/components/button')
    const button = page.getByRole('button', { name: 'Abort', exact: true }).first()

    const { settled } = await traceHover(page, button, 'filter')

    // Half a second of rest, sampled every frame, with the pointer still on the button. A keyframe
    // animation on hover would re-enter its cycle here; a transition has nothing left to fire.
    const held: string[] = await button.evaluate(el => {
      return new Promise<string[]>(resolve => {
        const seen: string[] = []
        const t0 = performance.now()
        const tick = () => {
          seen.push(getComputedStyle(el).filter)
          if (performance.now() - t0 < 500) requestAnimationFrame(tick)
          else resolve(seen)
        }
        tick()
      })
    })
    expect(
      [...new Set(held)],
      `the hover value moved after settling: ${JSON.stringify([...new Set(held)])}`
    ).toEqual([settled])

    // The second half, and the point of it: this is a transition, not an animation. Without this,
    // a later pass could swap the stepped transition for a looping @keyframes that happens to end
    // on the same value, and every assertion above would still pass.
    const animation = await computed(button, 'animationName')
    expect(
      animation,
      `animation-name computes to "${animation}". M5 is a transition: it fires once per state ` +
        `entry by construction, with no iteration count to cap. An animation here would need one.`
    ).toBe('none')
  })
})

test.describe('M5: reduced motion collapses the arrival', () => {
  test('the settled value is in place on the first frame, with no intermediate', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/components/button')
    const button = page.getByRole('button', { name: 'Abort', exact: true }).first()
    await settle(page, button)

    // What the collapse actually computes to. `transition-property: none` is the mechanism, in the
    // unlayered rule rather than in a `motion-reduce:` utility, because the unlayered rule would
    // outrank the utility. Deliberately NOT asserted here: transition-duration. It stays at its
    // declared 180ms under reduce, both for this rule and for Tailwind's own `transition-none`,
    // which sets transition-property and nothing else. A "duration is 0s" gate would be red
    // against code that collapses correctly.
    const property = await computed(button, 'transitionProperty')
    expect(
      property,
      `transition-property computes to "${property}" under prefers-reduced-motion: reduce.`
    ).toBe('none')

    // The observable claim, which is the one that matters: the hover state is simply there.
    const { rest, settled, samples } = await traceHover(page, button, 'filter')
    expect(settled).not.toBe(rest)
    const intermediates = [...new Set(samples.map(([, value]) => value))].filter(
      value => value !== rest && value !== settled
    )
    expect(
      intermediates.length,
      `reduced motion still showed intermediate values: ${JSON.stringify(intermediates)}`
    ).toBe(0)
    expect(
      samples[0]?.[1],
      `the first frame after the pointer arrived read "${samples[0]?.[1]}", not the settled ` +
        `"${settled}". Under reduce the change has to be instant, not fast.`
    ).toBe(settled)
  })
})
