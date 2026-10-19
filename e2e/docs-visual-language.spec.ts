import { test, expect, gotoDocs } from './fixtures'

/**
 * The docs surface's own visual language, gated.
 *
 * Two separate things live here and both were findings in the same review.
 *
 * 1. The type scale. Before this, the eyebrow, every section heading, every example caption and
 *    every table header rendered at roughly 12px uppercase mono, so a page read as one
 *    undifferentiated column. A scale is only a scale if the steps are real, so the steps are
 *    measured rather than described.
 *
 * 2. The motifs. Counted across the eighteen atoms, cut corners were on two, the corner crosshair
 *    on none and numerals-as-heroes on none. A motif applied and then quietly dropped by a later
 *    refactor is worse than one that was never applied, because the docs now claim it. These
 *    assertions read the rendered `clip-path`, `::before` and font sizes, not the class strings:
 *    a class string proves the class was authored, never that the rule it keys to is the one in
 *    effect (design.md, "Four assertion shapes that cannot fail").
 */

const THEMES = ['dark', 'light'] as const

/** The scale's minimum ratio between adjacent steps, from the shared design laws. */
const MIN_STEP = 1.25

/** WCAG 2.2's large-text threshold for regular weight. The section index's contrast pair is
 *  gated at 3:1 rather than 4.5:1 purely because the numeral renders above this. */
const LARGE_TEXT_PX = 24

async function px(page: import('@playwright/test').Page, selector: string) {
  return page.evaluate(sel => {
    const el = document.querySelector(sel)
    if (!el) throw new Error(`no element matched ${sel}`)
    return parseFloat(getComputedStyle(el).fontSize)
  }, selector)
}

test.describe('the component docs type scale', () => {
  test('every adjacent step is at least a 1.25 ratio', async ({ page }) => {
    await gotoDocs(page, '/components/button')

    const h1 = await px(page, '#main h1')
    const sectionWord = await px(page, '#main h2 > span:last-child')
    const lede = await px(page, '#main h1 + p')
    const body = await px(page, '#main dl dd')

    // Named so a failure says which step collapsed, not just that some number is wrong.
    const steps: [string, number, number][] = [
      ['h1 over section heading', h1, sectionWord],
      ['section heading over lede', sectionWord, lede],
      ['lede over body', lede, body],
    ]
    for (const [name, larger, smaller] of steps) {
      expect(
        larger / smaller,
        `${name}: ${larger}px over ${smaller}px is a ${(larger / smaller).toFixed(2)} ratio, below ${MIN_STEP}`
      ).toBeGreaterThanOrEqual(MIN_STEP)
    }
  })

  test('the section index stays above the large-text threshold its contrast pair assumes', async ({
    page,
  }) => {
    await gotoDocs(page, '/components/button')
    const index = await px(page, '#main h2 > span[aria-hidden="true"]')
    expect(
      index,
      `the section index renders at ${index}px. Its contrast pair in check-contrast.mjs is gated ` +
        `at 3:1 rather than 4.5:1 solely because it is large text; below ${LARGE_TEXT_PX}px that ` +
        `pair is measuring the wrong threshold and the gate passes while the type fails.`
    ).toBeGreaterThanOrEqual(LARGE_TEXT_PX)
  })

  test('the section index is aria-hidden, so headings are named by their word alone', async ({
    page,
  }) => {
    await gotoDocs(page, '/components/button')
    await expect(page.getByRole('heading', { name: 'Props', exact: true })).toBeVisible()
  })

  for (const theme of THEMES) {
    test(`the section index paints accent.signal.fill, not the adaptive text step — ${theme} theme`, async ({
      page,
    }) => {
      await gotoDocs(page, '/components/button')
      await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme)

      const seen = await page.evaluate(() => {
        const probe = document.createElement('span')
        probe.style.color = 'var(--color-accent-signal-fill)'
        document.body.append(probe)
        const expected = getComputedStyle(probe).color
        probe.remove()
        const digit = document.querySelector(
          '#main h2 > span[aria-hidden="true"] > span:nth-child(2)'
        )
        if (!digit) throw new Error('no section index digit')
        return { expected, actual: getComputedStyle(digit).color }
      })
      expect(
        seen.actual,
        'the digit must be the theme-invariant fill step the contrast gate names, not signal.text'
      ).toBe(seen.expected)
    })
  }

  test('the props contract reflows instead of scrolling sideways', async ({ page }) => {
    await gotoDocs(page, '/components/select')
    // A description list, not the four-column table that rendered as blank-gap fragments at 320px
    // with Description never reaching the screen.
    await expect(page.locator('#main dl dt').first()).toBeVisible()
    await expect(page.locator('#main [role="region"][aria-label="Select props"]')).toHaveCount(0)
  })
})

