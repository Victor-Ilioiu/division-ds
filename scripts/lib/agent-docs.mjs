// Renders the agent-readable outputs from component metadata. Pure functions: text in, text out.
// The runner (scripts/build-agent-docs.mjs) reads the repository and writes the files.

const TIER_NOUN = { atoms: 'Atom', molecules: 'Molecule', organisms: 'Organism' }

/** Where the docs site is hosted. The skill names it so an assistant outside this repository can
 *  still read the component pages; src/links.ts holds the same address for the site itself. */
export const DOCS_SITE = 'https://victorilioiu.com/systems/division-ds/'
/** Where shadcn downloads the components from: public/r/ in the public GitHub repository. */
export const REGISTRY = 'https://raw.githubusercontent.com/Victor-Ilioiu/division-ds/main/public/r'
/** The skill's files in the public repository, for a reader who has the package but not the skill. */
export const SKILL_SOURCE = 'https://github.com/Victor-Ilioiu/division-ds/blob/main/skills/division-ds/'

/** A table cell: one line, with the pipes that would end the cell escaped. */
const cell = text => String(text ?? '').replace(/\s*\n\s*/g, ' ').replace(/\|/g, '\\|')
const code = text => '`' + String(text).replace(/\|/g, '\\|') + '`'
const fence = (source, language = 'tsx') => '```' + language + '\n' + source + '\n```'

/** `import { Card, CardBody } from 'src/components/molecules/card/Card'`, one line per file. */
export function importLines(entry) {
  return entry.imports.map(({ names, from }) => `import { ${names.join(', ')} } from '${from}'`).join('\n')
}

/** The other components a page documents, by export name: ChatMessage's ResponseFeedback,
 *  ProductCard's ProductGrid. Parts named after the component (CardBody, RadioGroup) and helpers
 *  (lower case) are left out. The 2026-10-29 outside test could not find ResponseFeedback because
 *  only its parent was listed anywhere an agent looks first. */
export function alsoExports(entry) {
  return entry.imports
    .flatMap(({ names }) => names)
    .filter(name => /^[A-Z][a-z]/.test(name) && !name.startsWith(entry.name) && !name.endsWith('Provider'))
}

/** The docs site's top-bar search reads this, fetched the first time search opens. Slim on purpose:
 *  the names, the one-line summaries and the prop names and descriptions the shared scorer
 *  (search-score.mjs) ranks on, and the screen-facing tokens. Primitives are left out, as in the
 *  MCP search: they are never the answer for a screen. */
export function searchIndex(entries, tokens) {
  const index = {
    generatedBy: 'scripts/build-agent-docs.mjs',
    components: entries.map(entry => ({
      name: entry.name,
      slug: entry.slug,
      tier: entry.tier,
      summary: entry.summary,
      useWhen: entry.useWhen,
      also: alsoExports(entry),
      props: entry.props.map(prop => ({ name: prop.name, description: prop.description ?? '' })),
    })),
    tokens: tokens.tokens.filter(token => token.layer !== 'primitive').map(token => ({ name: token.name, layer: token.layer, use: token.use ?? '' })),
  }
  return JSON.stringify(index) + '\n'
}

/** Said under every Import block: the paths are the repository's, not an installed project's. */
export const INSTALLED_PATHS = 'Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file. An install has no index barrels: import each component from its own file, never from `components/molecules`.'

/** One component as a markdown page. `entry` is a manifest entry (see `manifestEntry`). */
export function componentMarkdown(entry) {
  const out = [`# ${entry.name}`, '', `> ${entry.summary}`, '']
  out.push(`- **Best for:** ${entry.useWhen}`, `- **Not for:** ${entry.notFor}`)
  const also = alsoExports(entry)
  if (also.length) out.push(`- **Also on this page:** ${also.map(code).join(', ')}`)
  out.push(`- ${TIER_NOUN[entry.tier]}. Source: \`${entry.source}\``)
  out.push(`- Rendered docs page: \`/components/${entry.slug}\``, '')

  out.push('## Import', '', fence(importLines(entry)), '', INSTALLED_PATHS, '')

  if (entry.requires?.length) {
    out.push('## Requires', '', ...entry.requires.map(item => `- ${item}`), '')
  }

  out.push('## Props', '', '| Prop | Type | Default | Description |', '|---|---|---|---|')
  for (const row of entry.props) {
    out.push(`| ${code(row.name)} | ${code(row.type)} | ${row.default ? code(row.default) : ''} | ${cell(row.description)} |`)
  }
  out.push('')

  if (entry.api?.length) {
    out.push(
      '## Types and helpers',
      '',
      'Exported beside the component, from the same file. Import a type with `import type { ... }`.',
      ''
    )
    for (const item of entry.api) out.push(fence(item.code, 'ts'), '')
  }

  if (entry.examples.length) {
    out.push('## Examples', '', 'Each is compiled and rendered on the docs page. Imports are omitted; see above.', '')
    for (const example of entry.examples) out.push(`### ${example.caption}`, '', fence(example.source), '')
  }

  out.push('## Keyboard', '')
  if (entry.keyboard.length === 0) out.push('Not focusable. No keyboard behaviour of its own.', '')
  else {
    out.push('| Keys | Result |', '|---|---|')
    for (const row of entry.keyboard) out.push(`| ${row.keys.map(code).join(' ')} | ${cell(row.does)} |`)
    out.push('')
  }

  out.push('## Do', '', ...entry.dos.map(item => `- ${item}`), '')
  out.push("## Don't", '', ...entry.donts.map(item => `- ${item}`), '')

  if (entry.pitfalls?.length) {
    out.push('## Common mistakes', '')
    for (const pitfall of entry.pitfalls) {
      out.push('Wrong:', '', fence(pitfall.wrong), '', 'Right:', '', fence(pitfall.right), '', pitfall.why, '')
    }
  }

  out.push('## Anatomy', '', ...entry.anatomy.map(row => `- **${row.part}**: ${row.description}`), '')
  return out.join('\n')
}

