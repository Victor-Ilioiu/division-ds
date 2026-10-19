import { describe, it, expect } from 'vitest'
import { contrastRatio, checkPairs, composite } from './contrast.mjs'

describe('contrastRatio', () => {
  it('matches the known white-on-black ratio of 21:1', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 0)
  })

  it('matches the measured white-on-reference-orange failure from Phase 1 (2.80:1)', () => {
    expect(contrastRatio('#ffffff', '#fe6f00')).toBeCloseTo(2.8, 1)
  })

  it('matches the decided ink-on-Division-DS-signal pass (5.85:1)', () => {
    expect(contrastRatio('#0a0602', '#f2550f')).toBeCloseTo(5.85, 1)
  })

  it('accepts three- and four-digit shorthand hex', () => {
    expect(contrastRatio('#fff', '#000')).toBeCloseTo(21, 0)
  })

  it('ignores a backdrop when both colours are opaque', () => {
    const withBackdrop = contrastRatio('#ffffff', '#000000', '#f2550f')
    expect(withBackdrop).toBeCloseTo(contrastRatio('#ffffff', '#000000'), 10)
  })
})

describe('composite', () => {
  it('paints 50% white over black as mid grey', () => {
    expect(composite('rgba(255, 255, 255, 0.5)', '#000000')).toBe('#808080')
  })

  it('returns an opaque colour unchanged, with no backdrop required', () => {
    expect(composite('#f2550f')).toBe('#f2550f')
  })

  it('refuses to measure a translucent colour with no backdrop', () => {
    // A translucent colour has no ratio of its own. Guessing one (by measuring its nominal RGB)
    // is how the form controls' boundaries read as fine while failing SC 1.4.11 on screen.
    expect(() => composite('rgba(214, 226, 240, 0.32)')).toThrow(/backdrop/)
  })

  it('reads rgb() space-separated with a percentage alpha the same as rgba() comma form', () => {
    expect(composite('rgb(255 255 255 / 50%)', '#000000')).toBe(
      composite('rgba(255, 255, 255, 0.5)', '#000000')
    )
  })

  it('composites over a translucent backdrop by resolving that backdrop first', () => {
    // rgba(255,255,255,0.5) over black is #808080; another 50% white over that is #c0c0c0.
    expect(composite('rgba(255, 255, 255, 0.5)', composite('rgba(255, 255, 255, 0.5)', '#000000')))
      .toBe('#c0c0c0')
  })
})

describe('compositing a translucent colour before measuring it', () => {
  // The regression these tests exist for: `border.hairline-strong` used to draw every form
  // control's boundary, and the hex-only parser could not evaluate it at all — so the gate
  // reported 28/28 green while nothing identifying a Checkbox, Radio or Switch reached 3:1.
  // These are the retired values, measured the way the browser paints them: the border sits on
  // the control's own fill, and the control's fill sits on the page.
  const DARK = { page: '#07080b', fill: '#0d1016', border: 'rgba(214, 226, 240, 0.32)' }
  const LIGHT = { page: '#f2f4f8', fill: '#c2cddc', border: 'rgba(11, 14, 19, 0.22)' }

  it('measures the retired dark control border against its own fill at 2.45:1 — under 3:1', () => {
    const ratio = contrastRatio(DARK.border, DARK.fill)
    expect(ratio).toBeCloseTo(2.45, 1)
    expect(ratio).toBeLessThan(3)
  })

  it('measures the retired dark control border against the page at 2.58:1 — under 3:1', () => {
    const borderPixel = composite(DARK.border, DARK.fill)
    const ratio = contrastRatio(borderPixel, DARK.page)
    expect(ratio).toBeCloseTo(2.58, 1)
    expect(ratio).toBeLessThan(3)
  })

  it('measures the retired light control border against its own fill at 1.58:1 — under 3:1', () => {
    const ratio = contrastRatio(LIGHT.border, LIGHT.fill)
    expect(ratio).toBeCloseTo(1.58, 1)
    expect(ratio).toBeLessThan(3)
  })

  it('clears 3:1 in both themes with the replacement border.control step', () => {
    expect(contrastRatio('#646b72', DARK.fill)).toBeGreaterThanOrEqual(3)
    expect(contrastRatio('#646b72', DARK.page)).toBeGreaterThanOrEqual(3)
    expect(contrastRatio('#616874', LIGHT.fill)).toBeGreaterThanOrEqual(3)
    expect(contrastRatio('#616874', LIGHT.page)).toBeGreaterThanOrEqual(3)
  })

  it('composites a translucent BACKGROUND over its own backdrop before measuring', () => {
    // surface.raised is rgba over the page; text on it must be measured against the composite,
    // not against the nominal rgb triple.
    const onComposite = contrastRatio('#e9eef4', 'rgba(40, 52, 69, 0.42)', '#07080b')
    const onNominal = contrastRatio('#e9eef4', '#283445')
    expect(onComposite).toBeGreaterThan(onNominal)
    expect(onComposite).toBeCloseTo(14.95, 1)
  })

  it('throws rather than guessing when a translucent background has no backdrop', () => {
    expect(() => contrastRatio('#e9eef4', 'rgba(40, 52, 69, 0.42)')).toThrow(/backdrop/)
  })
})

describe('checkPairs', () => {
  it('flags a pair under its minimum ratio as failing', () => {
    const results = checkPairs([{ name: 'white on orange', fg: '#ffffff', bg: '#fe6f00', minRatio: 4.5 }])
    expect(results[0].pass).toBe(false)
  })

  it('passes a pair that clears its minimum ratio', () => {
    const results = checkPairs([{ name: 'ink on signal', fg: '#0a0602', bg: '#f2550f', minRatio: 4.5 }])
    expect(results[0].pass).toBe(true)
  })

  it('fails a pair that is ABOVE its ceiling, which no accessibility floor can express', () => {
    // The shape the numeral pad needed. Light theme's pad measured 11.44:1 against a 4.5:1
    // floor and passed everything, while reading as a second numeral rather than as padding.
    const results = checkPairs([
      { name: 'pad on light page', fg: '#283445', bg: '#f2f4f8', minRatio: 3, maxRatio: 7.02 },
    ])
    expect(results[0].pass).toBe(false)
    expect(results[0].ratio).toBeCloseTo(11.44, 1)
  })

  it('passes a pair inside its band', () => {
    const results = checkPairs([
      { name: 'pad on light page', fg: '#627da4', bg: '#f2f4f8', minRatio: 3, maxRatio: 7.02 },
    ])
    expect(results[0].pass).toBe(true)
    expect(results[0].ratio).toBeCloseTo(3.82, 1)
  })

  it('leaves a floor-only pair alone when no ceiling is given', () => {
    const results = checkPairs([{ name: 'ink on white', fg: '#000000', bg: '#ffffff', minRatio: 4.5 }])
    expect(results[0].pass).toBe(true)
    expect(results[0].maxRatio).toBeUndefined()
  })

  it('carries a backdrop through to the ratio', () => {
    const results = checkPairs([
      { name: 'text on raised', fg: '#e9eef4', bg: 'rgba(40, 52, 69, 0.42)', backdrop: '#07080b', minRatio: 4.5 },
    ])
    expect(results[0].pass).toBe(true)
    expect(results[0].ratio).toBeCloseTo(14.95, 1)
  })
})
