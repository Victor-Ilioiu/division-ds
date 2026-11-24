import { readFileSync } from 'node:fs'
import { releaseVersionProblems } from './lib/release-version.mjs'

// The release guard. `node scripts/check-release-version.mjs 0.15.1` exits 1 unless main already
// says 0.15.1 everywhere the version is printed: DS_VERSION, the newest CHANGELOG heading, and the
// division-ds@ pins in AGENTS.md and public/install.md. The rules live in lib/release-version.mjs.

const version = process.argv[2]
if (!version) {
  console.error('Usage: node scripts/check-release-version.mjs <version>')
  process.exit(2)
}

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const problems = releaseVersionProblems(version, {
  versionTs: read('src/version.ts'),
  changelog: read('CHANGELOG.md'),
  agents: read('AGENTS.md'),
  install: read('public/install.md'),
})

if (problems.length > 0) {
  console.error(`\nRelease guard FAILED: main is not ready to publish ${version}.\n`)
  for (const problem of problems) console.error('  ' + problem)
  console.error(
    '\nMerge the PR that bumps the version (DS_VERSION, the CHANGELOG heading, the pins) first, then run the release again.\n'
  )
  process.exit(1)
}

console.log(`Release guard passed: main says ${version} everywhere it is printed.`)
