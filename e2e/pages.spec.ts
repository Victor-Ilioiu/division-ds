import type { Locator, Page } from '@playwright/test'
import { CARE } from '../src/demo/content'
import { applyTheme, expect, expectAxeClean, settleAnimations, test, THEMES, trackHeroBottom } from './fixtures'

// The page gutter, read off the demo shell: since the headers all moved to a 16px gutter
// (2026-10-30) the Navbar brand no longer marks where page content starts, the gutter does.
const pageGutter = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const shell = document.querySelector('[data-demo-shell]')!
    const probe = document.createElement('div')
    probe.style.width = 'var(--page-gutter)'
    shell.appendChild(probe)
    const width = probe.getBoundingClientRect().width
    probe.remove()
    return width
  })

// demo.spec.ts already covers axe and 320px-wide reflow for every registered page in both
// themes (Field notes' index and article included, via the article's own `samplePath`), and
// flows.spec.ts's own "every flow route reflows at 1280x256 and 320x256 in dark theme" describe
// block already sweeps every non-home DEMO_PAGES entry -- including these two, automatically --
// at the same two short-and-wide viewports this file would otherwise duplicate, but that sweep is
// dark theme only by its own design (its comment says so: light theme at these two viewports is
// only proven for the routes with their own dedicated block -- cart, checkout, confirmation,
// shop, product -- and Field notes isn't one of them). This file plugs exactly that gap for the
// two Field notes routes, in the same shape as those dedicated per-page blocks (Product's own
// "product page reflow at short viewports" describe, immediately above that sweep in
// flows.spec.ts), rather than re-proving dark theme a second time.

