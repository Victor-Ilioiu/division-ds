import { applyTheme, expect, expectAxeClean, settleAnimations, test, THEMES } from './fixtures'

test('Tabs: arrow keys move focus and switch the panel', async ({ page }) => {
  await page.goto('/components/tabs')
  const first = page.getByRole('main').getByRole('tab').first()
  await first.focus()
  await page.keyboard.press('ArrowRight')
  const second = page.getByRole('main').getByRole('tab').nth(1)
  await expect(second).toBeFocused()
  // Radix's default activationMode is 'automatic': the arrow key itself selects the tab it moves
  // focus to, with no separate Enter/Space needed.
  await expect(second).toHaveAttribute('aria-selected', 'true')
  // The page renders three Tabs instances (Default, With a disabled tab, Controlled), each with
  // its own currently-visible panel, so a bare getByRole('tabpanel') would be ambiguous -- follow
  // this specific tablist's own aria-controls link to its own panel.
  const panelId = await second.getAttribute('aria-controls')
  const panel = page.locator(`#${panelId}`)
  await expect(panel).toBeVisible()
  await expect(panel).toHaveText('Tube sight and holo sight.')
})

test('DropdownMenu: opens from the keyboard, walks items, closes to its trigger', async ({ page }) => {
  await page.goto('/components/dropdown-menu')
  const trigger = page.getByRole('button', { name: 'Manifest actions' }).first()
  await trigger.focus()
  await page.keyboard.press('Enter')
  const menu = page.getByRole('menu')
  await expect(menu).toBeVisible()
  const highlighted = page.locator('[role="menuitem"][data-highlighted], [role="menuitemcheckbox"][data-highlighted]')
  // Radix already highlights the first item the moment the menu opens, so a bare toHaveCount(1)
  // would pass even if ArrowDown did nothing -- assert which item is highlighted, before and
  // after, not just that exactly one is.
  await expect(highlighted).toHaveCount(1)
  await expect(highlighted).toContainText('Duplicate')
  await page.keyboard.press('ArrowDown')
  await expect(highlighted).toHaveCount(1)
  await expect(highlighted).toContainText('Pin to top')
  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('Toast: appears, is reachable with F8, and leaves on its own', async ({ page }) => {
  await page.goto('/components/toast')
  // The Tones example names its buttons by tone ("Info", "Ok", "Warning", "Hostile"), not by the
  // title the toast they raise carries.
  await page.getByRole('button', { name: 'Ok', exact: true }).click()
  // The title's full text is "Success: Manifest saved" (the sr-only tone word plus the
  // visible title), so filter on the visible half rather than the whole accessible name.
  const toast = page.getByRole('region', { name: /^Notifications/ }).locator('li').filter({ hasText: 'Manifest saved' })
  await expect(toast).toBeVisible()
  await page.keyboard.press('F8')
  // Radix focuses the viewport list inside its "Notifications (F8)" region, not the region itself.
  await expect(page.locator('[role="region"][aria-label^="Notifications"] ol')).toBeFocused()
  // Focus pauses the timer, so move it away before waiting for the default 5s to run out.
  await page.getByRole('main').click({ position: { x: 5, y: 5 } })
  await expect(toast).toBeHidden({ timeout: 8000 })
})

test('QuantityStepper: arrow keys step, buttons stay out of the tab order', async ({ page }) => {
  await page.goto('/components/quantity-stepper')
  const field = page.getByRole('spinbutton').first()
  await field.focus()
  const before = Number(await field.getAttribute('aria-valuenow'))
  await page.keyboard.press('ArrowUp')
  await expect(field).toHaveAttribute('aria-valuenow', String(before + 1))
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: /^Increase/ }).first()).not.toBeFocused()
  await field.focus()
  await page.keyboard.press('Shift+Tab')
  await expect(page.getByRole('button', { name: /^Decrease/ }).first()).not.toBeFocused()
})

test('Pagination: Next keeps focus when it goes inert on the last page', async ({ page }) => {
  await page.goto('/components/pagination')
  // The "Many pages" example is the stateful one: twenty pages, starting on page 1.
  const nav = page.getByRole('navigation', { name: 'Pagination, many pages' })
  const next = nav.getByRole('button', { name: 'Next page' })
  await next.focus()
  // Nineteen presses reach page 20; the twentieth must change nothing and must not drop focus.
  for (let press = 0; press < 20; press++) await page.keyboard.press('Enter')
  await expect(nav.getByRole('button', { name: 'Page 20' })).toHaveAttribute('aria-current', 'page')
  await expect(next).toHaveAttribute('aria-disabled', 'true')
  await expect(next).toBeFocused()
})

