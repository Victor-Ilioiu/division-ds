import { readFileSync, existsSync } from 'node:fs'
import { findDrift, findTemplateDrift } from './lib/figma-sync.mjs'

// The Figma sync gate. figma/snapshot.json is the Figma library's component properties and variable
// names, read through the Figma MCP and committed, because a live read needs a Figma token this
// repository does not hold. This compares that snapshot with the manifests. It catches code drifting
// from Figma (a new variant value, a renamed prop or token); it cannot see Figma changing until the
// snapshot is refreshed. The logic is in scripts/lib/figma-sync.mjs; this file is the runner.

const read = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'))
const snapshot = read('figma/snapshot.json')
const templates = {}
for (const name of Object.keys(snapshot.components)) {
  const file = new URL(`../figma/code-connect/${name}.figma.ts`, import.meta.url)
  if (existsSync(file)) templates[name] = readFileSync(file, 'utf8')
}
const problems = [
  ...findDrift(snapshot, read('public/manifest/components.json').components, read('public/manifest/tokens.json').tokens),
  ...findTemplateDrift(snapshot, templates),
]

if (problems.length > 0) {
  console.error(`\nFigma sync gate FAILED: ${problems.length} difference(s) between Figma and the code.\n`)
  for (const problem of problems) console.error('  ' + problem)
  console.error('\nFix Figma (file ' + snapshot.fileKey + '), then refresh figma/snapshot.json: commands.md, "Check Figma against the code".\n')
  process.exit(1)
}

const components = Object.keys(snapshot.components).length
const variables = Object.values(snapshot.variables).flat().length
console.log(`Figma sync gate passed: ${components} components, ${variables} variables.`)
