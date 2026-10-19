// Screenshots of the demo store's Footer, taken off the running dev server (npm run dev, 5473),
// for looking at the wordmark and the terrain behind it. No test judges how they look; this is
// how they were looked at.
//
//   node scripts/footer-shots.mjs <out dir> [widths] [themes] [extras]
//
//   widths   comma-separated viewport widths    default 1920,1440,1024,768,390,320
//   themes   comma-separated                    default dark,light
//   extras   comma-separated, any of:
//              closing   also save the closing block alone (the wordmark and the terrain)
//              motion    also save the closing block twice, four seconds apart
//              reduced   also save the first width under reduced motion (the 2D still)
//
// Launched with the GPU flags e2e/hero.spec.ts uses, so the live scene runs. Prints each
// footer's boxes and whether the page overflows sideways, and any console error it saw.

import { mkdirSync } from 'node:fs'
import { chromium } from '@playwright/test'

const [out, widthsArg, themesArg, extrasArg = ''] = process.argv.slice(2)
if (!out) {
  console.error('usage: node scripts/footer-shots.mjs <out dir> [widths] [themes] [closing,motion,reduced]')
  process.exit(1)
}
const widths = (widthsArg || '1920,1440,1024,768,390,320').split(',').map(Number)
const themes = (themesArg || 'dark,light').split(',')
const extras = new Set(extrasArg.split(',').filter(Boolean))
const PAGE = 'http://localhost:5473/demo/care'

mkdirSync(out, { recursive: true })
const browser = await chromium.launch({
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'],
})
const errors = []

async function shoot(width, theme, reduced) {
  const context = await browser.newContext({
    viewport: { width, height: width < 600 ? 800 : 900 },
    reducedMotion: reduced ? 'reduce' : 'no-preference',
  })
  const page = await context.newPage()
  const where = `${width}/${theme}${reduced ? '/reduced' : ''}`
  page.on('console', message => message.type() === 'error' && errors.push(`${where}: ${message.text()}`))
  page.on('pageerror', error => errors.push(`${where}: ${error.message}`))

  await page.goto(PAGE)
  // The routed page first: until its chunk lands the document is one screen tall.
  await page.getByRole('heading', { level: 1 }).waitFor()
  await page.evaluate(name => document.documentElement.setAttribute('data-theme', name), theme)
  await page.evaluate(() => document.fonts.ready)
  await page.locator('[data-footer-closing]').scrollIntoViewIfNeeded()
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  // The demo scrolls smoothly: wait until the position stops changing.
  let last = -1
  for (let tries = 0; tries < 40; tries++) {
    await page.waitForTimeout(150)
    const y = await page.evaluate(() => Math.round(window.scrollY))
    if (y === last) break
    last = y
  }
  if (!reduced) {
    await page
      .locator('[data-terrain="live"]')
      .waitFor({ timeout: 30000 })
      .catch(() => errors.push(`${where}: the terrain never went live`))
  }
  await page.waitForTimeout(700)

  const name = `${out}/${width}-${theme}${reduced ? '-reduced' : ''}`
  const closing = page.locator('[data-footer-closing]')
  await page.getByRole('contentinfo').screenshot({ path: `${name}.png` })
  if (extras.has('closing')) await closing.screenshot({ path: `${name}-closing.png` })
  if (extras.has('motion') && !reduced) {
    await closing.screenshot({ path: `${name}-t0.png` })
    await page.waitForTimeout(4000)
    await closing.screenshot({ path: `${name}-t4.png` })
  }

  const info = await page.evaluate(() => {
    const footer = document.querySelector('body footer:last-of-type')
    const box = selector => {
      const rect = footer.querySelector(selector)?.getBoundingClientRect()
      return rect ? [rect.left, rect.top, rect.width, rect.height].map(Math.round) : null
    }
    return {
      terrain: document.querySelector('[data-terrain]')?.getAttribute('data-terrain') ?? 'none',
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      closing: box('[data-footer-closing]'),
      wordmark: box('[data-footer-wordmark]'),
      gutter: getComputedStyle(footer.querySelector('[data-footer-upper]')).paddingLeft,
    }
  })
  console.log(where, JSON.stringify(info))
  await context.close()
}

for (const theme of themes) for (const width of widths) await shoot(width, theme, false)
if (extras.has('reduced')) for (const theme of themes) await shoot(widths[0], theme, true)
console.log(errors.length ? `console errors:\n${errors.join('\n')}` : 'no console errors')
await browser.close()