/** What the manifest holds for one component: the metadata plus what was read from the code. */
export function manifestEntry(meta, { imports, api = [], examples, source }) {
  return {
    name: meta.name,
    title: meta.title,
    tier: meta.tier,
    slug: meta.slug,
    summary: meta.summary,
    useWhen: meta.useWhen,
    notFor: meta.notFor,
    source,
    docs: `/docs/components/${meta.slug}.md`,
    imports,
    ...(meta.requires ? { requires: meta.requires } : {}),
    props: meta.props,
    ...(api.length ? { api } : {}),
    keyboard: meta.keyboard,
    dos: meta.dos,
    donts: meta.donts,
    ...(meta.pitfalls ? { pitfalls: meta.pitfalls } : {}),
    anatomy: meta.anatomy,
    examples,
  }
}

const byTier = entries =>
  Object.keys(TIER_NOUN).map(tier => [tier, entries.filter(entry => entry.tier === tier)])

/** The first sentence of a summary: the index line keeps that much and spends the rest of its
 *  length on choosing, which is what an agent reads the index for. */
export const firstSentence = text => text.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? text

/** One component's line in llms.txt: what it is, then best for and not for. */
export const indexLine = entry => {
  const also = alsoExports(entry)
  return `- [${entry.name}](${entry.docs.replace(/^\//, '')}): ${firstSentence(entry.summary)} Best for: ${entry.useWhen} Not for: ${entry.notFor}${also.length ? ` Also: ${also.join(', ')}.` : ''}`
}

/** llms.txt, in the llmstxt.org shape: a title, a summary, then sections of links. */
export function llmsIndex(entries, { rules }) {
  const out = [
    '# Division DS',
    '',
    `> A React 19, Tailwind 4 and Radix design system: ${entries.length} components, design tokens in three layers, light and dark themes, WCAG 2.2 AA. Components are source you read and copy, not a package.`,
    '',
    'Links below are relative to this file, so they work wherever the site is served. In the repository the same files are under `public/`.',
    'Read a component page before using the component: it has the props, working examples and the rules.',
    '',
    '## Start here',
    '',
    '- [Rules](llms-guidelines.txt): imports, colour, providers, forms. Short. Read it first.',
    '- [DESIGN.md](DESIGN.md): the system in one file, in the DESIGN.md format (the tokens as YAML front matter; colour, type, layout, elevation, shapes, motion, voice, every component in a line, the rules), for a tool that takes a single design file.',
    '- [Tokens](llms-tokens.txt): every semantic and component token with when to use it.',
    '- [Helpers](docs/helpers.md): the shared functions and types under src/lib (form errors, money, links, theme, streamed text).',
    '- [All components, compact](llms-components.txt): every prop signature in one file.',
    '- [Component manifest](manifest/components.json) and [token manifest](manifest/tokens.json): the same as data.',
    '',
  ]
  for (const [tier, group] of byTier(entries)) {
    out.push(`## ${tier[0].toUpperCase()}${tier.slice(1)}`, '')
    for (const entry of group) out.push(indexLine(entry))
    out.push('')
  }
  out.push('## The rules in brief', '', ...ruleHeadlines(rules).map(line => `- ${line}`), '')
  return out.join('\n')
}

/** The first sentence of each rule paragraph (`**Imports.** Import a component from...`). */
export function ruleHeadlines(rules) {
  return rules
    .split(/\n\s*\n/)
    .map(block => block.replace(/\s*\n\s*/g, ' ').trim())
    .filter(block => block.startsWith('**'))
    .map(block => block.match(/^\*\*[^*]+\*\*\s+.*?\.(?=\s|$)/)?.[0] ?? block)
}

/** Every component's contract in one compact file: no examples, no prose beyond the summary. */
export function componentsBundle(entries) {
  const out = [
    '# Division DS: components, compact',
    '',
    '> One block per component: what it is, how to import it, what it needs, and every prop as `name: type = default`. Full pages with examples: /docs/components/<slug>.md.',
    '',
  ]
  for (const [tier, group] of byTier(entries)) {
    out.push(`## ${tier[0].toUpperCase()}${tier.slice(1)}`, '')
    for (const entry of group) {
      out.push(`### ${entry.name}`, '', entry.summary, '', fence(importLines(entry)), '')
      for (const item of entry.requires ?? []) out.push(`Requires: ${item}`, '')
      for (const row of entry.props) {
        out.push(`- ${code(`${row.name}: ${row.type}${row.default ? ` = ${row.default}` : ''}`)} ${cell(row.description)}`)
      }
      out.push('', `Page: ${entry.docs}`, '')
    }
  }
  return out.join('\n')
}

/** The tokens an author chooses from, grouped by layer, each with its use. Primitive colour ramps
 *  are named as a family and not listed: they are not for choosing. */
export function tokensBundle(manifest) {
  const group = layer => manifest.tokens.filter(token => token.layer === layer)
  const value = token => (typeof token.value === 'string' ? token.value : `dark ${token.value.dark}, light ${token.value.light}`)
  const section = (title, layer, note) => [
    `## ${title}`,
    '',
    ...(note ? [note, ''] : []),
    '| Token | Use | Value |',
    '|---|---|---|',
    ...group(layer).map(token => `| ${code(token.name)} | ${cell(token.use)} | ${code(value(token))} |`),
    '',
  ]
  const ramps = [...new Set(group('primitive').map(token => token.name.replace(/-\d+$/, '')))]
  return [
    '# Division DS: tokens',
    '',
    `> ${manifest.rule}`,
    '',
    'Write a token as a CSS variable inside a Tailwind arbitrary value: `bg-[var(--color-surface-base)]`, `text-[var(--color-text-primary)]`, `gap-[var(--spacing-4)]`. You must use only the names listed here. Do not make one up: an undefined variable is not an error in the browser, it just paints nothing.',
    '',
    ...section('Semantic colour', 'semantic', 'Choose by what the colour is doing, not by how it looks. Values differ by theme and switch on their own.'),
    ...section('Component', 'component', 'What the controls are built from. Use the component; reach for these only when building a new control.'),
    ...section('Spacing', 'spacing', 'Tailwind\'s own spacing utilities sit on the same 4px grid (`gap-3` is 12px, `p-4` is 16px) and are fine to use.'),
    ...section('Motion', 'motion'),
    '## Primitive ramps',
    '',
    `Not for use in components or screens: ${ramps.map(code).join(', ')}, each with stops from 50 to 950. The semantic layer is built from them.`,
    '',
  ].join('\n')
}

/** The DESIGN.md format DESIGN.md follows: Google Labs' open spec (github.com/google-labs-code/
 *  design.md), version `alpha`, as the published linter `@google/design.md` reads it. The
 *  repository runs that linter on every test run (agent-docs.test.ts) and fails on any error or
 *  warning, so the file stays in the format rather than near it. */
