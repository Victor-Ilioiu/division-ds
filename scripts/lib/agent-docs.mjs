// Renders the agent-readable outputs from component metadata. Pure functions: text in, text out.
// The runner (scripts/build-agent-docs.mjs) reads the repository and writes the files.

const TIER_NOUN = { atoms: 'Atom', molecules: 'Molecule', organisms: 'Organism' }

/** Where the docs site is hosted. The skill names it so an assistant outside this repository can
 *  still read the component pages; src/links.ts holds the same address for the site itself. */
export const DOCS_SITE = 'https://victor-ilioiu.vercel.app/systems/division-ds/'
/** Where shadcn downloads the components from: public/r/ in the public GitHub repository. */
export const REGISTRY = 'https://raw.githubusercontent.com/Victor-Ilioiu/division-ds/main/public/r'

/** A table cell: one line, with the pipes that would end the cell escaped. */
const cell = text => String(text ?? '').replace(/\s*\n\s*/g, ' ').replace(/\|/g, '\\|')
const code = text => '`' + String(text).replace(/\|/g, '\\|') + '`'
const fence = (source, language = 'tsx') => '```' + language + '\n' + source + '\n```'

/** `import { Card, CardBody } from 'src/components/molecules/card/Card'`, one line per file. */
export function importLines(entry) {
  return entry.imports.map(({ names, from }) => `import { ${names.join(', ')} } from '${from}'`).join('\n')
}

/** One component as a markdown page. `entry` is a manifest entry (see `manifestEntry`). */
export function componentMarkdown(entry) {
  const out = [`# ${entry.name}`, '', `> ${entry.summary}`, '']
  out.push(`- **Best for:** ${entry.useWhen}`, `- **Not for:** ${entry.notFor}`)
  out.push(`- ${TIER_NOUN[entry.tier]}. Source: \`${entry.source}\``)
  out.push(`- Rendered docs page: \`/components/${entry.slug}\``, '')

  out.push('## Import', '', fence(importLines(entry)), '')

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
export const indexLine = entry =>
  `- [${entry.name}](${entry.docs.replace(/^\//, '')}): ${firstSentence(entry.summary)} Best for: ${entry.useWhen} Not for: ${entry.notFor}`

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
    .map(block => block.match(/^\*\*[^*]+\*\*\s+.*?[.:](?=\s|$)/)?.[0] ?? block)
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
      '- [ ] **States.** Every region has its empty, loading, error, success and disabled or no-permission state, as planned in `commands/build.md`. An empty list says what is empty and offers the action that fills it.',
      '- [ ] **Headings.** One `PageHeader`, so one `h1`. Section headings continue the outline: `h2` under the `h1`, `h3` inside an `h2`, no level skipped. `SectionHeading` is given the level.',
      '- [ ] **Tokens only.** No hex, `rgb()`, palette class or invented token name. `division-ds check` passes.',
      '- [ ] **Buttons.** Two or more side by side share a parent with a gap. One primary button per view. A busy button takes `loading`; a disabled one says why nearby. Icon-only actions are `IconButton` with a `label`.',
      '- [ ] **Forms.** Every `Input`, `Textarea`, `Select`, `MultiSelect` and `QuantityStepper` is inside a `FormField`; `Switch`, `Checkbox` and `Radio` have an `id` and a `<label htmlFor>`. A failed submit shows `ErrorSummary` and focuses it.',
      '- [ ] **Status.** Every status has a word, not only a colour.',
      '- [ ] **Focus.** Everything interactive is reached by Tab in reading order and shows the focus ring; anything styled by hand has the `focus-visible:outline-*` classes. An overlay hands focus back to what opened it.',
      '- [ ] **Text size.** Secondary text is 14px or larger; 11 to 12px only for uppercase mono labels.',
      '- [ ] **320px.** At 320px wide nothing scrolls sideways (`document.documentElement.scrollWidth <= 320`) and button rows wrap.',
      '- [ ] **Both themes.** It reads in dark and in light (`data-theme="light"` on `<html>`).',
      '- [ ] **Motion.** Anything animated by hand stops under reduced motion; nothing moves on its own.',
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
      ...command.body,
      '',
    ].join('\n')
  }
  return files
}
