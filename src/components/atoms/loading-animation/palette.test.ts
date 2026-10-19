import { describe, expect, it } from 'vitest'
import { parseCssColor } from './palette'

describe('parseCssColor', () => {
  it('reads the comma rgb() form getComputedStyle returns for a hex token', () => {
    expect(parseCssColor('rgb(242, 85, 15)')).toEqual({ r: 242 / 255, g: 85 / 255, b: 15 / 255, a: 1 })
  })

  it('keeps the alpha of an rgba() token, which a hairline token carries', () => {
    expect(parseCssColor('rgba(214, 226, 240, 0.16)')).toEqual({ r: 214 / 255, g: 226 / 255, b: 240 / 255, a: 0.16 })
  })

  it('reads the space-separated form with a slash alpha', () => {
    expect(parseCssColor('rgb(10 20 30 / 0.5)')).toEqual({ r: 10 / 255, g: 20 / 255, b: 30 / 255, a: 0.5 })
  })

  it('returns null for anything it cannot read, rather than guessing black', () => {
    expect(parseCssColor('var(--color-text-primary)')).toBeNull()
    expect(parseCssColor('')).toBeNull()
  })
})
