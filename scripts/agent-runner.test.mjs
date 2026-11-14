import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { slugify, lastLabeler, filesFromGit, failureOutcome, OUTCOMES, docsRoutes, componentSlugs, addedCaptions, screensMarkdown } from './agent-runner.mjs'
import { classify } from './policy-tier.mjs'

const policy = JSON.parse(readFileSync('policy/tiers.json', 'utf8'))
const ev = (event, name, login) => ({ event, label: { name }, actor: { login } })

describe('agent-runner', () => {
  it('slugs titles safely', () => {
    expect(slugify('Badge: Air quality has 6 levels (Good to Hazardous)')).toBe('badge-air-quality-has-6-levels-good-to-h')
    expect(slugify('$(rm -rf /); `x`')).toBe('rm-rf-x')
    expect(slugify('Ünïcode ✓')).toBe('unicode')
    expect(slugify('!!!')).toBe('change')
  })
  it('only the last person to add the label counts', () => {
    expect(lastLabeler([ev('labeled', 'approved', 'Victor-Ilioiu')], 'approved')).toBe('Victor-Ilioiu')
    expect(lastLabeler([ev('labeled', 'approved', 'Victor-Ilioiu'), ev('unlabeled', 'approved', 'x'), ev('labeled', 'approved', 'mallory')], 'approved')).toBe('mallory')
    expect(lastLabeler([ev('labeled', 'approved', 'Victor-Ilioiu'), ev('unlabeled', 'approved', 'Victor-Ilioiu')], 'approved')).toBe('')
    expect(lastLabeler([ev('labeled', 'bug', 'Victor-Ilioiu')], 'approved')).toBe('')
    expect(lastLabeler([{ event: 'commented' }], 'approved')).toBe('')
  })
  it('turns git output into policy-tier input', () => {
    const files = filesFromGit(
      'M\tsrc/components/atoms/badge/Badge.tsx\nA\tpublic/docs/x.md\nR100\tscripts/a.mjs\tsrc/a.mjs\n',
      '3\t1\tsrc/components/atoms/badge/Badge.tsx\n10\t0\tpublic/docs/x.md\n0\t0\tscripts/a.mjs => src/a.mjs\n',
    )
    expect(files[0]).toEqual({ filename: 'src/components/atoms/badge/Badge.tsx', status: 'modified', additions: 3, deletions: 1 })
    expect(files[2]).toMatchObject({ filename: 'src/a.mjs', status: 'renamed', previous_filename: 'scripts/a.mjs' })
    expect(classify(files, policy).tier).toBe('human')
  })
  it('the runner and the public trigger are human-only', () => {
    for (const p of ['.github/workflows/agent-runner.yml', 'public-repo/.github/workflows/agent-approve.yml', 'scripts/agent-runner.mjs'])
      expect(classify([{ filename: p, status: 'modified' }], policy).tier).toBe('human')
  })
  it('tells the public issue which kind of failure it was', () => {
    expect(failureOutcome({ change: 'failure', changeKind: 'none' }).kind).toBe('declined')
    expect(failureOutcome({ change: 'failure', changeKind: 'none' }).label).toBe('agent:declined')
    expect(failureOutcome({ change: 'failure', changeKind: 'human' }).kind).toBe('checks')
    expect(failureOutcome({ change: 'failure', changeKind: '' }).kind).toBe('runner')
    expect(failureOutcome({ change: 'success', verify: 'failure' }).kind).toBe('checks')
    expect(failureOutcome({ change: 'success', verify: 'success', build: 'failure' }).kind).toBe('checks')
    expect(failureOutcome({ change: 'success', verify: 'success', build: 'success', commit: 'failure', commitKind: 'changed' }).kind).toBe('checks')
    expect(failureOutcome({ change: 'success', verify: 'success', build: 'success', commit: 'failure' }).kind).toBe('runner')
    // npm ci, setup-node or the agent action itself failed: nothing after it ran
    expect(failureOutcome({ change: 'skipped', verify: 'skipped' }).kind).toBe('runner')
    expect(failureOutcome({}).kind).toBe('runner')
  })
  it('public messages never quote anything', () => {
    for (const o of Object.values(OUTCOMES)) {
      expect(o.message).not.toMatch(/[`$<>]/)
      expect(o.label).toMatch(/^agent:(declined|failed)$/)
    }
  })
  it('finds the docs pages a change touches', () => {
    const routes = docsRoutes(readFileSync('src/docsPages.ts', 'utf8'))
    expect(routes).toContain('/components/progress')
    expect(componentSlugs([
      'public/docs/components/progress.md',
      'src/components/atoms/progress/Progress.tsx',
      'src/components/atoms/progress/ProgressDocs.tsx',
      'src/components/docs/Example.tsx',
      'src/components/atoms/no-such-thing/X.tsx',
      'src/components/atoms/badge/Badge.tsx',
    ], routes)).toEqual(['progress', 'badge'])
    expect(componentSlugs(['src/components/atoms/a/A.tsx', 'src/components/atoms/b/B.tsx'], ['/components/a', '/components/b'], 1)).toEqual(['a'])
  })
  it('finds the examples a diff adds', () => {
    const diff = [
      '+++ b/X.tsx',
      '+      <Example caption="Ring">',
      '-      <Example caption="Old">',
      '       <Example caption="Kept">',
      `+<Example className="x" caption={'Tones'}>`,
      '+<Example caption="Ring">',
    ].join(String.fromCharCode(10))
    expect(addedCaptions(diff)).toEqual(['Ring', 'Tones'])
  })
  it('writes the screenshots section', () => {
    const shot = (caption, theme, width) => ({ slug: 'progress', caption, theme, width, file: `progress/${caption ? 'example-ring' : 'page'}-${theme}-${width}.png`, overflow: width === 320 && theme === 'dark' })
    const manifest = ['light', 'dark'].flatMap((t) => [1280, 320].flatMap((w) => [shot(null, t, w), shot('Ring', t, w)]))
    const md = screensMarkdown(manifest, 'https://github.com/o/r/blob/agent/screens/issue-6')
    expect(md).toContain('Example: **Ring**')
    expect(md).toContain('https://github.com/o/r/blob/agent/screens/issue-6/progress/example-ring-dark-320.png?raw=true')
    expect(md).toContain('Horizontal scroll at 320px dark')
    expect(md).toContain('[light 1280px](https://github.com/o/r/blob/agent/screens/issue-6/progress/page-light-1280.png?raw=true)')
    expect(md).not.toContain('<img src="https://github.com/o/r/blob/agent/screens/issue-6/progress/page-')
    expect(screensMarkdown([], 'x')).toContain('nothing to screenshot')
  })
})
