import { expect, test } from './fixtures'
import type { Page } from '@playwright/test'

/** Lenis's own `className` getter always includes the bare `lenis` class (plus state modifiers
 *  like `lenis-stopped`) on its `rootElement`, which defaults to `document.documentElement` --
 *  read from `node_modules/lenis/dist/lenis.mjs` rather than assumed. `destroy()` calls its own
 *  `cleanUpClassName()`, which strips every class starting with `lenis` back off. */
function hasLenisClass(page: Page) {
  return page.evaluate(() => document.documentElement.classList.contains('lenis'))
}

/** Broader than `hasLenisClass`: any class Lenis's own `className` getter can produce
 *  (`lenis-stopped`, `lenis-scrolling`, `lenis-smooth`), not only the bare `lenis` one --
 *  `stripLenisClasses` (`fx/smooth-scroll.ts`) removes the same set. */
function hasAnyLenisClass(page: Page) {
  return page.evaluate(() => Array.from(document.documentElement.classList).some(c => c === 'lenis' || c.startsWith('lenis-')))
}

/** Lenis's own `autoResize` (default on) measures `document.documentElement.scrollHeight` once
 *  at construction, then only again through a debounced (250ms) `ResizeObserver` on that same
 *  element -- read from `node_modules/lenis/dist/lenis.mjs`'s `Dimensions` class. Every demo page
 *  is `React.lazy`, so Lenis is constructed the instant `DemoLayout` mounts, against whatever
 *  height the Suspense fallback happens to have -- shorter than the real page that swaps in a
 *  moment later. `limit` (its public getter for the scroll range on the active axis) stays 0
 *  until that debounce lands, and a wheel scroll during that window has nothing to scroll into.
 *  `fx/smooth-scroll.ts` closes the gap with its own, undebounced `ResizeObserver`; this waits
 *  for that fix to have actually landed, the same way a real `resize` listener would. */
async function waitForLenisReady(page: Page) {
  await page.waitForFunction(() => {
    const lenis = (window as unknown as { __lenis?: { limit: number } }).__lenis
    return !!lenis && lenis.limit > 0
  })
}

/** Two lines of the same product in different sizes, in the exact shape `useCart()`'s own
 *  `rehydrate()` reads (`e2e/flows.spec.ts`'s `seedCartItem` is the established pattern this
 *  copies): written after a first, throwaway navigation, since `sessionStorage` needs an origin
 *  to belong to and outlives the caller's own subsequent `goto`. */
async function seedTwoCartLines(page: Page) {
  await page.goto('/store')
  await page.evaluate(() => {
    sessionStorage.setItem(
      'hexline-cart',
      JSON.stringify([
        {
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
        },
        {
          id: 'bump-helmet:M/L:black',
          productId: 'bump-helmet',
          name: 'Bump helmet',
          href: '/store/shop/bump-helmet',
          detail: 'Size M/L · Black',
          unitPrice: 6900,
          quantity: 1,
          maxQuantity: 10,
          size: 'M/L',
          colourId: 'black',
        },
      ])
    )
  })
}

