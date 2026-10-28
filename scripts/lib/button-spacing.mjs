// The touching-buttons matcher: a lightweight JSX tag scanner, the button-like/asChild-wrapper
// definition, and the parent-className check. `scripts/check-button-spacing.mjs` is the CLI that
// walks src/**/*.tsx and owns the exit code; this file is the pure function it wraps, the same
// split `check-contrast.mjs` and `check-vocabulary.mjs` both use, so the matching rules can be
// unit-tested without a filesystem.
//
// Why a gate at all. `Button` and `IconButton` render `inline-flex` (see
// src/components/atoms/button/Button.tsx), never a block element with its own margin. Two of them
// as bare JSX siblings, with no flex/grid parent carrying a `gap-` utility, land flush against each
// other on the same line -- JSX drops a whitespace-only line between two elements entirely, so
// there is no rendered space either. That is exactly what shipped in
// src/components/organisms/sheet/SheetDocs.tsx's "Filters on the right" example: a `Button` and a
// `SheetClose asChild` (its own single child a `Button`) as direct children of `SheetContent`, each
// carrying only `mt-6` (top margin, no horizontal gap), with no wrapping element at all.
//
// This is not a full JSX/TSX parser. It tokenizes `<Tag ...>`, `</Tag>` and `<Tag ... />` using a
// brace/paren/string-depth-aware scan of each tag's attribute text (so `onClick={() => f({a:1})}`
// does not confuse it about where the tag ends), builds a tree from that token stream, and asks two
// questions of every element: how many of its direct children are "button-like", and does its own
// className give it a real, nonzero, horizontal gap on an actual flex/grid container
// (`hasWorkingGap` below -- `gap-0`, a `gap-y-*`-only value, or a bare `gap-3` on an element with
// no `flex`/`grid` token all correctly fail this). Anything JSX can do that a real parser would
// resolve and this cannot -- conditional/mapped children, spread children, fragments standing in
// for a parent -- is out of scope; see button-spacing.test.mjs for what is deliberately not
// claimed. One specific accepted false negative, not worth a heuristic that would risk a worse
// false positive: a mutually-exclusive ternary (`{open ? <Button/> : <Button/>}`, where only one
// side ever renders) is invisible to this checker as two simultaneous children, same as it is to
// a reader skimming the JSX -- there is no touching bug there to catch in the first place.

const TAG_NAME = /[A-Za-z][A-Za-z0-9.]*/y

/** True at `text[i]` when a JSX tag plausibly starts there. A closing tag (`</Name>`) is always
 *  accepted: `</` right next to text content (`<Button>Apply</Button>`, no separating whitespace)
 *  is the ordinary JSX shape, not the ambiguous case. An opening tag (`<Name`) is accepted only
 *  when NOT immediately preceded by an identifier character -- that is what keeps `Array<string>`,
 *  `a < b` and `identity<T>()` from being read as tags, since in each of those the character right
 *  before `<` is part of an identifier, which a real JSX open tag never has. */
function isTagStart(text, i) {
  if (text[i] !== '<') return false
  const next = text[i + 1]
  if (next === '/') return true
  const prev = text[i - 1]
  if (prev && /[A-Za-z0-9_$]/.test(prev)) return false
  return /[A-Za-z]/.test(next)
}

/** Scans an opening or self-closing tag's attribute text starting right after the tag name, depth-
 *  and quote-aware so nested `{}` `()` `[]` and quoted strings inside attribute expressions never
 *  get mistaken for the tag's own closing `>`. Returns the raw attrs text, whether the tag was
 *  self-closing, and the index just past the whole tag. */
function scanAttrs(text, start) {
  let i = start
  let depth = 0
  let quote = null
  while (i < text.length) {
    const c = text[i]
    if (quote) {
      if (c === '\\') {
        i += 2
        continue
      }
      if (c === quote) quote = null
      i++
      continue
    }
    if (c === '"' || c === "'" || c === '`') {
      quote = c
      i++
      continue
    }
    if (c === '{' || c === '(' || c === '[') {
      depth++
      i++
      continue
    }
    if (c === '}' || c === ')' || c === ']') {
      depth--
      i++
      continue
    }
    if (depth <= 0 && c === '/' && text[i + 1] === '>') {
      return { attrsText: text.slice(start, i), selfClosing: true, end: i + 2 }
    }
    if (depth <= 0 && c === '>') {
      return { attrsText: text.slice(start, i), selfClosing: false, end: i + 1 }
    }
    i++
  }
  return { attrsText: text.slice(start), selfClosing: false, end: text.length }
}