// Every demo page's outer wrapper uses `px-gutter`, the same inset as the Navbar (and the Footer),
// so page content starts at the same x the chrome does, rather than a padding of its own. The
// gutter is one custom property, `--page-gutter`, set once on the demo shell (DemoLayout.tsx):
// 16px, and 64px from `lg`. This proves it at 1280px on a spread of page shapes: a listing, an
// article, Care, error states and two of the narrow, `max-w-md`-capped auth/cart columns, and
// the homepage hero, which was briefly the one exception (inset 48px further than the brand) and
// is not any more -- eight pages in total. Product.tsx is deliberately not one of them: its own h1 sits in the second
// column of a two-up grid (image, then details) by design, so it is never flush with the page's
// own left gutter regardless of the wrapper's own padding -- it would prove nothing either way.
test.describe('Page content starts at the Navbar brand\'s own x, at 1280px', () => {
  const PAGES: { path: string; heading: string }[] = [
    { path: '/store', heading: 'Kestrel C carbine replica' },
    { path: '/store/shop', heading: 'Shop' },
    { path: '/store/journal', heading: 'Field notes' },
    { path: '/store/journal/cleaning-after-a-field-day', heading: 'Cleaning a replica after a field day' },
    { path: '/store/care', heading: 'Hexline Care' },
    { path: '/store/cart', heading: 'Your cart' },
    { path: '/store/status/error', heading: 'Error states' },
  ]

  // Mutation: change `px-gutter` on Shop.tsx's root wrapper div to `px-4` -> at this test's own
  // 1280px viewport, the h1 sits 48px left of the Navbar brand instead of flush with it, and the
  // poll below never settles at 0 within its timeout. Same for `/store`: put `lg:px-24` on
  // HomeHero.tsx's copy column and its h1 is 32px right of the brand.
  // A Default page (DEFAULT_PAGE, src/demo/DefaultPage.tsx) is at most 1200px wide, and at 1280px
  // its column is the whole gutter-to-gutter width, so its h1 is flush with the brand like a
  // full-width page's. The 1440px block below holds the centring itself.
  for (const { path, heading } of PAGES) {
    test(`the h1 on ${path} starts at the page gutter`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 })
      await page.goto(path)
      const h1 = page.getByRole('heading', { level: 1, name: heading })
      await expect(h1).toBeVisible()
      // A web font swapping in after first paint changes glyph metrics, never the box each
      // element sits in -- x position here comes entirely from padding, not text -- but this
      // still waits for it, the same defensive rule every other layout measurement in this suite
      // follows, rather than assuming this one case is different.
      await page.evaluate(() => document.fonts.ready)
      const gutter = await pageGutter(page)
      await expect
        .poll(
          async () => {
            const h1X = await h1.evaluate(el => el.getBoundingClientRect().left)
            return Math.abs(gutter - h1X)
          },
          { message: `h1 on ${path} does not start at the page gutter` }
        )
        .toBeLessThanOrEqual(1)
    })
  }

  // The Default layout, as a figure: at 1440px the 1200px column sits centred, 120px from each
  // side (64px gutter + 56px of auto margin). The first element of the page is measured: the h1,
  // or for the product page (whose h1 sits in the second column of its grid) the breadcrumbs.
  // Mutation: drop `mx-auto` from DEFAULT_PAGE -> left becomes 64 on every page below.
  for (const { path, first } of [
    { path: '/store/cart', first: 'h1' },
    { path: '/store/care', first: 'h1' },
    { path: '/store/journal', first: 'h1' },
    { path: '/store/journal/cleaning-after-a-field-day', first: 'breadcrumb' },
    { path: '/store/shop/harrier-lr', first: 'breadcrumb' },
  ]) {
    test(`${path} is a Default page: 1200px, centred, at 1440px`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 })
      await page.goto(path)
      const el =
        first === 'h1'
          ? page.getByRole('heading', { level: 1 }).first()
          : page.getByRole('navigation', { name: 'Breadcrumb' })
      await expect(el).toBeVisible()
      const x = await el.evaluate(node => node.getBoundingClientRect().left)
      expect(Math.abs(x - 120)).toBeLessThanOrEqual(1)
    })
  }

  // Sign-in is the one narrow, centred (`max-w-md`) page: not Default, not full-width.
  // Mutation: drop `mx-auto` from SignIn.tsx's wrapper -> the right gap grows, this fails.
  test('the sign-in column is centred in the page', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/store/sign-in')
    const h1 = page.getByRole('heading', { level: 1, name: 'Hexline account' })
    await expect(h1).toBeVisible()
    const gaps = await h1.evaluate(el => {
      const r = el.getBoundingClientRect()
      return Math.abs(r.left - (document.documentElement.clientWidth - r.right))
    })
    expect(gaps).toBeLessThanOrEqual(1)
  })

  // The gutter itself, as a figure, so "everything is inset 64px" is a decision and not drift:
  // the brand's left edge is 64px from the window from `lg` (1024px) up and 16px below it, and the
  // content's right edge mirrors it. Read off the Navbar's own row and the home hero's h1.
  // Mutation: change `lg:[--page-gutter:4rem]` on the demo shell in DemoLayout.tsx to 3rem -> 48.
  for (const { width, gutter } of [
    { width: 1440, gutter: 64 },
    { width: 1024, gutter: 64 },
    { width: 1023, gutter: 16 },
    { width: 390, gutter: 16 },
  ]) {
    test(`the page gutter is ${gutter}px on both sides at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await page.goto('/store')
      await page.evaluate(() => document.fonts.ready)
      const brand = page.getByRole('banner').getByRole('link', { name: 'Hexline', exact: true })
      await expect(brand).toBeVisible()
      // the header keeps the site-wide 16px gutter at every width; the page content takes the page's
      await expect.poll(() => brand.evaluate(el => Math.round(el.getBoundingClientRect().left))).toBe(16)
      const h1 = page.getByRole('heading', { level: 1, name: 'Kestrel C carbine replica' })
      await expect.poll(() => h1.evaluate(el => Math.round(el.getBoundingClientRect().left))).toBe(gutter)
      // The right side: the first section heading's rule runs from gutter to gutter.
      const rule = page.getByRole('heading', { level: 2, name: 'Top-rated replicas' }).locator('xpath=ancestor::div[contains(@class,"border-t")][1]')
      const box = await rule.evaluate(el => {
        const rect = el.getBoundingClientRect()
        return { left: Math.round(rect.left), right: Math.round(document.documentElement.clientWidth - rect.right) }
      })
      expect(box).toEqual({ left: gutter, right: gutter })
    })
  }
})

// A real Lighthouse CLS regression on /store (0.59, "poor") traced to one dominant source: the
// homepage's own route used to be lazy-loaded like every other route, so a direct load briefly
// showed DemoLayout's Suspense fallback (a short "Loading…" paragraph) before the real, much
// taller page swapped in once its own separate chunk finished fetching -- the Footer jumping from
// just below that fallback to far down the real page. `routes.ts` now imports Home eagerly
// instead of through `lazy()` (see that file's own comment), the one exception to every other
// route there. This test proves the fix at the browser API CLS is actually defined by
// (`PerformanceObserver` on `layout-shift` entries), the same one Lighthouse itself reads from --
// not by re-running Lighthouse in CI, which is its own separate tool this suite doesn't otherwise
// depend on. It was written against the pinned scroll-scrub hero. The homepage hero is a
// three.js scene now, loading into a box whose size is stated in CSS before anything arrives.
// This test runs with this suite's default (e2e/fixtures.ts, `heroScene: 'still'`), so what it
// measures is the eager route plus the hero's still landing in that box; the same measurement
// through the live scene's whole load (preloader in, canvas in, preloader out) is in
// e2e/hero.spec.ts, next to a check that the Footer's position does not change.
test.describe('Homepage layout stability', () => {
  // Mutation: make routes.ts's Home lazy again,
  // `lazy(() => import('./pages/Home').then(m => ({ default: m.Home })))` -- the Suspense fallback
  // briefly shows again before the real chunk swaps in. Against the old pinned hero the sum below
  // then blew past 0.1 (0.35-0.59 in real runs, though the exact value was racy -- it depended on
  // whether the chunk fetch finished inside this test's own 2s window). That mutation has NOT
  // been re-run against the current hero.
  //
  // The layout-shift total alone would not notice the hero itself changing height: it counts
  // what moves inside the viewport, and the hero fills it (see `trackHeroBottom` in fixtures.ts).
  // So this also holds the hero's bottom edge to one position for the whole window.
  // Mutation run against the current hero (2026-10-02): add `mt-24` to the hero's section in
  // HomeHero.tsx only while it shows the still (`live ? '' : 'mt-24'`). With this suite's default
  // the hero renders once as live and then falls back, so its bottom edge moves 96px: the edge
  // assertion failed with two values (801 and 897), and both layout-shift assertions above it
  // passed.
  test('cumulative layout shift on /store stays under 0.1 over load + 2s, motion allowed', async ({ page }) => {
    // Motion allowed, not reduced: smooth scroll (Lenis) only mounts on this branch, and it is
    // the one most visitors actually see.
    await page.emulateMedia({ reducedMotion: 'no-preference' })
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
    const heroBottoms = await trackHeroBottom(page)
    await page.goto('/store')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    // The regression this guards landed a full 2s+ after `load` in real runs (the lazy chunk's
    // own network round trip) -- a read taken any earlier would miss it entirely, which is
    // exactly how this bug passed every other check in this suite before now. `expect.poll`, not a
    // single `page.waitForTimeout` then one read: it keeps sampling the live, still-accumulating
    // total for the poll's own timeout window (well past 2s) rather than trusting one snapshot
    // taken at an arbitrary moment inside it.
    await expect
      .poll(async () => page.evaluate(() => (window as any).__cls), {
        timeout: 5000,
        message: 'cumulative layout shift on /store exceeded 0.1 over load + 2s',
      })
      .toBeLessThan(0.1)
    // A poll can pass on an EARLY read before a late shift lands, just as easily as a single
    // snapshot could -- holding here for the full 2s this test's own name promises, then taking
    // one more read, is what actually proves nothing arrived after the poll above stopped short.
    await page.waitForTimeout(2000)
    expect(await page.evaluate(() => (window as any).__cls)).toBeLessThan(0.1)
    expect(await heroBottoms(), 'the hero changed where the rest of the page starts').toHaveLength(1)
  })
})

// Every route but Home is lazy, and the homepage's cure (import it eagerly) is not one to repeat
// seventeen times. The cause was the same for all of them: while a route's chunk loads, `<main>`
// holds DemoLayout's one-line "Loading…" fallback, the Footer sat directly under that line, on
// screen, and the real page threw it down when it arrived. Measured on 2026-10-02 with the route
// module delayed 400ms, the same PerformanceObserver as above: 0.74 on a product page, 0.67 on
// the shop, 0.76 on Care, 0.27 on sign-in at 1280x800, and 0.68 / 0.68 / 0.68 / 0.30 at 390x844.
// The fix is a floor on `<main>` (one screen less the Navbar, DemoLayout.tsx), so the Footer
// starts at or below the fold whether the page has loaded or not. All eight read 0.000 after it.
//
// The route's own module is delayed here on purpose. On this dev server it otherwise lands in a
// frame or two and the fallback is never painted, so the test would pass with the floor removed.
// `sawFallback` is the proof that the state under test was really on screen.
//
// Mutation, run 2026-10-02: remove `min-h-[calc(100dvh-3.5rem)]` from DemoLayout's `<main>` ->
// all eight fail on the Footer's position while loading (its top edge at 189 against 800, and at
// 267 against 844). A failed assertion ends the test, so the layout-shift assertions below it
// were not reached in that run; the totals above are what they would have read.
test.describe('Lazy demo routes do not shift the layout on a direct load', () => {
  const LAZY_ROUTES = [
    // A page several screens tall: its Footer used to be thrown furthest.
    { path: '/store/shop/kestrel-c', module: '**/src/demo/pages/shop/Product.tsx*' },
    { path: '/store/shop', module: '**/src/demo/pages/shop/Shop.tsx*' },
    { path: '/store/care', module: '**/src/demo/pages/Pricing.tsx*' },
    // A page shorter than a screen: a floor on the fallback alone would pull its Footer UP.
    { path: '/store/sign-in', module: '**/src/demo/pages/auth/SignIn.tsx*' },
  ]
  const VIEWPORTS = [
    { width: 1280, height: 800 },
    { width: 390, height: 844 },
  ]

  for (const { path, module } of LAZY_ROUTES) {
    for (const viewport of VIEWPORTS) {
      test(`${path} at ${viewport.width}x${viewport.height}: the Footer stays below the fold while the page loads, and nothing shifts`, async ({
        page,
      }) => {
        await page.emulateMedia({ reducedMotion: 'no-preference' })
        await page.setViewportSize(viewport)
        await page.addInitScript(() => {
          const w = window as any
          w.__cls = 0
          w.__sawFallback = false
          w.__footerTopsWhileLoading = [] as number[]
          new PerformanceObserver(list => {
            for (const entry of list.getEntries()) {
              const e = entry as unknown as { hadRecentInput: boolean; value: number }
              if (!e.hadRecentInput) w.__cls += e.value
            }
          }).observe({ type: 'layout-shift', buffered: true })
          const sample = () => {
            const main = document.getElementById('main')
            const footer = document.querySelector('footer')
            if (main && footer && main.textContent === 'Loading…') {
              w.__sawFallback = true
              w.__footerTopsWhileLoading.push(Math.round(footer.getBoundingClientRect().top))
            }
            requestAnimationFrame(sample)
          }
          requestAnimationFrame(sample)
        })
        let delayed = 0
        await page.route(module, async route => {
          delayed += 1
          await new Promise(resolve => setTimeout(resolve, 400))
          await route.continue()
        })
        await page.goto(path)
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        expect(delayed, `the route pattern ${module} matched no request, so nothing was delayed`).toBeGreaterThan(0)
        expect(await page.evaluate(() => (window as any).__sawFallback), 'the fallback was never on screen').toBe(true)

        // While the fallback showed, the Footer was never inside the viewport.
        const tops: number[] = await page.evaluate(() => (window as any).__footerTopsWhileLoading)
        expect(Math.min(...tops), 'the Footer was on screen while the page was loading').toBeGreaterThanOrEqual(
          viewport.height
        )

        // `sawFallback` above is set only when <main>'s whole text is "Loading…", so it also
        // says the loading state is still there as text in the main landmark: the floor took
        // nothing away from what assistive technology is told.

        // Same two reads as the homepage test: a poll, then a hold and one more.
        await expect
          .poll(async () => page.evaluate(() => (window as any).__cls), {
            timeout: 5000,
            message: `cumulative layout shift on ${path} exceeded 0.1`,
          })
          .toBeLessThan(0.1)
        await page.waitForTimeout(2000)
        expect(await page.evaluate(() => (window as any).__cls)).toBeLessThan(0.1)
      })
    }
  }
})

test.describe('Field notes reflow at short viewports, light theme', () => {
  const VIEWPORTS = [
    { width: 1280, height: 256 },
    { width: 320, height: 256 },
  ]

  // Mutation: add `min-w-[2000px]` to Journal.tsx's root wrapper div -> the poll below never
  // becomes true within its timeout.
  for (const viewport of VIEWPORTS) {
    test(`the Field notes index has no horizontal overflow at ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport)
      await page.goto('/store/journal')
      await expect(page.getByRole('heading', { level: 1, name: 'Field notes' })).toBeVisible()
      await applyTheme(page, 'light')
      await page.evaluate(() => document.fonts.ready)
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), {
          message: `${viewport.width}x${viewport.height} scrolls horizontally in light theme`,
        })
        .toBe(true)
    })
  }

  // Mutation: add `min-w-[2000px]` to Article.tsx's root wrapper div -> the poll below never
  // becomes true within its timeout.
  for (const viewport of VIEWPORTS) {
    test(`a Field note has no horizontal overflow at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.goto('/store/journal/cleaning-after-a-field-day')
      await expect(page.getByRole('heading', { level: 1, name: 'Cleaning a replica after a field day' })).toBeVisible()
      await applyTheme(page, 'light')
      await page.evaluate(() => document.fonts.ready)
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), {
          message: `${viewport.width}x${viewport.height} scrolls horizontally in light theme`,
        })
        .toBe(true)
    })
  }
})

// "On this page" links are plain `href="#id"` anchors with no click handler of their own (see
// Article.tsx's own comment on why -- staying native is what keeps this working once Lenis is
// wired in elsewhere). That native fragment navigation is exactly the mechanism the Navbar's own
// skip link already relies on (`href="#main"`, `<main tabIndex={-1}>`) -- this is the same
// mechanism proven against a real target other than `#main`, and the actual claim worth proving
// here: a click lands on the section AND moves focus there, which jsdom's own navigation does
// not reproduce (Article.test.tsx's own unit test only proves the link and the id line up).
// Mutation: drop `tabIndex={-1}` from the body heading's own `<h2>` in Article.tsx's `Block` ->
// the browser's fragment navigation still scrolls to it (an id target needs no tabindex for
// that), but there is nothing focusable there to land on, and the `toBeFocused()` assertion below
// times out instead.
test('a click on an "On this page" link scrolls to that section and moves focus there', async ({ page }) => {
  await page.goto('/store/journal/cleaning-after-a-field-day')
  await expect(page.getByRole('heading', { level: 1, name: 'Cleaning a replica after a field day' })).toBeVisible()

  const link = page.getByRole('link', { name: 'Steps' })
  await link.click()

  await expect(page).toHaveURL(/#steps$/)
  const heading = page.locator('#steps')
  await expect(heading).toBeFocused()
  await expect
    .poll(() => heading.evaluate(el => el.getBoundingClientRect().top), {
      message: 'the "Steps" heading never scrolled into view',
    })
    .toBeLessThan(300)
})

/** Same proof as flows.spec.ts's own `tabTo` (not exported from there, so copied rather than
 *  imported): presses Tab until `target` holds focus, asserting focus never lands on the body
 *  along the way. */
async function tabTo(page: Page, target: Locator, max = 40) {
  for (let i = 0; i < max; i++) {
    if (await target.evaluate(el => el === document.activeElement).catch(() => false)) return
    await page.keyboard.press('Tab')
    expect(
      await page.evaluate(() => document.activeElement !== document.body),
      `tab press ${i + 1} moved focus to the body`
    ).toBe(true)
  }
  await expect(target).toBeFocused()
}

test.describe('Care page', () => {
  // The same short-viewport reflow pattern flows.spec.ts uses in its own describe block: demo.spec
  // already covers 320x800 for every registered page, including this one, so only the two sizes
  // it does not cover are repeated here.
  test.describe('reflow at short viewports', () => {
    const VIEWPORTS = [
      { width: 1280, height: 256 },
      { width: 320, height: 256 },
    ]

    // Mutation: add `min-w-[2000px]` to Pricing.tsx's root wrapper div -> the page is wider than
    // both viewports below, and the poll never becomes true within its timeout.
    for (const viewport of VIEWPORTS) {
      test(`Care has no horizontal overflow at ${viewport.width}x${viewport.height}`, async ({ page }) => {
        await page.setViewportSize(viewport)
        await page.goto('/store/care')
        await expect(page.getByRole('heading', { level: 1, name: 'Hexline Care' })).toBeVisible()
        await page.evaluate(() => document.fonts.ready)
        await expect
          .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), {
            message: `${viewport.width}x${viewport.height} scrolls horizontally`,
          })
          .toBe(true)
      })
    }
  })

  // Mutation: hardcode `checked={false}` on Pricing.tsx's Switch instead of `checked={annual}` ->
  // the switch never reflects `?billing=annual` and the second assertion below fails.
  test('the billing switch survives a reload through the URL, not local state', async ({ page }) => {
    await page.goto('/store/care')
    await expect(page.getByRole('heading', { level: 1, name: 'Hexline Care' })).toBeVisible()
    const billingSwitch = page.getByRole('switch', { name: 'Bill annually (2 months free)' })
    await billingSwitch.click()
    await expect(page).toHaveURL(/billing=annual/)

    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: 'Hexline Care' })).toBeVisible()
    await expect(page.getByRole('switch', { name: 'Bill annually (2 months free)' })).toBeChecked()
    // 10x the Basic tier's monthly price (content.ts's CARE catalogue): two months free.
    await expect(page.getByText('€40.00', { exact: false }).first()).toBeVisible()
  })

  // Mutation: change Pricing.tsx's Faq item from a native `<details>` to a plain `<div>` -> a
  // `<div>` has no native collapse behaviour at all, so the answer is visible from the very
  // first render (the FIRST assertion below fails, before Tab or Enter ever run) instead of only
  // opening on a real activation. Confirmed by running it: the actual failure is the initial
  // `not.toBeVisible()`, not a later no-op Enter press.
  test('a keyboard user can open an FAQ item with Enter', async ({ page }) => {
    await page.goto('/store/care')
    await expect(page.getByRole('heading', { level: 1, name: 'Hexline Care' })).toBeVisible()
    const question = CARE.faq[0].question
    const answer = page.getByText(CARE.faq[0].answer)
    const summary = page.getByText(question)

    await expect(answer).not.toBeVisible()
    await tabTo(page, summary)
    await page.keyboard.press('Enter')
    await expect(answer).toBeVisible()
    // Native <details>/<summary> keeps focus on the summary across the toggle -- never a nav-away.
    await expect(summary).toBeFocused()
  })
})

