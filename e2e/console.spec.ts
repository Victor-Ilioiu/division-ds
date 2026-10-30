import type { Page } from '@playwright/test'
import { CONSOLE_NOT_FOUND_TITLE, CONSOLE_PAGES } from '../src/console/routes'
import { applyTheme, expect, expectAxeClean, settleAnimations, test, THEMES } from './fixtures'

// Halden Console, the monitoring demo at /console. Every route is taken from CONSOLE_PAGES
// (src/console/routes.ts), so a page added there is covered here with no edit to this file.
// Run alone: E2E_PORT=5493 npx playwright test e2e/console.spec.ts
type SpecPage = { path: string; title: string }

const PAGES: SpecPage[] = [
  ...CONSOLE_PAGES.map(p => ({ path: p.samplePath ?? p.path, title: p.sampleTitle ?? p.title })),
  { path: '/console/does-not-exist', title: CONSOLE_NOT_FOUND_TITLE },
]

const SUGGESTION = 'Why is Cold room 2 at Brennick warm?'

/** Stops the live feed, so nothing on the page changes under the assertion that follows. */
async function pause(page: Page) {
  await page.getByRole('radio', { name: 'Paused' }).click()
  await expect(page.getByRole('radio', { name: 'Paused' })).toBeChecked()
}

for (const theme of THEMES) {
  for (const spec of PAGES) {
    test(`${spec.path} — loads with its title, axe clean in ${theme} theme`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.goto(spec.path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expect(page).toHaveTitle(spec.title)
      await pause(page)
      await applyTheme(page, theme)
      await settleAnimations(page)
      await expectAxeClean(page)
    })
  }

  test(`the alert sheet and the docked assistant are axe clean in ${theme} theme`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/console/alerts?alert=a-01')
    await expect(page.getByRole('dialog', { name: 'Cold room 2 above 8 °C' })).toBeVisible()
    await applyTheme(page, theme)
    await settleAnimations(page)
    await expectAxeClean(page)
    await page.keyboard.press('Escape')
    await pause(page)
    await page.getByRole('button', { name: 'Assistant' }).click()
    await expect(page.getByRole('complementary', { name: 'Assistant panel' })).toBeVisible()
    await settleAnimations(page)
    await expectAxeClean(page)
  })
}

test.describe('reflow at 320px', () => {
  test.use({ viewport: { width: 320, height: 800 } })
  for (const spec of [...PAGES, { path: '/console/alerts?alert=a-01', title: 'Halden Console — alerts' }]) {
    test(`${spec.path} — no horizontal overflow at 320px`, async ({ page }) => {
      const sheet = spec.path.includes('?alert=')
      await page.goto(sheet ? '/console/alerts' : spec.path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await pause(page)
      if (sheet) {
        // A modal sheet hides the page (and its Paused control) from the accessibility tree, so
        // the feed is paused first and the sheet opened after.
        await page.getByRole('button', { name: 'Cold room 2 above 8 °C' }).click()
        await expect(page.getByRole('dialog', { name: 'Cold room 2 above 8 °C' })).toBeVisible()
      }
      const { scrollWidth, innerWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }))
      expect(scrollWidth, `${spec.path} scrolls horizontally at 320px`).toBeLessThanOrEqual(innerWidth)
    })
  }

  test('the menu opens the navigation in a sheet', async ({ page }) => {
    await page.goto('/console')
    await page.getByRole('button', { name: 'Menu' }).click()
    const sheet = page.getByRole('dialog', { name: 'Menu' })
    await sheet.getByRole('link', { name: /^Alerts/ }).click()
    await expect(page).toHaveURL(/\/console\/alerts$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Alerts' })).toBeVisible()
    await expect(sheet).toBeHidden()
  })

  test('the assistant is its own page below lg', async ({ page }) => {
    await page.goto('/console')
    await page.getByRole('link', { name: 'Assistant' }).click()
    await expect(page).toHaveURL(/\/console\/assistant$/)
    await expect(page.getByText('Scripted demo: no model is called.')).toBeVisible()
  })
})

test('live updates tick every five seconds, and Paused stops them', async ({ page }) => {
  await page.goto('/console')
  const clock = page.getByTestId('console-clock')
  await expect(clock).toContainText('10:00:05', { timeout: 8000 })
  const reading = page.getByRole('region', { name: 'Now' })
  await pause(page)
  const frozenClock = await clock.textContent()
  const frozenCards = await page.locator('main').innerText()
  await page.waitForTimeout(6000)
  expect(await clock.textContent()).toBe(frozenClock)
  expect(await page.locator('main').innerText()).toBe(frozenCards)
  await expect(reading).toBeVisible()
  await page.getByRole('radio', { name: 'Live' }).click()
  await expect(clock).not.toHaveText(frozenClock ?? '', { timeout: 8000 })
})

test('alerts: bulk acknowledge, and Undo puts them back', async ({ page }) => {
  await page.goto('/console/alerts')
  await pause(page)
  const table = page.getByRole('table', { name: 'Alerts, open' })
  await table.getByRole('checkbox', { name: 'Select Gateway not reporting, Ostwind Fulfilment, Leipzig' }).click()
  await table.getByRole('checkbox', { name: 'Select Cold room 1 above 8 °C, Greyhaven Cold Chain, Gdańsk' }).click()
  await page.getByRole('button', { name: 'Acknowledge 2 alerts' }).click()
  await expect(page.getByText('2 alerts acknowledged').first()).toBeVisible()
  await expect(page.getByText('5 open alerts')).toBeVisible()
  await expect(table.getByRole('row', { name: /Gateway not reporting/ })).toHaveCount(0)
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByText('7 open alerts')).toBeVisible()
  await expect(table.getByRole('row', { name: /Gateway not reporting/ })).toHaveCount(1)
})

