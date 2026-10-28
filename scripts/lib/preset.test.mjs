import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { DEFAULT_PRESET, WHITE_INK, buildTheme, decodePreset, encodePreset, inkFor, themeCss } from './preset.mjs'
import { resolveTokens } from './resolve-tokens.mjs'
import { checkPairs } from './contrast.mjs'
import { pairsForTheme } from './contrast-pairs.mjs'

const read = path => JSON.parse(readFileSync(path, 'utf8'))
const docs = {
  primitives: read('tokens/primitive/color.json'),
  dark: read('tokens/semantic/color.dark.json'),
  light: read('tokens/semantic/color.light.json'),
  control: read('tokens/component/control.json'),
}

describe('preset codes', () => {
  it('encodes the shipped anchors as a short versioned string', () => {
    expect(encodePreset(DEFAULT_PRESET)).toBe('1-f2550f-283445')
  })

  it('round-trips, normalising case and the leading #', () => {
    const preset = { signal: '#0A7CFF', neutral: '2b3240' }
    expect(decodePreset(encodePreset(preset))).toEqual({ signal: '#0a7cff', neutral: '#2b3240' })
  })

  it('refuses an unknown version and a malformed code, saying what it expected', () => {
    expect(() => decodePreset('2-f2550f-283445')).toThrow(/version "2"/)
    expect(() => decodePreset('1-f2550f')).toThrow(/Expected 1-<signal hex>-<neutral hex>/)
    expect(() => decodePreset('1-zz550f-283445')).toThrow(/Malformed/)
    expect(() => encodePreset({ signal: 'red', neutral: '#283445' })).toThrow(/six-digit hex/)
  })
})

describe('buildTheme', () => {
  it('reproduces the shipped tokens exactly for the default preset', () => {
    const { themes, failures } = buildTheme(DEFAULT_PRESET, docs)
    expect(themes.dark.tokens).toEqual(resolveTokens(docs.primitives, docs.dark))
    expect(themes.light.tokens).toEqual(resolveTokens(docs.primitives, docs.light))
    expect(failures).toEqual([])
  })

  it('runs the same pair list as the CLI gate', () => {
    const { themes } = buildTheme(DEFAULT_PRESET, docs)
    expect(themes.dark.results).toEqual(checkPairs(pairsForTheme('tokens/semantic/color.dark.json')))
    expect(themes.light.results).toEqual(checkPairs(pairsForTheme('tokens/semantic/color.light.json')))
  })

  it('re-tints the accent, including the wash and glow literals', () => {
    const { themes } = buildTheme({ ...DEFAULT_PRESET, signal: '#1f8fff' }, docs)
    expect(themes.dark.tokens['--color-accent-signal-fill']).toBe('#1f8fff')
    expect(themes.dark.tokens['--color-accent-signal-wash']).toBe('rgba(31, 143, 255, 0.12)')
    expect(themes.dark.tokens['--color-accent-signal-glow']).toBe('rgba(31, 143, 255, 0.38)')
  })

  it('puts white text on an accent dark enough for it, and dark text otherwise', () => {
    const blue = buildTheme({ ...DEFAULT_PRESET, signal: '#1d4ed8' }, docs).themes
    expect(blue.dark.tokens['--color-accent-signal-ink']).toBe(WHITE_INK)
    expect(blue.light.tokens['--color-accent-signal-ink']).toBe(WHITE_INK)
    const yellow = buildTheme({ ...DEFAULT_PRESET, signal: '#ffe14d' }, docs).themes
    expect(yellow.dark.tokens['--color-accent-signal-ink']).toBe('#0a0602')
    // The default orange gives white only 3.4:1, so it keeps the shipped dark ink.
    expect(inkFor(DEFAULT_PRESET.signal, '#0a0602')).toBe('#0a0602')
  })

  it('moves nothing for the default preset', () => {
    expect(buildTheme(DEFAULT_PRESET, docs).adjustments).toEqual({ dark: [], light: [] })
  })

  it('moves a failing token to the nearest ramp stop that passes, in that theme only', () => {
    // Green's 500 reaches under 3:1 on the light page; 600 is the nearest stop that clears it.
    const { failures, adjustments, themes } = buildTheme({ ...DEFAULT_PRESET, signal: '#16a34a' }, docs)
    expect(failures).toEqual([])
    expect(adjustments.dark).toEqual([])
    const fill = adjustments.light.find(a => a.token === 'accent.signal.fill')
    expect(fill).toMatchObject({ from: '500', to: '600' })
    expect(fill.fixed).toContain('checked/on fill (accent.signal.fill) on surface.base')
    // The dark theme keeps the user's own colour as the fill.
    expect(themes.dark.tokens['--color-accent-signal-fill']).toBe('#16a34a')
  })

  it('re-tints the wash and picks the ink from the moved fill', () => {
    const { themes } = buildTheme({ ...DEFAULT_PRESET, signal: '#eab308' }, docs)
    const fill = themes.light.tokens['--color-accent-signal-fill']
    expect(fill).not.toBe('#eab308')
    expect(themes.light.tokens['--color-accent-signal-glow']).toBe(`rgba(${[0, 2, 4].map(i => parseInt(fill.slice(1 + i, 3 + i), 16)).join(', ')}, 0.3)`)
    expect(themes.light.tokens['--color-accent-signal-ink']).toBe(inkFor(fill, '#0a0602'))
  })

  it('still names the failing pairs when no stop can fix them', () => {
    // A neutral that wrecks the light page: the solver does not touch surfaces, so it stays failed.
    const { failures } = buildTheme({ ...DEFAULT_PRESET, neutral: '#ff00ff' }, docs)
    expect(failures.length).toBeGreaterThan(0)
    expect(failures.every(f => f.theme === 'light')).toBe(true)
  })
})

describe('themeCss', () => {
  it('writes both theme blocks under the same selectors as tokens.css', () => {
    const { themes } = buildTheme(DEFAULT_PRESET, docs)
    const css = themeCss(DEFAULT_PRESET, themes)
    expect(css).toContain(':root, [data-theme="dark"] {\n  --color-surface-base: #07080b;')
    expect(css).toContain('[data-theme="light"] {\n  --color-surface-base: ')
    expect(css).toContain('preset 1-f2550f-283445')
  })
})
