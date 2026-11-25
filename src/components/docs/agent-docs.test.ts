import { beforeAll, describe, expect, it } from 'vitest'
import { lint } from '@google/design.md/linter'
import { buildAgentDocs, staleFiles } from '../../../scripts/build-agent-docs.mjs'
import { COMPONENT_RECIPES, DESIGN_RULES, MOTION_ROLES, TYPE_ROLES } from '../../../scripts/lib/agent-docs.mjs'
import { sourceFiles } from '../../../scripts/lib/read-source-files.mjs'

/**
 * The files an agent reads (`public/llms*.txt`, `public/docs/components/*.md`, the manifests, the
 * skill) are generated and committed, so they are there without a build. Committed generated
 * files go stale the moment someone forgets the command, so this regenerates them in memory and
 * compares with the disk.
 */
describe('the generated agent docs', () => {
  let files: Record<string, string>

  beforeAll(async () => {
    files = await buildAgentDocs()
  })

  it('are current (run `npm run agent-docs` if this fails)', () => {
    expect(staleFiles(files)).toEqual([])
  })

  it('link only to files that are generated', () => {
    const index = files['public/llms.txt']
    // Relative links, so the index works at a site root and under the portfolio's sub-path alike.
    const links = [...index.matchAll(/\]\(([^)]+)\)/g)].map(match => `public/${match[1]}`)
    expect(links.filter(link => link.startsWith('public//') || link.includes('://'))).toEqual([])
    expect(links.length).toBeGreaterThan(47)
    // tokens.json is written by `npm run tokens`, one step earlier, not by this generator.
    expect(links.filter(link => !(link in files) && link !== 'public/manifest/tokens.json')).toEqual([])
  })

  it('give every component a page with an import line, props and at least one example', () => {
    const pages = Object.entries(files).filter(([path]) => path.startsWith('public/docs/components/'))
    expect(pages).toHaveLength(84)
    for (const [path, text] of pages) {
      expect(text, path).toMatch(/## Import\n\n```tsx\nimport \{ \w/)
      expect(text, path).toContain('## Props')
      expect(text, path).toMatch(/## Examples\n[\s\S]*```tsx/)
    }
  })

  it('split the skill into a short core, a file per topic and a file per command', () => {
    const skill = Object.keys(files)
      .filter(path => path.startsWith('skills/division-ds/'))
      .map(path => path.slice('skills/division-ds/'.length))
      .sort()
    expect(skill).toEqual([
      'SKILL.md',
      'commands/add.md',
      'commands/build.md',
      'commands/fix.md',
      'commands/review.md',
      'topics/ai.md',
      'topics/colour.md',
      'topics/feedback.md',
      'topics/forms.md',
      'topics/layout.md',
      'topics/motion.md',
      'topics/overlays.md',
    ])
    // The core is the one file always loaded. It held every rule (6.4 kB) before the split.
    expect(files['skills/division-ds/SKILL.md'].length).toBeLessThan(6_000)
  })

  it('give every index line a best for and a not for', () => {
    const lines = files['public/llms.txt'].split('\n').filter(line => line.startsWith('- [') && line.includes('](docs/components/'))
    expect(lines).toHaveLength(Object.keys(files).filter(path => path.startsWith('public/docs/components/')).length)
    for (const line of lines) expect(line).toMatch(/ Best for: .+ Not for: .+\.$/)
  })

  it('write DESIGN.md as one short file that refers to every component page and nothing missing', () => {
    const design = files['public/DESIGN.md']
    const links = [...design.matchAll(/\]\(([^)]+)\)/g)].map(match => `public/${match[1]}`)
    expect(links.filter(link => !(link in files))).toEqual([])
    // The spec's external references: an inline code span that is all `@<path>`, resolved from the
    // folder DESIGN.md is in. tokens.json is written by `npm run tokens`, not by this generator.
    const refs = [...design.matchAll(/`@([^`\s#]+\.[a-z]+)(?:#[^`\s]+)?`/g)].map(match => `public/${match[1]}`)
    expect(refs.filter(ref => !(ref in files))).toEqual([])
    expect(refs.filter(ref => ref.startsWith('public/docs/components/'))).toHaveLength(
      Object.keys(files).filter(path => path.startsWith('public/docs/components/')).length,
    )
    expect(design).toMatch(/`font-display`: `"Oxanium"/)
    expect(design).toContain('`--color-surface-base`')
    // 18.1 kB when written (2026-10-26). It links the pages rather than inlining them.
    // Moved to 23.5 kB with Terminal and its 17 tokens (2026-11-01).
    // Moved to 21.5 kB with Panel and CodeBlock (2026-10-30): each component adds a linked line.
    // Moved to 27 kB with the 30 category colour tokens (Badge `color`, 2026-11-03): one table
    // row each, with the shortest use line that still says "a label, not a status".
    // Moved to 29 kB with the 18 severity tokens (Badge `severity`, 2026-11-12): one row each,
    // the use line already cut to "Solid Badge severity=N: the fill."; the rows alone are ~1.4 kB.
    // Moved to 30.5 kB with six components and four tokens (data font, state ladder, overlay,
    // 2026-11-16): one linked line per component and one table row per token.
    // Moved to 50 kB with the DESIGN.md format (2026-11-24): the tokens moved into YAML front
    // matter (about 8 kB of colour, both themes) with the pairs the linter checks (about 13 kB),
    // and the Value column left the body tables, which now carry the use only.
    // Moved to 63 kB with the spec's November additions (2026-11-25): 20 component recipes with
    // their states (about 6 kB of YAML), motion tokens, four more type roles, Voice & Content's six
    // topics, explicit Do and Don't lists, Responsive Behavior and Known Gaps.
    expect(design.length).toBeLessThan(63_000)
  })

  // DESIGN.md follows Google Labs' DESIGN.md format, and this runs the published linter on it, the
  // same one `npx -p @google/design.md designmd lint public/DESIGN.md` runs. Warnings fail too:
  // each one is a token a tool would drop, a pair below AA, or a section out of the spec's order.
  // One is expected: 0.4.0 predates the spec's `motion` group (added 2026-11-17, google-labs-code/
  // design.md#182) and calls it `token-like-ignored`. The allowance is that exact finding, and
  // the second expect fails once a linter that reads `motion` is installed, so it gets removed.
  it('write DESIGN.md that the official DESIGN.md linter passes with no error or warning but the motion one', () => {
    const report = lint(files['public/DESIGN.md'])
    const problems = report.findings.filter(finding => finding.severity !== 'info')
    const motion = (finding: (typeof problems)[number]) => finding.severity === 'warning' && /^"motion" looks like a design-token map/.test(finding.message)
    expect(problems.filter(finding => !motion(finding))).toEqual([])
    expect(problems.filter(motion), 'the installed linter reads `motion` now: drop this allowance').toHaveLength(1)
    // The spec's sections in the spec's order, then the two the spec leaves to the author, which
    // its order check skips.
    expect(report.sections).toEqual([
      'Overview',
      'Colors',
      'Typography',
      'Layout',
      'Elevation & Depth',
      'Shapes',
      'Motion & Micro-interaction',
      'Voice & Content Strategy',
      'Components',
      "Do's and Don'ts",
      'Responsive Behavior',
      'Known Gaps',
    ])
    // Not vacuous: the linter resolved the pairs and measured them.
    expect(report.designSystem.components.size).toBeGreaterThan(100)
  })

  it('give DESIGN.md every semantic colour at the value the theme files resolve to', () => {
    const { colors } = lint(files['public/DESIGN.md']).designSystem
    const rgba = (value: string) => {
      const hex = value.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
      if (hex) return { r: parseInt(hex[1], 16), g: parseInt(hex[2], 16), b: parseInt(hex[3], 16), a: 1 }
      const fn = value.match(/^rgba\((\d+), (\d+), (\d+), ([\d.]+)\)$/)
      if (!fn) throw new Error(`Unexpected colour value ${value}`)
      return { r: Number(fn[1]), g: Number(fn[2]), b: Number(fn[3]), a: Number(fn[4]) }
    }
    const resolved = (path: string) => {
      const colour = colors.get(path)
      return colour && { r: colour.r, g: colour.g, b: colour.b, a: colour.a ?? 1 }
    }
    const manifest = JSON.parse(sourceFiles(['public/manifest'], /^tokens\.json$/)[0].text)
    const semantic = manifest.tokens.filter(
      (token: { layer: string; name: string }) => token.layer === 'semantic' && !token.name.startsWith('--color-terminal-'),
    )
    expect(semantic.length).toBeGreaterThan(80)
    for (const token of semantic as { name: string; value: string | { dark: string; light: string } }[]) {
      const key = token.name.replace(/^--color-/, '')
      if (typeof token.value === 'string') expect(resolved(key), token.name).toEqual(rgba(token.value))
      else for (const theme of ['dark', 'light'] as const) expect(resolved(`${theme}.${key}`), `${token.name} ${theme}`).toEqual(rgba(token.value[theme]))
    }
    expect(resolved('primary')).toEqual(resolved('accent-signal-fill'))
  })

  it('read every DESIGN.md type role, motion and recipe off source that still sets it', () => {
    const sources = new Map(sourceFiles(['src/components', 'src/styles'], /\.(tsx|css)$/).map(file => [file.path, file.text]))
    for (const role of TYPE_ROLES) {
      expect(sources.get(role.evidence.file), `${role.name}: ${role.evidence.file}`).toContain(role.evidence.classes)
    }
    for (const item of [...MOTION_ROLES, ...COMPONENT_RECIPES]) {
      for (const classes of item.evidence.classes) expect(sources.get(item.evidence.file), `${item.name}: ${item.evidence.file}`).toContain(classes)
    }
    // The spec recommends 9 to 15 type levels.
    expect(TYPE_ROLES.length).toBeGreaterThanOrEqual(9)
    // Each recipe is in the front matter under its name, or a -dark/-light pair of it.
    const { components } = lint(files['public/DESIGN.md']).designSystem
    for (const recipe of COMPONENT_RECIPES) {
      expect(components.has(recipe.name) || (components.has(`${recipe.name}-dark`) && components.has(`${recipe.name}-light`)), recipe.name).toBe(true)
    }
  })

  it("restate in DESIGN.md's Do's and Don'ts only rules AGENTS.md still has", () => {
    const titles = new Set([...files['public/llms-guidelines.txt'].matchAll(/^\*\*([^*]+?)\.?\*\*/gm)].map(match => match[1]))
    for (const [rule, text] of [...DESIGN_RULES.do, ...DESIGN_RULES.dont]) {
      expect(titles.has(rule), `${rule}: ${text}`).toBe(true)
      expect(files['public/DESIGN.md']).toContain(`- ${text}`)
    }
  })

  it('keep the index small enough to read whole', () => {
    // 20 kB held 58 components; the nine added on 2026-10-15 (monitoring and assistant) brought it
    // to about 22 kB after their index lines were trimmed, so the cap moved with the count.
    // 25.5 kB from 2026-10-30, when Panel and CodeBlock took it just over 24 kB.
    // 28.5 kB from 2026-11-16: six components (KnowledgeGraph, MeterRow, PanelHeader, LogFeed,
    // SegmentedMeter, StatusChip) took it to about 27.4 kB, one line each.
    // 29.5 kB from 2026-11-25: SidePanel, CommentThread and Attachments added three lines (about 1.4 kB).
    expect(files['public/llms.txt'].length).toBeLessThan(29_500)
    // 8 kB until the Assistant copy rule (2026-10-26) took it just over, trimmed to three lines.
    expect(files['public/llms-guidelines.txt'].length).toBeLessThan(8_500)
  })
})