test('the alert sheet opens from the URL, resolves with a note, and closes', async ({ page }) => {
  await page.goto('/console/alerts?alert=a-03')
  const sheet = page.getByRole('dialog', { name: 'Freezer aisle B above -18 °C' })
  await expect(sheet).toBeVisible()
  await expect(sheet.getByRole('img', { name: /^Freezer aisle B,/ })).toBeVisible()
  await sheet.getByRole('textbox', { name: /Note/ }).fill('Door seal checked.')
  await sheet.getByRole('button', { name: 'Resolve' }).click()
  await expect(sheet.getByText(/^Resolved by Noor Aziz, Today/)).toBeFocused()
  await expect(sheet.getByText('Door seal checked.')).toBeVisible()
  await sheet.getByRole('button', { name: 'Close alert' }).click()
  await expect(sheet).toBeHidden()
  await expect(page).toHaveURL(/\/console\/alerts$/)
})

test.describe('the assistant', () => {
  test('investigates the Cold room 2 alert and, on Approve, acknowledges it', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/console/alerts')
    await pause(page)
    await page.getByRole('button', { name: 'Cold room 2 above 8 °C' }).click()
    await page.getByRole('dialog', { name: 'Cold room 2 above 8 °C' }).getByRole('button', { name: 'Investigate with Assistant' }).click()
    // From lg up the assistant docks beside the page.
    const panel = page.getByRole('complementary', { name: 'Assistant panel' })
    await expect(panel).toBeVisible()
    await expect(panel.getByText(SUGGESTION, { exact: true })).toBeVisible()
    await expect(panel.getByText('query_sensor_history')).toBeVisible()
    await expect(panel.getByText('door_events')).toBeVisible()
    await expect(panel.getByText('compressor_status')).toBeVisible()
    await expect(panel.getByText(/The door was left open after a delivery/).first()).toBeVisible()
    const approval = panel.getByRole('region', { name: 'Acknowledge the alert and email Mara Lindqvist?' })
    await expect(approval.getByText('m.lindqvist@brennick.example', { exact: false })).toBeVisible()
    await approval.getByRole('button', { name: 'Approve and send' }).click()
    await expect(panel.getByText('send_email')).toBeVisible()
    await expect(page.getByText('Alert acknowledged').first()).toBeVisible()
    await expect(panel.getByText(/^Done\. The email is sent/).first()).toBeVisible({ timeout: 10_000 })
  })

  test('the approved acknowledgement shows on the alerts page', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/console/assistant')
    await pause(page)
    await page.getByRole('button', { name: SUGGESTION }).click()
    await page.getByRole('button', { name: 'Approve and send' }).click({ timeout: 15_000 })
    await expect(page.getByText(/^Done\. The email is sent/).first()).toBeVisible({ timeout: 10_000 })
    await page.getByRole('link', { name: /^Alerts/ }).first().click()
    await page.getByRole('radio', { name: 'Acknowledged' }).click()
    await expect(page.getByRole('table', { name: 'Alerts, acknowledged' }).getByRole('row', { name: /Cold room 2 above 8 °C, Brennick/ })).toHaveCount(1)
  })

  test('Reject sends nothing and says so', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/console/assistant')
    await pause(page)
    await page.getByRole('button', { name: SUGGESTION }).click()
    await page.getByRole('button', { name: 'Don’t send' }).click({ timeout: 15_000 })
    await expect(page.getByText(/I have not sent the email/).first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('send_email')).toHaveCount(0)
  })

  test('focus stays in the prompt while the reply streams, and Stop ends it', async ({ page }) => {
    await page.goto('/console/assistant')
    await pause(page)
    const box = page.getByRole('textbox', { name: 'Message the assistant' })
    await box.fill(SUGGESTION)
    await box.press('Enter')
    const stop = page.getByRole('button', { name: 'Stop' })
    await expect(stop).toBeVisible()
    await expect(box).toBeFocused()
    await expect(page.getByText('query_sensor_history')).toBeVisible()
    await expect(box).toBeFocused()
    await stop.click()
    const log = page.getByRole('log', { name: 'Conversation with the assistant' })
    await expect(log).toContainText('Stopped')
    await expect(page.getByRole('button', { name: 'Send' })).toBeVisible()
    await page.getByRole('button', { name: 'Retry' }).click()
    await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible()
  })

  test('a free-typed prompt gets the honest reply', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/console/assistant')
    await pause(page)
    const box = page.getByRole('textbox', { name: 'Message the assistant' })
    await box.fill('Is it cold in Basel?')
    await box.press('Enter')
    await expect(page.getByText('This demo only runs its scripted investigations; try one of the suggestions.').first()).toBeVisible()
  })
})

test('the command palette jumps to a site', async ({ page }) => {
  await page.goto('/console')
  await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible()
  await page.keyboard.press('Control+k')
  const field = page.getByRole('combobox', { name: 'Search components, guidelines, tokens, the store and the CRM' })
  await field.fill('Gdańsk')
  await page.getByRole('option', { name: 'Greyhaven Cold Chain, Gdańsk' }).click()
  await expect(page).toHaveURL(/\/console\/sites\/greyhaven$/)
  await expect(page).toHaveTitle('Halden Console — Greyhaven Cold Chain, Gdańsk')
})

test('the docs header Demos menu links to Halden Console', async ({ page }) => {
  await page.goto('/components')
  await page.getByRole('button', { name: 'Demos' }).click()
  await page.getByRole('menuitem', { name: /Halden Console/ }).click()
  await expect(page).toHaveURL(/\/console$/)
  await expect(page).toHaveTitle('Halden Console — overview')
})