// demo.spec.ts's generic per-page pass and flows.spec.ts's own FLOW_PAGES sweep both only ever
// `goto` /store/status/error fresh, so between them they already prove the page's own default
// load (both themes' axe, 320px reflow, and dark-theme 1280x256/320x256 reflow) -- see this
// file's own header comment on that split. None of that ever clicks the crash button, so the
// route error boundary's own fallback (DemoErrorBoundary/DemoRouteError, mounted in DemoLayout)
// is a UI surface nothing else in this suite renders at all. This block is that surface's only
// coverage, not a light-theme gap-fill for the page's normal state the way Care's/Field notes'
// own blocks are.
async function triggerCrash(page: Page) {
  await page.goto('/store/status/error')
  await expect(page.getByRole('heading', { level: 1, name: 'Error states' })).toBeVisible()
  await page.getByRole('button', { name: 'Show the full-page error' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Something went wrong' })).toBeVisible()
}

test.describe('Error states', () => {
  // Mutation: in DemoLayout.tsx, move DemoErrorBoundary to wrap the whole shell (Navbar and
  // Footer included) instead of just the Suspense/Outlet inside <main> -> the Navbar's own cart
  // button is unmounted along with the crashed page, and the dialog this opens never appears.
  test('a thrown render error shows the route error page, and the Navbar stays usable', async ({ page }) => {
    await triggerCrash(page)
    await expect(page.getByRole('navigation', { name: 'Hexline', exact: true })).toBeVisible()
    await expect(page.getByRole('contentinfo')).toBeVisible()
    await page.getByRole('button', { name: 'Cart, 0 items' }).click()
    await expect(page.getByRole('dialog', { name: 'Cart' })).toBeVisible()
  })

  // Throwing removes the button that had focus (StatusError's own crash button) from the DOM the
  // instant DemoRouteError replaces it, so this is the one case useFocusMainOnNavigate cannot
  // cover -- no navigation happens, the pathname never changes, so that hook's own effect never
  // fires. DemoRouteError has to move focus itself.
  // A single post-hoc sample of `document.activeElement` cannot tell "focus never touched body"
  // apart from "focus touched body, then moved on before this line ran" -- the rAF counter below
  // samples every animation frame across the whole transition instead, the same technique the
  // "Try again" focus test below uses.
  // Mutation: drop `tabIndex={-1}` and the focus-on-mount effect from DemoRouteError's own `<h1>`
  // -> `__b` counts at least one frame with focus on body before the heading ever takes it.
  test('focus moves to the error page heading, never to body', async ({ page }) => {
    await page.goto('/store/status/error')
    await expect(page.getByRole('heading', { level: 1, name: 'Error states' })).toBeVisible()
    const crashButton = page.getByRole('button', { name: 'Show the full-page error' })
    // Focused explicitly before the counter starts: a freshly loaded page has no focused element
    // at all yet, and the counter would otherwise (correctly, but uninterestingly) count that
    // ordinary idle gap as "focus on body" too. The counter needs to start from a real, already-
    // focused baseline so every frame it then counts is one this click's own crash caused.
    await crashButton.focus()
    await page.evaluate(() => {
      ;(window as any).__b = 0
      const f = () => {
        if (document.activeElement === document.body) (window as any).__b++
        requestAnimationFrame(f)
      }
      requestAnimationFrame(f)
    })
    await crashButton.click()
    await expect(page.getByRole('heading', { level: 1, name: 'Something went wrong' })).toBeFocused()
    expect(await page.evaluate(() => (window as any).__b)).toBe(0)
  })

  // Mutation: drop `key={resetCount}` from DemoErrorBoundary in DemoLayout.tsx (a hardcoded key,
  // say) -> "Try again" bumps `resetCount` as always, but the boundary is never actually
  // remounted, its caught `state.error` is never cleared (componentDidUpdate only watches
  // `resetKey`, i.e. `path`, which never changes here), and the heading below stays "Something
  // went wrong" instead.
  test('"Try again" recovers the page', async ({ page }) => {
    await triggerCrash(page)
    await page.getByRole('button', { name: 'Try again' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Error states' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Show the full-page error' })).toBeVisible()
  })

  // "Try again" removes itself along with the rest of the crashed fallback, so without
  // DemoLayout's own resetCount-keyed focus effect, focus drops to body instead of landing on
  // #main.
  // Mutation: remove the effect.
  test('"Try again" moves focus to #main, never body', async ({ page }) => {
    await triggerCrash(page)
    await page.evaluate(() => { (window as any).__b = 0; const f = () => { if (document.activeElement === document.body) (window as any).__b++; requestAnimationFrame(f) }; requestAnimationFrame(f) })
    await page.getByRole('button', { name: 'Try again' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Error states' })).toBeVisible()
    await expect(page.locator('#main')).toBeFocused()
    expect(await page.evaluate(() => (window as any).__b)).toBe(0)
  })

  // Mutation: drop the `resetKey={path}` prop from DemoErrorBoundary in DemoLayout.tsx ->
  // `componentDidUpdate` never sees `resetKey` change on this navigation, `state.error` is never
  // cleared, and the fallback from this crash keeps rendering under the unrelated Home route.
  test('navigating to another route clears the error', async ({ page }) => {
    await triggerCrash(page)
    await page.getByRole('link', { name: 'Go to the store home' }).click()
    await expect(page).toHaveURL(/\/store$/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByText('Something went wrong')).toHaveCount(0)
  })

  // Keying DemoErrorBoundary on `${path}:${resetCount}` together (an earlier version of this
  // component did) was reported, from a real browser, to remount <Suspense> on every navigation
  // and blank <main> to its own "Loading…" fallback even when the destination's lazy chunk is
  // already cached. This encodes that contract for the cached-visit case specifically (a
  // first-ever visit shows a fallback either way, proving nothing).
  //
  // Mutation tried and NOT restored as a passing check, recorded rather than hidden: adding
  // `path` back into the key (`key={`${path}:${resetCount}`}`) does not fail this test, here.
  // `React.lazy`'s wrapper caches its resolved module against the `lazy()` call itself (module-
  // scoped in routes.ts, not per-render), and its own status check on an already-fulfilled result
  // returns synchronously without a fresh suspend -- remounting the *boundary* around it, in this
  // build, never observably re-triggers the fallback either way, at least not for anything an rAF
  // sampler or a `document.body.innerText` check can catch. The architectural fix (Suspense no
  // longer remounts on an ordinary route change, only on a real crash/retry) still stands as
  // correct and is applied below regardless -- this test guards the contract going forward, not
  // a regression proven to exist in this exact build.
  test('navigating to an already-visited route never re-shows the "Loading…" fallback', async ({ page }) => {
    await page.goto('/store')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    // Warm Care's own lazy chunk -- resolved and cached from here on, independent of any
    // Suspense boundary's own mount identity.
    const nav = page.getByRole('navigation', { name: 'Hexline', exact: true })
    await nav.getByRole('link', { name: 'Care' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Hexline Care' })).toBeVisible()
    await nav.getByRole('link', { name: 'Home' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.evaluate(() => {
      ;(window as any).__loading = 0
      const f = () => {
        if (document.body.innerText.includes('Loading…')) (window as any).__loading++
        requestAnimationFrame(f)
      }
      requestAnimationFrame(f)
    })
    await nav.getByRole('link', { name: 'Care' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Hexline Care' })).toBeVisible()
    expect(await page.evaluate(() => (window as any).__loading)).toBe(0)
  })

  // A dynamic-import failure's own promise rejection is cached by React.lazy forever, so
  // recovering from one needs a real reload, not an ordinary "Try again" -- see
  // DemoErrorBoundary's own `CHUNK_LOAD_ERROR`. That reload, and the network 404 that provokes
  // the crash in the first place, both log real browser console errors this test deliberately
  // provokes on purpose, so this block opts into `allowedConsoleErrors` (e2e/fixtures.ts) for
  // exactly those two patterns -- every other test in this file still fails on any console.error
  // at all, unfiltered.
  test.describe('a chunk-load failure recovers with a reload, not an infinite retry loop', () => {
    test.use({ allowedConsoleErrors: ['dynamically imported module', 'Failed to load resource'] })

    // Mutation: remove the `CHUNK_LOAD_ERROR` branch from DemoErrorBoundary's `handleRetry` ->
    // "Try again" calls the ordinary `onRetry` instead of reloading, resuspends on the same
    // cached rejection, and crashes again immediately -- the final heading below stays "Something
    // went wrong" rather than becoming "Hexline Care".
    test('opening Care with its module blocked shows the fallback, and "Try again" reloads once unblocked', async ({
      page,
    }) => {
      await page.goto('/store')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await page.route('**/src/demo/pages/Pricing.tsx*', route => route.fulfill({ status: 404 }))
      // Scoped to the Navbar: the footer's own Shop column also links to Care (added the same
      // milestone this test predates), and an unscoped query is ambiguous between the two.
      await page.getByRole('navigation', { name: 'Hexline', exact: true }).getByRole('link', { name: 'Care' }).click()
      await expect(page.getByRole('heading', { level: 1, name: 'Something went wrong' })).toBeVisible()
      await expect(page.getByText(/couldn't load\. check your connection/i)).toBeVisible()
      await page.unroute('**/src/demo/pages/Pricing.tsx*')
      await page.getByRole('button', { name: 'Try again' }).click()
      await expect(page.getByRole('heading', { level: 1, name: 'Hexline Care' })).toBeVisible()
    })
  })

  for (const theme of THEMES) {
    // Mutation: drop "Try again" from the fallback's retry Button (rendered through ErrorState,
    // headingLevel={1}) -> a real axe `button-name` violation on the crashed page. (Dropping
    // `aria-hidden` from the TriangleAlert icon instead, tried in an earlier round, did not bite:
    // axe treats a roleless icon-only SVG as already outside the accessibility tree.)
    test(`the crashed error page is axe clean in ${theme} theme`, async ({ page }) => {
      await triggerCrash(page)
      await applyTheme(page, theme)
      await settleAnimations(page)
      await expectAxeClean(page)
    })
  }

  test.describe('the crashed error page reflows at short viewports', () => {
    const VIEWPORTS = [
      { width: 320, height: 800 },
      { width: 1280, height: 256 },
      { width: 320, height: 256 },
    ]

    // Mutation: add `min-w-[2000px]` to DemoRouteError's root wrapper div -> the poll below never
    // becomes true within its timeout, at every one of these three sizes.
    for (const viewport of VIEWPORTS) {
      test(`no horizontal overflow at ${viewport.width}x${viewport.height}`, async ({ page }) => {
        await page.setViewportSize(viewport)
        await triggerCrash(page)
        await applyTheme(page, 'light')
        await page.evaluate(() => document.fonts.ready)
        await expect
          .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), {
            message: `${viewport.width}x${viewport.height} scrolls horizontally`,
          })
          .toBe(true)
      })
    }
  })
})

// The account dashboard (`/store/account`, `/store/account/orders`, `/store/account/settings`) is
// reached only signed in -- every route has `sampleTitle: SIGN_IN_TITLE` in routes.ts precisely
// because demo.spec's own generic per-route sweep, and flows.spec's own dark-theme
// 1280x256/320x256 sweep, both navigate with no session and so only ever measure the sign-in
// redirect those routes bounce to (the same accepted gap Checkout/Verify/Onboarding already
// have). Neither sweep ever reaches the real, signed-in Overview/Orders/Settings content, so this
// block is where that content's own axe and reflow coverage lives, seeded with `addInitScript`
// the way flows.spec seeds a pending email or a cart line.
test.describe('Account pages', () => {
  const ACCOUNT_PATHS = ['/store/account', '/store/account/orders', '/store/account/settings']

  async function seedSignedIn(page: Page) {
    await page.addInitScript(() => {
      sessionStorage.setItem(
        'hexline-session',
        JSON.stringify({ user: { name: 'Rae', email: 'rae@hexline.test' }, pendingEmail: null })
      )
    })
  }

  // Mutation: drop the `if (!user)` check from RequireSession.tsx -> the Overview heading below
  // renders with no session instead of the sign-in redirect, and this assertion fails.
  for (const path of ACCOUNT_PATHS) {
    test(`a direct load of ${path} with no session bounces to sign-in with a notice`, async ({ page }) => {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1, name: 'Hexline account' })).toBeVisible()
      await expect(page.getByText('Sign in to see your account.')).toBeVisible()
    })
  }

  // Mutation: hardcode the notice in RequireSession.tsx to the generic string, ignoring
  // `hadUser.current` -> the text below never appears.
  // Signing out here leaves the page through a real route change (Settings sits behind
  // RequireSession, which redirects once the session clears), so focus lands wherever
  // `useFocusMainOnNavigate` sends every other in-app navigation: `#main`, never the body and
  // never the Sign in control -- that control only gets focused when signing out does NOT change
  // route (the Navbar's own menu, on a page with nothing gating it -- see demo.spec's own
  // "signing out focuses..." test for that case).
  test('signing out from Settings lands on sign-in, with its own notice, focus on #main', async ({ page }) => {
    await seedSignedIn(page)
    await page.goto('/store/account/settings')
    await expect(page.getByRole('heading', { level: 1, name: 'Your account' })).toBeVisible()
    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page).toHaveURL(/\/store\/sign-in$/)
    await expect(page.getByText("You've signed out.")).toBeVisible()
    await expect(page.locator('#main')).toBeFocused()
  })

  // Mutation: change Orders.tsx's PAGE_SIZE from 5 to 14 -> "Page 2" never appears, and the first
  // `getByRole('button', { name: 'Page 2' })` click below times out.
  test('Orders sorts by Total, paginates, and both survive a reload', async ({ page }) => {
    await seedSignedIn(page)
    await page.goto('/store/account/orders')
    await expect(page.getByRole('heading', { level: 1, name: 'Your account' })).toBeVisible()

    await page.getByRole('button', { name: 'Total' }).click()
    await expect(page).toHaveURL(/sort=total-asc/)
    // HX-100009 (€54.00) is the cheapest order in the fixed table -- the first row once sorted
    // ascending by total.
    await expect(page.getByRole('rowheader').first()).toHaveText('HX-100009')

    await page.getByRole('button', { name: 'Page 2' }).click()
    await expect(page).toHaveURL(/page=2/)
    // HX-100005 (€154.00) is the sixth-cheapest order -- the first row of the second page of 5,
    // sorted ascending by total.
    await expect(page.getByRole('rowheader').first()).toHaveText('HX-100005')

    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: 'Your account' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Total' })).toHaveAttribute('aria-sort', 'ascending')
    await expect(page.getByRole('rowheader').first()).toHaveText('HX-100005')
  })

  // Mutation: change the empty-state guard in Orders.tsx from `filtered.length === 0` to `false`
  // -> the table (with its own "Nothing to show." message) renders instead of this page's own
  // EmptyState, and the text below is never found.
  test('filtering Orders to a status with none shows an empty state, cleared by its own action', async ({ page }) => {
    await seedSignedIn(page)
    await page.goto('/store/account/orders')
    await expect(page.getByRole('heading', { level: 1, name: 'Your account' })).toBeVisible()
    await page.getByRole('combobox', { name: 'Status' }).click()
    await page.getByRole('option', { name: 'Returned', exact: true }).click()
    await expect(page.getByText('No orders match that status.')).toBeVisible()
    await expect(page.getByRole('table')).not.toBeVisible()
    await page.getByRole('button', { name: 'Clear filter' }).click()
    await expect(page.getByRole('table')).toBeVisible()
  })

  // Mutation: drop the `statusTriggerRef.current?.focus()` call from Orders.tsx's `clearFilter`
  // -> Clear filter's own button unmounts (the empty state it lived in goes away) with nothing
  // else claiming focus, and it drops to the body.
  test('Clear filter keeps focus off the body', async ({ page }) => {
    await seedSignedIn(page); await page.goto('/store/account/orders?status=Returned')
    await page.getByRole('button', { name: 'Clear filter' }).click()
    await expect(page.getByRole('table')).toBeVisible()
    await expect(page.getByRole('combobox', { name: 'Status' })).toBeFocused()
  })

  // Mutation: drop the `location.pathname === '/store/account'` check from DemoLayout.tsx's
  // `handleAccountSelect` (always `navigate('/store/account')`) -> at either width, `#main` below
  // is not focused, since React Router's own navigate() to the page already showing renders
  // nothing new for `useFocusMainOnNavigate` to react to.
  for (const width of [320, 1280]) {
    test(`Your account from the Account menu at ${width}px`, async ({ page }) => {
      await seedSignedIn(page)
      await page.setViewportSize({ width, height: 800 })
      await page.goto('/store/shop')
      await page.getByRole('button', { name: 'Account: Rae' }).locator('visible=true').click()
      await page.getByRole('menuitem', { name: 'Your account' }).click()
      await expect(page).toHaveURL(/\/store\/account$/)
      await expect(page.locator('#main')).toBeFocused()
    })
  }

  // Mutation: drop the `location.pathname === '/store/account'` check from DemoLayout.tsx's
  // `handleAccountSelect` (always `navigate('/store/account')`) -> the history length below grows
  // by one (a duplicate entry for the page already showing) instead of staying the same.
  test('choosing "Your account" while already there moves focus, without a duplicate history entry', async ({
    page,
  }) => {
    await seedSignedIn(page)
    await page.goto('/store/account')
    await expect(page.getByRole('heading', { level: 1, name: 'Your account' })).toBeVisible()
    const historyLength = await page.evaluate(() => history.length)
    await page.getByRole('button', { name: 'Account: Rae' }).locator('visible=true').click()
    await page.getByRole('menuitem', { name: 'Your account' }).click()
    await expect(page).toHaveURL(/\/store\/account$/)
    await expect(page.locator('#main')).toBeFocused()
    expect(await page.evaluate(() => history.length)).toBe(historyLength)
  })

  // The `signingOut` ref (DemoLayout.tsx) tells `onCloseAutoFocus` this close is a sign out, not
  // a plain menu selection, so it can preventDefault Radix's own default (return focus to the
  // trigger, which Sign out has just removed from the DOM). Signed in from the shop (no route
  // change involved, so this isolates the ref's own effect from the redirect this file's other
  // sign-out test already covers).
  //
  // Dropping the `if (signingOut.current)` gate so `closeAutoFocus` never calls `preventDefault`
  // for Sign out does NOT fail this test: `wasSignedIn`'s own effect above runs independently on
  // every `user` transition from signed-in to signed-out and focuses the Sign in control itself,
  // regardless of what Radix's close-autofocus did or didn't do first. The mutation that does
  // fail it is dropping that effect's own `visible?.focus()` call -- the real load-bearing line
  // this test actually guards. The `signingOut` ref/preventDefault pair still earns its place (it
  // stops Radix from attempting to focus a trigger node that's already gone, rather than relying
  // on that attempt being a harmless no-op), just not on a distinction this particular assertion
  // can tell apart from the effect's own guarantee.
  test('signing out from the Account menu still focuses the Sign in control', async ({ page }) => {
    await seedSignedIn(page)
    await page.goto('/store/shop')
    await page.getByRole('button', { name: 'Account: Rae' }).locator('visible=true').click()
    await page.getByRole('menuitem', { name: 'Sign out' }).click()
    await expect(page.getByRole('link', { name: 'Sign in' }).locator('visible=true')).toBeFocused()
  })

  for (const theme of THEMES) {
    for (const path of ACCOUNT_PATHS) {
      test(`${path} — axe clean, signed in, in ${theme} theme`, async ({ page }) => {
        await seedSignedIn(page)
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.goto(path)
        await expect(page.getByRole('heading', { level: 1, name: 'Your account' })).toBeVisible()
        await applyTheme(page, theme)
        await settleAnimations(page)
        await expectAxeClean(page)
      })
    }
  }

  // Mutation, run once as representative proof (every other route/viewport pair shares the same
  // poll against the same two properties): add `min-w-[2000px]` to AccountLayout.tsx's root
  // wrapper div -> every one of these fails, the page wider than each viewport.
  const REFLOW_VIEWPORTS = [
    { width: 320, height: 800 },
    { width: 1280, height: 256 },
    { width: 320, height: 256 },
  ]
  for (const path of ACCOUNT_PATHS) {
    for (const viewport of REFLOW_VIEWPORTS) {
      test(`${path} has no horizontal overflow at ${viewport.width}x${viewport.height}, signed in`, async ({
        page,
      }) => {
        await seedSignedIn(page)
        await page.setViewportSize(viewport)
        await page.goto(path)
        await expect(page.getByRole('heading', { level: 1, name: 'Your account' })).toBeVisible()
        await page.evaluate(() => document.fonts.ready)
        await expect
          .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), {
            message: `${path} scrolls horizontally at ${viewport.width}x${viewport.height}`,
          })
          .toBe(true)
      })
    }
  }
})

// The homepage under its hero: five sections, two of them sliders that run the full width of the
// page. demo.spec.ts already holds axe and the 320px reflow for `/store` in both themes; what is
// here is what only this page can get wrong.
test.describe('Homepage sections', () => {
  const SECTIONS = [
    'Top-rated replicas',
    'Offers',
    'Shop by category',
    'Top-rated accessories',
    'House rules',
  ]

  // A slider runs edge to edge and carries the page gutter as its own padding, so its first card
  // has to start where the headings do, at both gutters: 64px at 1280 and 16px at 390. Mutation:
  // pass `gutter="2rem"` to a Carousel in Home.tsx -> its first card starts 32px left of the
  // brand at 1280 and 16px right of it at 390.
  for (const width of [1280, 390]) {
    test(`every section heading, and the first card of each slider, starts at the page gutter at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 })
      await page.goto('/store')
      await page.evaluate(() => document.fonts.ready)
      const brandX = await pageGutter(page)
      for (const name of SECTIONS) {
        const heading = page.getByRole('heading', { level: 2, name })
        await expect(heading).toBeVisible()
        const x = await heading.evaluate(el => el.getBoundingClientRect().left)
        expect(Math.abs(x - brandX), `"${name}" heading`).toBeLessThanOrEqual(1)
      }
      for (const name of ['Offers', 'Top-rated accessories']) {
        const x = await page
          .getByRole('region', { name })
          .getByRole('listitem')
          .first()
          .evaluate(el => el.getBoundingClientRect().left)
        expect(Math.abs(x - brandX), `first card of "${name}"`).toBeLessThanOrEqual(1)
      }
    })
  }

  // "Top-rated replicas" is four cards (the rule in store/selections.ts yields four since the
  // Harrier LR joined the catalogue): all four across on a wide screen, two by two in between,
  // one column on a phone. Never three, which would strand the fourth on a row of its own.
  // Mutation: put `@xl:grid-cols-3` back on the grid in Home.tsx -> [3, 1] at 1024.
  for (const { width, rows } of [
    { width: 1440, rows: [4] },
    { width: 1280, rows: [4] },
    { width: 1024, rows: [2, 2] },
    { width: 768, rows: [2, 2] },
    { width: 390, rows: [1, 1, 1, 1] },
  ]) {
    test(`the top-rated replicas are four cards in rows of ${rows.join(' and ')} at ${width}px, one height per row`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/store')
      await page.evaluate(() => document.fonts.ready)
      const list = page.getByRole('region', { name: 'Top-rated replicas' }).getByRole('list')
      await list.scrollIntoViewIfNeeded()
      const measured = await list.evaluate(node => {
        const cards = Array.from(node.children, item => item.getBoundingClientRect())
        const tops = [...new Set(cards.map(card => Math.round(card.top)))]
        return {
          count: cards.length,
          perRow: tops.map(top => cards.filter(card => Math.round(card.top) === top).length),
          heightsPerRow: tops.map(top => new Set(cards.filter(card => Math.round(card.top) === top).map(card => Math.round(card.height))).size),
        }
      })
      expect(measured.count).toBe(4)
      expect(measured.perRow).toEqual(rows)
      expect(measured.heightsPerRow.every(count => count === 1), 'cards in a row are one height').toBe(true)
    })
  }

  // House rules: four cards built from the system's Card, in one row on a wide screen and all one
  // height, two by two in between, stacked on a phone. The fourth says what the store is.
  // Mutation: drop `h-full` from the rule cards in Home.tsx -> the heights differ.
  for (const { width, rows } of [
    { width: 1440, rows: [4] },
    { width: 1024, rows: [2, 2] },
    { width: 390, rows: [1, 1, 1, 1] },
  ]) {
    test(`the house rules are four cards in rows of ${rows.join(' and ')} at ${width}px, one height per row`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/store')
      await page.evaluate(() => document.fonts.ready)
      const cards = page.getByRole('list', { name: 'House rules' }).getByRole('article')
      await expect(cards).toHaveCount(4)
      await cards.first().scrollIntoViewIfNeeded()
      const boxes = await cards.evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect()).map(rect => ({ top: Math.round(rect.top), height: Math.round(rect.height) })))
      const tops = [...new Set(boxes.map(box => box.top))]
      expect(tops.map(top => boxes.filter(box => box.top === top).length)).toEqual(rows)
      for (const top of tops) {
        expect(new Set(boxes.filter(box => box.top === top).map(box => box.height)).size, 'one height per row').toBe(1)
      }
    })
  }

  // The fourth card's link goes off the site, to the portfolio the case study will be published
  // on, and says so: a new tab, announced, and "Coming soon" beside it. Not clicked here: the
  // suite does not reach the network.
  test('the fourth house rule links out to the case study, announced as a new tab and marked as coming soon', async ({ page }) => {
    await page.goto('/store')
    const concept = page.getByRole('list', { name: 'House rules' }).getByRole('article').nth(3)
    await expect(concept).toContainText('Nothing here is for sale.')
    const link = concept.getByRole('link', { name: 'Read the case study (opens in a new tab)' })
    await expect(link).toHaveAttribute('href', 'https://victor-ilioiu.vercel.app')
    await expect(link).toHaveAttribute('target', '_blank')
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    await expect(concept).toContainText('Coming soon')
  })

  // SectionHeading draws its index ABOVE the title, on a line of its own, so the title keeps the
  // left edge its description and its section share. Mutation: put `flex-row items-baseline`
  // back on the heading in SectionHeading.tsx -> the numeral's bottom is below the title's top
  // and the title starts to the right of the numeral.
  test('each section numeral sits above its title, both on the same left edge', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/store')
    await page.evaluate(() => document.fonts.ready)
    for (const name of ['Top-rated replicas', 'Offers', 'Shop by category', 'Top-rated accessories', 'House rules']) {
      const heading = page.getByRole('heading', { level: 2, name })
      const boxes = await heading.evaluate(node => {
        const [numeral, title] = Array.from(node.children, child => child.getBoundingClientRect())
        return { numeral: { left: numeral.left, bottom: numeral.bottom }, title: { left: title.left, top: title.top } }
      })
      expect(boxes.numeral.bottom, `"${name}": numeral above the title`).toBeLessThanOrEqual(boxes.title.top)
      expect(Math.abs(boxes.numeral.left - boxes.title.left), `"${name}": one left edge`).toBeLessThanOrEqual(1)
    }
  })

  // The affordance: at every width the last card in view is cut by the edge of the page, and the
  // cards in a row are one height, with or without a badge or a compare price.
  for (const width of [1440, 1024, 768, 390]) {
    test(`each slider shows a cut card at its edge and cards of one height at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/store')
      await page.evaluate(() => document.fonts.ready)
      for (const name of ['Offers', 'Top-rated accessories']) {
        const track = page.getByRole('region', { name }).getByRole('list')
        await track.scrollIntoViewIfNeeded()
        const measured = await track.evaluate(list => {
          const view = list.getBoundingClientRect()
          const cards = Array.from(list.children, item => item.getBoundingClientRect())
          return {
            cut: cards.some(card => card.left < view.right - 24 && card.right > view.right + 24),
            heights: [...new Set(cards.map(card => Math.round(card.height)))],
            nameTops: [
              ...new Set(Array.from(list.querySelectorAll('h3'), heading => Math.round(heading.getBoundingClientRect().top))),
            ],
          }
        })
        expect(measured.cut, `"${name}" shows part of a further card`).toBe(true)
        expect(measured.heights, `"${name}" card heights`).toHaveLength(1)
        // Names on one line across the row: a badge does not push its card's name down.
        expect(measured.nameTops, `"${name}" product name positions`).toHaveLength(1)
      }
    })
  }

  // Smooth scroll (Lenis) is on for this test: motion allowed, a fine pointer. A sideways wheel
  // over a slider has to reach the slider, and a wheel straight down over it still scrolls the
  // page. Mutation: remove `allowNestedScroll` from src/fx/smooth-scroll.ts -> the second wheel
  // event (sideways with a little vertical in it, the shape a trackpad swipe has) moves nothing.
  test('a sideways wheel over a slider scrolls the slider, and a vertical one still scrolls the page', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/store')
    await page.waitForFunction(() => {
      const lenis = (window as unknown as { __lenis?: { limit: number } }).__lenis
      return lenis !== undefined && lenis.limit > 0
    })
    const track = page.getByRole('region', { name: 'Offers' }).getByRole('list')
    await track.scrollIntoViewIfNeeded()
    const box = (await track.boundingBox())!
    await page.mouse.move(box.x + 300, box.y + box.height / 2)
    const scrollLeft = () => track.evaluate(list => list.scrollLeft)

    await page.mouse.wheel(300, 0)
    await expect.poll(scrollLeft).toBeGreaterThan(0)
    const afterFirst = await scrollLeft()
    await page.mouse.wheel(300, 12)
    await expect.poll(scrollLeft).toBeGreaterThan(afterFirst)

    const pageY = await page.evaluate(() => window.scrollY)
    await page.mouse.wheel(0, 240)
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(pageY)
  })

  test('a category tile opens the shop filtered to that category, with the count the tile gave', async ({ page }) => {
    await page.goto('/store')
    const tile = page
      .getByRole('region', { name: 'Shop by category' })
      .getByRole('listitem')
      .filter({ hasText: 'Optics' })
    const count = (await tile.textContent())!.match(/(\d+) products?/)![1]
    await tile.getByRole('link', { name: 'Optics' }).click()
    await expect(page).toHaveURL(/\/store\/shop\?category=optics$/)
    await expect(page.getByRole('checkbox', { name: 'Optics' })).toBeChecked()
    await expect(page.getByRole('status', { name: 'Result count' })).toHaveText(new RegExp(`^${count} products?$`))
  })

  // The sign-up is the Footer's since 2026-10-02 (it was this page's sixth section), on every
  // page; these three run it from the homepage, where it used to live. The Footer's layout
  // around it is held in organisms.spec.ts.
  test.describe('the newsletter sign-up in the Footer, through the demo API', () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(() => {
        ;(window as unknown as { __hexlineLatency?: number }).__hexlineLatency = 0
      })
    })

    test('an empty submit focuses the error summary, the offline address shows the alert, a real one succeeds', async ({
      page,
    }) => {
      await page.goto('/store')
      const form = page.getByRole('form', { name: 'Newsletter sign-up' })
      const field = form.getByRole('textbox', { name: 'Email for field notes', exact: true })
      const submit = form.locator('button[type="submit"]')

      await submit.click()
      await expect(form.getByRole('group', { name: 'There is a problem' })).toBeFocused()

      await field.fill('offline@hexline.test')
      await submit.click()
      await expect(form.getByRole('alert')).toHaveText('Something went wrong. Please try again.')
      await expect(field).toHaveValue('offline@hexline.test')

      await field.fill('rae@hexline.test')
      await submit.click()
      await expect(page.getByRole('heading', { level: 3, name: 'You are subscribed' })).toBeFocused()
      await expect(page.getByText('Updates go to rae@hexline.test.')).toBeVisible()
      await expect(form).toHaveCount(0)
    })

    for (const theme of THEMES) {
      test(`axe clean with the newsletter error summary showing in ${theme} theme`, async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.goto('/store')
        await applyTheme(page, theme)
        const form = page.getByRole('form', { name: 'Newsletter sign-up' })
        await form.locator('button[type="submit"]').click()
        await expect(form.getByRole('group', { name: 'There is a problem' })).toBeFocused()
        await settleAnimations(page)
        await expectAxeClean(page)
      })
    }
  })
})
