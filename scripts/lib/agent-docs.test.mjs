import { describe, expect, it } from 'vitest'
import {
  componentMarkdown,
  componentsBundle,
  extractRules,
  guidelinesFile,
  importLines,
  llmsIndex,
  manifestEntry,
  ruleHeadlines,
  rulesByTopic,
  SKILL_TOPICS,
  skillFiles,
  tokensBundle,
} from './agent-docs.mjs'

const meta = {
  name: 'Badge',
  title: 'Badge',
  tier: 'atoms',
  slug: 'badge',
  summary: 'A status chip. Six tones.',
  useWhen: 'Labelling a status with a word.',
  notFor: 'A removable filter: use Tag.',
  requires: ['A word inside it.'],
  pitfalls: [{ wrong: '<Badge />', right: '<Badge>Sale</Badge>', why: 'Colour alone is not a status.' }],
  anatomy: [{ part: 'Chip', description: 'Mono, uppercase.' }],
  props: [
    { name: 'tone', type: "'ok' | 'hostile'", default: "'ok'", description: 'The status.' },
    { name: 'dot', type: 'boolean', description: 'A marker\nbeside the text.' },
  ],
  keyboard: [],
  dos: ['Give it a word.'],
  donts: ['No colour-only badge.'],
}
const entry = manifestEntry(meta, {
  imports: [{ names: ['Badge'], from: 'src/components/atoms/badge/Badge' }],
  examples: [{ caption: 'Tones', source: '<Badge tone="ok">Nominal</Badge>' }],
  source: 'src/components/atoms/badge/Badge.tsx',
})
const RULES = '## Rules\n\nIntro line.\n\n**Imports.** Import from the file. Not the barrel.\n\n**Colour.** Tokens only:\n`var(--x)`.'

describe('manifestEntry', () => {
  it('adds what was read from the code and where the page is', () => {
    expect(entry).toMatchObject({ docs: '/docs/components/badge.md', source: 'src/components/atoms/badge/Badge.tsx' })
    expect(entry.examples).toHaveLength(1)
  })

  it('leaves out optional fields a component does not have', () => {
    const bare = manifestEntry({ ...meta, requires: undefined, pitfalls: undefined }, { imports: [], examples: [], source: '' })
    expect(bare).not.toHaveProperty('requires')
    expect(bare).not.toHaveProperty('pitfalls')
  })
})

describe('componentMarkdown', () => {
  const page = componentMarkdown(entry)

  it('opens with the name, the summary, then best for and not for', () => {
    expect(
      page.startsWith(
        '# Badge\n\n> A status chip. Six tones.\n\n- **Best for:** Labelling a status with a word.\n- **Not for:** A removable filter: use Tag.\n'
      )
    ).toBe(true)
  })

  it('states the import as code', () => {
    expect(importLines(entry)).toBe("import { Badge } from 'src/components/atoms/badge/Badge'")
    expect(page).toContain("```tsx\nimport { Badge } from 'src/components/atoms/badge/Badge'\n```")
  })

  it('escapes the pipes of a union type so the table keeps its columns, and flattens a multi-line cell', () => {
    expect(page).toContain("| `tone` | `'ok' \\| 'hostile'` | `'ok'` | The status. |")
    expect(page).toContain('| `dot` | `boolean` |  | A marker beside the text. |')
  })

  it('carries requirements, examples as source, and each mistake as wrong then right', () => {
    expect(page).toContain('## Requires\n\n- A word inside it.')
    expect(page).toContain('### Tones\n\n```tsx\n<Badge tone="ok">Nominal</Badge>\n```')
    expect(page.indexOf('Wrong:')).toBeLessThan(page.indexOf('Right:'))
    expect(page).toContain('Colour alone is not a status.')
  })

  it('says so when a component has no keyboard behaviour', () => {
    expect(page).toContain('Not focusable.')
  })
})

describe('the index and the bundles', () => {
  it('llmsIndex follows the llms.txt shape and links each component page', () => {
    const index = llmsIndex([entry], { rules: RULES })
    expect(index.startsWith('# Division DS\n\n> ')).toBe(true)
    // The summary's first sentence only: the rest of the line is spent on choosing.
    expect(index).toContain(
      '## Atoms\n\n- [Badge](docs/components/badge.md): A status chip. Best for: Labelling a status with a word. Not for: A removable filter: use Tag.\n'
    )
    expect(index).toContain('- **Imports.** Import from the file.')
  })

  it('ruleHeadlines takes the first sentence of each rule and skips other paragraphs', () => {
    expect(ruleHeadlines(RULES)).toEqual(['**Imports.** Import from the file.', '**Colour.** Tokens only: `var(--x)`.'])
  })

  it('componentsBundle writes each prop as a signature', () => {
    const bundle = componentsBundle([entry])
    expect(bundle).toContain("- `tone: 'ok' \\| 'hostile' = 'ok'` The status.")
    expect(bundle).toContain('Requires: A word inside it.')
    expect(bundle).not.toContain('Nominal')
  })

  it('tokensBundle lists what can be chosen and only names the ramps', () => {
    const bundle = tokensBundle({
      rule: 'Semantic only.',
      tokens: [
        { name: '--color-signal-500', layer: 'primitive', value: '#f2550f' },
        { name: '--color-text-primary', layer: 'semantic', value: { dark: '#eee', light: '#111' }, use: 'Body text.' },
        { name: '--spacing-4', layer: 'spacing', value: '16px', use: 'Default padding.' },
      ],
    })
    expect(bundle).toContain('| `--color-text-primary` | Body text. | `dark #eee, light #111` |')
    expect(bundle).toContain('| `--spacing-4` | Default padding. | `16px` |')
    expect(bundle).toContain('`--color-signal`')
    expect(bundle).not.toContain('--color-signal-500')
  })
})

