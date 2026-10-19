import { test, expect } from './fixtures'
import { DOCS_SECTIONS } from '../src/components/shell/Sidebar'

const THEMES = ['dark', 'light'] as const

// 320 CSS px wide is WCAG 2.2 SC 1.4.10's reflow width — the equivalent of a 1280px viewport at
// 400% zoom, and the width the criterion is written against. The axe suite runs at 1280px and
// structurally cannot see a reflow failure: axe has no rule for it, and at 1280px there is
// nothing to see. So this file exists as its own gate rather than as another assertion bolted
// onto guidelines.spec.ts.
//
// What it caught: `Sidebar` was a hard `min-w-[220px]` in a plain flex row with no responsive
// behaviour, so at 320px it took 220px and pushed `<main>` off-screen on all 28 pages, in both
// themes; and `<main>` had `flex-1` with no `min-w-0`, so wide content overflowed independently
// of the sidebar. Two causes, one symptom.
test.use({ viewport: { width: 320, height: 800 } })

for (const theme of THEMES) {
  for (const section of DOCS_SECTIONS) {
    test(`${section.label} — no horizontal overflow at 320px in ${theme} theme`, async ({ page }) => {
      await page.goto(section.to)
      // See guidelines.spec.ts's own comment: the chart panel route is React.lazy, and a reflow
      // measurement taken before its chunk arrives would measure the (empty) Suspense fallback,
      // which has no h1 -- waiting for the real page's own h1 is exact, unlike `networkidle`.
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme)

      const { scrollWidth, innerWidth, widest } = await page.evaluate(() => {
        const root = document.documentElement
        // Name the widest offender, so a failure says what to fix instead of only that something
        // is too wide.
        let widest: string | null = null
        let widestRight = root.clientWidth
        for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*'))) {
          const right = el.getBoundingClientRect().right
          if (right > widestRight + 1) {
            widestRight = right
            widest = `${el.tagName.toLowerCase()}.${el.className?.toString().slice(0, 80)} (right: ${Math.round(right)})`
          }
        }
        return { scrollWidth: root.scrollWidth, innerWidth: window.innerWidth, widest }
      })

      expect(
        scrollWidth,
        `${section.to} scrolls horizontally at 320px (scrollWidth ${scrollWidth} > innerWidth ${innerWidth}).` +
          (widest ? ` Widest element: ${widest}` : '')
      ).toBeLessThanOrEqual(innerWidth)
    })
  }
}
