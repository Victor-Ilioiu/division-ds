// The tools `division-ds mcp` serves, as plain functions over the two manifests. The protocol
// (JSON-RPC over stdio) lives in mcp-server.mjs; nothing here knows it exists, so every tool is
// unit-tested by calling it.
//
// Most design-system MCP servers stop at list / search / get docs (shadcn, Chakra, Dialtone,
// Blade, Vibe; surveyed 2026-10-25). `validate_code` is the one they lack: it runs the same gates
// as `division-ds check` on the code the agent has just written, before the agent says it is done.
import { alsoExports, INSTALLED_PATHS } from './agent-docs.mjs'
import { checkText } from './check-text.mjs'
import { contrastRatio } from './contrast.mjs'
import { buildIndex, closest } from './props-validator.mjs'

export const REGISTRY_BASE = 'https://raw.githubusercontent.com/Victor-Ilioiu/division-ds/main/public/r'
const TIERS = ['atoms', 'molecules', 'organisms']
const LAYERS = ['primitive', 'spacing', 'motion', 'semantic', 'component']
// WCAG 2.2 minimums: SC 1.4.3 for text, SC 1.4.11 for the boundary of a control or a graphic.
const MINIMUMS = { normal: 4.5, large: 3, ui: 3 }

const words = text => String(text).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)

