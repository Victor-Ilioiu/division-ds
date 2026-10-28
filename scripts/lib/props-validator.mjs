// The props validator: every JSX element that is a Division DS component, checked against the
// component manifest (public/manifest/components.json). Run in a consumer project through
// `division-ds check` (scripts/division-ds.mjs); this file is the pure function it wraps, the
// same split the other gates use, so the rules are unit-testable without a filesystem.
//
// Why it exists. Inside this repository `tsc` catches a wrong prop. An agent writing a screen in
// another project often has no type-check in its loop (a JS project, a sandbox, a file it never
// compiles), and the two mistakes it makes are the ones a type would catch: a prop the component
// does not take (`<Badge variant=...>`, where Badge's prop is `tone`), and an enum value that is
// not in the union (`<Button variant="danger">`, where the value is `hostile`). Both render
// something, so neither is visible until a person looks.
//
// Parsing is the TypeScript compiler's own (`ts.createSourceFile`, syntax only: no program, no
// type-check, no tsconfig), so generics, arrow functions in attributes and fragments are read
// exactly as the compiler reads them. A regex tag scanner like button-spacing.mjs's is enough
// for a parent/child count; it is not enough to know which import a tag name refers to.
//
// What the manifest can and cannot say, and so what is checked:
// - A props table lists the props declared in this repository, plus a `...rest` row when the
//   component spreads native or Radix props. It never lists every inherited native attribute.
// - Enum values: checked on every component and part, wherever a row's type is a union of string
//   literals and the value is a literal.
// - Unknown props: checked only on a component that is the one component its manifest entry
//   exports. A compound entry (Dialog, Tabs, DropdownMenu, Card, ...) lists each part's own props
//   and nothing of the Radix part underneath, so judging `<TabsTrigger asChild>` against the table
//   would be a false positive. A false positive teaches an agent to stop reading the gate.
// - With a `...rest` row of native attributes, an event handler or a standard HTML attribute is
//   accepted; one the rest type names in its Omit<> is not. With a `...rest` row of a Radix
//   component's props, any other prop is accepted (the Radix surface is not in the manifest).
import ts from 'typescript'
import { parseRowName, resolvePart } from './component-props.mjs'

/** Always accepted on any component: React's own props, and attributes every DOM wrapper takes. */
const ALWAYS = new Set(['key', 'ref', 'className', 'children', 'id', 'style'])
const isAlwaysAllowed = name => ALWAYS.has(name) || /^(aria|data)-/.test(name)
const isEventHandler = name => /^on[A-Z]/.test(name)

/** The HTML and React DOM attributes a native `...rest` accepts, beyond aria-*, data-* and on*.
 *  Generous on purpose: a missing name here is a false positive, an extra one only a miss. */
const HTML_ATTRIBUTES = new Set(
  (
    'about accessKey autoCapitalize autoCorrect autoFocus autoSave contentEditable contextMenu dir draggable ' +
    'enterKeyHint hidden inert inputMode is itemID itemProp itemRef itemScope itemType lang nonce part popover ' +
    'popoverTarget popoverTargetAction prefix property radioGroup resource rel rev role security slot spellCheck ' +
    'suppressContentEditableWarning suppressHydrationWarning tabIndex title translate typeof unselectable vocab ' +
    'dangerouslySetInnerHTML defaultChecked defaultValue color results ' +
    // forms, buttons, inputs, textareas
    'accept alt autoComplete capture checked cols dirName disabled form formAction formEncType formMethod ' +
    'formNoValidate formTarget height list max maxLength min minLength multiple name pattern placeholder ' +
    'readOnly required rows size src step type value width wrap ' +
    // anchors
    'download href hrefLang media ping referrerPolicy target'
  ).split(/\s+/)
)

/** Words that mean the same thing to an agent. A value in a group that is not in the union gets
 *  the first member of its group that is: Button's `variant="hostile"` becomes "danger", and
 *  Badge's `tone="danger"` becomes "hostile" (the system uses both words, on different props). */
const SYNONYMS = [
  ['hostile', 'danger', 'destructive', 'error', 'negative', 'critical', 'red'],
  ['ok', 'success', 'positive', 'green'],
  ['warning', 'warn', 'caution', 'amber', 'yellow'],
  ['info', 'information', 'blue'],
  ['secondary', 'outline', 'outlined'],
  ['ghost', 'text', 'plain', 'link'],
  ['quiet', 'muted', 'subtle'],
  ['sm', 'small', 'xs'],
  ['md', 'medium', 'default'],
  ['lg', 'large', 'xl'],
]

/** The union member an agent most likely meant by `value`, or undefined. */
export function synonymIn(value, literals) {
  const group = SYNONYMS.find(words => words.includes(value.toLowerCase()))
  return group?.find(word => literals.includes(word))
}

/** The string literals of a type cell, or null when the type is not purely a union of them
 *  (`'sm' | 'md'` -> ['sm', 'md']; `string`, `number | 'auto'`, `ReactNode` -> null).
 *  `undefined` members are ignored: an optional union is still the same union. */
