import type { Page } from '@playwright/test'
import { applyTheme, expect, expectAxeClean, settleAnimations, test, THEMES } from './fixtures'

// The AI interface components in a real browser, on the ChatThread page's live conversation: a
// scripted reply that streams, Stop, focus staying in the box while text arrives, Jump to latest,
// and reduced motion. jsdom has no layout and no timers worth trusting for any of these.

const thread = (page: Page) => page.getByRole('log', { name: 'Conversation with the assistant' })
const box = (page: Page) => page.getByRole('textbox', { name: 'Message the assistant' })
const lastReply = (page: Page) => thread(page).getByRole('article', { name: 'Assistant' }).last()

async function ask(page: Page, text = 'How is Depot 4 doing?') {
  await box(page).fill(text)
  await box(page).press('Enter')
}

test.describe('ChatThread live conversation', () => {
  test('a reply streams in after the tool call, and the finished text is announced once', async ({ page }) => {
    await page.goto('/components/chat-thread')
    await ask(page)
    await expect(thread(page).getByText('How is Depot 4 doing?')).toBeVisible()
    await expect(page.getByRole('status').filter({ hasText: 'Assistant is working' })).toBeAttached()
    // Streaming: the message is busy and holds only part of the reply.
    await expect(lastReply(page)).toHaveAttribute('aria-busy', 'true', { timeout: 5000 })
    const partial = await lastReply(page).innerText()
    expect(partial).not.toContain('within a working day')
    await expect(lastReply(page)).not.toHaveAttribute('aria-busy', 'true', { timeout: 15000 })
    await expect(lastReply(page)).toContainText('within a working day')
    const said = page.getByRole('status').filter({ hasText: 'Assistant is working' }).locator('p')
    await expect(said.filter({ hasText: /^Assistant: Depot 4 holds .* within a working day\.$/ })).toHaveCount(1)
    await expect(said.filter({ hasText: 'Assistant is working' })).toHaveCount(1)
  })

  test('Stop ends the stream where it is and says so', async ({ page }) => {
    await page.goto('/components/chat-thread')
    await ask(page)
    await expect(lastReply(page)).toHaveAttribute('aria-busy', 'true', { timeout: 5000 })
    await page.getByRole('button', { name: 'Stop' }).click()
    await expect(thread(page).getByText('Assistant stopped')).toBeVisible()
    await expect(lastReply(page)).not.toHaveAttribute('aria-busy')
    const frozen = await lastReply(page).innerText()
    await page.waitForTimeout(600)
    expect(await lastReply(page).innerText()).toBe(frozen)
    expect(frozen).not.toContain('within a working day')
    await expect(page.getByRole('button', { name: 'Send', exact: true })).toBeVisible()
  })

  test('focus stays in the box while the reply streams, and typing continues', async ({ page }) => {
    await page.goto('/components/chat-thread')
    await ask(page)
    await expect(lastReply(page)).toHaveAttribute('aria-busy', 'true', { timeout: 5000 })
    await expect(box(page)).toBeFocused()
    await page.keyboard.type('And next week')
    await expect(box(page)).toBeFocused()
    await expect(box(page)).toHaveValue('And next week')
    await expect(lastReply(page)).not.toHaveAttribute('aria-busy', 'true', { timeout: 15000 })
    await expect(box(page)).toBeFocused()
  })

  test('scrolled up, the thread stays put while text arrives, and Jump to latest returns to the end', async ({ page }) => {
    await page.goto('/components/chat-thread')
    await ask(page)
    await expect(lastReply(page)).toHaveAttribute('aria-busy', 'true', { timeout: 5000 })
    await thread(page).evaluate(log => {
      log.scrollTop = 0
    })
    const jump = page.getByRole('button', { name: 'Jump to latest' })
    await expect(jump).toBeVisible()
    await page.waitForTimeout(500)
    expect(await thread(page).evaluate(log => log.scrollTop)).toBe(0)
    await jump.click()
    await expect(jump).toBeHidden()
    await expect(thread(page)).toBeFocused()
    const gap = await thread(page).evaluate(log => log.scrollHeight - log.scrollTop - log.clientHeight)
    expect(gap).toBeLessThanOrEqual(32)
  })

  test('approving the reorder moves focus to the status line', async ({ page }) => {
    await page.goto('/components/chat-thread')
    await page.getByRole('button', { name: 'Send reorder' }).click()
    await expect(page.getByText('Approved by you')).toBeFocused()
  })

  test('under reduced motion the reply arrives whole, at once', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/components/chat-thread')
    await ask(page)
    // The tool still takes its moment; then the whole reply lands in one step, never word by word.
    await expect(lastReply(page)).toContainText('within a working day', { timeout: 5000 })
    await expect(lastReply(page)).not.toHaveAttribute('aria-busy')
  })

  test('nothing scrolls the page sideways at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 })
    await page.goto('/components/chat-thread')
    await thread(page).getByRole('button', { name: 'Show details' }).first().click()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })

  for (const theme of THEMES) {
    test(`axe clean mid-conversation, scrolled up, in ${theme} theme`, async ({ page }) => {
      await page.goto('/components/chat-thread')
      await applyTheme(page, theme)
      await ask(page)
      await expect(lastReply(page)).not.toHaveAttribute('aria-busy', 'true', { timeout: 15000 })
      await thread(page).getByRole('button', { name: 'Show details' }).first().click()
      await thread(page).evaluate(log => {
        log.scrollTop = 0
      })
      await expect(page.getByRole('button', { name: 'Jump to latest' })).toBeVisible()
      await settleAnimations(page)
      await expectAxeClean(page)
    })
  }
})
