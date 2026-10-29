import { expect, test } from './fixtures'

test('the top bar stays at the top while the page scrolls', async ({ page }) => {
  await page.goto('/components/button')
  const bar = page.locator('header').first()
  await expect(page.locator('#props')).toBeAttached()
  await page.evaluate(() => window.scrollTo(0, 2000))
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(500)
  expect((await bar.boundingBox())!.y).toBe(0)
})

test('keyboard focus is never hidden under the sticky bar (SC 2.4.11)', async ({ page }) => {
  await page.goto('/components/button')
  await expect(page.locator('#props')).toBeAttached()
  // Shift+Tab walks back up the page: each focused control must sit below the bar, not under it.
  await page.locator('main').getByRole('button').last().focus()
  // The page really is scrolled, so a control could be under the bar.
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(500)
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Shift+Tab')
    const top = await page.evaluate(() => document.activeElement?.closest('header') ? 999 : document.activeElement!.getBoundingClientRect().top)
    expect(top).toBeGreaterThanOrEqual(57)
  }
})

test('/ opens search, a query ranks the right component first, Enter opens it', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Search the docs' })).toBeVisible()
  await page.keyboard.press('/')
  const field = page.getByRole('combobox', { name: 'Search components, guidelines, props and tokens' })
  await expect(field).toBeFocused()
  await field.fill('confirm delete')
  await expect(page.getByRole('option').first()).toContainText('AlertDialog')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/components\/alert-dialog$/)
})

test('a prop result opens the page at its Props section', async ({ page }) => {
  await page.goto('/components/button')
  await expect(page.getByRole('button', { name: 'Search the docs' })).toBeVisible()
  await page.keyboard.press('Control+k')
  await page.getByRole('combobox').fill('checkbox indeterminate')
  await expect(page.getByRole('option').first()).toContainText('Checkbox')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/components\/checkbox$/)
  await expect.poll(() => page.evaluate(() => Math.round(document.getElementById('props')?.getBoundingClientRect().top ?? 9999))).toBeLessThan(120)
})

test('a Slider moves to where the track is clicked, without dragging (SC 2.5.7)', async ({ page }) => {
  await page.goto('/components/slider')
  const slider = page.getByRole('slider', { name: 'Kit weight' })
  const before = Number(await slider.getAttribute('aria-valuenow'))
  const track = slider.locator('xpath=ancestor::*[@data-orientation][1]')
  const box = (await track.boundingBox())!
  await page.mouse.click(box.x + box.width * 0.9, box.y + box.height / 2)
  await expect.poll(async () => Number(await slider.getAttribute('aria-valuenow'))).toBeGreaterThan(before)
})
