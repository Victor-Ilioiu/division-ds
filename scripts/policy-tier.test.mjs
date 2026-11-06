import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { classify, globToRegExp } from './policy-tier.mjs'

const policy = JSON.parse(readFileSync('policy/tiers.json', 'utf8'))
const f = (filename, status = 'modified', extra = {}) => ({ filename, status, ...extra })

describe('policy-tier', () => {
  it('globs', () => {
    expect(globToRegExp('public/llms*.txt').test('public/llms-tokens.txt')).toBe(true)
    expect(globToRegExp('public/llms*.txt').test('public/x/llms.txt')).toBe(false)
    expect(globToRegExp('public/manifest/**').test('public/manifest/a/b.json')).toBe(true)
  })
  it('generated files only -> auto', () => {
    expect(classify([f('public/manifest/components.json'), f('figma/snapshot.json')], policy).tier).toBe('auto')
  })
  it('one source file makes it review', () => {
    expect(classify([f('public/manifest/components.json'), f('src/components/atoms/Button/Button.meta.ts')], policy).tier).toBe('review')
  })
  it('policy, CI and scripts are human', () => {
    for (const p of ['policy/tiers.json', '.github/workflows/pr.yml', 'scripts/check-contrast.mjs', 'package.json', 'tokens/primitive/color.json'])
      expect(classify([f(p)], policy).tier).toBe('human')
  })
  it('renaming a file out of a human path is still human', () => {
    expect(classify([f('public/r/x.json', 'renamed', { previous_filename: 'scripts/x.mjs' })], policy).tier).toBe('human')
  })
  it('deletions are human, even of generated files', () => {
    expect(classify([f('public/manifest/components.json', 'removed')], policy).tier).toBe('human')
  })
  it('a new component folder is human, a new file in an existing one is review', () => {
    expect(classify([f('src/components/atoms/Zap/Zap.tsx', 'added')], policy, () => false).tier).toBe('human')
    expect(classify([f('src/components/atoms/Button/extra.ts', 'added')], policy, () => true).tier).toBe('review')
  })
  it('empty diff is review, never auto', () => {
    expect(classify([], policy).tier).toBe('review')
  })
})
