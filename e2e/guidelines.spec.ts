import AxeBuilder from '@axe-core/playwright'
import { DOCS_SECTIONS } from '../src/components/shell/Sidebar'
import { applyTheme, expect, settleAnimations, test, THEMES } from './fixtures'

for (const theme of THEMES) {
  for (const section of DOCS_SECTIONS) {
    test(`${section.label} — axe clean in ${theme} theme`, async ({ page }) => {
      // The Motion guideline page's M1/M3 examples animate in from opacity 0 on mount (M1
      // snap-in) or count up from 0 (M3), and every animation in this system collapses to its
      // settled state under reduced motion (design.md). Without this, axe could sample mid-fade
      // and see contrast that is real for a fraction of a second and never at rest -- the same
      // race button-hover.spec.ts settles for M5 by emulating reduced motion before navigating,
      // rather than by waiting on animation timing.
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.goto(section.to)
      // The chart panel route loads on demand (React.lazy): `goto`'s own 'load' wait covers the
      // shell's own bundle, not a dynamic import a route triggers after it. Without this, axe could
      // run against the Suspense fallback (which has no h1) and report a page clean that was never
      // actually scanned. Waiting for the real page's own h1 is exact, unlike `networkidle`, which
      // waits for the network in general rather than for this page's own content specifically.
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await applyTheme(page, theme)
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze()
      expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
    })
  }
}

// A mistyped path under the docs shell (never /store -- e2e/demo.spec.ts covers that shell's own
// NotFound) still renders the same chrome as every real docs page: the sidebar landmark, not a
// bare fallback screen. `/components/nope` stands in for any unregistered docs path.
test.describe('the docs 404', () => {
  for (const theme of THEMES) {
    // Mutation: change the docs 404 route in App.tsx to render `<DocsNotFound />` outside the
    // `<AppShell>` element (bypassing the shell entirely) -> the sidebar landmark below is never
    // in the tree, and this fails on the `getByRole('navigation', ...)` assertion.
    test(`/components/nope is axe clean, with the sidebar landmark present, in ${theme} theme`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.goto('/components/nope')
      await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible()
      await expect(page.getByRole('navigation', { name: 'Documentation' })).toBeVisible()
      await applyTheme(page, theme)
      await settleAnimations(page)
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze()
      expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
    })
  }

  // The two short-viewport shapes the demo's own reflow checks use (flows.spec.ts), plus the
  // ordinary 320-wide reflow width every other docs page is checked at (reflow.spec.ts) -- the
  // docs 404 is a real page in the same shell and gets the same three-shape coverage.
  for (const viewport of [
    { width: 320, height: 800 },
    { width: 1280, height: 256 },
    { width: 320, height: 256 },
  ]) {
    test(`/components/nope has no horizontal overflow at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.goto('/components/nope')
      await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible()
      const { scrollWidth, innerWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }))
      expect(
        scrollWidth,
        `/components/nope scrolls horizontally at ${viewport.width}x${viewport.height}`
      ).toBeLessThanOrEqual(innerWidth)
    })
  }

  // RouteFocus's own focus-to-main hook (App.tsx) covers every route, including this one -- proven
  // here with a real click rather than assumed from the hook existing.
  // Mutation: change one of DocsNotFound's Link targets (say "Components: Button") to a plain `<a
  // href>` instead of the router `Link` -> the click causes a full page reload, and `#main` is
  // never the element `document.activeElement` settles on afterward.
  test('clicking a link in the docs 404 moves focus to #main', async ({ page }) => {
    await page.goto('/components/nope')
    await page.getByRole('link', { name: 'Components: Button' }).click()
    await expect(page).toHaveURL(/\/components\/button$/)
    await expect(page.locator('#main')).toBeFocused()
  })
})

// Exercises the sidebar's collapsed markup (the `hidden` wrapper, the rotated chevron), which the
// page-wide axe sweep above never reaches since it always runs against the default, open state.
test.describe('the docs sidebar, with a group collapsed', () => {
  for (const theme of THEMES) {
    test(`is axe clean in ${theme} theme`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.goto('/components/button')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await applyTheme(page, theme)
      const nav = page.getByRole('navigation', { name: 'Documentation' })
      // 'Guidelines' because it is the one group that starts open without holding the current
      // page: only Guidelines is open by default, plus Atoms here because /components/button
      // lives in it. Clicking a group that already starts collapsed (Molecules, say) would OPEN
      // it and never reach the collapsed markup this test exists for. Not Atoms either: collapsing
      // the group holding the current page is legal but muddies which collapse is under test.
      const toggle = nav.getByRole('button', { name: 'Guidelines' })
      await toggle.click()
      await expect(toggle).toHaveAttribute('aria-expanded', 'false')
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze()
      expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
    })
  }
})
