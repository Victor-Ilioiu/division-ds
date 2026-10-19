import { describe, expect, it } from 'vitest'
import {
  allowedLines,
  EXEMPT,
  findViolations,
  formatViolation,
  SCANNED_EXTENSIONS,
  SCANNED_ROOTS,
  stripComments,
  suggest,
} from './token-discipline.mjs'
import { sourceFiles } from './read-source-files.mjs'

const TOKENS = [
  '--color-signal-500',
  '--color-surface-base',
  '--color-surface-raised',
  '--color-text-primary',
  '--color-accent-hostile-text',
  '--color-accent-hostile-fill',
  '--spacing-4',
  '--duration-fast',
]
const scan = (text, path = 'src/demo/pages/Screen.tsx') => findViolations(text, path, TOKENS)
const rules = (text, path) => scan(text, path).map(violation => violation.rule)

describe('raw colours', () => {
  it.each([
    ['a hex in a class', '<div className="bg-[#ff0000]" />'],
    ['a short hex', "const c = '#f00'"],
    ['an eight-digit hex', 'color: #ff000080;'],
    ['rgb()', 'color: rgb(255 0 0);'],
    ['rgba()', "style={{ color: 'rgba(0,0,0,0.5)' }}"],
    ['hsl()', 'background: hsl(0 100% 50%);'],
    ['oklch()', 'background: oklch(0.6 0.2 30);'],
    ['color-mix()', 'background: color-mix(in srgb, red, blue);'],
  ])('fails on %s', (_name, text) => {
    expect(rules(text)).toContain('raw-colour')
  })

  it('passes a token, an anchor, and a hex-looking word that is too long to be one', () => {
    expect(scan('<a href="#main" className="text-[var(--color-text-primary)]" />')).toEqual([])
    expect(scan("const id = '#checkout-form'")).toEqual([])
  })

  it('ignores a value quoted in a comment', () => {
    expect(scan('// raised from #6f7a88\nconst a = 1 /* was rgba(0,0,0,1) */')).toEqual([])
  })
})

describe('palette classes', () => {
  it.each(['bg-red-500', 'text-slate-900', 'border-gray-200', 'ring-blue-400', 'bg-white', 'text-black'])(
    'fails on %s',
    name => {
      expect(rules(`<div className="p-4 ${name}" />`)).toEqual(['palette-class'])
    }
  )

  it('passes utilities that only look similar', () => {
    expect(scan('<div className="text-sm border-t bg-[var(--color-surface-base)] to-transparent text-balance" />')).toEqual([])
  })
})

describe('token names', () => {
  it('fails on a name that is not a token, and suggests the nearest ones', () => {
    const [violation] = scan('<p className="text-[var(--color-accent-danger-text)]" />')
    expect(violation.rule).toBe('unknown-token')
    expect(violation.fix).toContain('--color-accent-hostile-text')
  })

  it('fails on a misspelt spacing or motion token', () => {
    expect(rules('gap: var(--spacing-5); transition-duration: var(--duration-quick);')).toEqual([
      'unknown-token',
      'unknown-token',
    ])
  })

  it('passes a real token, a computed name, and a variable outside the token namespaces', () => {
    expect(scan('var(--color-surface-base) var(--color-accent-${tone}-fill) var(--page-gutter, 1rem) var(--tilt-x)')).toEqual([])
  })

  it('fails on a ramp step inside a component, and passes it elsewhere', () => {
    const text = 'color: var(--color-signal-500);'
    expect(rules(text, 'src/components/atoms/badge/Badge.tsx')).toEqual(['primitive-in-component'])
    expect(scan(text, 'src/demo/pages/Home.tsx')).toEqual([])
  })
})

describe('allow comments', () => {
  it('covers its own line and the next, when it gives a reason', () => {
    expect(scan("// token-discipline: allow, pixels of a sample photo\nconst a = '#7c9c6b'")).toEqual([])
    expect(scan("const a = '#7c9c6b' // token-discipline: allow, pixels of a sample photo")).toEqual([])
    expect(scan('{/* token-discipline: allow, a manifest number in copy */}\n<p>Manifest #482</p>')).toEqual([])
  })

  it('covers nothing without a reason, and nothing two lines down', () => {
    expect(rules("// token-discipline: allow\nconst a = '#7c9c6b'")).toEqual(['raw-colour'])
    expect(rules("// token-discipline: allow, pixels of a sample photo\n\nconst a = '#7c9c6b'")).toEqual(['raw-colour'])
    expect([...allowedLines('a\n// token-discipline: allow, three word reason\nb\nc')]).toEqual([2, 3])
  })
})

describe('helpers', () => {
  it('stripComments keeps line numbers and URLs', () => {
    const text = "const u = 'https://example.test' // note\n/* a\n b */ const x = 1"
    const out = stripComments(text)
    expect(out.split('\n')).toHaveLength(3)
    expect(out).toContain('https://example.test')
    expect(out).not.toContain('note')
  })

  it('suggest ranks by shared parts', () => {
    expect(suggest('--color-surface-card', TOKENS)).toEqual(['--color-surface-base', '--color-surface-raised'])
    expect(suggest('--zzz', TOKENS)).toEqual([])
  })

  it('formatViolation names the place, the rule, what was found and the fix', () => {
    expect(formatViolation({ path: 'src/a.tsx', line: 3, rule: 'raw-colour', found: '#f00', fix: 'Use a token.' })).toBe(
      'src/a.tsx:3  [raw-colour] #f00\n      Use a token.'
    )
  })

  it('exempts files by pattern, each with a reason', () => {
    expect(scan('color: #f00;', 'src/styles/tokens.css')).toEqual([])
    expect(scan("const c = '#f00'", 'src/demo/scene/models/rifle.ts')).toEqual([])
    for (const entry of EXEMPT) expect(entry.why.length).toBeGreaterThan(20)
  })
})

describe('the repository', () => {
  it('has no violation today', async () => {
    const { readFileSync } = await import('node:fs')
    const tokenNames = JSON.parse(readFileSync('public/manifest/tokens.json', 'utf8')).tokens.map(token => token.name)
    const violations = sourceFiles(SCANNED_ROOTS, SCANNED_EXTENSIONS).flatMap(({ path, text }) =>
      findViolations(text, path, tokenNames)
    )
    expect(violations.map(formatViolation)).toEqual([])
  })
})