export const DESIGN_MD_SPEC = 'alpha'

/** The two themes, in the order DESIGN.md lists them. Dark is the default. */
const THEMES = ['dark', 'light']

/** The semantic colours left out of DESIGN.md's front matter: the 17 ANSI colours only Terminal
 *  applies. They would add 34 lines of colour and 34 of pairs for one component; the Colors
 *  section says where they are. */
const DESIGN_YAML_SKIP = /^terminal-/

/** The type roles DESIGN.md states as typography tokens. The system has no type-scale tokens (the
 *  components set sizes with Tailwind's scale), so each role is read off the component that
 *  defines it, and `evidence` holds the class string that sets it: agent-docs.test.ts fails if
 *  that string leaves the file, so a changed component cannot leave a stale role here. `font` is
 *  a `--font-*` name from src/styles/tailwind.css. Sizes are px at the 16px root the system never
 *  overrides; line heights are Tailwind's (`leading-tight` 1.25, `leading-relaxed` 1.625, and the
 *  `text-sm` / `text-xs` defaults of 20/14 and 16/12). */
export const TYPE_ROLES = [
  {
    name: 'headline-lg', font: 'display', size: '30px', weight: 600, lineHeight: 1.25,
    use: 'A screen title (PageHeader). 24px in a narrow container.',
    evidence: { file: 'src/components/molecules/page-header/PageHeader.tsx', classes: 'font-display text-2xl font-semibold leading-tight' },
  },
  {
    name: 'headline-md', font: 'display', size: '24px', weight: 600, lineHeight: 1.25, letterSpacing: '0.02em',
    use: 'A section title, uppercase (SectionHeading). 20px in a narrow container.',
    evidence: { file: 'src/components/molecules/section-heading/SectionHeading.tsx', classes: 'font-display text-xl font-semibold uppercase leading-tight tracking-[0.02em]' },
  },
  {
    name: 'body-md', font: 'body', size: '16px', weight: 400, lineHeight: 1.625,
    use: 'Reading text: a description under a title, a paragraph.',
    evidence: { file: 'src/components/molecules/page-header/PageHeader.tsx', classes: 'font-body text-base leading-relaxed' },
  },
  {
    name: 'body-sm', font: 'body', size: '14px', weight: 400, lineHeight: 1.43,
    use: 'Supporting and help text. The smallest size for text.secondary.',
    evidence: { file: 'src/components/molecules/section-heading/SectionHeading.tsx', classes: 'font-body text-sm' },
  },
  {
    name: 'label-md', font: 'mono', size: '12px', weight: 600, lineHeight: 1.33, letterSpacing: '0.18em',
    use: 'An eyebrow over a title, uppercase (PageHeader).',
    evidence: { file: 'src/components/molecules/page-header/PageHeader.tsx', classes: 'font-mono text-xs font-semibold uppercase tracking-[0.18em]' },
  },
  {
    name: 'button-md', font: 'display', size: '14px', weight: 600, lineHeight: 1.43, letterSpacing: '0.025em',
    use: 'A Button label, uppercase. 12px at sizes xs and sm, 16px at lg.',
    evidence: { file: 'src/components/atoms/button/Button.tsx', classes: 'font-display font-semibold uppercase tracking-wide' },
  },
  {
    name: 'data-md', font: 'data', size: '14px', weight: 400, lineHeight: 1.43, fontFeature: '"tnum"',
    use: 'Numbers, ids, timestamps and logs, with tabular figures (LogFeed, ListItem meta).',
    evidence: { file: 'src/components/molecules/log-feed/LogFeed.tsx', classes: 'font-data text-sm' },
  },
]

/** A YAML key or scalar. Strings are written JSON-quoted, which YAML reads as a double-quoted
 *  scalar, so a value with a `#`, a `{` or a comma needs no further escaping. */
const yamlKey = key => (/^[a-z][a-z0-9-]*$/.test(key) ? key : JSON.stringify(key))
const yamlValue = value => (typeof value === 'number' ? String(value) : JSON.stringify(value))
const yamlFlow = props => `{${Object.entries(props).map(([key, value]) => `${key}: ${yamlValue(value)}`).join(', ')}}`