describe('the rules, once, in three places', () => {
  const agents = `# Title\n\n<!-- rules:start -->\n${RULES}\n<!-- rules:end -->\n\n## After`

  it('extractRules takes the marked section and fails without the markers', () => {
    expect(extractRules(agents)).toBe(RULES)
    expect(() => extractRules('# No markers')).toThrow(/rules:start/)
  })

  it('extractRules drops the topic markers, so no output carries them', () => {
    expect(extractRules(TOPICAL)).not.toContain('<!--')
    expect(extractRules(TOPICAL)).toContain('Intro line.\n\n**Imports.** Import from the file.')
  })

  it('guidelinesFile carries them without the heading', () => {
    expect(guidelinesFile(RULES)).toContain('**Imports.** Import from the file.')
    expect(guidelinesFile(RULES)).not.toContain('## Rules')
  })
})

// A rules block with one marked rule per topic, the shape AGENTS.md has.
const TOPIC_RULES = Object.keys(SKILL_TOPICS).map(name => `<!-- topic: ${name} -->\n\n**${name} rule.** About ${name}.`)
const TOPICAL = [
  '# Title',
  '',
  '<!-- rules:start -->',
  '## Rules\n\nIntro line.\n\n<!-- topic: core -->\n\n**Imports.** Import from the file. Not the barrel.',
  '',
  TOPIC_RULES.join('\n\n'),
  '<!-- rules:end -->',
].join('\n')

describe('the skill, split by topic', () => {
  const split = rulesByTopic(TOPICAL)
  const skill = skillFiles(split, 47)

  it('puts every rule in exactly one file: core in SKILL.md, the rest in its topic file', () => {
    expect(split.intro).toBe('## Rules\n\nIntro line.')
    expect(split.core).toBe('**Imports.** Import from the file. Not the barrel.')
    for (const name of Object.keys(SKILL_TOPICS)) {
      const holders = Object.entries(skill).filter(([, text]) => text.includes(`**${name} rule.**`))
      expect(holders.map(([path]) => path), name).toEqual([`topics/${name}.md`])
    }
    expect(Object.values(skill).filter(text => text.includes('**Imports.**'))).toHaveLength(1)
    expect(skill['SKILL.md']).toContain('**Imports.** Import from the file.')
  })

  it('writes the core with frontmatter, the plan-first step and an index of every topic and command', () => {
    const core = skill['SKILL.md']
    expect(core.startsWith('---\nname: division-ds\ndescription: ')).toBe(true)
    expect(core).toContain('47 components')
    expect(core).toContain('## Plan first')
    expect(core).toContain('division-ds check')
    for (const path of Object.keys(skill).filter(path => path !== 'SKILL.md')) expect(core, path).toContain(`\`${path}\``)
    expect(Object.keys(skill).filter(path => path.startsWith('commands/')).sort()).toEqual(
      ['commands/add.md', 'commands/build.md', 'commands/fix.md', 'commands/review.md']
    )
    expect(Object.values(skill).join('\n')).not.toContain('<!--')
  })

  it('build plans states before code', () => {
    const build = skill['commands/build.md']
    for (const state of ['empty', 'loading', 'error', 'success', 'disabled or no permission']) expect(build).toContain(state)
    expect(build.indexOf('**States.**')).toBeLessThan(build.indexOf('**Write.**'))
  })

  it('fails on a rule outside a topic, an unknown topic, or a topic with no rules', () => {
    const wrap = body => `<!-- rules:start -->\n${body}\n<!-- rules:end -->`
    expect(() => rulesByTopic(wrap('**Loose.** No marker.'))).toThrow(/before the first/)
    expect(() => rulesByTopic(wrap('<!-- topic: nonsense -->\n\n**X.** Y.'))).toThrow(/unknown rules topic/)
    expect(() => rulesByTopic(wrap('<!-- topic: core -->\n\n**X.** Y.'))).toThrow(/no rules under <!-- topic: colour/)
  })
})
