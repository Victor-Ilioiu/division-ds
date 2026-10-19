import { expect, test } from './fixtures'

// A sidebar navigation must land every docs page at the very top, header in view, whatever the
// page's length. Before the fix, the scroll reset ran first and then `#main.focus()` scrolled the
// focused landmark into view, so any page tall enough to scroll opened with the header cut off
// (scrollY == main.offsetTop), while a short page (Motion, which cannot scroll) looked correct.
// Mutation: drop `preventScroll: true` from useFocusMainOnNavigate -> the long-page case fails
// with a non-zero scrollY.
const sidebar = (page: import('@playwright/test').Page) =>
  page.getByRole('navigation', { name: 'Documentation' })

test.describe('docs navigation from the sidebar', () => {
  for (const [from, linkName, to] of [
    // Long page to long page: the case that used to hide the header.
    ['/guidelines/color', 'Typography', '/guidelines/typography'],
    // Long page to a short one, and short to long, so both directions stay covered.
    ['/guidelines/typography', 'Motion', '/guidelines/motion'],
    ['/guidelines/motion', 'Color', '/guidelines/color'],
  ] as const) {
    test(`${from} -> ${to} lands at the top with the header in view, focus on #main`, async ({ page }) => {
      await page.goto(from)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await page.evaluate(() => window.scrollTo(0, 400))

      await sidebar(page).getByRole('link', { name: linkName, exact: true }).click()
      await expect(page).toHaveURL(new RegExp(`${to}$`))
      await expect(page.locator('#main')).toBeFocused()

      // Polled, not read once: a late focus-driven scroll would land after the URL changes.
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
      await page.waitForTimeout(150)
      expect(await page.evaluate(() => window.scrollY)).toBe(0)
      const headerTop = await page.locator('header').first().evaluate(el => el.getBoundingClientRect().top)
      expect(headerTop).toBe(0)
    })
  }

  // The sidebar is the shell's, not the page's: a navigation re-renders only the routed content
  // inside #main. Mutation: key AppShell's outer wrapper (or the Sidebar) on the pathname -> the
  // marker set on the sidebar node below is gone after the click, because the node was replaced.
  test('the sidebar and header are the same DOM nodes after a navigation (no remount, no flicker)', async ({ page }) => {
    await page.goto('/guidelines/color')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await sidebar(page).evaluate(el => el.setAttribute('data-nav-marker', 'kept'))
    await page.locator('header').first().evaluate(el => el.setAttribute('data-nav-marker', 'kept'))

    await sidebar(page).getByRole('link', { name: 'Typography', exact: true }).click()
    await expect(page).toHaveURL(/\/guidelines\/typography$/)

    await expect(sidebar(page)).toHaveAttribute('data-nav-marker', 'kept')
    await expect(page.locator('header').first()).toHaveAttribute('data-nav-marker', 'kept')
  })

  // The routed content animates in on a navigation, and only then: a fresh load starts settled
  // (nothing to transition from, and axe sweeps that load a page directly must never sample a
  // mid-fade frame).
  test('the routed content animates in on navigation, not on a fresh load', async ({ page }) => {
    await page.goto('/guidelines/color')
    const view = page.locator('#main > [data-route-view]')
    await expect(view).toHaveCount(1)
    await expect(view).not.toHaveClass(/anim-route-in/)

    await sidebar(page).getByRole('link', { name: 'Typography', exact: true }).click()
    await expect(page).toHaveURL(/\/guidelines\/typography$/)
    await expect(page.locator('#main > [data-route-view]')).toHaveClass(/anim-route-in/)
  })
})

// Every demo carries the way back to the docs: in its sticky header beside the theme switch on a
// wide screen, and in its menu sheet on a narrow one, where the header has no room for it.
test.describe('back to the design system from a demo', () => {
  for (const path of ['/demo', '/crm', '/console']) {
    test(`${path} at 1440px: the header link goes to the docs home`, async ({ page }) => {
      await page.goto(path)
      const link = page.locator('header').first().getByRole('link', { name: 'Design system' })
      await expect(link).toBeVisible()
      await link.click()
      await expect(page).toHaveURL(/\/$/)
      await expect(page).toHaveTitle('Division DS')
    })

    test(`${path} at 320px: the link is in the menu, not the header`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 800 })
      await page.goto(path)
      await expect(page.locator('header').first().getByRole('link', { name: 'Design system' })).toBeHidden()
      await page.locator('header').first().getByRole('button', { name: 'Menu' }).click()
      const link = page.getByRole('dialog', { name: 'Menu' }).getByRole('link', { name: 'Design system' })
      await expect(link).toBeVisible()
      await link.click()
      await expect(page).toHaveURL(/\/$/)
      await expect(page).toHaveTitle('Division DS')
    })
  }
})