/** Every JSX tag token in `text`, in source order: `{ type: 'open' | 'close' | 'self', name,
 *  attrsText, start }`. `start` is the index of the tag's leading `<`. */
export function tokenizeTags(text) {
  const tokens = []
  let i = 0
  while (i < text.length) {
    if (!isTagStart(text, i)) {
      i++
      continue
    }
    const start = i
    if (text[i + 1] === '/') {
      const nameStart = i + 2
      TAG_NAME.lastIndex = nameStart
      const match = TAG_NAME.exec(text)
      if (!match) {
        i++
        continue
      }
      const close = text.indexOf('>', TAG_NAME.lastIndex)
      if (close === -1) break
      tokens.push({ type: 'close', name: match[0], attrsText: '', start })
      i = close + 1
      continue
    }
    const nameStart = i + 1
    TAG_NAME.lastIndex = nameStart
    const match = TAG_NAME.exec(text)
    if (!match) {
      i++
      continue
    }
    const { attrsText, selfClosing, end } = scanAttrs(text, TAG_NAME.lastIndex)
    tokens.push({ type: selfClosing ? 'self' : 'open', name: match[0], attrsText, start })
    i = end
  }
  return tokens
}

/** Parses one tag's attribute text into `name -> raw value text` (quotes/braces stripped, so a
 *  string attr and an expression attr are both just the inner text). A boolean shorthand attribute
 *  (`asChild` with no `=`) maps to `'true'`. Spread attributes (`{...rest}`) carry no name and are
 *  skipped -- this checker only ever looks up specific attribute names, never enumerates all of
 *  them, so a spread is invisible to it by construction (see button-spacing.test.mjs). */
function parseAttributes(attrsText) {
  const attrs = new Map()
  const NAME = /[A-Za-z_][A-Za-z0-9_-]*/y
  let i = 0
  while (i < attrsText.length) {
    const c = attrsText[i]
    if (/\s/.test(c)) {
      i++
      continue
    }
    if (c === '{') {
      // A spread (`{...x}`) or a stray expression between attributes -- skip the balanced group.
      let depth = 0
      let quote = null
      while (i < attrsText.length) {
        const ch = attrsText[i]
        if (quote) {
          if (ch === '\\') {
            i += 2
            continue
          }
          if (ch === quote) quote = null
          i++
          continue
        }
        if (ch === '"' || ch === "'" || ch === '`') {
          quote = ch
          i++
          continue
        }
        if (ch === '{') depth++
        if (ch === '}') {
          depth--
          i++
          if (depth === 0) break
          continue
        }
        i++
      }
      continue
    }
    NAME.lastIndex = i
    const match = NAME.exec(attrsText)
    if (!match) {
      i++
      continue
    }
    const name = match[0]
    i = NAME.lastIndex
    while (/\s/.test(attrsText[i])) i++
    if (attrsText[i] !== '=') {
      attrs.set(name, 'true')
      continue
    }
    i++
    while (/\s/.test(attrsText[i])) i++
    const quoteChar = attrsText[i]
    if (quoteChar === '"' || quoteChar === "'") {
      const valStart = i + 1
      let j = valStart
      while (j < attrsText.length && attrsText[j] !== quoteChar) j++
      attrs.set(name, attrsText.slice(valStart, j))
      i = j + 1
      continue
    }
    if (quoteChar === '{') {
      let depth = 0
      let j = i
      let quote = null
      const valStart = i + 1
      while (j < attrsText.length) {
        const ch = attrsText[j]
        if (quote) {
          if (ch === '\\') {
            j += 2
            continue
          }
          if (ch === quote) quote = null
          j++
          continue
        }
        if (ch === '"' || ch === "'" || ch === '`') {
          quote = ch
          j++
          continue
        }
        if (ch === '{') depth++
        if (ch === '}') {
          depth--
          j++
          if (depth === 0) break
          continue
        }
        j++
      }
      attrs.set(name, attrsText.slice(valStart, j - 1))
      i = j
      continue
    }
    // An unquoted, unbraced value shouldn't occur in valid TSX; skip one token defensively.
    i++
  }
  return attrs
}

