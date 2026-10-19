import { CRM_NOT_FOUND_TITLE, CRM_PAGES } from '../src/crm/routes'
import { applyTheme, expect, expectAxeClean, settleAnimations, test, THEMES } from './fixtures'

// Corvane, the CRM demo at /crm. Every route is taken from CRM_PAGES (src/crm/routes.ts), the one
// place a CRM page is registered, so a page added there is covered here with no edit to this file.
type SpecPage = { path: string; title: string }

const PAGES: SpecPage[] = [
  ...CRM_PAGES.map(p => ({ path: p.samplePath ?? p.path, title: p.sampleTitle ?? p.title })),
  { path: '/crm/does-not-exist', title: CRM_NOT_FOUND_TITLE },
]

for (const theme of THEMES) {
  for (const page of PAGES) {
    test(`${page.path} — loads with its title, axe clean in ${theme} theme`, async ({ page: p }) => {
      await p.emulateMedia({ reducedMotion: 'reduce' })
      await p.goto(page.path)
      await expect(p.getByRole('heading', { level: 1 })).toBeVisible()
      await expect(p).toHaveTitle(page.title)
      await applyTheme(p, theme)
      await settleAnimations(p)
      await expectAxeClean(p)
    })
  }
}

test.describe('reflow at 320px', () => {
  test.use({ viewport: { width: 320, height: 800 } })
  for (const page of [...PAGES, { path: '/crm?view=table', title: 'Corvane — pipeline' }]) {
    test(`${page.path} — no horizontal overflow at 320px`, async ({ page: p }) => {
      await p.goto(page.path)
      await expect(p.getByRole('heading', { level: 1 })).toBeVisible()
      const { scrollWidth, innerWidth } = await p.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }))
      expect(scrollWidth, `${page.path} scrolls horizontally at 320px`).toBeLessThanOrEqual(innerWidth)
    })
  }

  test('the menu opens the navigation in a sheet', async ({ page }) => {
    await page.goto('/crm')
    await page.getByRole('button', { name: 'Menu' }).click()
    const sheet = page.getByRole('dialog', { name: 'Menu' })
    await sheet.getByRole('link', { name: 'Forecast' }).click()
    await expect(page).toHaveURL(/\/crm\/forecast$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Forecast' })).toBeVisible()
    await expect(sheet).toBeHidden()
  })
})