export function literalUnion(type) {
  if (!type) return null
  const members = type.split('|').map(member => member.trim()).filter(member => member && member !== 'undefined')
  if (members.length === 0) return null
  const values = []
  for (const member of members) {
    const match = member.match(/^'([^']*)'$/) || member.match(/^"([^"]*)"$/)
    if (!match) return null
    values.push(match[1])
  }
  return values
}

/** What a `...rest` row's type says: `{ open, excluded }`. `open` is 'native' for HTML attributes
 *  (`HTMLAttributes<...>`, `ButtonHTMLAttributes<...>`), 'any' for anything else (a Radix part's
 *  props: the manifest cannot list them). `excluded` is the Omit<> list, plus every aria-* key
 *  when the type says it removes them (Select). */
export function parseRest(type = '') {
  const excluded = new Set()
  const omit = type.match(/Omit<[\s\S]*?,\s*((?:'[^']*'\s*\|?\s*)+)>/)
  if (omit) for (const match of omit[1].matchAll(/'([^']*)'/g)) excluded.add(match[1])
  // `children` is left out even when omitted: a component that renders children declares its own
  // `children` prop and Omits the native one, and the tables do not list `children` rows reliably
  // (meta.test.ts exempts it from coverage), so the manifest cannot tell the two cases apart.
  excluded.delete('children')
  if (/\bminus\b[^.]*\bdata-testid\b/.test(type)) excluded.add('data-testid')
  const minusAria = /\bminus every aria-\* key/.test(type)
  const native = /\b\w*HTMLAttributes</.test(type) || /^HTMLAttributes/.test(type)
  return { open: native ? 'native' : 'any', excluded, minusAria }
}

const isComponentExport = name => /^[A-Z][a-z]/.test(name) && !/Variants$/.test(name)

/**
 * The manifest, indexed by export name: `Map<exportName, spec>` where a spec is
 * `{ entry, docs, props: Map<prop, { type, literals }>, rest, checkUnknown }`.
 * Rows are attributed to parts the way `checkPropsTable` attributes them (component-props.mjs):
 * a `(Part)` qualifier names one export; an unqualified row belongs to every component the
 * entry exports.
 */
export function buildIndex(manifest) {
  const index = new Map()
  for (const entry of manifest.components ?? []) {
    const exportNames = (entry.imports ?? []).flatMap(item => item.names).filter(isComponentExport)
    if (exportNames.length === 0) continue
    const components = Object.fromEntries(exportNames.map(name => [name, true]))
    const specs = Object.fromEntries(
      exportNames.map(name => [name, { entry: entry.name, docs: entry.docs, props: new Map(), rest: null }])
    )
    let unresolved = false
    for (const row of entry.props ?? []) {
      const parsed = parseRowName(row.name)
      if (parsed.call) continue
      let holders = exportNames
      // A rest row names its part in the type cell: `(Radio) Omit<RadioGroup.Item props, ...>`.
      const part = parsed.rest ? row.type.match(/^\(([^)]+)\)\s/)?.[1] : parsed.part
      if (part) {
        const target = resolvePart(part, entry.name, { components, types: {} })
        if (!target) {
          unresolved = true
          continue
        }
        holders = [target.name]
      }
      if (parsed.rest) {
        const rest = parseRest(row.type.replace(/^\([^)]+\)\s*/, ''))
        for (const name of holders) specs[name].rest = rest
        continue
      }
      if (row.type === '—') continue
      for (const name of holders) {
        for (const prop of parsed.props) specs[name].props.set(prop, { type: row.type, literals: literalUnion(row.type) })
      }
    }
    const single = exportNames.length === 1
    for (const name of exportNames) {
      const spec = specs[name]
      spec.checkUnknown = single && !unresolved && spec.rest?.open !== 'any'
      index.set(name, spec)
    }
  }
  return index
}

/** True when an import specifier is Division DS: a component path (`components/atoms|molecules|
 *  organisms`, any prefix) or the package name. Anything else is the consumer's own code. */
export function isDivisionSource(specifier) {
  return /(^|\/)components\/(atoms|molecules|organisms)(\/|$)/.test(specifier) || /^division-ds(\/|$)/.test(specifier)
}

export function distance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0]
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const current = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 0 : 1))
      previous = current
    }
  }
  return row[b.length]
}

/** The nearest candidate to `word`, or undefined when nothing is close enough to be a typo. */
export function closest(word, candidates) {
  let best
  let bestScore = Infinity
  for (const candidate of candidates) {
    const score = distance(word, candidate)
    if (score < bestScore) {
      best = candidate
      bestScore = score
    }
  }
  return bestScore <= Math.max(2, Math.floor(word.length / 3)) ? best : undefined
}

const list = values => values.map(value => `"${value}"`).join(', ')