for (const theme of THEMES) {
  test(`FormField: a failed submit focuses the error summary, axe clean in ${theme} theme`, async ({ page }) => {
    await page.goto('/components/form-field')
    await applyTheme(page, theme)
    await page.getByRole('button', { name: 'Reserve' }).click()
    const summary = page.getByRole('group', { name: 'There is a problem' })
    await expect(summary).toBeFocused()
    await expect(summary.getByRole('link')).toHaveCount(2)
    await summary.getByRole('link', { name: 'Choose a country.' }).click()
    await expect(page.getByRole('combobox', { name: 'Country' })).toBeFocused()
    await settleAnimations(page)
    await expectAxeClean(page)
  })
}

// The open tooltip only: Radix keeps a closing one in the DOM while it animates out, and the shell
// may still be scrolling just after load, which closes a tooltip that opened during it (see the
// Tooltip test in docs-visual-language.spec.ts), so the first open is retried. A retried focus
// blurs first: focusing the element that already has focus fires no focus event.
const OPEN_TOOLTIP = '[role="tooltip"]:not([data-state="closed"])'

test('StatusTracker: one tab stop, arrows rove across the bars and the focused bar shows its tooltip', async ({ page }) => {
  await page.goto('/components/status-tracker')
  const row = page.getByRole('list', { name: 'Uptime, last 30 days' })
  const bars = row.getByRole('img')
  const tooltip = page.locator(OPEN_TOOLTIP)
  await expect(bars).toHaveCount(30)
  // Exactly one bar in the tab order, and it is the newest.
  await expect(row.locator('[tabindex="0"]')).toHaveCount(1)
  await expect(bars.nth(29)).toHaveAttribute('tabindex', '0')
  await expect(async () => {
    await bars.nth(29).blur()
    await bars.nth(29).focus()
    await expect(tooltip).toHaveText(/^Operational\. .*15 Oct/, { timeout: 1500 })
  }).toPass()
  await page.keyboard.press('ArrowLeft')
  await expect(bars.nth(28)).toBeFocused()
  await expect(bars.nth(28)).toHaveAttribute('tabindex', '0')
  await expect(tooltip).toHaveText(/^Operational\. .*14 Oct/)
  await page.keyboard.press('Home')
  await expect(bars.first()).toBeFocused()
  await page.keyboard.press('End')
  await expect(bars.nth(29)).toBeFocused()
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowLeft')
  // Index 26 is the day with no readings in the docs sample.
  await expect(bars.nth(26)).toBeFocused()
  await expect(tooltip).toHaveText(/^No data\. .*no readings$/)
  // Tab leaves the row in one press, wherever focus is inside it.
  await page.keyboard.press('Tab')
  await expect(row.locator(':focus')).toHaveCount(0)
})

test('StatusTracker: a hovered bar shows its tooltip', async ({ page }) => {
  await page.goto('/components/status-tracker')
  const bar = page.getByRole('list', { name: 'Uptime, last 30 days' }).getByRole('img').nth(19)
  await expect(async () => {
    await page.mouse.move(0, 0)
    await bar.hover()
    await expect(page.locator(OPEN_TOOLTIP)).toHaveText(/^Down\. .*41 min down$/, { timeout: 1500 })
  }).toPass()
})

test('SegmentedControl: the arrow keys move the selection and change the value', async ({ page }) => {
  await page.goto('/components/segmented-control')
  const group = page.getByRole('radiogroup', { name: 'Range' })
  await expect(group.getByRole('radio', { name: '24 h' })).toBeChecked()
  await group.getByRole('radio', { name: '24 h' }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(group.getByRole('radio', { name: '7 d' })).toBeFocused()
  await expect(group.getByRole('radio', { name: '7 d' })).toBeChecked()
  await expect(page.getByText('Showing the last 7 d.')).toBeVisible()
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowLeft')
  await expect(group.getByRole('radio', { name: '1 h' })).toBeChecked()
  await expect(group.getByRole('radio', { name: '24 h' })).not.toBeChecked()
})

for (const theme of THEMES) {
  test(`StatusTracker: axe clean with a bar's tooltip open, in ${theme} theme`, async ({ page }) => {
    await page.goto('/components/status-tracker')
    await applyTheme(page, theme)
    const bar = page.getByRole('list', { name: 'Uptime, last 30 days' }).getByRole('img').last()
    await expect(async () => {
      await bar.blur()
      await bar.focus()
      await expect(page.locator(OPEN_TOOLTIP)).toBeVisible({ timeout: 1500 })
    }).toPass()
    await settleAnimations(page)
    await expectAxeClean(page)
  })
}
