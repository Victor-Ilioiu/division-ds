import { describe, it, expect } from 'vitest'
import { pinsIn, releaseVersionProblems } from './release-version.mjs'

const ready = {
  versionTs: "export const DS_VERSION = '0.15.1'\n",
  changelog: '# Changelog\r\n\r\n## 0.15.1 — 2026-11-24\r\n\r\n### Fixed\r\n',
  agents: '`claude mcp add division-ds -- npx -y division-ds@0.15.1 mcp`',
  install: 'npx -y division-ds@0.15.1 mcp\n"args": ["-y", "division-ds@0.15.1", "mcp"]',
}

describe('the release guard', () => {
  it('passes when every place says the version', () => {
    expect(releaseVersionProblems('0.15.1', ready)).toEqual([])
  })

  it('stops the 2026-11-24 state: feature merged, version PR not', () => {
    const problems = releaseVersionProblems('0.15.0', {
      versionTs: "export const DS_VERSION = '0.14.0'",
      changelog: '# Changelog\n\n## Unreleased\n\n## 0.14.0 — 2026-11-21\n',
      agents: 'npx -y division-ds@0.14.0 mcp',
      install: 'division-ds@0.14.0 and division-ds@0.14.0',
    })
    expect(problems).toEqual([
      "src/version.ts says DS_VERSION = '0.14.0', not '0.15.0'.",
      "CHANGELOG.md's newest heading is '## Unreleased', not '## 0.15.0 — <date>'.",
      'AGENTS.md pins division-ds@0.14.0, not 0.15.0.',
      'public/install.md pins division-ds@0.14.0, not 0.15.0.',
    ])
  })

  it('catches one stale pin among right ones, and a file with no pin at all', () => {
    const problems = releaseVersionProblems('0.15.1', { ...ready, install: 'division-ds@0.15.1 then division-ds@0.15.0', agents: 'none' })
    expect(problems).toEqual(['AGENTS.md has no division-ds@0.15.1 pin.', 'public/install.md pins division-ds@0.15.0, not 0.15.1.'])
  })

  it('does not take 0.15.10 for 0.15.1', () => {
    expect(releaseVersionProblems('0.15.1', { ...ready, changelog: '## 0.15.10 — 2027-01-01\n' })).toHaveLength(1)
  })

  it('reads pins', () => {
    expect(pinsIn('npx division-ds@1.2.3 and division-ds@1.2.4-beta.1')).toEqual(['1.2.3', '1.2.4-beta.1'])
  })
})