/** Element nodes that render `inline-flex` with no self-contained horizontal gap of their own. */
const BUTTON_TAGS = new Set(['Button', 'IconButton'])

/** Components whose own implementation already wraps `children` (or `...rest`, which children
 *  land in) in an element carrying a `gap-` utility, so a call site is correct with no `gap-` of
 *  its own -- the component *is* the gap-bearing wrapper. Checking a call site's className alone
 *  cannot see this (the gap lives in the component's source, not the call site's JSX), so without
 *  this list every real use of these components with 2+ button-like children would be a false
 *  positive. Narrow and exact by design, the same shape as `ALLOWED_IDIOMS` in vocabulary.mjs: an
 *  entry here is a claim about one named component's current source, verified by reading it, not a
 *  blanket exemption. Re-verify the cited line before trusting an existing entry, and re-check
 *  whether an entry is still needed if that component's implementation changes.
 *
 *  This exemption is NOT unconditional: `breaksExemption` below still checks the call site's own
 *  className for a `cn(...)`/tailwind-merge display or zero-gap override (`className="block"`,
 *  common across this codebase's own *Docs.tsx files) that would silently defeat the internal
 *  `flex ... gap-` these components render -- both merge the call site's className last, so
 *  `block` wins the `display` conflict and turns the internal flex row off entirely.
 *
 *  - `DialogFooter` (src/components/organisms/dialog/Dialog.tsx) renders
 *    `<div className={cn('flex flex-wrap items-center justify-end gap-3 mt-6', className)} ...>`.
 *  - `Example` (src/components/docs/Example.tsx) renders its children inside
 *    `<Panel className={cn('flex flex-wrap items-center gap-4', className)}>`.
 *  - `CardFooter` and `CardActions` (src/components/molecules/card/Card.tsx) both render a
 *    `flex flex-wrap ... gap-3` row. */
const GAP_PROVIDING_COMPONENTS = new Set(['DialogFooter', 'Example', 'CardFooter', 'CardActions'])

/** A whole class token, bounded by whitespace/quote/backtick on both sides (so `inline` never
 *  matches inside `inline-flex`, and `gap-0` never matches inside `gap-0.5` or `sm:gap-0`). */
function hasToken(className, token) {
  return new RegExp(`(^|[\\s'"\`])${token}(?=[\\s'"\`]|$)`).test(className)
}

/** True when the call site's own className carries a token that would override the internal
 *  `flex ... gap-` a `GAP_PROVIDING_COMPONENTS` entry renders -- `block`/`inline`/`contents` win
 *  the `display` conflict under tailwind-merge (the call site's className is merged last), and a
 *  literal `gap-0`/`gap-x-0` passed at the call site wins the same way on the `gap` property. */
function breaksExemption(className) {
  return ['block', 'inline', 'contents', 'gap-0', 'gap-x-0'].some(token => hasToken(className, token))
}

/** True when `className` carries a real, nonzero, HORIZONTAL gap token (`gap-<n>` or
 *  `gap-x-<n>`, never `gap-y-<n>` alone -- vertical spacing does nothing for two elements sitting
 *  side by side in a row) on an element that actually establishes a flex/grid formatting context.
 *  Both halves matter on their own: a `gap-` utility on an element with no `flex`/`grid`/
 *  `inline-flex`/`inline-grid` does nothing (a plain block `<div>` ignores `gap-3` entirely), and
 *  `flex-1`/`flex-none`/`flex-auto` (flex-ITEM properties, not `display: flex`) must not be
 *  mistaken for a flex container -- both are excluded by requiring the exact token, bounded on
 *  both sides, not merely `/\bflex\b/` (which `flex-1` also satisfies). */
