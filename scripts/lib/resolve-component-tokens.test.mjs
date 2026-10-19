import { describe, it, expect } from 'vitest'
import { resolveComponentTokens } from './resolve-component-tokens.mjs'

describe('resolveComponentTokens', () => {
  it('turns a semantic alias into a var() reference, not a resolved value', () => {
    const doc = {
      component: {
        button: { 'primary-fill': { $type: 'color', $value: '{color.semantic.accent.signal.fill}' } },
      },
    }
    expect(resolveComponentTokens(doc)).toEqual({
      '--component-button-primary-fill': 'var(--color-accent-signal-fill)',
    })
  })

  it('passes literal values through untouched', () => {
    const doc = { component: { control: { 'height-md': { $type: 'dimension', $value: '40px' } } } }
    expect(resolveComponentTokens(doc)).toEqual({ '--component-control-height-md': '40px' })
  })

  it('flattens nested groups with dashes', () => {
    const doc = { component: { control: { border: { rest: { $type: 'color', $value: '#fff' } } } } }
    expect(resolveComponentTokens(doc)).toEqual({ '--component-control-border-rest': '#fff' })
  })

  it('throws on an alias that does not point at the semantic layer', () => {
    const doc = { component: { x: { y: { $type: 'color', $value: '{color.primitive.signal.500}' } } } }
    expect(() => resolveComponentTokens(doc)).toThrow(/semantic/)
  })

  // Validating the layer was never enough on its own: a typo inside the semantic path matched the
  // regex, emitted a var() nothing defines, and painted an unstyled element with no build error.
  it('throws on an alias whose target does not exist in the semantic layer', () => {
    const doc = {
      component: { x: { y: { $type: 'color', $value: '{color.semantic.accent.signal.filll}' } } },
    }
    expect(() => resolveComponentTokens(doc, ['--color-accent-signal-fill'])).toThrow(
      /names no semantic token/
    )
  })

  it('accepts an alias whose target does exist', () => {
    const doc = {
      component: { x: { y: { $type: 'color', $value: '{color.semantic.accent.signal.fill}' } } },
    }
    expect(resolveComponentTokens(doc, ['--color-accent-signal-fill'])).toEqual({
      '--component-x-y': 'var(--color-accent-signal-fill)',
    })
  })

  it('checks only the layer when no semantic key set is supplied', () => {
    // check-contrast.mjs resolves the component doc once, before it has a theme in hand; the
    // per-theme membership check belongs to build-tokens.mjs, which holds both key sets.
    const doc = {
      component: { x: { y: { $type: 'color', $value: '{color.semantic.accent.signal.filll}' } } },
    }
    expect(resolveComponentTokens(doc)).toEqual({
      '--component-x-y': 'var(--color-accent-signal-filll)',
    })
  })
})
