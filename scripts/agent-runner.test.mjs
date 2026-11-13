import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { slugify, lastLabeler, filesFromGit } from './agent-runner.mjs'
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
})