test.describe('smooth scroll (Lenis), on the demo site', () => {
  test('a wheel scroll eases scrollY across several frames rather than jumping straight there', async ({ page }) => {
    await page.goto('/store')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect.poll(() => hasLenisClass(page)).toBe(true)
    await waitForLenisReady(page)

    await page.mouse.wheel(0, 2000)
    // Collected inside one page.evaluate call, on consecutive animation frames, so the samples
    // are not spaced out by round-trip latency to the test process -- each one really is one
    // frame apart.
    const samples = await page.evaluate(
      () =>
        new Promise<number[]>(resolve => {
          const out: number[] = []
          function step() {
            out.push(window.scrollY)
            if (out.length < 12) requestAnimationFrame(step)
            else resolve(out)
          }
          requestAnimationFrame(step)
        })
    )
    // A native, unsmoothed wheel scroll (confirmed directly: the reduced-motion test below,
    // where Lenis is never created, lands on its final scrollY within a single frame and every
    // later sample matches) lands on its final value immediately, so every later delta would
    // already be 0. Lenis's own frame-rate-independent damping (`fx/smooth-scroll.ts`'s
    // `lerp: 0.1`, `smoothWheel: true`) is still easing toward the target here: several separate
    // frame-to-frame gaps, not just the first one, still move the position.
    const deltas = samples.slice(1).map((v, i) => v - samples[i])
    expect(deltas.filter(d => d > 0).length).toBeGreaterThanOrEqual(3)
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
  })

  test('PageDown moves the page', async ({ page }) => {
    await page.goto('/store')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.keyboard.press('PageDown')
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
  })

  test('the skip link focuses #main natively, with Lenis running, and lands it at the top', async ({ page }) => {
    await page.goto('/store')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect.poll(() => hasLenisClass(page)).toBe(true)
    await waitForLenisReady(page)
    await page.evaluate(() => window.scrollTo(0, 1500))
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Skip to content' })
    await expect(skip).toBeFocused()
    await skip.click()
    await expect(page.locator('#main')).toBeFocused()
    // Not just focused: actually scrolled back to the top the click's own hash jump promised,
    // rather than left wherever the 1500px scroll (or Lenis still easing from it) happened to be.
    // The Navbar is sticky, so "the top" is just under it (scroll-padding-top, tailwind.css).
    await expect
      .poll(() => page.evaluate(() => document.getElementById('main')!.getBoundingClientRect().top - document.querySelector('header')!.getBoundingClientRect().bottom))
      .toBeLessThan(5)
  })

  test('reduced motion: scrollY jumps directly and <html> never gets the lenis class', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/store')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    expect(await hasLenisClass(page)).toBe(false)

    await page.mouse.wheel(0, 2000)
    // A single, unsmoothed frame is enough for the native scroll to land -- unlike the "motion
    // allowed" test above, there is no multi-frame catch-up to observe.
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))
    const y = await page.evaluate(() => window.scrollY)
    expect(y).toBeGreaterThan(0)
    expect(await hasLenisClass(page)).toBe(false)
  })

  test('flipping reduced motion mid-session adds and removes the lenis class', async ({ page }) => {
    await page.goto('/store')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect.poll(() => hasLenisClass(page)).toBe(true)

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect.poll(() => hasLenisClass(page)).toBe(false)

    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await expect.poll(() => hasLenisClass(page)).toBe(true)
  })

  test('a wheel event over an open CartSheet leaves the page behind it unscrolled', async ({ page }) => {
    await page.goto('/store')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect.poll(() => hasLenisClass(page)).toBe(true)
    await waitForLenisReady(page)
    await page.getByRole('button', { name: 'Cart, 0 items' }).click()
    // react-remove-scroll (under Radix's Sheet) blocks a wheel outside the open sheet on its own;
    // `fx/smooth-scroll.ts`'s `prevent` option makes Lenis back off entirely for as long as
    // `data-scroll-locked` sits on `<body>`, rather than reaching its own `stop()`-driven
    // `preventDefault()`, which would have blocked a wheel *inside* the sheet's own scrollable
    // list too (see the overlay-scrolling test below).
    await expect.poll(() => page.evaluate(() => document.body.hasAttribute('data-scroll-locked'))).toBe(true)
    await page.mouse.wheel(0, 1200)
    await page.waitForTimeout(200)
    expect(await page.evaluate(() => window.scrollY)).toBe(0)
  })

  test('a wheel event inside the CartSheet\'s own scrollable list still scrolls it', async ({ page }) => {
    await seedTwoCartLines(page)
    await page.setViewportSize({ width: 1280, height: 360 })
    await page.goto('/store')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect.poll(() => hasLenisClass(page)).toBe(true)
    await waitForLenisReady(page)
    await page.getByRole('button', { name: 'Cart, 2 items' }).click()
    await expect.poll(() => page.evaluate(() => document.body.hasAttribute('data-scroll-locked'))).toBe(true)
    const scroller = page.getByRole('dialog').locator('.overflow-y-auto')
    await scroller.hover()
    await page.mouse.wheel(0, 200)
    await expect.poll(() => scroller.evaluate(el => el.scrollTop)).toBeGreaterThan(0)
  })

  test('a keyboard focus move right after a wheel scroll is not fought by the easing still in flight', async ({
    page,
  }) => {
    await page.goto('/store')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await waitForLenisReady(page)
    await page.mouse.wheel(0, 150)
    await page.keyboard.press('Tab')
    await expect
      .poll(() =>
        page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null
          if (!el || el === document.body) return false
          const r = el.getBoundingClientRect()
          return r.top >= 0 && r.top <= innerHeight
        })
      )
      .toBe(true)
  })

  test('End right after a wheel scroll reaches the real scroll max, not a stale eased target', async ({ page }) => {
    await page.goto('/store')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await waitForLenisReady(page)
    await page.mouse.wheel(0, 150)
    await page.keyboard.press('End')
    await expect
      .poll(() =>
        page.evaluate(() => scrollY >= document.documentElement.scrollHeight - innerHeight - 2)
      )
      .toBe(true)
  })

  test('a route change resets scroll; a query-only change keeps it', async ({ page }) => {
    await page.goto('/store/shop')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const firstCategory = page.getByRole('checkbox').first()
    await firstCategory.scrollIntoViewIfNeeded()
    await page.evaluate(() => window.scrollBy(0, 150))
    const before = await page.evaluate(() => Math.round(scrollY))
    expect(before).toBeGreaterThan(0)
    await firstCategory.click()
    await expect(page).toHaveURL(/category=/)
    expect(await page.evaluate(() => Math.round(scrollY))).toBe(before)
    const link = page.locator('main a[href^="/store/shop/"]').first()
    await link.evaluate(el => (el as HTMLElement).focus({ preventScroll: true }))
    await page.evaluate(() => window.scrollTo(0, 500))
    await page.keyboard.press('Enter')
    await expect(page.locator('#main')).toBeFocused()
    await expect
      .poll(() => page.evaluate(() => scrollY <= document.getElementById('main')!.offsetTop))
      .toBe(true)
  })

  // Mutation: keep `useScrollResetOnNavigate` called only from `useSmoothScroll` (its pre-fix
  // location, under DemoLayout alone) instead of `RouteFocus` in App.tsx -- the docs-to-docs
  // assertion below fails, since nothing ever resets scroll on a route change that never passes
  // through the Hexline demo shell at all.
  test('scroll resets on a route change in both directions: demo to docs, and docs to docs', async ({ page }) => {
    await page.goto('/store')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.mouse.wheel(0, 800)
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)

    // Demo to docs.
    const docsLink = page.getByRole('link', { name: 'Documentation' })
    await docsLink.scrollIntoViewIfNeeded()
    await docsLink.click()
    await expect(page).toHaveURL(/^[^?]*\/components$/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    // Not a strict 0: focus landing on #main (useFocusMainOnNavigate, right after this reset)
    // can nudge it into view under a sticky header by a few px of its own -- the same tolerance
    // the pre-existing "a route change resets scroll" test above uses. The 600px scroll below is
    // what actually distinguishes "reset" from "not reset" here.
    await expect
      .poll(() => page.evaluate(() => window.scrollY <= document.getElementById('main')!.offsetTop))
      .toBe(true)

    // Docs to docs.
    await page.evaluate(() => window.scrollTo(0, 600))
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
    const sidebar = page.getByRole('navigation', { name: 'Documentation' })
    // A Guidelines link: it is the one group open by default on '/', while every component
    // group starts collapsed (and inert), so a component link here would not be clickable.
    await sidebar.getByRole('link', { name: 'Color', exact: true }).click()
    await expect(page).toHaveURL(/\/guidelines\/color$/)
    // The page is a lazy chunk: until its content replaces the loading spinner it is too short to
    // scroll, so the next hop's scrollTo(600) would silently stay at 0. Its own heading, by name:
    // during the navigation the previous page's h1 is still on screen.
    await expect(page.getByRole('heading', { level: 1, name: 'Every colour, and what it is for' })).toBeVisible()
    await expect
      .poll(() => page.evaluate(() => window.scrollY <= document.getElementById('main')!.offsetTop))
      .toBe(true)

    // A second docs-to-docs hop, proving the first was not a one-off (a fresh-load coincidence).
    await page.evaluate(() => window.scrollTo(0, 600))
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
    await sidebar.getByRole('link', { name: 'Typography', exact: true }).click()
    await expect(page).toHaveURL(/\/guidelines\/typography$/)
    await expect
      .poll(() => page.evaluate(() => window.scrollY <= document.getElementById('main')!.offsetTop))
      .toBe(true)
  })

  test('the docs shell never gets the lenis class', async ({ page }) => {
    await page.goto('/components')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.mouse.wheel(0, 1000)
    await page.waitForTimeout(200)
    expect(await hasLenisClass(page)).toBe(false)
  })

  // Mutation: drop the delayed `setTimeout(... 450)` sweep from `dispose()`, back to only Lenis's
  // own synchronous `cleanUpClassName()` -- `<html>` still carries a lenis class here on this
  // build, and the poll below times out instead of settling to `false`.
  test('a native scroll right before leaving the demo shell leaves no lenis class on <html>', async ({ page }) => {
    await page.goto('/store')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect.poll(() => hasLenisClass(page)).toBe(true)
    await waitForLenisReady(page)
    await page.mouse.wheel(0, 800)
    // A raw DOM click, not a Locator's own `.click()`: Playwright's actionability checks
    // (scrolling the target into view, waiting for it to stop moving) take real time on their
    // own, and this test wants DemoLayout's unmount -- and the Lenis instance's own dispose() --
    // to land while the wheel scroll above is still easing, not once it has long since settled.
    await page.evaluate(() => {
      const link = Array.from(document.querySelectorAll('a')).find(a => a.textContent?.trim() === 'Documentation')
      link?.click()
    })
    await expect(page).toHaveURL(/^[^?]*\/components$/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    // Past the 450ms delayed sweep, not just the instant after Lenis's own synchronous cleanup.
    await expect.poll(() => hasAnyLenisClass(page), { timeout: 2000 }).toBe(false)
  })
})
