import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { applyTheme, expect, test, THEMES } from './fixtures'

// Real xterm in a real browser: what jsdom cannot show. The unit tests hold the contract.
const frame = (page: Page, name: string) => page.getByRole('group', { name })
const input = (page: Page, name: string) => frame(page, name).locator('.xterm-helper-textarea')
const rows = (page: Page, name: string) => frame(page, name).locator('.xterm-rows')

// xterm does not draw a terminal that is off screen, so its rows are empty until it scrolls in.
const show = (page: Page, name: string) => frame(page, name).scrollIntoViewIfNeeded()

test.beforeEach(async ({ page }) => {
  await page.goto('/components/terminal')
  await show(page, 'Sample build')
  await expect(rows(page, 'Sample build')).toContainText('Sample session')
})

for (const theme of THEMES) {
  test(`axe clean with terminals rendered, and a screenshot, in ${theme} theme`, async ({ page }) => {
    await applyTheme(page, theme)
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
    expect(results.violations.map(v => `${v.id}: ${v.nodes[0].html}`)).toEqual([])
    await frame(page, 'Sample build').screenshot({ path: `test-results/terminal-${theme}.png` })
  })
}

test('typing reaches onData; read only stays silent and still selects', async ({ page }) => {
  await input(page, 'Sample build').focus()
  await page.keyboard.type('hello')
  await expect(rows(page, 'Sample build')).toContainText('hello')

  const log = frame(page, 'Deploy log')
  await show(page, 'Deploy log')
  await input(page, 'Deploy log').focus()
  await page.keyboard.type('nope')
  await expect(rows(page, 'Deploy log')).not.toContainText('nope')
  await log.locator('.xterm-screen').dblclick({ position: { x: 30, y: 8 } })
  await expect(log.locator('.xterm-selection div')).not.toHaveCount(0)
})

test('the focus ring shows, and the shortcut leaves while Tab stays inside', async ({ page }) => {
  const field = input(page, 'Sample build')
  await field.focus()
  await expect(frame(page, 'Sample build')).toHaveCSS('outline-style', 'solid')
  await page.keyboard.press('Tab')
  await expect(field).toBeFocused()
  await page.keyboard.press('Control+Shift+L')
  await expect(field).not.toBeFocused()
  await expect(page.getByRole('button', { name: 'Start the stream' })).toBeFocused()
})

test('only one set of rows per terminal under StrictMode, with no doubled output', async ({ page }) => {
  await expect(frame(page, 'Sample build').locator('.xterm')).toHaveCount(1)
  const text = await rows(page, 'Sample build').innerText()
  expect(text.match(/Sample session/g)).toHaveLength(1)
})

test('the live region stays silent while the rows are readable', async ({ page }) => {
  const log = frame(page, 'Sample build')
  await expect(log.locator('.live-region')).toHaveAttribute('aria-live', 'off')
  await expect(log.locator('.xterm-accessibility-tree')).toContainText('Sample session')
})

test('switching theme recolours the terminal and keeps its buffer', async ({ page }) => {
  await applyTheme(page, 'dark')
  const log = frame(page, 'Theme check')
  await show(page, 'Theme check')
  const background = () => log.locator('.xterm-scrollable-element').first().evaluate(el => getComputedStyle(el).backgroundColor)
  const dark = await background()
  await page.getByRole('button', { name: 'Light theme', exact: true }).click()
  await expect.poll(background).not.toBe(dark)
  await expect(rows(page, 'Theme check')).toContainText('Sample session')
})

test('a large burst leaves the page responsive and the end of it on screen', async ({ page }) => {
  await input(page, 'Sample build').focus()
  // Goes through the docs demo's echo: the same write() path as a stream, 200 kB in one go.
  const line = 'x'.repeat(78)
  const blocked = await page.evaluate(async text => {
    const field = document.querySelector<HTMLTextAreaElement>('[role="group"][aria-label="Sample build"] .xterm-helper-textarea')!
    const paste = new ClipboardEvent('paste', { clipboardData: new DataTransfer(), bubbles: true, cancelable: true })
    paste.clipboardData!.setData('text/plain', text)
    let longest = 0
    let previous = performance.now()
    const timer = setInterval(() => {
      const now = performance.now()
      longest = Math.max(longest, now - previous)
      previous = now
    }, 10)
    field.dispatchEvent(paste)
    await new Promise(resolve => setTimeout(resolve, 1500))
    clearInterval(timer)
    return longest
  }, `${line}\n`.repeat(2500) + 'END-OF-BURST')
  await expect(rows(page, 'Sample build')).toContainText('END-OF-BURST')
  expect(blocked).toBeLessThan(1000)
})

test('a scrolled-up reader stays put while output arrives, and the end is followed otherwise', async ({ page }) => {
  await page.getByRole('button', { name: 'Start the stream' }).click()
  await expect(rows(page, 'Sample build')).toContainText('[030]', { timeout: 15000 })
  const log = frame(page, 'Sample build')
  await log.locator('.xterm-screen').hover()
  const end = await rows(page, 'Sample build').innerText()
  await page.mouse.wheel(0, -300)
  await expect.poll(() => rows(page, 'Sample build').innerText()).not.toBe(end)
  await page.waitForTimeout(100)
  const held = await rows(page, 'Sample build').innerText()
  await page.waitForTimeout(800) // six more lines arrive meanwhile
  expect(await rows(page, 'Sample build').innerText()).toBe(held)

  // Back at the end, the next output is followed.
  await expect(page.getByRole('button', { name: 'Start the stream' })).toBeVisible({ timeout: 15000 })
  await expect(async () => {
    await page.mouse.wheel(0, 1000)
    await expect(rows(page, 'Sample build')).toContainText('[040]', { timeout: 300 })
  }).toPass({ timeout: 8000 })
  await page.mouse.wheel(0, 1000) // [040] shows one line before the true end, the cursor's line
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: 'Start the stream' }).click()
  await expect(rows(page, 'Sample build')).toContainText('[025]', { timeout: 15000 })
})

test('the grid is measured in the mono font once it has loaded', async ({ page }) => {
  const { family, cell, expected } = await frame(page, 'Sample build').locator('.xterm-screen').evaluate(async el => {
    await document.fonts.ready
    const host = el.closest('[data-terminal-host]') as HTMLElement
    const family = getComputedStyle(host).fontFamily
    const ctx = document.createElement('canvas').getContext('2d')!
    ctx.font = `14px ${family}`
    const cols = Math.round(el.getBoundingClientRect().width / ctx.measureText('W').width)
    return { family, cell: el.getBoundingClientRect().width / cols, expected: ctx.measureText('W').width }
  })
  expect(family).toContain('JetBrains Mono')
  expect(Math.abs(cell - expected)).toBeLessThan(0.1)
})

test('a web link opens in a new tab with no way back to this page', async ({ page, context }) => {
  const log = frame(page, 'Sample build')
  const row = log.locator('.xterm-rows > div', { hasText: 'https://example.com/terminal' })
  await context.route('https://example.com/**', route => route.fulfill({ body: 'ok' }))
  const box = (await row.boundingBox())!
  const popup = context.waitForEvent('page')
  await page.mouse.move(box.x + 100, box.y + 8)
  await page.mouse.move(box.x + 102, box.y + 8)
  await page.waitForTimeout(300) // links are found on hover, asynchronously
  await page.mouse.down()
  await page.mouse.up()
  const opened = await popup
  await opened.waitForLoadState()
  expect(await opened.evaluate(() => window.opener)).toBeNull()
})