function hasWorkingGap(className) {
  const gapTokens = className.match(/gap(?:-x|-y)?-[\w.[\]-]+/g) ?? []
  const hasRealHorizontalGap = gapTokens.some(token => {
    if (token.startsWith('gap-y-')) return false
    const value = token.match(/^gap(?:-x)?-(.+)$/)?.[1]
    return value !== undefined && value !== '0'
  })
  if (!hasRealHorizontalGap) return false
  return ['flex', 'inline-flex', 'grid', 'inline-grid'].some(token => hasToken(className, token))
}

/**
 * Builds the element tree from a token stream. Each node: `{ name, attrsText, attrs, start,
 * children }`, where `children` holds only child *elements* in source order (text and expression
 * children carry no structure this checker can reason about, so they're not represented at all).
 * A stray/mismatched closing tag pops back to the nearest matching ancestor by name if one exists
 * on the stack, otherwise it is ignored -- real TSX is always balanced; this only has to not throw
 * on the odd case this scanner misreads.
 */
export function buildTree(tokens) {
  const root = { name: null, attrsText: '', attrs: new Map(), start: -1, children: [] }
  const stack = [root]
  for (const token of tokens) {
    if (token.type === 'open') {
      const node = {
        name: token.name,
        attrsText: token.attrsText,
        attrs: parseAttributes(token.attrsText),
        start: token.start,
        children: [],
      }
      stack[stack.length - 1].children.push(node)
      stack.push(node)
      continue
    }
    if (token.type === 'self') {
      stack[stack.length - 1].children.push({
        name: token.name,
        attrsText: token.attrsText,
        attrs: parseAttributes(token.attrsText),
        start: token.start,
        children: [],
      })
      continue
    }
    // close
    const idx = stack.map(n => n.name).lastIndexOf(token.name)
    if (idx > 0) stack.length = idx
  }
  return root
}

/** True when `node` is itself a button, or is some other element carrying `asChild` whose one and
 *  only child element is a button -- the `SheetClose asChild><Button/></SheetClose>` shape that is
 *  exactly what shipped broken. Only one level of unwrapping: an `asChild` wrapper around an
 *  `asChild` wrapper is not chased further. */
export function isButtonLike(node) {
  if (BUTTON_TAGS.has(node.name)) return true
  if (node.attrs.get('asChild') === 'true' && node.children.length === 1) {
    return BUTTON_TAGS.has(node.children[0].name)
  }
  return false
}

export function lineIndex(text) {
  const offsets = [0]
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\n') offsets.push(i + 1)
  }
  return offsets
}

export function lineColAt(offsets, index) {
  let lo = 0
  let hi = offsets.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (offsets[mid] <= index) lo = mid
    else hi = mid - 1
  }
  return { line: lo + 1, column: index - offsets[lo] + 1 }
}

/**
 * Every parent element in `text` with 2+ direct button-like children and no `gap-` in its own
 * `className`, as `{ file, line, column, tag, count, excerpt }`.
 */
export function findViolations(text, file = '<input>') {
  const tree = buildTree(tokenizeTags(text))
  const offsets = lineIndex(text)
  const violations = []
  const lines = text.split(/\r?\n/)

  function visit(node) {
    if (node.name !== null) {
      const buttonLikeCount = node.children.filter(isButtonLike).length
      if (buttonLikeCount >= 2) {
        const className = node.attrs.get('className') ?? ''
        const exempt = GAP_PROVIDING_COMPONENTS.has(node.name) && !breaksExemption(className)
        if (!exempt && !hasWorkingGap(className)) {
          const { line, column } = lineColAt(offsets, node.start)
          violations.push({
            file,
            line,
            column,
            tag: node.name,
            count: buttonLikeCount,
            excerpt: (lines[line - 1] ?? '').trim().slice(0, 120),
          })
        }
      }
    }
    for (const child of node.children) visit(child)
  }
  visit(tree)

  return violations.sort((a, b) => a.line - b.line || a.column - b.column)
}

/** The one-line form the CLI prints per violation. */
export function formatViolation({ file, line, column, tag, count, excerpt }) {
  return (
    `${file}:${line}:${column}  <${tag}> has ${count} button-like children with no working, ` +
      `horizontal "gap-" on a flex/grid className\n` +
    `      ${excerpt}`
  )
}
