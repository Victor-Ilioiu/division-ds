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
})
