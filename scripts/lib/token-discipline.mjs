// The token-discipline gate's rules, as pure functions over text. The runner is
// scripts/check-token-discipline.mjs.
//
// Colour comes from a token or it does not ship. Until this gate existed the components were
// clean by convention only, and a convention is exactly what an agent new to the system cannot
// see: a hardcoded hex renders fine, and an invented token name (`var(--color-brand)`) fails
// silently, because an undefined custom property is not an error anywhere.
//
// Colour only, on purpose. Spacing is not gated: enforcing it before the scale is complete makes
// an author (or an agent) invent a token name to satisfy the rule, which is the worse failure.

export const SCANNED_ROOTS = ['src']
export const SCANNED_EXTENSIONS = /\.(tsx?|css)$/

/** Files where a literal colour is the point, each with its reason. Everything else is scanned.
 *  A new entry needs a reason as good as these; "it was easier" is the case the gate exists for. */
export const EXEMPT = [
  { pattern: /^src\/styles\/tokens\.css$/, why: 'generated from tokens/: this is where the literals are meant to be' },
  { pattern: /\.test\.tsx?$/, why: 'tests assert on literal values and on deliberately wrong input' },
  { pattern: /^src\/demo\/(scene|blob|terrain)\//, why: 'WebGL materials: three.js takes colours as numbers, not CSS variables' },
  { pattern: /^src\/components\/atoms\/loading-animation\/(palette|scene|kit|variants)\.ts$/, why: 'WebGL materials, read from the tokens at runtime where they can be' },
  { pattern: /^src\/pages\/guidelines\//, why: 'the pages that display the palette, the ramps and the measured values themselves' },
]

const TOKEN_NAMESPACE = /var\(\s*(--(?:color|component|spacing|duration|ease)-[a-z0-9-]*)/g
const PRIMITIVE_RAMP = /^--color-(signal|hostile|ok|info|warning|neutral)-\d+$/
const HEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g
const COLOR_FUNCTION = /\b(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb|color-mix)\(/g
const PALETTE_CLASS = new RegExp(
  '(?<![\\w-])(?:bg|text|border|ring|outline|fill|stroke|from|via|to|decoration|divide|placeholder|caret|accent|shadow)-' +
    '(?:(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-(?:50|[1-9]00|950)' +
    '|white|black)(?![\\w-])',
  'g'
)

/** Blanks comments, keeping every newline so line numbers hold. A value quoted in a comment is
 *  documentation ("raised from #6f7a88"), not a colour on the page. */
export function stripComments(text) {
  const blank = match => match.replace(/[^\n]/g, ' ')
  return text.replace(/\/\*[\s\S]*?\*\//g, blank).replace(/(^|[^:'"`\\])\/\/[^\n]*/g, (match, lead) => lead + blank(match.slice(lead.length)))
}

/** Up to three real tokens closest to a name that is not one, nearest first. */
export function suggest(name, tokenNames) {
  const parts = name.split('-').filter(Boolean)
  return tokenNames
    .map(candidate => {
      const other = candidate.split('-').filter(Boolean)
      const shared = parts.filter(part => other.includes(part)).length
      return { candidate, score: shared * 2 - Math.abs(other.length - parts.length) }
    })
    .filter(entry => entry.score > 2)
    .sort((a, b) => b.score - a.score || a.candidate.localeCompare(b.candidate))
    .slice(0, 3)
    .map(entry => entry.candidate)
}

const ALLOW = /token-discipline: allow\b[\s,:-]*(.*?)\s*(?:\*\/\}?)?\s*$/

/** The line numbers a `token-discipline: allow <reason>` comment covers: its own line and the
 *  next one. The reason is required, at least a few words; a bare marker covers nothing, so the
 *  gate reports the line as if the comment were not there. */
export function allowedLines(text) {
  const covered = new Set()
  text.split('\n').forEach((line, index) => {
    const match = line.match(ALLOW)
    if (match && match[1].trim().split(/\s+/).length >= 3) {
      covered.add(index + 1)
      covered.add(index + 2)
    }
  })
  return covered
}

/** How many allow comments a file carries, for the runner's summary line. */
export const countAllows = text => text.split('\n').filter(line => ALLOW.test(line)).length

const isExempt = path => EXEMPT.some(entry => entry.pattern.test(path))
const inComponents = path => /^src\/components\/(atoms|molecules|organisms)\//.test(path)

/**
 * Every violation in one file: `{ path, line, rule, found, fix }`.
 * `tokenNames` is every CSS variable the token build emits (public/manifest/tokens.json).
 */
export function findViolations(text, path, tokenNames) {
  if (isExempt(path)) return []
  const known = new Set(tokenNames)
  const violations = []
  const allowed = allowedLines(text)
  const lines = stripComments(text).split('\n')
  lines.forEach((line, index) => {
    if (allowed.has(index + 1)) return
    const add = (rule, found, fix) => violations.push({ path, line: index + 1, rule, found, fix })

    for (const match of line.matchAll(TOKEN_NAMESPACE)) {
      const name = match[1]
      // A name ending in a hyphen is the fixed part of a computed one: var(--color-accent-${tone}-fill).
      if (name.endsWith('-')) continue
      if (!known.has(name)) {
        const near = suggest(name, tokenNames)
        add('unknown-token', `var(${name})`, near.length ? `No such token. Did you mean ${near.join(', ')}?` : 'No such token. The full list is public/manifest/tokens.json.')
      } else if (PRIMITIVE_RAMP.test(name) && inComponents(path)) {
        add('primitive-in-component', `var(${name})`, 'A component reads semantic tokens, not a ramp step. Pick one by intent from public/manifest/tokens.json (accent.<state>.text, .fill or .ink).')
      }
    }

    // What is left once every var(...) and every `--name: value` on a token is out of the way is
    // where a literal colour would be.
    const rest = line.replace(/var\([^)]*\)/g, '')
    for (const match of rest.matchAll(HEX)) {
      add('raw-colour', match[0], 'Use a semantic token: text-[var(--color-text-primary)], bg-[var(--color-surface-base)]. Tokens and what each is for: public/manifest/tokens.json.')
    }
    for (const match of rest.matchAll(COLOR_FUNCTION)) {
      add('raw-colour', match[0] + '…)', 'Use a semantic token. If no token fits, the colour is a change to the system: add it under tokens/ with a contrast pair.')
    }
    for (const match of rest.matchAll(PALETTE_CLASS)) {
      add('palette-class', match[0], 'Tailwind\'s palette is not this system\'s. Use an arbitrary value on a token: bg-[var(--color-surface-raised)], text-[var(--color-accent-hostile-text)].')
    }
  })
  return violations
}

export function formatViolation({ path, line, rule, found, fix }) {
  return `${path}:${line}  [${rule}] ${found}\n      ${fix}`
}