test.describe('pipeline board', () => {
  test('moves a deal with its Move menu, and Undo puts it back', async ({ page }) => {
    await page.goto('/crm')
    const board = page.getByRole('region', { name: 'Pipeline board' })
    await board.getByRole('button', { name: 'Move Leeds cross-dock sensors' }).click()
    await page.getByRole('menuitem', { name: 'Move to Proposal' }).click()
    const proposal = board.getByRole('list', { name: /^Proposal/ })
    await expect(proposal.getByRole('button', { name: 'Leeds cross-dock sensors', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Undo' }).click()
    const qualified = board.getByRole('list', { name: /^Qualified/ })
    await expect(qualified.getByRole('button', { name: 'Leeds cross-dock sensors', exact: true })).toBeVisible()
    await expect(proposal.getByRole('button', { name: 'Leeds cross-dock sensors', exact: true })).toHaveCount(0)
  })

  test('moves a deal with a real pointer drag, and Undo puts it back', async ({ page }) => {
    await page.goto('/crm')
    const board = page.getByRole('region', { name: 'Pipeline board' })
    const card = page.locator('[data-kanban-card="d-04"]')
    const target = board.getByRole('list', { name: /^Discovery/ })
    await card.scrollIntoViewIfNeeded()
    const from = await card.getByText('Ambergate Distribution').boundingBox()
    const to = await target.boundingBox()
    if (!from || !to) throw new Error('the card or the column has no box')
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
    await page.mouse.down()
    // Past the 6px activation distance first, then across in steps so dnd-kit sees the moves.
    await page.mouse.move(from.x + from.width / 2 + 12, from.y + from.height / 2, { steps: 4 })
    await page.mouse.move(to.x + to.width / 2, to.y + 40, { steps: 20 })
    await page.mouse.up()
    await expect(target.getByRole('button', { name: 'Leeds cross-dock sensors', exact: true })).toBeVisible()
    await expect(page.getByText('Leeds cross-dock sensors moved to Discovery').first()).toBeVisible()
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(board.getByRole('list', { name: /^Qualified/ }).getByRole('button', { name: 'Leeds cross-dock sensors', exact: true })).toBeVisible()
  })
})

// The name field has focus when the dialog opens, so a press on Cancel blurs it first. That blur
// used to raise "Give the deal a name.", the error pushed the footer down mid-click, and the
// release missed Cancel: the dialog stayed open with an error. A real mouse, because only real
// layout reproduces the miss.
test.describe('New deal dialog', () => {
  for (const close of ['Cancel', 'Close']) {
    test(`${close} closes it with no error, and it reopens clean`, async ({ page }) => {
      await page.goto('/crm')
      await page.getByRole('button', { name: 'New deal' }).click()
      const dialog = page.getByRole('dialog', { name: 'New deal' })
      await expect(dialog.getByRole('textbox', { name: /Deal name/ })).toBeFocused()
      await dialog.getByRole('button', { name: close, exact: true }).click()
      await expect(dialog).toBeHidden()
      await page.getByRole('button', { name: 'New deal' }).click()
      await expect(dialog).toBeVisible()
      await expect(dialog.getByText('There is a problem')).toHaveCount(0)
      await expect(dialog.getByText('Give the deal a name.')).toHaveCount(0)
    })
  }
})

test('the table assigns an owner to the selected deals in bulk', async ({ page }) => {
  await page.goto('/crm?view=table&nonext=1')
  const table = page.getByRole('table', { name: 'Deals' })
  await table.getByRole('checkbox', { name: 'Select Leeds cross-dock sensors' }).click()
  await table.getByRole('checkbox', { name: 'Select Paint shop probes' }).click()
  await page.getByRole('combobox', { name: 'Assign owner' }).click()
  await page.getByRole('option', { name: 'Elias Brandt' }).click()
  await expect(page.getByText('2 deals assigned to Elias Brandt').first()).toBeVisible()
  await expect(table.getByRole('row', { name: /Leeds cross-dock sensors/ })).toContainText('Elias Brandt')
  await expect(table.getByRole('row', { name: /Paint shop probes/ })).toContainText('Elias Brandt')
})

test.describe('deal sheet', () => {
  test('opens from the URL, and Back closes it after an in-app open', async ({ page }) => {
    await page.goto('/crm?deal=d-01')
    const sheet = page.getByRole('dialog', { name: 'Rotterdam hub rollout' })
    await expect(sheet).toBeVisible()
    await sheet.getByRole('button', { name: 'Close deal' }).click()
    await expect(sheet).toBeHidden()
    await expect(page).toHaveURL(/\/crm$/)

    await page.getByRole('region', { name: 'Pipeline board' }).getByRole('button', { name: 'Bristol yard visibility', exact: true }).click()
    await expect(page).toHaveURL(/\?deal=d-06$/)
    await expect(page.getByRole('dialog', { name: 'Bristol yard visibility' })).toBeVisible()
    await page.goBack()
    await expect(page.getByRole('dialog', { name: 'Bristol yard visibility' })).toBeHidden()
    await expect(page).toHaveURL(/\/crm$/)
  })

  test('logs a note into the deal activity', async ({ page }) => {
    await page.goto('/crm?deal=d-01')
    const sheet = page.getByRole('dialog', { name: 'Rotterdam hub rollout' })
    await sheet.getByRole('textbox', { name: 'Note' }).fill('Legal want a 30-day exit clause.')
    await sheet.getByRole('button', { name: 'Log note' }).click()
    await expect(sheet.getByRole('list', { name: 'Activity on Rotterdam hub rollout' }).getByText('Legal want a 30-day exit clause.')).toBeVisible()
  })

  test('marks a deal lost with a reason, inline in the sheet', async ({ page }) => {
    await page.goto('/crm?deal=d-02')
    const sheet = page.getByRole('dialog', { name: 'Freezer aisle monitoring' })
    await sheet.getByRole('button', { name: 'Mark lost' }).click()
    const form = sheet.getByRole('group', { name: 'Mark this deal lost' })
    await form.getByRole('combobox', { name: /Reason/ }).click()
    await page.getByRole('option', { name: 'Budget' }).click()
    await form.getByRole('button', { name: 'Confirm lost' }).click()
    await expect(sheet.getByText('Reason: Budget', { exact: true })).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(1)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('region', { name: 'Pipeline board' }).getByRole('list', { name: /^Lost/ }).getByRole('button', { name: 'Freezer aisle monitoring', exact: true })).toBeVisible()
  })
})

test('the command palette jumps to an account', async ({ page }) => {
  await page.goto('/crm')
  await expect(page.getByRole('heading', { level: 1, name: 'Pipeline' })).toBeVisible()
  await page.keyboard.press('Control+k')
  const field = page.getByRole('combobox', { name: 'Search deals, accounts, contacts and pages' })
  await field.fill('Saltmere')
  await page.getByRole('option', { name: 'Saltmere Foods' }).click()
  await expect(page).toHaveURL(/\/crm\/accounts\/acc-saltmere$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Saltmere Foods' })).toBeVisible()
  await expect(page).toHaveTitle('Corvane — Saltmere Foods')
})

test('the docs sidebar links to Corvane', async ({ page }) => {
  await page.goto('/')
  const nav = page.getByRole('navigation', { name: 'Documentation' })
  const link = nav.getByRole('link', { name: 'Corvane CRM' })
  // The Demo site group starts folded.
  const group = nav.getByRole('button', { name: /Demo site/ })
  if ((await group.getAttribute('aria-expanded')) === 'false') await group.click()
  await link.click()
  await expect(page).toHaveURL(/\/crm$/)
  await expect(page).toHaveTitle('Corvane — pipeline')
})
