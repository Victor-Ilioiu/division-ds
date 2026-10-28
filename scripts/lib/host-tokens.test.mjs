import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { HOST_VARIABLES, hostAdapterCss } from './host-tokens.mjs'

const dark = { '--color-surface-base': '#000', '--color-text-primary': '#fff' }
const light = { '--color-surface-base': '#fff', '--color-text-primary': '#000' }

describe('hostAdapterCss', () => {
  it('knows the 76 McpUiStyleVariableKey names', () => {
    expect(HOST_VARIABLES.size).toBe(76)
    expect(HOST_VARIABLES.has('--color-background-primary')).toBe(true)
    expect(HOST_VARIABLES.has('--color-surface-base')).toBe(false)
  })

  it('points each token at the host variable with the theme value as fallback', () => {
    const css = hostAdapterCss({ '--color-surface-base': '--color-background-primary' }, dark, light)
    expect(css).toContain('[data-host="mcp"] {\n  --color-surface-base: var(--color-background-primary, #000);')
    expect(css).toContain('[data-theme="light"] [data-host="mcp"], [data-host="mcp"][data-theme="light"] {\n  --color-surface-base: var(--color-background-primary, #fff);')
  })

  it('writes a shared fallback once, in the first rule only', () => {
    const css = hostAdapterCss({ '--font-body': '--font-sans' }, dark, light, { '--font-body': 'system-ui' })
    expect(css.match(/--font-body/g)).toHaveLength(1)
  })

  it('refuses a name the host does not send, a self-mapping and an unknown token', () => {
    expect(() => hostAdapterCss({ '--color-surface-base': '--color-surface-1' }, dark, light)).toThrow(/not a host style variable/)
    expect(() => hostAdapterCss({ '--color-text-primary': '--color-text-primary' }, dark, light)).toThrow(/maps onto itself/)
    expect(() => hostAdapterCss({ '--color-nope': '--color-text-info' }, dark, light)).toThrow(/not a Division token/)
  })

  it('accepts the shipped map', () => {
    const { map } = JSON.parse(readFileSync('tokens/host/mcp-apps.json', 'utf8'))
    const real = JSON.parse(readFileSync('public/manifest/tokens.json', 'utf8')).tokens
    const names = Object.fromEntries(real.map(t => [t.name, 'x']))
    const fonts = { '--font-body': 'a', '--font-display': 'b' }
    expect(() => hostAdapterCss(map, names, names, fonts)).not.toThrow()
  })
})
