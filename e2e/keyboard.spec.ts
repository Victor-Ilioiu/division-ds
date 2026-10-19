import { test, expect, gotoDocs } from './fixtures'
import { NAV, SECTIONS } from '../src/components/shell/Sidebar'

const THEMES = ['dark', 'light'] as const
// Headroom beyond one tab per sidebar entry: the skip link and the shell's own chrome stops
// (e.g. the theme toggle) before the sidebar is ever reached, plus one tab past the sidebar's
// last link so the walk can register landing outside it. The walk breaks at that first
// post-sidebar stop, so this never needs to cover multiple tabs into <main> — just that one.
// Scales on its own as SECTIONS grows instead of needing a hand-raised bump each milestone.
const SHELL_AND_CONTENT_HEADROOM = 10
// The sidebar organism gives every group its own disclosure button (aria-expanded/aria-controls)
// ahead of its items, one tab stop per NAV group. Derived from NAV.length rather than hand-coded,
// so it scales on its own the same way SECTIONS.length does above if a group is ever added.
const GROUP_TOGGLE_TABS = NAV.length
const MAX_TABS = SECTIONS.length + GROUP_TOGGLE_TABS + SHELL_AND_CONTENT_HEADROOM
const SIDEBAR_SELECTOR = 'nav[aria-label="Documentation"]'

/** Describes document.activeElement without holding a handle across awaits. */
async function activeElementInfo(page: import('@playwright/test').Page) {
  return page.evaluate(
    ({ sidebarSelector }) => {
      const el = document.activeElement as HTMLElement | null
      if (!el) return null
      return {
        tag: el.tagName,
        text: (el.textContent ?? '').trim().slice(0, 40),
        isSkipLink: el.getAttribute('href') === '#main',
        inSidebar: !!el.closest(sidebarSelector),
        inMain: !!el.closest('#main'),
      }
    },
    { sidebarSelector: SIDEBAR_SELECTOR }
  )
}

const TRANSPARENT = 'rgba(0, 0, 0, 0)'

/** The computed outline-colour of the `.bevel-focus-wrap` around whatever currently has focus. */
async function focusWrapOutlineColor(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null
    const wrap = el?.closest('.bevel-focus-wrap') as HTMLElement | null
    return wrap ? getComputedStyle(wrap).outlineColor : null
  })
}

/**
 * Focuses `selector` and reports the ring host's computed `outline-color` twice: synchronously,
 * in the same task as the focus, and again one animation frame later. Both readings are compared
 * against `--color-focus-ring` resolved in the live theme, so the assertion is "the ring is the
 * ring token", not "the ring is painted".
 *
 * The existing bevelled test above compares transparent-versus-painted and structurally cannot
 * see a wrong COLOUR. It could not: every unbevelled control carried Tailwind's
 * `transition-colors`, whose property list includes `outline-color`, and no rest-state
 * `outline-color` was declared — so the ring started at `currentColor` (text.primary, near-white)
 * and interpolated to the signal over 120ms. Measured on `main input` at /components/input before
 * the fix: rgb(233,238,244) at t+0ms, rgb(239,139,96) at t+30ms, rgb(242,85,15) at t+60ms. The
 * one-frame reading is the load-bearing half: a transition is ~4% along by then, which is a plain
 * inequality, while the synchronous reading can legitimately land on either end of a transition
 * depending on when the timeline advances.
 *
 * A keyboard press before calling this is required, not decoration: Chromium only matches
 * `:focus-visible` on a programmatically focused button when the last user interaction was a
 * keyboard one.
 */
async function ringColorAtFocus(
  page: import('@playwright/test').Page,
  selector: string,
  ringHost: 'self' | 'wrap'
) {
  return page.evaluate(
    async ({ selector, ringHost }) => {
      const el = document.querySelector(selector) as HTMLElement | null
      if (!el) throw new Error(`no element matched ${selector}`)
      const host = ringHost === 'wrap' ? (el.closest('.bevel-focus-wrap') as HTMLElement | null) : el
      if (!host) throw new Error(`no ring host for ${selector}`)

      // Resolve the token through the cascade in whatever theme is live, so the expectation is
      // the token itself rather than a hex copied into the test.
      const probe = document.createElement('span')
      probe.style.color = 'var(--color-focus-ring)'
      document.body.append(probe)
      const expected = getComputedStyle(probe).color
      probe.remove()

      el.focus()
      const atFocus = getComputedStyle(host).outlineColor
      await new Promise(resolve => requestAnimationFrame(() => resolve(null)))
      const nextFrame = getComputedStyle(host).outlineColor

      return { expected, atFocus, nextFrame, focused: document.activeElement === el }
    },
    { selector, ringHost }
  )
}

