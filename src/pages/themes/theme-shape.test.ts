import { describe, expect, it } from 'vitest'
import { readShape, shapeCss, shapeVars } from './theme-shape'

describe('theme shape', () => {
  it('reads the offered radii and treats anything else as the cut', () => {
    expect(readShape('r0')).toBe(0)
    expect(readShape('r12')).toBe(12)
    expect(readShape('r999')).toBe(999)
    expect(readShape('r8')).toBeNull()
    expect(readShape(null)).toBeNull()
    expect(readShape('cut')).toBeNull()
    expect(readShape('r5')).toBeNull()
    expect(readShape('r')).toBeNull()
  })

  it('adds nothing for the cut, so the shipped look is unchanged', () => {
    expect(shapeVars(null)).toEqual({})
    expect(shapeCss(null)).toBe('')
  })

  it('turns the bevel off and sets the radius in the copied CSS', () => {
    const css = shapeCss(4)
    expect(css).toContain(':root {')
    expect(css).toContain('--shape-bevel: 0;')
    expect(css).toContain('--shape-radius: 4px;')
  })
})
