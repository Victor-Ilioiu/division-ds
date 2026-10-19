import { DISCLAIMER } from '../src/demo/content'
import { DEMO_PAGES } from '../src/demo/routes'
import { applyTheme, expect, expectAxeClean, settleAnimations, test, THEMES } from './fixtures'

type SpecPage = { path: string; title: string; samplePath?: string; sampleTitle?: string }

const PAGES: SpecPage[] = [
  ...DEMO_PAGES.map(p => ({ path: p.path, title: p.title, samplePath: p.samplePath, sampleTitle: p.sampleTitle })),
  { path: '/demo/does-not-exist', title: 'Hexline — page not found' },
]

for (const theme of THEMES) {
  for (const page of PAGES) {
    test(`${page.path} — axe clean in ${theme} theme`, async ({ page: p }) => {
      await p.emulateMedia({ reducedMotion: 'reduce' })
      await p.goto(page.samplePath ?? page.path)
      await expect(p.getByRole('heading', { level: 1 })).toBeVisible()
      await expect(p).toHaveTitle(page.sampleTitle ?? page.title)
      await applyTheme(p, theme)
      await settleAnimations(p)
      await expectAxeClean(p)
    })
  }
}

test.describe('reflow at 320px', () => {
  test.use({ viewport: { width: 320, height: 800 } })
  for (const theme of THEMES) {
    for (const page of PAGES) {
      test(`${page.path} — no horizontal overflow at 320px in ${theme} theme`, async ({ page: p }) => {
        await p.goto(page.samplePath ?? page.path)
        await expect(p.getByRole('heading', { level: 1 })).toBeVisible()
        await applyTheme(p, theme)
        const { scrollWidth, innerWidth } = await p.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
        }))
        expect(scrollWidth, `${page.path} scrolls horizontally at 320px`).toBeLessThanOrEqual(innerWidth)
      })
    }
  }
})

// The replica rule's rendered half: every page that shows a product states what the products are
// in the page body, and the Footer states it on every page. One sentence, one form, read from the
// same `DISCLAIMER` constant the pages render. Checkout only renders with something in the cart
// (an empty one bounces to /demo/cart), so a line is seeded first, the way flows.spec.ts seeds one:
// written once after a first navigation, since sessionStorage survives every later `goto`.
// Mutation: remove `<Disclaimer />` from any one of Home, Shop, Product, Cart or Checkout -> the
// `main` assertion fails on that route. Change `legal={DISCLAIMER}` in DemoLayout.tsx -> the
// footer assertion fails on the first route.
test('the disclaimer is in the body of home, shop, product, cart and checkout, and in the footer everywhere', async ({
  page,
}) => {
  await page.goto('/demo')
  await page.evaluate(() => {
    sessionStorage.setItem(
      'hexline-cart',
      JSON.stringify([
        {
          id: 'kestrel-c:-:black',
          productId: 'kestrel-c',
          name: 'Kestrel C carbine replica',
          unitPrice: 13900,
          quantity: 1,
          colourId: 'black',
        },
      ])
    )
  })
  for (const path of ['/demo', '/demo/shop', '/demo/shop/kestrel-c', '/demo/cart', '/demo/checkout']) {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    // Still on the route asked for: checkout did not bounce to the cart.
    expect(new URL(page.url()).pathname, `${path} redirected`).toBe(path)
    await expect(page.locator('main').getByText(DISCLAIMER, { exact: true }), `${path} body`).toBeVisible()
    await expect(page.getByRole('contentinfo').getByText(DISCLAIMER, { exact: true }), `${path} footer`).toBeVisible()
  }
  // A page that shows no product carries it in the footer only.
  await page.goto('/demo/sign-in')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.locator('main').getByText(DISCLAIMER, { exact: true })).toHaveCount(0)
  await expect(page.getByRole('contentinfo').getByText(DISCLAIMER, { exact: true })).toBeVisible()
})

test('an in-app navigation moves focus to main, never to body', async ({ page }) => {
  await page.goto('/demo/does-not-exist')
  await page.getByRole('link', { name: 'Back to the Hexline home' }).click()
  await expect(page).toHaveURL(/\/demo$/)
  await expect(page.locator('#main')).toBeFocused()
})