/** The first family in a font stack: `"Oxanium", system-ui, sans-serif` is `Oxanium`. */
const firstFamily = stack => stack.split(',')[0].trim().replace(/^["']|["']$/g, '')

/** DESIGN.md's tokens, as `{ colors, typography, rounded, spacing, components }` of plain values.
 *
 *  Colours: the ones that are the same in both themes sit at the top level, and the rest under
 *  `dark` and `light`, as the spec lays out themes. Each key is the CSS variable without
 *  `--color-`, so `colors.dark.text-primary` is `var(--color-text-primary)` in the dark theme.
 *  `primary` is `accent-signal-fill` under the name the spec requires.
 *
 *  Components: the colour pairs the system paints, one entry per pair per theme (`-dark`,
 *  `-light`; one entry with no suffix when both colours are theme-independent). Every colour
 *  must be in one, or the linter calls it orphaned, so a semantic colour this function has no
 *  rule for throws here instead of slipping through. Text sits on `surface-base`, which is the
 *  pair the contrast gate holds every text colour to. Lines and outlines (borders, the focus
 *  ring, chart series) are a `backgroundColor` with a width: the spec has no border property. A
 *  translucent layer is a `backgroundColor` alone, because the linter cannot composite it over
 *  the surface below; scripts/check-contrast.mjs does. */
export function designTokens(manifest, { fonts }) {
  const key = token => token.name.replace(/^--color-/, '')
  const colours = manifest.tokens.filter(token => token.layer === 'semantic' && !DESIGN_YAML_SKIP.test(key(token)))
  const shared = new Set(colours.filter(token => typeof token.value === 'string').map(key))
  const known = new Set(colours.map(key))
  const ref = (name, theme) => {
    if (!known.has(name)) throw new Error(`DESIGN.md: no semantic colour --color-${name}`)
    return shared.has(name) ? `{colors.${name}}` : `{colors.${theme}.${name}}`
  }

  const signal = colours.find(token => key(token) === 'accent-signal-fill')
  if (typeof signal?.value !== 'string') throw new Error('DESIGN.md: --color-accent-signal-fill must be one value in both themes; it is `primary`.')
  const colors = { primary: signal.value }
  for (const token of colours) if (shared.has(key(token))) colors[key(token)] = token.value
  for (const theme of THEMES) {
    colors[theme] = Object.fromEntries(colours.filter(token => !shared.has(key(token))).map(token => [key(token), token.value[theme]]))
  }

  const fontStack = Object.fromEntries(fonts.map(font => [font.name, font.stack]))
  const typography = Object.fromEntries(
    TYPE_ROLES.map(role => {
      if (!fontStack[role.font]) throw new Error(`DESIGN.md: type role ${role.name} names --font-${role.font}, which src/styles/tailwind.css does not define.`)
      return [role.name, {
        fontFamily: firstFamily(fontStack[role.font]),
        fontSize: role.size,
        fontWeight: role.weight,
        lineHeight: role.lineHeight,
        ...(role.letterSpacing ? { letterSpacing: role.letterSpacing } : {}),
        ...(role.fontFeature ? { fontFeature: role.fontFeature } : {}),
      }]
    })
  )

  const spacing = Object.fromEntries(
    manifest.tokens.filter(token => token.layer === 'spacing').map(token => [token.name.replace(/^--spacing-/, ''), token.value])
  )

  const components = {}
  const covered = new Set()
  const pair = (name, roles, extra = {}) => {
    const themed = Object.values(roles).some(colour => !shared.has(colour))
    for (const theme of themed ? THEMES : [null]) {
      const props = Object.fromEntries(Object.entries(roles).map(([prop, colour]) => [prop, ref(colour, theme)]))
      components[theme ? `${name}-${theme}` : name] = { ...props, ...extra }
    }
    for (const colour of Object.values(roles)) covered.add(colour)
  }
  // The named recipes first: their colours are then covered and the loop below skips them.
  const control = { height: manifest.tokens.find(token => token.name === '--component-control-height-md')?.value ?? '40px' }
  pair('page', { backgroundColor: 'surface-base', textColor: 'text-primary' }, { typography: '{typography.body-md}' })
  pair('input', { backgroundColor: 'surface-sunken', textColor: 'text-primary' }, { typography: '{typography.body-md}', ...control })
  pair('input-placeholder', { backgroundColor: 'surface-sunken', textColor: 'text-placeholder' })
  pair('card', { backgroundColor: 'surface-raised' }, { padding: '{spacing.6}' })
  const button = { typography: '{typography.button-md}', rounded: '{rounded.none}', ...control, padding: '20px' }
  pair('button-primary', { backgroundColor: 'accent-signal-fill', textColor: 'accent-signal-ink' }, button)
  pair('button-danger', { backgroundColor: 'accent-hostile-fill', textColor: 'accent-hostile-ink' }, button)
  for (const token of colours) {
    const name = key(token)
    if (covered.has(name)) continue
    const fill = name.match(/^(.+)-fill$/)?.[1]
    if (fill && known.has(`${fill}-ink`)) pair(`${fill}-solid`, { backgroundColor: name, textColor: `${fill}-ink` })
    else if (known.has(`${name}-ink`)) pair(`${name}-solid`, { backgroundColor: name, textColor: `${name}-ink` })
    else if (/-ink$/.test(name)) continue // covered with its fill, or reported below
    else if (/^border-|^ai-border$/.test(name)) pair(name, { backgroundColor: name }, { width: '1px' })
    else if (/^focus-ring$|^chart-series-\d$/.test(name)) pair(name, { backgroundColor: name }, { width: '2px' })
    else if (/^surface-|-wash$|-glow$/.test(name)) pair(name, { backgroundColor: name })
    // Decorative, and banded below text contrast on purpose: no background to be checked against.
    else if (name === 'numeral-pad') pair(name, { textColor: name })
    else pair(name, { backgroundColor: 'surface-base', textColor: name })
  }
  const missing = [...known].filter(name => !covered.has(name))
  if (missing.length) throw new Error(`DESIGN.md: no component pair for ${missing.map(name => `--color-${name}`).join(', ')}. Add a rule in designTokens().`)

  return { colors, typography, rounded: { none: '0px' }, spacing, components }
}

/** The front matter block, `---` to `---`. Groups are block maps; a typography role or a
 *  component is one flow map per line, so the block stays short enough to read. */
function designFrontMatter(tokens, { name, description }) {
  const lines = ['---', `version: ${DESIGN_MD_SPEC}`, `name: ${yamlValue(name)}`, `description: ${yamlValue(description)}`]
  const block = (map, indent) => {
    for (const [key, value] of Object.entries(map)) {
      if (value && typeof value === 'object' && THEMES.includes(key)) {
        lines.push(`${indent}${yamlKey(key)}:`)
        block(value, `${indent}  `)
      } else lines.push(`${indent}${yamlKey(key)}: ${typeof value === 'object' ? yamlFlow(value) : yamlValue(value)}`)
    }
  }
  for (const group of ['colors', 'typography', 'rounded', 'spacing', 'components']) {
    lines.push(`${group}:`)
    block(tokens[group], '  ')
  }
  lines.push('---')
  return lines
}

/** A rule paragraph from AGENTS.md whole, by its bold title (`Assistant copy`), on one line. */
function ruleParagraph(rules, title) {
  const block = rules.split(/\n\s*\n/).find(text => text.startsWith(`**${title}.**`))
  if (!block) throw new Error(`DESIGN.md: AGENTS.md has no rule titled "${title}".`)
  return block.replace(/\s*\n\s*/g, ' ').trim()
}

/** DESIGN.md: the whole system in one file, in the DESIGN.md format (see DESIGN_MD_SPEC). The
 *  YAML front matter holds the tokens; the body is the spec's sections in the spec's order, then
 *  one line per component, linking its page rather than inlining it. `fonts` is
 *  `[{ name, stack }]` from the `--font-*` theme variables in src/styles/tailwind.css. */
export function designFile(entries, manifest, { fonts, rules }) {
  const tokens = designTokens(manifest, { fonts })
  const uses = layer => manifest.tokens.filter(token => token.layer === layer)
  const useTable = list => ['| Token | Use |', '|---|---|', ...list.map(token => `| ${code(token.name)} | ${cell(token.use)} |`), '']
  const valueTable = list => [
    '| Token | Use | Value |',
    '|---|---|---|',
    ...list.map(token => `| ${code(token.name)} | ${cell(token.use)} | ${code(token.value)} |`),
    '',
  ]
  const skipped = uses('semantic').filter(token => DESIGN_YAML_SKIP.test(token.name.replace(/^--color-/, '')))
  const heights = ['sm', 'md', 'lg'].map(size => manifest.tokens.find(token => token.name === `--component-control-height-${size}`)?.value)
  const out = [
    ...designFrontMatter(tokens, {
      name: 'Division DS',
      description: `A two-theme React 19, Tailwind 4 and Radix design system: ${entries.length} components, tokens in three layers, WCAG 2.2 AA, dark by default.`,
    }),
    '',
    '# Division DS',
    '',
    `> A React 19, Tailwind 4 and Radix design system: ${entries.length} components, design tokens in three layers, light and dark themes, WCAG 2.2 AA. This file is the system in one page, in the DESIGN.md format (spec version ${DESIGN_MD_SPEC}); each component links its full page with props and examples.`,
    '',
    'Links are relative to this file. Generated by `npm run agent-docs` from the token files and the component metadata: never edit it by hand.',
    '',
    '## Overview',
    '',
    'A precise, dark-first interface language built as an accessible product system: one signal orange on smoked dark greys, hairline panels with crosshair marks at the corners, cut corners, and numerals as heroes. There are two themes, set by `data-theme="dark"` or `"light"` on `<html>`; dark is the default. In the repository, build gates check that every colour comes from a token and that every pair the components paint meets WCAG 2.2 AA in both themes.',
    '',
    'The front matter holds the tokens. In code, write a token as its CSS variable inside a Tailwind arbitrary value, never as its value: `colors.dark.text-primary` and `colors.light.text-primary` are both `var(--color-text-primary)`, which switches with the theme. Colours at the top of `colors` are the same in both themes. `primary` is `--color-accent-signal-fill`.',
    '',
    '## Colors',
    '',
    manifest.rule,
    '',
    'Write a colour as `bg-[var(--color-surface-base)]` or `text-[var(--color-text-primary)]`. Use only the names below.',
    '',
    ...useTable(uses('semantic').filter(token => !skipped.includes(token))),
    `The ${skipped.length} \`--color-terminal-*\` tokens are the ANSI colours inside the Terminal component, which applies them itself; they are not in the front matter. They and the component tokens are listed with their values in [llms-tokens.txt](llms-tokens.txt).`,
    '',
    '## Typography',
    '',
    'Three typefaces, all under the SIL Open Font License: Oxanium for display (headings, figures, button labels), Saira for body text, JetBrains Mono for labels, code and data.',
    '',
    ...fonts.map(font => `- ${code(`font-${font.name}`)}: ${code(font.stack)}`),
    '',
    'The roles in the front matter, as the components set them:',
    '',
    '| Role | Face | Size | Use |',
    '|---|---|---|---|',
    ...TYPE_ROLES.map(role => `| ${code(role.name)} | ${code(`font-${role.font}`)} ${role.weight} | ${role.size} | ${cell(role.use)} |`),
    '',
    'The format has no text case: `headline-md`, `label-md` and `button-md` are set in uppercase. Secondary text is 14px or larger; 11 to 12px is for uppercase mono labels only.',
    '',
    '## Layout',
    '',
    'A 4px grid. Tailwind\'s own spacing utilities sit on the same grid (`gap-3` is 12px, `p-4` is 16px) and are fine to use.',
    '',
    ...useTable(uses('spacing')),
    `A page shell sets \`--page-gutter\` once (16px, and 64px from the large breakpoint), and everything inside reads it through \`px-gutter\` or \`mx-gutter\`, so a brand, a heading and a grid start on one edge. Controls come in three heights: ${heights.join(', ')} (\`--component-control-height-sm\`, \`-md\`, \`-lg\`); the middle one is the default.`,
    '',
    '## Elevation & Depth',
    '',
    'Depth comes from tone and line, not from shadow. The page is `surface.base`. A control you type or pick in is the darker, opaque `surface.sunken`. A Card or Panel is the translucent `surface.raised` behind a hairline border; a Panel adds a 6px backdrop blur. The surfaces that frame other content (Panel, Card, Dialog, DropdownMenu, CommandPalette and Select\'s listbox) carry crosshair marks at their corners. A Dialog, Sheet or CommandPalette dims the page behind it with `surface.scrim`. An interactive Card answers hover and keyboard focus with a signal border and a 4px lift, and no shadow. The one cast shadow is the static tilted glass of a hero section.',
    '',
    '## Shapes',
    '',
    'Corners are square (`rounded.none`). The cut corner is the shape of a single object: Button, IconButton, Avatar (md and lg), the Tooltip panel and Tag have their bottom-right corner cut off, at 5, 8, 14 or 22px (`.bevel-xs` to `.bevel-lg`). The crosshair is the frame around several objects. A form control gets neither, because `clip-path` would clip the focus ring it draws. Spinner is the one round shape. A theme can set `--shape-bevel` (0 removes every cut) and `--shape-radius` (surfaces stop at 24px).',
    '',
    '## Motion',
    '',
    'The components animate themselves; these tokens are for anything you animate yourself. Anything you animate stops under `prefers-reduced-motion`, and nothing moves on its own. The tokens are listed here and not in the front matter because the published DESIGN.md linter (`@google/design.md` 0.4.0) does not read a motion group yet.',
    '',
    ...valueTable(uses('motion')),
    '## Voice & Content Strategy',
    '',
    `- ${ruleParagraph(rules, 'Assistant copy')}`,
    `- ${ruleParagraph(rules, 'Status tones')}`,
    `- ${ruleParagraph(rules, 'Feedback')}`,
    '',
    '## Components',
    '',
    'The front matter\'s `components` are the colour pairs the system paints, one per pair and theme (`-dark`, `-light`; no suffix when the pair is the same in both themes). Text sits on `surface-base` and every text pair passes WCAG AA, which the DESIGN.md linter checks. An entry with a `backgroundColor` and a width is a line or an outline (a border, the focus ring, a chart series), because the format has no border property. An entry with a `backgroundColor` alone is a translucent layer; the repository\'s own contrast gate measures it over the surface below. `numeral-pad` is decorative and kept dim on purpose. Build screens from the components below, not from the pairs.',
    '',
  ]
  for (const [tier, group] of byTier(entries)) {
    out.push(`### ${tier[0].toUpperCase()}${tier.slice(1)}`, '')
    for (const entry of group) {
      const also = alsoExports(entry)
      out.push(`- [${entry.name}](${entry.docs.replace(/^\//, '')}): ${firstSentence(entry.summary)}${also.length ? ` Also: ${also.join(', ')}.` : ''}`)
    }
    out.push('')
  }
  out.push("## Do's and Don'ts", '', 'In full: [llms-guidelines.txt](llms-guidelines.txt).', '', ...ruleHeadlines(rules).map(line => `- ${line}`), '')
  return out.join('\n')
}

/** The shared helpers under src/lib, one section per file: exported types whole, functions as
 *  signatures, each with its doc comment. `helpers` is `[{ from, api }]`. */
export function helpersPage(helpers) {
  const out = [
    '# Division DS: helpers',
    '',
    '> The functions and types under `src/lib` that components and screens share. Read from the source: types are whole, functions are signatures. Import each from its own file.',
    '',
  ]
  for (const { from, api } of helpers) {
    if (api.length === 0) continue
    const values = api.filter(item => item.kind !== 'type').map(item => item.name)
    const types = api.filter(item => item.kind === 'type').map(item => item.name)
    const lines = [
      ...(values.length ? [`import { ${values.join(', ')} } from '${from}'`] : []),
      ...(types.length ? [`import type { ${types.join(', ')} } from '${from}'`] : []),
    ]
    out.push(`## ${from}`, '', fence(lines.join('\n')), '')
    for (const item of api) out.push(fence(item.code, 'ts'), '')
  }
  return out.join('\n')
}

/** The rules block of AGENTS.md as written, topic markers included. */
function rulesBlock(agentsMd) {
  const match = agentsMd.replace(/\r\n/g, '\n').match(/<!-- rules:start -->\n([\s\S]*?)\n<!-- rules:end -->/)
  if (!match) throw new Error('AGENTS.md has no <!-- rules:start --> ... <!-- rules:end --> section.')
  return match[1].trim()
}

/** A `<!-- topic: forms -->` line inside the rules block. It says which skill topic file the rules
 *  under it belong to, until the next marker. It is for the generator only: no output shows it. */
const TOPIC_MARKER = /^<!-- topic: ([a-z-]+) -->$/

/** The rules section of AGENTS.md, between its markers, with the topic markers taken out. Every
 *  file that carries the rules whole (llms-guidelines.txt, the rules installer's block) reads this. */
export function extractRules(agentsMd) {
  return rulesBlock(agentsMd)
    .split('\n')
    .filter(line => !TOPIC_MARKER.test(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
}

/**
 * The skill's topics. `core` is not a file: it is the rules SKILL.md carries itself.
 *
 * What goes in core, and why: only the rules that apply to every screen whatever it holds, so the
 * one file an agent always loads stays short. That is imports, colour basics (a token, never a
 * literal), the providers every screen assumes, the focus ring, the page title and the empty and
 * loading states every screen plans (the `build` command starts there), what the system does not
 * have (it decides the first component choice), and vocabulary (it applies to any copy written in
 * this repository). Everything that only matters once a screen has a form, an overlay, an accent,
 * a status, a layout decision or an animation is a topic, loaded when the work reaches it.
 */
export const SKILL_TOPICS = {
  colour: { title: 'Colour roles', when: 'choosing an accent, the text on a fill, or a status colour' },
  layout: { title: 'Layout and type', when: 'laying out a page: the shell, background, width, type sizes, cards, links' },
  forms: { title: 'Forms and actions', when: 'a screen has a field, a form or more than one button' },
  overlays: { title: 'Overlays', when: 'adding a Dialog, an AlertDialog or a Sheet' },
  feedback: { title: 'Feedback', when: 'a screen reports a result or a wait: a toast, an alert, progress, a spinner' },
  motion: { title: 'Motion', when: 'animating anything yourself' },
  ai: { title: 'Assistant copy', when: 'wording a chat' },
}

/**
 * The rules split by their topic markers: `{ intro, core, topics: { colour, forms, ... } }`, each a
 * markdown string. Fails when a rule sits before the first marker, a marker names a topic that is
 * not in SKILL_TOPICS, or a topic has no rules, so every rule lands in exactly one file.
 */
export function rulesByTopic(agentsMd) {
  const intro = []
  const groups = {}
  let topic = null
  for (const block of rulesBlock(agentsMd).split(/\n\s*\n/)) {
    const marker = block.trim().match(TOPIC_MARKER)
    if (marker) {
      topic = marker[1]
      if (topic !== 'core' && !(topic in SKILL_TOPICS)) throw new Error(`AGENTS.md: unknown rules topic "${topic}".`)
      groups[topic] ??= []
    } else if (topic) groups[topic].push(block)
    else if (block.startsWith('**')) throw new Error(`AGENTS.md: a rule before the first <!-- topic: ... --> marker: ${block.slice(0, 40)}`)
    else intro.push(block)
  }
  for (const name of ['core', ...Object.keys(SKILL_TOPICS)]) {
    if (!groups[name]?.length) throw new Error(`AGENTS.md: no rules under <!-- topic: ${name} -->.`)
  }
  const { core, ...topics } = Object.fromEntries(Object.entries(groups).map(([name, blocks]) => [name, blocks.join('\n\n')]))
  return { intro: intro.join('\n\n'), core, topics }
}

export function guidelinesFile(rules) {
  return [
    '# Division DS: rules',
    '',
    '> What to know before writing a screen with Division DS. Generated from the Rules section of AGENTS.md.',
    '',
    rules.replace(/^## Rules\n+/, ''),
    '',
  ].join('\n')
}

const GENERATED = 'Generated from AGENTS.md by `npm run agent-docs`. Edit the rules there, not here.'

const CHECK_COMMANDS = [
  '- In a project that uses the components: `npx division-ds check <files or dirs>` (the checker is on npm; Node 22 or newer). It flags a raw colour, an invented token, touching buttons, an unknown prop and a value outside a prop\'s union.',
  '- In the Division DS repository itself: `npm run verify` (type-check, every gate, the unit tests).',
]

/** The commands: procedures an agent runs, one file each, loaded by name. */
const SKILL_COMMANDS = {
  build: {
    when: 'building a new screen or page. Plans the regions and their states before any code',
    body: [
      'Plan before code. The states a screen gets wrong are the ones nobody planned: an empty list',
      'with no message, a load that fails into a blank panel, a button that is disabled with no reason.',
      '',
      '1. **Regions.** List the screen top to bottom: the page header, each block of content (a table,',
      '   a form, a row of stats, a list), then anything that opens on top (a dialog, a sheet).',
      '2. **States.** Under each region, write one line per state, even when the answer is "none":',
      '   - **empty**: nothing yet, or a filter emptied it;',
      '   - **loading**: the first load, and a refresh;',
      '   - **error**: the load failed, or a save was rejected;',
      '   - **success**: the content, and what confirms an action;',
      '   - **disabled or no permission**: what someone who cannot act sees, and the reason they are told.',
      '3. **Components.** Pick one component per region and state from `public/llms.txt`. Each line there',
      '   has "Best for" and "Not for"; when "Not for" names your case, take the component it names.',
      '   The usual picks: page title `PageHeader`; empty `EmptyState`; loading `Skeleton` shapes in a',
      '   `SkeletonGroup`; failed load `Alert` in the `hostile` tone with a retry; a done action `Toast`;',
      '   a destructive confirm `AlertDialog`.',
      '4. **Read.** Open `public/docs/components/<slug>.md` for every component in the plan (Requires,',
      '   props, examples, Common mistakes). Load the topic files the plan touches: a field means',
      '   `topics/forms.md`, an overlay `topics/overlays.md`, a status colour `topics/colour.md`.',
      '5. **Write.** Each component imported from its own file; every colour a token from',
      '   `public/llms-tokens.txt`.',
      '6. **Check.** Run the check below and fix every finding (`commands/fix.md`), then go through',
      '   `commands/review.md`.',
      '',
      'A plan looks like this:',
      '',
      '```',
      'PageHeader: "Orders", action "New order"',
      'Region: orders table (DataTable, Pagination below)',
      '  empty:      EmptyState "No orders yet", action "Browse replicas", as emptyMessage',
      '  loading:    SkeletonGroup "Loading orders", one Skeleton line per row',
      '  error:      Alert hostile "Orders did not load", Retry button',
      '  success:    rows; a bulk action confirms with a Toast',
      '  no access:  the "New order" button is absent, a sentence says who can create orders',
      '```',
      '',
      '## Check',
      '',
      ...CHECK_COMMANDS,
    ],
  },
  add: {
    when: 'adding one component to a screen that already exists',
    body: [
      '1. Find it in `public/llms.txt`. Its "Best for" should describe your case and its "Not for"',
      '   should not; if "Not for" names your case, use the component it names instead.',
      '2. Open `public/docs/components/<slug>.md` and read, in order: **Requires** (a provider, a',
      '   wrapper such as `FormField`, a landmark), **Props**, **Examples**, **Common mistakes** and',
      '   **Don\'t**.',
      '3. Take the import from the page\'s Import block and rewrite it as a relative path from your',
      '   file. Import a type with `import type`.',
      '4. Start from the closest example on the page and change only the content. Keep what it sets',
      '   for access: `label`, `id`, `aria-*`, the heading level.',
      '5. Supply what Requires names: a field inside a `FormField`; `Switch`, `Checkbox` and `Radio`',
      '   with an `id` and a `<label htmlFor>`; a button beside another inside a parent with a gap.',
      '6. Add the states it brings with it: why a control is disabled, what a list shows when empty,',
      '   a button\'s `loading`.',
      '7. Run the check below on the file.',
      '',
      '## Check',
      '',
      ...CHECK_COMMANDS,
    ],
  },
  fix: {
    when: 'a gate, `division-ds check` or a test has failed and named a rule. What each message means and the fix',
    body: [
      'Every finding prints `path:line [rule] what was found` and a line saying what to write instead.',
      'Do what that line says. Never silence a gate: no new EXEMPT entry, no `token-discipline: allow`',
      'comment and no ALLOWED_IDIOMS entry to get past one.',
      '',
      '| Message | Fix |',
      '|---|---|',
      '| `[raw-colour]` a hex, `rgb()` or `hsl()` | Replace it with a semantic token by intent, `text-[var(--color-text-primary)]`. Pick from `public/llms-tokens.txt`. |',
      '| `[palette-class]` `bg-red-500`, `text-white` | Same: an arbitrary value on a token, `bg-[var(--color-surface-raised)]`. |',
      '| `[unknown-token]` | The name is not a token. Take the "Did you mean" suggestion, or look it up in `public/llms-tokens.txt`. Never define it yourself. |',
      '| `[primitive-in-component]` | A ramp step (`--color-signal-500`). Use the semantic token for what it does: `accent.<state>.text`, `.fill` or `.ink`. |',
      '| `touching-buttons`, "Button-spacing gate FAILED" | Wrap the buttons in one parent with a gap (`flex flex-wrap items-center gap-3`) and move any margin onto it. `DialogFooter` and `CardFooter` already are one. |',
      '| `[unknown-prop]` "has no prop" | The prop does not exist. Open the page the message names and use a prop from its table. |',
      '| `[unknown-prop]` "types X away on purpose" | The component sets that attribute itself. Use the prop it names (`label` for a name, `invalid` for an error state). |',
      '| `[invalid-value]` | The value is not in the prop\'s union. The message lists the allowed values. |',
      '| `[ai-in-cta]` | A button says "AI". Name what it does instead: "Summarize", "Draft a reply". |',
      '| `[assistant-copy]` | An assistant component\'s label says "answer", "please" or "!". Write "response", drop "please", drop the exclamation point. |',
      '| "Vocabulary gate FAILED" (this repository only) | Reword the line. If it is an ordinary idiom, ask before adding it to ALLOWED_IDIOMS. |',
      '| "Agent docs are stale" (this repository only) | Run `npm run agent-docs`, then `npm run verify`. |',
      '| A props-table test fails in `meta.test.ts` (this repository only) | The `<Name>.meta.ts` table and the real props disagree. Change the table to match the code, both ways. |',
      '| A type error on a component prop | Read the prop\'s type on its page; for a link that is disabled or busy, render the state directly instead of fighting the type. |',
      '',
      'After the fix, run the same command again until it passes.',
    ],
  },
  review: {
    when: 'a screen is written and you are about to say it is done. The checklist to run over it',
    body: [
      'Go through every line. A line that does not hold is a change to make, not a note to leave.',
      '',
      '- [ ] **States.** Every region has its empty, loading, error, success and disabled or no-permission state, as planned before the code (the regions-and-states plan of `commands/build.md`). An empty list says what is empty and offers the action that fills it.',
      '- [ ] **Headings.** One `PageHeader`, so one `h1`. Section headings continue the outline: `h2` under the `h1`, `h3` inside an `h2`, no level skipped. `SectionHeading` is given the level.',
      '- [ ] **Tokens only.** No hex, `rgb()`, palette class or invented token name. `division-ds check` passes.',
      '- [ ] **Buttons.** Two or more side by side share a parent with a gap. One primary button per view. A busy button takes `loading`; a disabled one says why nearby. Icon-only actions are `IconButton` with a `label`.',
      '- [ ] **Forms.** Every `Input`, `Textarea`, `Select`, `MultiSelect` and `QuantityStepper` is inside a `FormField`; `Switch`, `Checkbox` and `Radio` have an `id` and a `<label htmlFor>`. A failed submit shows `ErrorSummary` and focuses it.',
      '- [ ] **Status.** Every status has a word, not only a colour.',
      '- [ ] **Focus.** Everything interactive is reached by Tab in reading order and shows the focus ring; anything styled by hand has the `focus-visible:outline-*` classes. An overlay hands focus back to what opened it. A button that removes its own row or item (Acknowledge, Delete, Dismiss) moves focus to the next one, else the previous one, else the empty state; focus never drops to the page.',
      '- [ ] **Text size.** Secondary text is 14px or larger; 11 to 12px only for uppercase mono labels.',
      '- [ ] **320px.** At 320px wide nothing scrolls sideways (`document.documentElement.scrollWidth <= 320`) and button rows wrap.',
      '- [ ] **Both themes.** It reads in dark and in light (`data-theme="light"` on `<html>`).',
      '- [ ] **Motion.** Anything animated by hand stops under reduced motion; nothing moves on its own.',
      '- [ ] **Live data.** Values that update on their own change in place, with no announcement for each number; a change of status (good to unhealthy) is announced once, through one polite live region (`role="status"`). Charts animate only their first draw, so new data every few seconds is fine.',
      '',
      '## Check',
      '',
      ...CHECK_COMMANDS,
    ],
  },
}

/**
 * The skill an agent installs, as files under `skills/division-ds/` keyed by their path inside it:
 * `SKILL.md` (the core, always loaded), `topics/<name>.md` (the rest of the rules, by subject) and
 * `commands/<name>.md` (procedures). The split is what keeps the always-loaded part short: an agent
 * reads the core every time and a topic only when the work reaches it. `split` is `rulesByTopic`.
 */
export function skillFiles(split, componentCount) {
  const files = {}
  files['SKILL.md'] = [
    '---',
    'name: division-ds',
    `description: Use when building or changing UI with Division DS (React 19, Tailwind 4, Radix; ${componentCount} components). Covers which component and token to use, the composition rules prop types cannot express (providers, FormField, button gaps, card borders), planning a screen's states, and how to check the result. Load it before writing any screen or component in a project that has Division DS components.`,
    '---',
    '',
    '# Division DS',
    '',
    GENERATED,
    '',
    'This file is the core: what every screen needs. The topic and command files below hold the rest; load one when the work reaches it, not before.',
    '',
    '## Plan first',
    '',
    'Before writing a screen, list its regions and, for each, its states: empty, loading, error, success, and disabled or no permission. Pick a component for each from `public/llms.txt` by its "Best for" and "Not for". `commands/build.md` is the whole procedure.',
    '',
    '## Where things are',
    '',
    '| You want | Read |',
    '|---|---|',
    '| Every component, one line each with best for and not for | `public/llms.txt` |',
    '| One component: props, examples, keyboard, mistakes | `public/docs/components/<slug>.md` |',
    '| Which token to use for what | `public/llms-tokens.txt` |',
    '| Shared helpers: form errors, money, links, theme, streamed text | `public/docs/helpers.md` |',
    '| The same as data | `public/manifest/components.json`, `public/manifest/tokens.json` |',
    '',
    `Outside this repository, read the same files online: \`${DOCS_SITE}llms.txt\`, \`${DOCS_SITE}docs/components/<slug>.md\`, and so on. Add a component to a project with \`npx shadcn@latest add ${REGISTRY}/<slug>.json\`, or every component with \`division-ds-all\` as the slug. The setup steps, in plain text: \`${DOCS_SITE}install.md\`.`,
    '',
    '## Check your work',
    '',
    ...CHECK_COMMANDS,
    '',
    'A finding says what to write instead. `commands/fix.md` explains each one.',
    '',
    '## Topics: load when',
    '',
    ...Object.entries(SKILL_TOPICS).map(([name, topic]) => `- \`topics/${name}.md\`: ${topic.when}.`),
    '',
    '## Commands: load when',
    '',
    ...Object.entries(SKILL_COMMANDS).map(([name, command]) => `- \`commands/${name}.md\`: ${command.when}.`),
    '',
    '## Core rules',
    '',
    split.intro.replace(/^## Rules\n*/, '').trim(),
    '',
    split.core,
    '',
  ].join('\n')
  for (const [name, topic] of Object.entries(SKILL_TOPICS)) {
    files[`topics/${name}.md`] = [
      `# Division DS: ${topic.title.toLowerCase()}`,
      '',
      `> Load when ${topic.when}. ${GENERATED}`,
      '',
      split.topics[name],
      '',
    ].join('\n')
  }
  for (const [name, command] of Object.entries(SKILL_COMMANDS)) {
    files[`commands/${name}.md`] = [
      `# Division DS: ${name}`,
      '',
      `> Load when ${command.when}. Generated by \`npm run agent-docs\`; the procedure lives in scripts/lib/agent-docs.mjs.`,
      '',
      // A project that installed the components has no public/ folder of ours (the 2026-10-20
      // outside test followed these steps to files that did not exist).
      `Paths starting \`public/\` are in the Division DS repository. In a project that uses the components, read them online: \`public/llms.txt\` is \`${DOCS_SITE}llms.txt\`, and so on. The other procedures named here (\`commands/build.md\` and the rest) are in the skill: \`${SKILL_SOURCE}commands/<name>.md\`, or \`npx division-ds skill\` to install them.`,
      '',
      ...command.body,
      '',
    ].join('\n')
  }
  return files
}
