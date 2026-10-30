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
  for (const path of ['/store', '/crm', '/console']) {
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

// Below md the docs nav is not a column and not a "Show navigation" disclosure: the top bar's
// menu button, far right, opens it in a sheet. Choosing a page or pressing Escape closes the
// sheet, and focus returns to the menu button.
test.describe('docs nav on a phone', () => {
  test.use({ viewport: { width: 375, height: 800 } })

  test('the menu button opens the docs nav in a sheet and a link navigates', async ({ page }) => {
    await page.goto('/guidelines/color')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(sidebar(page)).toBeHidden()
    await expect(page.getByRole('button', { name: /navigation/ })).toHaveCount(0)
    const menu = page.locator('header').first().getByRole('button', { name: 'Menu' })
    await expect(menu).toHaveAttribute('aria-expanded', 'false')
    const box = await menu.boundingBox()
    expect(box?.height).toBe(32)
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeGreaterThan(375 - 24)
    await menu.click()
    // The open sheet hides the rest of the page from the accessibility tree, header included.
    await expect(page.locator('header').first().getByRole('button', { name: 'Menu', includeHidden: true })).toHaveAttribute('aria-expanded', 'true')
    const sheet = page.getByRole('dialog', { name: 'Menu' })
    await sheet.getByRole('navigation', { name: 'Documentation' }).getByRole('link', { name: 'Typography', exact: true }).click()
    await expect(page).toHaveURL(/\/guidelines\/typography$/)
    await expect(sheet).toBeHidden()
    // The Sheet hands focus back to its trigger on close, as it does in Corvane and the Console.
    await expect(menu).toBeFocused()
  })

  test('Escape closes the sheet and focus returns to the menu button', async ({ page }) => {
    await page.goto('/guidelines/color')
    const menu = page.locator('header').first().getByRole('button', { name: 'Menu' })
    await menu.click()
    await expect(page.getByRole('dialog', { name: 'Menu' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Menu' })).toBeHidden()
    await expect(menu).toBeFocused()
  })
})

// Hexline below @4xl has no room for the search button; the menu sheet's Search entry opens the
// header's one DocsSearch (still mounted, hidden), never a second palette.
test.describe('Hexline search on a phone', () => {
  test.use({ viewport: { width: 375, height: 800 } })

  test('the menu sheet has a Search entry that opens the site search', async ({ page }) => {
    await page.goto('/store')
    await expect(page.locator('header').first().getByRole('button', { name: 'Search the site' })).toBeHidden()
    const menu = page.locator('header').first().getByRole('button', { name: 'Menu' })
    await menu.click()
    await page.getByRole('dialog', { name: 'Menu' }).getByRole('button', { name: 'Search', exact: true }).click()
    const palette = page.getByRole('dialog', { name: 'Search the site' })
    await expect(palette).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(1)
    await page.keyboard.press('Escape')
    await expect(palette).toBeHidden()
    await expect(menu).toBeFocused()
  })
})

test.describe('the site header', () => {
  test('Demos sits after Theme Builder among the links, and the search shows its label at desktop width', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/')
    const nav = page.getByRole('navigation', { name: 'Site' })
    await expect(nav.getByRole('listitem')).toHaveText(['Docs', 'Components', 'Theme Builder', 'Demos'])
    const search = page.getByRole('button', { name: 'Search the site' })
    await expect(search).toContainText('Search')
    await expect(search.locator('kbd')).toBeVisible()
    await nav.getByRole('button', { name: 'Demos' }).click()
    await expect(page.getByRole('menuitem', { name: /Hexline Store/ })).toBeVisible()
  })

  test('Theme Builder goes to /themes and is current there; the old theme builder URL redirects with its query', async ({ page }) => {
    await page.goto('/guidelines/theme?preset=1-2563eb-283445')
    await expect(page).toHaveURL(/\/themes\?preset=1-2563eb-283445$/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Site' }).getByRole('link', { name: 'Theme Builder' })).toHaveAttribute('aria-current', 'page')
    // the shared preset opens with its accent chosen in the Accent colour select
    await expect(page.getByRole('combobox', { name: 'Accent colour' })).toContainText('Blue')
    await expect(page.getByRole('navigation', { name: 'Documentation' })).toHaveCount(0)
  })
})