test('leaving /demo for the docs restores the shell title and focuses main', async ({ page }) => {
  await page.goto('/demo')
  await page.getByRole('link', { name: 'Documentation' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page).toHaveTitle('Division DS')
  await expect(page.locator('#main')).toBeFocused()
})

// A path under /demo that no registered route claims still renders the Hexline shell's own
// NotFound (Navbar and Footer, "Back to the Hexline home"), not the docs shell's DocsNotFound
// -- the outer app's catch-all sits BELOW the DemoLayout route in App.tsx, so /demo/* keeps
// matching its own fallthrough first.
// Mutation: remove the `<Route path="/demo/*" element={<NotFound />} />` line from App.tsx ->
// this path falls through to the docs shell's own 404 instead, and the Hexline nav landmark
// below is never rendered.
test('/demo/nope still shows the Hexline page, not the docs shell', async ({ page }) => {
  await page.goto('/demo/nope')
  await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Hexline', exact: true })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Documentation' })).not.toBeVisible()
  await expect(page).toHaveTitle('Hexline — page not found')
})

// AppShell now takes its title from a `title` prop rather than a hardcoded string, so the route
// that renders DocsNotFound can pass it something other than the default -- and a real navigation
// away from that route (not just a mounted-once assertion) has to win the default title back.
// Mutation: hardcode `document.title = 'Division DS'` in AppShell, ignoring the `title` prop ->
// the first assertion below fails immediately; the docs 404 never shows its own title at all.
test('a real click from the docs 404 to a real page restores "Division DS"', async ({ page }) => {
  await page.goto('/does-not-exist')
  await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible()
  await expect(page).toHaveTitle('Division DS — page not found')
  await page.getByRole('link', { name: 'Components: Button' }).click()
  await expect(page).toHaveURL(/\/components\/button$/)
  await expect(page).toHaveTitle('Division DS')
})

