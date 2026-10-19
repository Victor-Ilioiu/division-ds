import { describe, expect, it } from 'vitest'
import { checkUsage, measuredNotes, tokenManifest } from './token-usage.mjs'

describe('checkUsage', () => {
  const usage = { $comment: 'ignored', '--color-text-primary': 'Body text, headings and values.' }

  it('passes when every required token has a sentence and nothing else is described', () => {
    expect(checkUsage(['--color-text-primary'], usage)).toEqual([])
  })

  it('names a token with no entry, and one whose entry is too short to mean anything', () => {
    expect(checkUsage(['--color-text-primary', '--spacing-4'], usage)).toEqual([
      '--spacing-4 has no entry in tokens/usage.json. Add one sentence saying when to use it.',
    ])
    expect(checkUsage(['--spacing-4'], { '--spacing-4': '16px.' })).toHaveLength(1)
  })

  it('names an entry for a token that does not exist', () => {
    expect(checkUsage([], usage)).toEqual([
      'tokens/usage.json describes --color-text-primary, which is not a token. Remove the entry or fix the name.',
    ])
  })
})

describe('measuredNotes', () => {
  it('reads descriptions by CSS variable name, at any depth', () => {
    const semantic = {
      color: {
        semantic: {
          text: { primary: { $value: '#fff' }, muted: { $value: '#777', $description: '4.6:1' } },
          accent: { ok: { text: { $value: '#0f0', $description: '7.6:1' } } },
        },
      },
    }
    expect(measuredNotes(semantic)).toEqual({ '--color-text-muted': '4.6:1', '--color-accent-ok-text': '7.6:1' })
  })
})

describe('tokenManifest', () => {
  const tokens = tokenManifest({
    primitive: { '--color-signal-500': '#f2550f', '--spacing-4': '16px', '--duration-fast': '120ms' },
    semanticDark: { '--color-text-primary': '#eee', '--color-focus-ring': '#f2550f' },
    semanticLight: { '--color-text-primary': '#111', '--color-focus-ring': '#f2550f' },
    component: { '--component-button-primary-fill': 'var(--color-accent-signal-fill)' },
    usage: { '--spacing-4': 'Default padding.', '--color-text-primary': 'Body text.', '--color-focus-ring': 'Focus.', '--component-button-primary-fill': 'Fill.' },
    notesDark: { '--color-text-primary': '15:1' },
    notesLight: {},
  })
  const byName = Object.fromEntries(tokens.map(token => [token.name, token]))

  it('sorts tokens into layers', () => {
    expect(tokens.map(token => token.layer)).toEqual(['primitive', 'spacing', 'motion', 'semantic', 'semantic', 'component'])
  })

  it('gives one value when the themes agree and both when they differ', () => {
    expect(byName['--color-focus-ring'].value).toBe('#f2550f')
    expect(byName['--color-text-primary'].value).toEqual({ dark: '#eee', light: '#111' })
  })

  it('carries the use, and the measured note only where one exists', () => {
    expect(byName['--color-text-primary']).toMatchObject({ use: 'Body text.', measured: { dark: '15:1' } })
    expect(byName['--color-focus-ring']).not.toHaveProperty('measured')
    expect(byName['--color-signal-500']).not.toHaveProperty('use')
  })
})