for (const theme of THEMES) {
  // Bevelled controls (Button, IconButton) delegate their ring to an unclipped wrapper, because
  // clip-path would clip an outline drawn on the button itself. That wrapper used to key on
  // `:focus-within`, which matches for a mouse click too — so clicking a Button painted an orange
  // ring while clicking a Checkbox (plain `focus-visible:`) did not. Both halves answer to
  // focus-visible now; this is the gate that says so, in both directions.
  test(`bevelled focus ring is keyboard-only — ${theme} theme`, async ({ page }) => {
    await gotoDocs(page, '/components/button')
    await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme)

    const button = page.locator('#main .bevel-focus-wrap > button').first()
    await button.click()
    expect(
      await page.evaluate(() => document.activeElement?.tagName),
      'the click should leave the button focused'
    ).toBe('BUTTON')
    expect(
      await focusWrapOutlineColor(page),
      'a mouse click must not paint the ring — :focus-within would have'
    ).toBe(TRANSPARENT)

    // Leave and return by keyboard: that flips focus-visible on without changing which element
    // holds focus.
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Tab')
    expect(
      await page.evaluate(() => document.activeElement?.tagName),
      'Shift+Tab then Tab should land back on the same button'
    ).toBe('BUTTON')
    expect(
      await focusWrapOutlineColor(page),
      'keyboard focus must still paint the ring on the unclipped wrapper'
    ).not.toBe(TRANSPARENT)
  })

  // The ring is this system's reticle motif and the one signal a keyboard user relies on, so its
  // COLOUR at the instant of focus is gated, not just its presence. One bevelled control (ring on
  // the unclipped wrapper) and one unbevelled control (ring on the element itself), because the
  // two halves draw it in different places and only one of them was ever broken.
  test(`unbevelled ring is the ring token at the instant of focus — ${theme} theme`, async ({ page }) => {
    await gotoDocs(page, '/components/input')
    await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme)

    // Establishes keyboard modality; without it Chromium will not match :focus-visible on a
    // programmatic focus.
    await page.keyboard.press('Tab')

    const ring = await ringColorAtFocus(page, '#main input:not([disabled]):not([readonly])', 'self')
    expect(ring.focused, 'the input should hold focus').toBe(true)
    expect(ring.atFocus, 'the ring must already be the focus-ring token in the focus task').toBe(ring.expected)
    expect(
      ring.nextFrame,
      'one frame after focus the ring must still be the token — anything else means outline-color is being transitioned'
    ).toBe(ring.expected)
  })

  // The theme toggle renders on all 28 pages and shipped with no system ring at all, falling
  // back to the UA default (rgb(16, 16, 16) auto 1px), because it was a hand-rolled <button>
  // rather than the Button atom. It routes through the atom now; this is what keeps it there.
  test(`the shell's theme toggle draws the system ring — ${theme} theme`, async ({ page }) => {
    await gotoDocs(page, '/components/button')
    await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme)

    await page.keyboard.press('Tab')

    const ring = await ringColorAtFocus(page, 'header .bevel-focus-wrap > button', 'wrap')
    expect(ring.focused, 'the theme toggle should hold focus').toBe(true)
    expect(ring.atFocus, 'the theme toggle must draw the system focus ring, not the UA default').toBe(ring.expected)
  })

  test(`bevelled ring is the ring token at the instant of focus — ${theme} theme`, async ({ page }) => {
    await gotoDocs(page, '/components/button')
    await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme)

    await page.keyboard.press('Tab')

    const ring = await ringColorAtFocus(page, '#main .bevel-focus-wrap > button:not([disabled])', 'wrap')
    expect(ring.focused, 'the button should hold focus').toBe(true)
    expect(ring.atFocus, 'the wrapper ring must already be the focus-ring token in the focus task').toBe(ring.expected)
    expect(ring.nextFrame, 'one frame after focus the wrapper ring must still be the token').toBe(ring.expected)
  })

  test(`keyboard walk — ${theme} theme`, async ({ page }) => {
    // /components/button is the first docs page with focusable content inside <main> (its
    // Examples render real buttons and a link), which is what makes the "reaches main" step
    // below satisfiable. Earlier docs pages render nothing focusable there.
    await gotoDocs(page, '/components/button')
    await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme)

    const viewport = page.viewportSize()
    if (!viewport) throw new Error('no viewport size available')

    await test.step('first Tab reaches the skip link', async () => {
      await page.keyboard.press('Tab')
      const info = await activeElementInfo(page)
      expect(info?.isSkipLink, `expected the skip link, got ${JSON.stringify(info)}`).toBe(true)
    })

    await test.step('focus is not trapped in the sidebar, staying in view throughout', async () => {
      let sawSidebar = false
      let leftSidebarAfterVisiting = false
      let reachedMain = false
      let lastInfo: Awaited<ReturnType<typeof activeElementInfo>> = null

      for (let i = 0; i < MAX_TABS; i++) {
        await page.keyboard.press('Tab')
        const info = await activeElementInfo(page)
        expect(info, `no element focused after tab ${i + 1}`).not.toBeNull()
        lastInfo = info

        // Viewport containment at every step — the check that would catch the sidebar's
        // max-h / overflow-y-auto / sticky CSS scroll-clipping a focus ring out of sight.
        const box = await page.evaluate(() => {
          const el = document.activeElement
          if (!el) return null
          const r = el.getBoundingClientRect()
          return { x: r.left, y: r.top, width: r.width, height: r.height }
        })
        expect(
          box,
          `focused element (${info!.tag} "${info!.text}") after tab ${i + 1} has no rect — not rendered/visible`
        ).not.toBeNull()

        const intersectsViewport =
          box!.x < viewport.width && box!.x + box!.width > 0 && box!.y < viewport.height && box!.y + box!.height > 0
        expect(
          intersectsViewport,
          `focused element (${info!.tag} "${info!.text}") after tab ${i + 1} is outside the viewport: ${JSON.stringify(box)}`
        ).toBe(true)

        if (info!.inMain) reachedMain = true
        if (info!.inSidebar) sawSidebar = true
        if (sawSidebar && !info!.inSidebar) {
          leftSidebarAfterVisiting = true
          break
        }
      }

      expect(
        leftSidebarAfterVisiting,
        `focus appears trapped in the sidebar after ${MAX_TABS} tabs — last focused element: ${JSON.stringify(lastInfo)}`
      ).toBe(true)

      // Focus must genuinely leave the shell chrome and enter page content, not just leave the
      // sidebar for some other piece of chrome. /components/button's Examples give it real
      // focusable targets (buttons, a link) to land on.
      expect(
        reachedMain,
        `focus never reached inside <main id="main"> during the walk — last focused element: ${JSON.stringify(lastInfo)}`
      ).toBe(true)
    })

    await test.step('activating the skip link moves focus to #main (WCAG 2.4.1 bypass blocks)', async () => {
      // Fresh navigation: don't rely on focus state left over from the walk above.
      await gotoDocs(page, '/components/kbd')
      await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme)

      await page.keyboard.press('Tab')
      const beforeActivation = await activeElementInfo(page)
      expect(beforeActivation?.isSkipLink, 'expected the skip link to be focused before activating it').toBe(true)

      await page.keyboard.press('Enter')

      const afterActivation = await activeElementInfo(page)
      const hash = await page.evaluate(() => window.location.hash)
      expect(
        afterActivation?.inMain,
        `activating the skip link did not move focus into #main — focus landed on ` +
          `${JSON.stringify(afterActivation)} (location.hash: "${hash}"). This usually means #main ` +
          `lacks tabindex="-1", so a fragment target that isn't natively focusable never receives focus.`
      ).toBe(true)
    })
  })
}