// A back/forward navigation (or any history change React Router's own Link never drove) still
// has to land on the right title: BrowserRouter listens for the browser's own `popstate` event,
// not just its own Link clicks, and AppShell's title effect has to run again once that swaps in
// DocsNotFound.
// Mutation: give AppShell's title effect a `[]` dependency array -> the title never updates again
// after the first AppShell mount, and this reads the PREVIOUS page's title instead of the 404's.
test('a history pushState plus a popstate event shows the docs 404 title', async ({ page }) => {
  await page.goto('/components/button')
  await expect(page).toHaveTitle('Division DS')
  await page.evaluate(() => {
    history.pushState({}, '', '/components/nope')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible()
  await expect(page).toHaveTitle('Division DS — page not found')
})

// The Navbar's actions row (brand, the account control, the cart button, the theme toggle, the
// mobile menu button) has to lay out on one line at 320px, not wrap onto a second: a wrap grows
// the header, and at a 320x256 viewport (400% zoom) every pixel of header height comes out of
// the page (see commands.md's "Gotchas that cost time" for the numbers). Below
// `sm` the account control switches to an icon-only compact form for exactly this reason -- this
// proves the switch actually holds the header to one row's height, in both auth states, rather
// than asserting the pixel widths that only justify it.
test.describe('the Navbar actions row does not wrap at 320px', () => {
  for (const signedIn of [false, true]) {
    test(`header height matches at 320px, 680px and 1280px, ${signedIn ? 'signed in' : 'signed out'}`, async ({
      page,
    }) => {
      if (signedIn) {
        await page.addInitScript(() => {
          sessionStorage.setItem(
            'hexline-session',
            JSON.stringify({ user: { name: 'Alex', email: 'alex@hexline.test' }, pendingEmail: null })
          )
        })
      }
      const name = signedIn ? 'Account: Alex' : 'Sign in'
      const role = signedIn ? 'button' : 'link'

      await page.setViewportSize({ width: 1280, height: 800 })
      await page.goto('/demo')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      // A web font swapping in after the first paint reflows the row it sizes -- wait for it
      // before trusting a boundingBox read, and poll rather than read once, since the resize
      // itself needs a frame to settle.
      await page.evaluate(() => document.fonts.ready)
      // Exactly one control with this name is in the accessibility tree: the other form is
      // display:none, which a real browser (unlike jsdom) drops from both the tab order and
      // getByRole's own accessible-name lookup.
      await expect(page.getByRole(role, { name })).toHaveCount(1)
      let wideHeight = 0
      await expect.poll(async () => {
        wideHeight = (await page.locator('header').boundingBox())?.height ?? 0
        return wideHeight
      }).toBeGreaterThan(0)

      // 680px sits just above the @2xl container-query breakpoint (42rem/672px) that swaps the
      // Navbar's own inline item list in for the hamburger menu -- Care's own inNav entry made
      // that list one item longer than it has ever been, so 680px is where a wrap would first
      // show up, not at 320px (below @2xl, the list is hidden entirely) or 1280px (comfortably
      // clear of it).
      for (const width of [680, 320]) {
        await page.setViewportSize({ width, height: 800 })
        await page.evaluate(() => document.fonts.ready)
        await expect(page.getByRole(role, { name })).toHaveCount(1)
        let otherHeight = 0
        await expect.poll(async () => {
          otherHeight = (await page.locator('header').boundingBox())?.height ?? 0
          return otherHeight
        }).toBeGreaterThan(0)

        expect(otherHeight, `the header grew a second row at ${width}px`).toBe(wideHeight)
      }
    })
  }

  for (const width of [320, 375, 639, 640, 1280]) {
    test(`signing out focuses whichever Sign in control the width shows, at ${width}px`, async ({ page }) => {
      await page.addInitScript(() => {
        sessionStorage.setItem(
          'hexline-session',
          JSON.stringify({ user: { name: 'Alex', email: 'alex@hexline.test' }, pendingEmail: null })
        )
      })
      await page.setViewportSize({ width, height: 800 })
      await page.goto('/demo')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await page.getByRole('button', { name: 'Account: Alex' }).click()
      await page.getByRole('menuitem', { name: 'Sign out' }).click()
      await expect(page.getByRole('link', { name: 'Sign in' })).toBeFocused()
    })
  }
})

// The demo Footer: four groups read from the catalogue, the guide list and the route registry.
// A grid with no buttons on a desktop, an accordion on a phone, and every Shop link lands on the
// shop filtered to its category, through the shop's own URL parameter.
// Mutation (run 2026-10-02): change `?category=` to `?cat=` in FOOTER_COLUMNS (DemoLayout.tsx) ->
// the URL assertion fails.
test('the demo footer is a grid on a desktop and an accordion on a phone, and a Shop link filters the shop', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/demo/care')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  const footer = page.getByRole('contentinfo')
  const nav = footer.getByRole('navigation', { name: 'Hexline footer' })
  await expect(nav.getByRole('button')).toHaveCount(0)
  for (const title of ['Shop', 'Guides', 'Service', 'Design system']) {
    await expect(nav.getByRole('heading', { level: 2, name: title, exact: true })).toBeVisible()
  }
  await expect(nav.getByRole('list', { name: 'Guides', exact: true }).getByRole('link')).toHaveCount(5)

  await page.setViewportSize({ width: 390, height: 800 })
  await expect(nav.getByRole('button')).toHaveCount(4)
  await expect(nav.getByRole('link')).toHaveCount(0)
  // The disclaimer is the small print, not inside any group: it stays on screen.
  await expect(footer.getByText(DISCLAIMER, { exact: true })).toBeVisible()
  const shop = nav.getByRole('button', { name: 'Shop', exact: true })
  await shop.click()
  await expect(shop).toHaveAttribute('aria-expanded', 'true')
  await expect(nav.getByRole('link')).toHaveCount(6)
  await nav.getByRole('link', { name: 'Optics', exact: true }).click()
  await expect(page).toHaveURL(/\/demo\/shop\?category=optics$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Shop' })).toBeVisible()
  await expect(page.getByRole('status', { name: 'Result count' })).toHaveText(/^\d+ products?$/)
  const shown = Number((await page.getByRole('status', { name: 'Result count' }).textContent())!.split(' ')[0])
  expect(shown).toBeGreaterThan(0)
  expect(shown).toBeLessThan(20)
})
