// The release guard's rules, as a pure function over file text. The runner is
// scripts/check-release-version.mjs; the release workflow runs it before it builds anything.
//
// Why it exists: the workflow publishes whatever main holds under the version typed into it.
// Twice (0.14.0 on 2026-11-21, 0.15.0 on 2026-11-24) it ran after the feature PR merged and
// before the version PR did, so npm got a package whose AGENTS.md pinned the previous version,
// and a published version can never be replaced. This makes that state refuse to publish.

/** Every `division-ds@x.y.z` pin in a text, in order. */
export const pinsIn = text => [...text.matchAll(/division-ds@(\d+\.\d+\.\d+(?:-[\w.]+)?)/g)].map(match => match[1])

/**
 * What stops `version` from being released from these files, one sentence each; empty means go.
 * @param {string} version the version typed into the workflow
 * @param {{ versionTs: string, changelog: string, agents: string, install: string }} files
 */
export function releaseVersionProblems(version, { versionTs, changelog, agents, install }) {
  const problems = []
  const declared = versionTs.match(/DS_VERSION\s*=\s*'([^']+)'/)?.[1]
  if (declared !== version) {
    problems.push(`src/version.ts says DS_VERSION = '${declared ?? '?'}', not '${version}'.`)
  }
  const heading = changelog.match(/^## (.+)$/m)?.[1]?.trim()
  if (!heading?.startsWith(`${version} `)) {
    problems.push(`CHANGELOG.md's newest heading is '## ${heading ?? '?'}', not '## ${version} — <date>'.`)
  }
  for (const [file, text] of [
    ['AGENTS.md', agents],
    ['public/install.md', install],
  ]) {
    const pins = pinsIn(text)
    if (pins.length === 0) problems.push(`${file} has no division-ds@${version} pin.`)
    const wrong = [...new Set(pins.filter(pin => pin !== version))]
    if (wrong.length > 0) problems.push(`${file} pins division-ds@${wrong.join(', division-ds@')}, not ${version}.`)
  }
  return problems
}
