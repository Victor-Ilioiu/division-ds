import { beforeAll, describe, expect, it } from 'vitest'
import { buildAgentDocs, staleFiles } from '../../../scripts/build-agent-docs.mjs'

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
    expect(pages).toHaveLength(68)
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

  it('write DESIGN.md as one short file that links every component page and nothing missing', () => {
    const design = files['public/DESIGN.md']
    const links = [...design.matchAll(/\]\(([^)]+)\)/g)].map(match => `public/${match[1]}`)
    expect(links.filter(link => !(link in files))).toEqual([])
    expect(links.filter(link => link.startsWith('public/docs/components/'))).toHaveLength(
      Object.keys(files).filter(path => path.startsWith('public/docs/components/')).length,
    )
    expect(design).toMatch(/`font-display`: `"Oxanium"/)
    expect(design).toContain('`--color-surface-base`')
    // 18.1 kB when written (2026-10-26). It links the pages rather than inlining them.
    expect(design.length).toBeLessThan(20_000)
  })

  it('keep the index small enough to read whole', () => {
    // 20 kB held 58 components; the nine added on 2026-10-15 (monitoring and assistant) brought it
    // to about 22 kB after their index lines were trimmed, so the cap moved with the count.
    expect(files['public/llms.txt'].length).toBeLessThan(24_000)
    // 8 kB until the Assistant copy rule (2026-10-26) took it just over, trimmed to three lines.
    expect(files['public/llms-guidelines.txt'].length).toBeLessThan(8_500)
  })
})