/** The literal string values an attribute's initializer can take, or null when it is not a
 *  literal (a variable, a call, a template with substitutions). A conditional of two literals
 *  yields both. */
function literalValues(initializer) {
  if (!initializer) return null
  if (ts.isStringLiteral(initializer)) return [initializer]
  if (!ts.isJsxExpression(initializer) || !initializer.expression) return null
  const collect = node => {
    while (ts.isParenthesizedExpression(node)) node = node.expression
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return [node]
    if (ts.isConditionalExpression(node)) {
      const whenTrue = collect(node.whenTrue)
      const whenFalse = collect(node.whenFalse)
      return whenTrue && whenFalse ? [...whenTrue, ...whenFalse] : null
    }
    return null
  }
  return collect(initializer.expression)
}

export function scriptKind(path) {
  if (/\.tsx$/.test(path)) return ts.ScriptKind.TSX
  if (/\.jsx$/.test(path)) return ts.ScriptKind.JSX
  if (/\.[cm]?js$/.test(path)) return ts.ScriptKind.JSX
  return ts.ScriptKind.TS
}

/**
 * Every props violation in one file: `{ path, line, column, rule, component, prop, found, fix }`.
 * `rule` is 'unknown-prop' or 'invalid-value'. `index` comes from `buildIndex`.
 */
export function findPropViolations(text, path, index) {
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, scriptKind(path))
  // local name -> export name, for named imports from Division DS; namespace imports by local name.
  const named = new Map()
  const namespaces = new Set()
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue
    if (!isDivisionSource(statement.moduleSpecifier.text)) continue
    const bindings = statement.importClause?.namedBindings
    if (!bindings) continue
    if (ts.isNamespaceImport(bindings)) namespaces.add(bindings.name.text)
    else for (const element of bindings.elements) named.set(element.name.text, (element.propertyName ?? element.name).text)
  }
  if (named.size === 0 && namespaces.size === 0) return []

  const violations = []
  const resolve = tagName => {
    if (ts.isIdentifier(tagName)) return named.get(tagName.text)
    if (ts.isPropertyAccessExpression(tagName) && ts.isIdentifier(tagName.expression) && namespaces.has(tagName.expression.text)) {
      return tagName.name.text
    }
    return undefined
  }

  const check = element => {
    const exportName = resolve(element.tagName)
    const spec = exportName && index.get(exportName)
    if (!spec) return
    const tag = element.tagName.getText(source)
    const known = [...spec.props.keys()]
    for (const attribute of element.attributes.properties) {
      if (!ts.isJsxAttribute(attribute)) continue
      const prop = attribute.name.getText(source)
      const at = source.getLineAndCharacterOfPosition(attribute.getStart(source))
      const add = (rule, found, fix) =>
        violations.push({ path, line: at.line + 1, column: at.character + 1, rule, component: tag, prop, found, fix })
      const row = spec.props.get(prop)

      if (!row) {
        const rest = spec.rest
        const excluded = rest && (rest.excluded.has(prop) || (rest.minusAria && /^aria-/.test(prop)))
        if (excluded) {
          add('unknown-prop', `<${tag} ${prop}>`, `${spec.entry} types "${prop}" away on purpose. ${known.length ? `Its props: ${known.join(', ')}.` : ''} See ${spec.docs}.`.replace(/\s+/g, ' ').trim())
          continue
        }
        if (!spec.checkUnknown || isAlwaysAllowed(prop)) continue
        if (rest && (isEventHandler(prop) || HTML_ATTRIBUTES.has(prop))) continue
        const near = closest(prop, known)
        const hint = near
          ? `Did you mean "${near}"?`
          : known.length
            ? `${tag} takes: ${known.join(', ')}${rest ? ', and native attributes' : ''}.`
            : `${tag} takes no props of its own.`
        add('unknown-prop', `<${tag} ${prop}>`, `${tag} has no prop "${prop}". ${hint} See ${spec.docs}.`)
        continue
      }

      if (!row.literals) continue
      const values = literalValues(attribute.initializer)
      if (!values) continue
      for (const value of values) {
        if (row.literals.includes(value.text)) continue
        const near = synonymIn(value.text, row.literals) ?? closest(value.text, row.literals)
        const valueAt = source.getLineAndCharacterOfPosition(value.getStart(source))
        violations.push({
          path,
          line: valueAt.line + 1,
          column: valueAt.character + 1,
          rule: 'invalid-value',
          component: tag,
          prop,
          found: `${prop}="${value.text}"`,
          fix: `${tag}'s ${prop} is one of ${list(row.literals)}.${near ? ` Write ${prop}="${near}".` : ''}`,
        })
      }
    }
  }

  const visit = node => {
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) check(node)
    ts.forEachChild(node, visit)
  }
  visit(source)
  return violations.sort((a, b) => a.line - b.line || a.column - b.column)
}

export function formatPropViolation({ path, line, column, rule, found, fix }) {
  return `${path}:${line}:${column}  [${rule}] ${found}\n      ${fix}`
}