test.describe('the motifs are on the components, not only in the docs', () => {
  test('Avatar carries the cut corner at md and lg and not at 24px', async ({ page }) => {
    await gotoDocs(page, '/components/avatar')
    const clip = await page.evaluate(() => {
      const at = (sel: string) => {
        const el = document.querySelector(sel)
        if (!el) throw new Error(`no element matched ${sel}`)
        return getComputedStyle(el).clipPath
      }
      return { sm: at('#main .w-6.h-6'), md: at('#main .w-9.h-9'), lg: at('#main .w-12.h-12') }
    })
    expect(clip.md, 'the md avatar should carry the cut').not.toBe('none')
    expect(clip.lg, 'the lg avatar should carry the cut').not.toBe('none')
    expect(
      clip.sm,
      'the sm avatar is 24px, the footprint Kbd excludes by name; it must stay square'
    ).toBe('none')
  })

  test('the Tooltip panel carries the cut corner', async ({ page }) => {
    await gotoDocs(page, '/components/tooltip')
    // Retried, not hovered once: the first example sits below a 720px fold since the "Best for"
    // block landed, the shell may still scroll right after load, and Radix closes a tooltip on
    // scroll. A hover that lands during that scroll shows nothing; the next one does.
    const trigger = page.locator('#main button').first()
    const panel = page.locator('[role="tooltip"]').first()
    await expect(async () => {
      await trigger.hover()
      await expect(panel).toBeVisible({ timeout: 1500 })
    }).toPass()
    expect(await panel.evaluate(el => getComputedStyle(el).clipPath)).not.toBe('none')
  })

  test('the Select listbox carries the crosshair and does not clip its arms', async ({ page }) => {
    await gotoDocs(page, '/components/select')
    await page.locator('#main button[role="combobox"]').first().click()
    const listbox = page.locator('[role="listbox"]').first()
    await expect(listbox).toBeVisible()

    const seen = await listbox.evaluate(el => {
      const before = getComputedStyle(el, '::before')
      return {
        content: before.content,
        arms: before.backgroundImage,
        overflow: getComputedStyle(el).overflow,
        clip: getComputedStyle(el).clipPath,
      }
    })
    expect(seen.content, 'the crosshair pseudo-element should be rendered').toBe('""')
    expect(seen.arms.match(/linear-gradient/g) ?? [], 'four corners, two arms each').toHaveLength(8)
    expect(
      seen.overflow,
      'the arms are drawn 5px outside the element, so the listbox must not clip its own overflow'
    ).toBe('visible')
    expect(
      seen.clip,
      'a clip-path would cut the crosshair arms off; the listbox takes the crosshair instead of the cut'
    ).toBe('none')
  })

  test('the Progress readout is the hero of its row, and its pad is not announced', async ({
    page,
  }) => {
    await gotoDocs(page, '/components/progress')

    // Found through the pad rather than by nth-of-type: the first demo on the page has no
    // readout at all, so any positional selector here silently measures the wrong bar.
    const seen = await page.evaluate(() => {
      const pad = [...document.querySelectorAll('#main span[aria-hidden="true"]')].find(el =>
        /^0+$/.test(el.textContent ?? '')
      )
      if (!pad) throw new Error('no dimmed leading-zero pad found on any Progress readout')
      const readout = pad.parentElement!
      const label = readout.previousElementSibling!
      return {
        padText: pad.textContent,
        padColor: getComputedStyle(pad).color,
        readoutColor: getComputedStyle(readout).color,
        readout: parseFloat(getComputedStyle(readout).fontSize),
        label: parseFloat(getComputedStyle(label).fontSize),
      }
    })

    expect(
      seen.readout / seen.label,
      `the readout is ${seen.readout}px against a ${seen.label}px label. Before this pass both sat ` +
        `at ~13px and the numeral carried no more weight than the word beside it.`
    ).toBeGreaterThanOrEqual(1.8)

    // The dimmed leading zeros are padding, not value. They are aria-hidden so a screen reader
    // still hears "65%" rather than "zero six five percent", and dimmed so a sighted reader can
    // see that they are not part of it either.
    expect(seen.padText, 'the pad is zeros only').toMatch(/^0+$/)
    expect(seen.padColor, 'the pad must be dimmed away from the readout it pads').not.toBe(
      seen.readoutColor
    )
  })
})

/**
 * The Overview is the one brand-register surface in the app, and the only place extreme scale is
 * licensed. What that buys is a numeral roughly four times the size of a component page's h1, in
 * `accent.signal.fill` -- the theme-INVARIANT step, which measures 3.14:1 on the light page. That
 * clears WCAG's 3:1 rule for large text and fails the 4.5:1 body rule, so the pair named in
 * scripts/lib/contrast-pairs.mjs is only legitimate while the type stays large. A shrink does not
 * fail the contrast gate, it silently invalidates it, which is why the size is asserted here as
 * well as measured there.
 */