/** `context`: { manifest, tokens, version, readDoc(slug) -> string|undefined, readChecklist() -> string|undefined } */
export function createTools(context) {
  const { manifest, tokens, version } = context
  const components = manifest.components
  const index = buildIndex(manifest)
  const tokenNames = tokens.tokens.map(token => token.name)
  const tokenByName = new Map(tokens.tokens.map(token => [token.name, token]))
  // Every reply says which data it came from, because the agent's project may have installed an
  // older copy of the components than the manifest this server reads (Dialtone does the same).
  const stamp = `\n\n(division-ds ${version}; data: ${components.length} components, ${tokenNames.length} tokens. It describes the current release; a project that installed the components earlier may differ.)`

  function findComponent(name) {
    const wanted = String(name ?? '').trim().toLowerCase()
    return (
      components.find(c => c.name.toLowerCase() === wanted || c.slug === wanted) ??
      // A component documented on another's page (ResponseFeedback on ChatMessage's) opens that page.
      components.find(c => alsoExports(c).some(other => other.toLowerCase() === wanted))
    )
  }

  function unknownComponent(name) {
    const guess = closest(String(name), components.map(c => c.name))
    throw new ToolError(`No component "${name}".${guess ? ` Did you mean ${guess}?` : ''} list_components gives every name.`)
  }

  /** A token's value in one theme, following var() references down to a colour. */
  function tokenValue(name, theme, seen = new Set()) {
    if (seen.has(name)) throw new ToolError(`Token ${name} refers to itself.`)
    seen.add(name)
    const token = tokenByName.get(name)
    if (!token) {
      const guess = closest(name, tokenNames)
      throw new ToolError(`No token ${name}.${guess ? ` Did you mean ${guess}?` : ''} get_tokens lists them.`)
    }
    const value = typeof token.value === 'object' ? token.value[theme] : token.value
    const ref = /^var\((--[a-z0-9-]+)\)$/.exec(value)
    return ref ? tokenValue(ref[1], theme, seen) : value
  }

  const colour = (input, theme) => (String(input).startsWith('--') ? tokenValue(String(input), theme) : String(input))

  const tools = [
    {
      name: 'list_components',
      description: 'Every Division DS component with its tier and one line on when to use it. Start here to pick a component; then call get_component for its props and examples.',
      inputSchema: {
        type: 'object',
        properties: { tier: { type: 'string', enum: TIERS, description: 'Only this tier.' } },
        additionalProperties: false,
      },
      run({ tier } = {}) {
        if (tier !== undefined && !TIERS.includes(tier)) throw new ToolError(`tier is one of ${TIERS.join(', ')}.`)
        const rows = components.filter(c => !tier || c.tier === tier)
        return rows
          .map(c => {
            const also = alsoExports(c)
            return `- ${c.name} (${c.tier}): ${c.useWhen}${c.notFor ? ` Not for: ${c.notFor}` : ''}${also.length ? ` Also on its page: ${also.join(', ')}.` : ''}`
          })
          .join('\n')
      },
    },
    {
      name: 'get_component',
      description: 'One component: import path, props with types and defaults, keyboard behaviour, do and don\'t, and working examples. Read it before writing the component, so props and values are real.',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Component name or slug, e.g. "Button" or "icon-button".' },
          section: { type: 'string', enum: ['all', 'props'], description: '"props" returns only the import and the prop table. Default "all".' },
        },
        required: ['name'],
        additionalProperties: false,
      },
      run({ name, section = 'all' }) {
        const c = findComponent(name) ?? unknownComponent(name)
        const imports = c.imports.map(i => `import { ${i.names.join(', ')} } from '${i.from}'`).join('\n')
        const props = c.props.map(p => `- ${p.name}: ${p.type}${p.default ? ` = ${p.default}` : ''}. ${p.description ?? ''}`.trimEnd()).join('\n')
        const head = `# ${c.name} (${c.tier})\n\n${c.summary}\n\n${imports}\n\n${INSTALLED_PATHS}\n\n## Props\n\n${props}`
        if (section === 'props') return head
        const page = context.readDoc?.(c.slug)
        // The page is the full contract (examples, keyboard, do and don't, written for agents).
        // Without it, fall back to the same facts from the manifest.
        if (page) return page
        const list = (title, items) => (items?.length ? `\n\n## ${title}\n\n${items.map(item => `- ${item}`).join('\n')}` : '')
        const keyboard = (c.keyboard ?? []).map(k => `${k.keys.join(' + ')}: ${k.does}`)
        const examples = (c.examples ?? []).map(e => `### ${e.caption}\n\n\`\`\`tsx\n${e.source}\n\`\`\``).join('\n\n')
        return head + list('Keyboard', keyboard) + list('Do', c.dos) + list('Don\'t', c.donts) + (examples ? `\n\n## Examples\n\n${examples}` : '')
      },
    },
    {
      name: 'search',
      description: 'Find components and tokens by what they are for, e.g. "confirm delete", "page background", "loading". Returns exact names to pass to get_component or to use as var(--name).',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          limit: { type: 'integer', minimum: 1, maximum: 50, description: 'Default 10.' },
        },
        required: ['query'],
        additionalProperties: false,
      },
      run({ query, limit = 10 }) {
        const terms = words(query)
        if (terms.length === 0) throw new ToolError('query has no words to search for.')
        // `props` is the prop descriptions: a word found there counts once, as a hint, so a long
        // prop table does not outrank a component or token whose own summary is about the query.
        const score = (title, body, props = '', propNames = '') => {
          const t = words(title).join(' ')
          const b = words(body)
          const p = words(props)
          const n = words(propNames)
          const inMain = term => t.includes(term) || b.some(w => w.startsWith(term))
          // Every word of the query in the name or summary beats one word found often: "page
          // background" is the surface token, not PageHeader, whose name matches "page" alone.
          const all = terms.length > 1 && terms.every(inMain) ? 5 : 0
          return all + terms.reduce((sum, term) => sum + (t.includes(term) ? 3 : 0) + Math.min(b.filter(w => w.startsWith(term)).length, 3) + (inMain(term) ? 0 : n.some(w => w.startsWith(term)) ? 2 : p.some(w => w.startsWith(term)) ? 1 : 0), 0)
        }
        const hits = [
          // The title holds every name on the page (ChatMessage and ResponseFeedback); the body adds
          // the prop descriptions, where what a part does is written ("helpful", "thumbs up").
          ...components.map(c => {
            const also = alsoExports(c)
            const props = c.props.map(p => `${p.name} ${p.description ?? ''}`).join(' ')
            const line = `${c.useWhen}${also.length ? ` Also on its page: ${also.join(', ')}.` : ''}`
            return { kind: 'component', name: c.name, line, score: score(`${c.name} ${also.join(' ')}`, `${c.summary} ${c.useWhen}`, props, c.props.map(p => p.name).join(' ')) }
          }),
          // Primitives are not for screens (tokens.json's rule), so they never come up as an answer.
          ...tokens.tokens.filter(t => t.layer !== 'primitive').map(t => ({ kind: `${t.layer} token`, name: t.name, line: t.use ?? '', score: score(t.name, t.use ?? '') })),
        ]
          .filter(hit => hit.score > 0)
          .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
          .slice(0, limit)
        if (hits.length === 0) return `Nothing matches "${query}". Try a broader word, or list_components / get_tokens.`
        return hits.map(hit => `- ${hit.name} (${hit.kind}): ${hit.line}`).join('\n')
      },
    },
    {
      name: 'get_tokens',
      description: 'Design tokens with their values (light and dark for themed colours) and when to use each. Screens use semantic and component tokens only, as var(--name) inside a Tailwind arbitrary value: text-[var(--color-text-primary)].',
      inputSchema: {
        type: 'object',
        properties: {
          layer: { type: 'string', enum: LAYERS, description: 'Only this layer. Default: every layer except primitive.' },
          query: { type: 'string', description: 'Only tokens whose name or use contains this text.' },
        },
        additionalProperties: false,
      },
      run({ layer, query } = {}) {
        if (layer !== undefined && !LAYERS.includes(layer)) throw new ToolError(`layer is one of ${LAYERS.join(', ')}.`)
        const needle = query?.toLowerCase()
        const rows = tokens.tokens
          .filter(t => (layer ? t.layer === layer : t.layer !== 'primitive'))
          .filter(t => !needle || `${t.name} ${t.use ?? ''}`.toLowerCase().includes(needle))
        if (rows.length === 0) return 'No tokens match.'
        const value = v => (typeof v === 'object' ? `dark ${v.dark}, light ${v.light}` : v)
        return `${tokens.rule}\n\n${rows.map(t => `- ${t.name} (${t.layer}) = ${value(t.value)}${t.use ? `. ${t.use}` : ''}`).join('\n')}`
      },
    },
    {
      name: 'validate_code',
      description: 'Checks code you wrote with Division DS components, before you say it is done: raw colours, Tailwind palette classes, token names that do not exist, two buttons with no gap, unknown props, prop values outside their union, "AI" in a button label and "answer"/"please"/"!" in assistant component labels. Props are checked only on elements imported from Division DS paths. Each finding says what to write instead. Same gates as `npx division-ds check`.',
      inputSchema: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'The whole file, imports included: props are matched through the imports.' },
          filename: { type: 'string', description: 'Its name, e.g. "src/pages/Settings.tsx". The extension decides which gates run: a .css file gets the colour and token checks, and setting a real token (--color-surface-base: ...) is allowed there, since that is how a project themes the system. Default "Screen.tsx".' },
        },
        required: ['code'],
        additionalProperties: false,
      },
      run({ code, filename = 'Screen.tsx' }) {
        if (!/\.(tsx|jsx|ts|css)$/.test(filename)) throw new ToolError('filename ends in .tsx, .jsx, .ts or .css.')
        const findings = checkText(String(code), filename, index, tokenNames)
        if (findings.length === 0) {
          return `No findings in ${filename}: colours, tokens, button spacing, props and AI copy are clean.\nNot checked: how the screen behaves. Run get_review_checklist, in a browser.`
        }
        return `${findings.length} finding(s) in ${filename}. Fix each, then validate again.\n\n${findings.map(f => `- [${f.gate}] line ${f.line}: ${f.found}\n  Fix: ${f.fix}`).join('\n')}`
      },
    },
    {
      name: 'check_contrast',
      description: 'The WCAG 2.2 AA contrast of a foreground on a background, in both themes. Each colour is a token name (--color-text-secondary) or a colour (#a1a1aa, rgb()). Translucent colours are composited over --color-surface-base. Use it before pairing two tokens the system does not already pair.',
      inputSchema: {
        type: 'object',
        properties: {
          foreground: { type: 'string' },
          background: { type: 'string' },
          use: { type: 'string', enum: ['normal', 'large', 'ui'], description: 'normal text (4.5:1), large text (3:1: 24px, or 18.66px bold), or a control boundary / graphic (3:1). Default normal.' },
        },
        required: ['foreground', 'background'],
        additionalProperties: false,
      },
      run({ foreground, background, use = 'normal' }) {
        const min = MINIMUMS[use]
        if (min === undefined) throw new ToolError('use is one of normal, large, ui.')
        const lines = ['dark', 'light'].map(theme => {
          const fg = colour(foreground, theme)
          const bg = colour(background, theme)
          let ratio
          try {
            ratio = contrastRatio(fg, bg, tokenValue('--color-surface-base', theme))
          } catch (error) {
            throw new ToolError(error.message)
          }
          return `- ${theme}: ${ratio.toFixed(2)}:1 ${ratio >= min ? 'PASS' : 'FAIL'} (${fg} on ${bg})`
        })
        const failed = lines.some(line => line.includes('FAIL'))
        return `${foreground} on ${background}, ${use} (needs ${min}:1):\n${lines.join('\n')}${failed ? '\n\nPick another pair: search for a text or border token meant for this surface.' : ''}`
      },
    },
    {
      name: 'get_add_command',
      description: 'The shadcn command that installs components into a project, with their dependencies. Use when the project does not have the components yet.',
      inputSchema: {
        type: 'object',
        properties: {
          components: { type: 'array', items: { type: 'string' }, description: 'Names or slugs. Empty or "all" gives the command for every component.' },
        },
        additionalProperties: false,
      },
      run({ components: wanted = [] } = {}) {
        if (wanted.length === 0 || (wanted.length === 1 && wanted[0] === 'all')) {
          return `npx shadcn@latest add ${REGISTRY_BASE}/division-ds-all.json\n\nIt installs under src/division-ds/. Then mount one <Toaster> and one <TooltipProvider> at the root of the app.`
        }
        const urls = wanted.map(name => `${REGISTRY_BASE}/${(findComponent(name) ?? unknownComponent(name)).slug}.json`)
        return `npx shadcn@latest add ${urls.join(' ')}\n\nIt installs under src/division-ds/, with the components these depend on.`
      },
    },
    {
      name: 'get_review_checklist',
      description: 'The checklist to run over a screen before saying it is done: states, headings, focus, forms, 320px, both themes, motion. validate_code covers the code; this covers behaviour.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      run() {
        const checklist = context.readChecklist?.()
        if (!checklist) throw new ToolError('The review checklist is not in this package. Read it at https://github.com/Victor-Ilioiu/division-ds/blob/main/skills/division-ds/commands/review.md')
        return checklist
      },
    },
  ]

  return tools.map(tool => ({ ...tool, run: args => tool.run(args ?? {}) + stamp }))
}

/** A mistake in the agent's arguments: reported to it as a tool error it can act on, not as a
 *  protocol failure. */
export class ToolError extends Error {}
