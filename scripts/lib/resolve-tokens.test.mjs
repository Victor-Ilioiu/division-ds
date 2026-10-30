import { describe, it, expect } from 'vitest'
import { resolveTokens } from './resolve-tokens.mjs'

describe('resolveTokens', () => {
  const primitives = { color: { primitive: { signal: { 500: { $type: 'color', $value: '#f2550f' } } } } }
  const semantic = { color: { semantic: { accent: { signal: { fill: { $type: 'color', $value: '{color.primitive.signal.500}' } } } } } }

  it('resolves an alias to its primitive value', () => {
    const flat = resolveTokens(primitives, semantic)
    expect(flat['--color-accent-signal-fill']).toBe('#f2550f')
  })

  it('passes through a literal (non-alias) value unchanged', () => {
    const semanticLiteral = { color: { semantic: { border: { hairline: { $type: 'color', $value: 'rgba(214, 226, 240, 0.16)' } } } } }
    const flat = resolveTokens(primitives, semanticLiteral)
    expect(flat['--color-border-hairline']).toBe('rgba(214, 226, 240, 0.16)')
  })

  it('throws on an alias that points nowhere', () => {
    const bad = { color: { semantic: { accent: { x: { $type: 'color', $value: '{color.primitive.nope.500}' } } } } }
    expect(() => resolveTokens(primitives, bad)).toThrow(/nope/)
  })

  it('mixes two stops in OKLab when the token carries a division-ds mix', () => {
    const prims = { color: { primitive: { neutral: { 50: { $value: '#f2f4f8' }, 100: { $value: '#c2cddc' } } } } }
    const sem = { color: { semantic: { surface: { sunken: { $type: 'color', $value: '{color.primitive.neutral.50}', $extensions: { 'division-ds': { mix: { with: '{color.primitive.neutral.100}', amount: 0.31 } } } } } } } }
    expect(resolveTokens(prims, sem)['--color-surface-sunken']).toBe('#e3e8ef')
  })

  it('throws on a mix amount outside 0 to 1', () => {
    const prims = { color: { primitive: { n: { 1: { $value: '#ffffff' }, 2: { $value: '#000000' } } } } }
    const sem = { color: { semantic: { x: { $value: '{color.primitive.n.1}', $extensions: { 'division-ds': { mix: { with: '{color.primitive.n.2}', amount: 2 } } } } } } }
    expect(() => resolveTokens(prims, sem)).toThrow(/amount/)
  })
})