test.describe('the Overview spends its scale where the contrast gate assumes it does', () => {
  /** The 52px step. Every numeral on the page is at or above it; the pair is named for it. */
  const LEDGER_PX = 52

  test('the hero numeral and the gate ledger stay at or above the size their pair assumes', async ({
    page,
  }) => {
    await page.goto('/')

    const sizes = await page.evaluate(() =>
      [...document.querySelectorAll('#main [data-numeral]')].map(el => ({
        kind: el.getAttribute('data-numeral'),
        px: parseFloat(getComputedStyle(el).fontSize),
      }))
    )
    // One hero and a numeral per gate row. Not a fixed total: each demo added to the site (Corvane,
    // Halden Console) adds a gate row, and the size rule below is what this test is for.
    expect(sizes.filter(s => s.kind === 'hero'), 'one hero numeral').toHaveLength(1)
    expect(sizes.filter(s => s.kind === 'gate').length, 'a numeral per gate row').toBeGreaterThanOrEqual(4)
    expect(sizes.length, 'nothing but the hero and the gate rows carries data-numeral').toBe(
      1 + sizes.filter(s => s.kind === 'gate').length
    )
    for (const { kind, px: size } of sizes) {
      expect(
        size,
        `the ${kind} numeral renders at ${size}px. Its pair in scripts/lib/contrast-pairs.mjs is ` +
          `gated at 3:1 rather than 4.5:1 solely because it is large text; below ${LARGE_TEXT_PX}px ` +
          `that pair measures the wrong threshold and passes while the type fails.`
      ).toBeGreaterThanOrEqual(LEDGER_PX)
    }
    const hero = sizes.find(s => s.kind === 'hero')!
    const ledger = sizes.find(s => s.kind === 'gate')!
    expect(
      hero.px / ledger.px,
      'the hero is the hero: one thing on this page is meant to be unmistakably the largest'
    ).toBeGreaterThanOrEqual(2)
  })

  test('the hero numeral clears the large-text threshold at 320px too', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 })
    await page.goto('/')
    const px = await page.evaluate(
      () => parseFloat(getComputedStyle(document.querySelector('#main [data-numeral="hero"]')!).fontSize)
    )
    expect(
      px,
      `the hero clamps to ${px}px at 320px. The clamp's lower bound is what keeps the pair valid ` +
        `on a phone, which is where PRODUCT.md says this reader often is.`
    ).toBeGreaterThanOrEqual(LARGE_TEXT_PX)
  })

  for (const theme of THEMES) {
    test(`the Overview numerals paint accent.signal.fill, not the adaptive text step -- ${theme} theme`, async ({
      page,
    }) => {
      await page.goto('/')
      await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme)

      const seen = await page.evaluate(() => {
        const probe = document.createElement('span')
        probe.style.color = 'var(--color-accent-signal-fill)'
        document.body.append(probe)
        const expected = getComputedStyle(probe).color
        probe.remove()
        const digits = document.querySelector(
          '#main [data-numeral="hero"] > span:not([aria-hidden="true"])'
        )
        if (!digits) throw new Error('no hero numeral digits')
        return { expected, actual: getComputedStyle(digits).color }
      })
      expect(
        seen.actual,
        'the digits must be the theme-invariant fill step the contrast gate names, not signal.text'
      ).toBe(seen.expected)
    })
  }

  test('the Overview h1 is the same step as a component page h1, not a second scale', async ({
    page,
  }) => {
    await page.goto('/')
    const overview = await px(page, '#main h1')
    await gotoDocs(page, '/components/button')
    const component = await px(page, '#main h1')
    expect(
      overview,
      'brand register buys extreme scale for ONE element here, the numeral. The heading step is ' +
        'shared with the other twenty-seven pages so the shell reads as one system.'
    ).toBe(component)
  })

  test('the front door uses the system it documents', async ({ page }) => {
    await page.goto('/')
    // The real Panel, with the corner crosshair drawn by ::before rather than by extra markup.
    const panel = page.locator('#main .panel.crosshair').first()
    await expect(panel).toBeVisible()
    const arms = await panel.evaluate(el => getComputedStyle(el, '::before').backgroundImage)
    expect(arms.match(/linear-gradient/g) ?? [], 'four corners, two arms each').toHaveLength(8)
    // Real Buttons, which render their own unclipped focus wrapper.
    await expect(page.locator('#main .bevel-focus-wrap').first()).toBeVisible()
  })
})
