import { describe, expect, it } from 'vitest'
import { formatMoney, formatMoneyCompact } from './money'

describe('formatMoney', () => {
  it('formats cents as euros by default', () => {
    expect(formatMoney(12900)).toBe('€129.00')
  })

  it('formats a cents total carried over from a per-unit price times a quantity', () => {
    expect(formatMoney(1999 * 3)).toBe('€59.97')
  })

  it('takes its decimal count from the currency, not a hard-coded 2: JPY has none', () => {
    expect(formatMoney(500, { currency: 'JPY' })).toBe('JP¥500')
  })

  it('takes its decimal count from the currency, not a hard-coded 2: KWD has three', () => {
    expect(formatMoney(1234, { currency: 'KWD' })).toBe('KWD 1.234')
  })

  it('rounds a non-integer amount to the nearest whole minor unit rather than truncating it', () => {
    expect(formatMoney(1999.6)).toBe('€20.00')
  })
})

describe('formatMoneyCompact', () => {
  // The bug ChartPanel's own axisWidth/formatAxisValue fix exists for: a chart's fixed-width
  // y-axis clips `formatMoney`'s own two decimals ("€600.00"). No decimals is the whole point.
  // Mutation: drop `maximumFractionDigits: 0` from the formatter options -> this reads
  // '€600.00', matching plain `formatMoney`, and the assertion below fails.
  it('formats a round euro amount with no decimals, unlike formatMoney', () => {
    expect(formatMoneyCompact(60000)).toBe('€600')
    expect(formatMoney(60000)).toBe('€600.00')
  })

  // Mutation: drop `notation: 'compact'` -> this reads '€1,200' (grouped, but not abbreviated)
  // instead of '€1K'.
  it('abbreviates once the amount reaches four digits', () => {
    expect(formatMoneyCompact(120000)).toBe('€1K')
  })

  it('still takes its decimal count from the currency for the conversion itself, not the display', () => {
    expect(formatMoneyCompact(500, { currency: 'JPY' })).toBe('JP¥500')
  })
})
