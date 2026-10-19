import { readFileSync } from 'node:fs'
import { sourceFiles } from './lib/read-source-files.mjs'
import { EXEMPT, findViolations, formatViolation, SCANNED_EXTENSIONS, SCANNED_ROOTS } from './lib/token-discipline.mjs'

// The token-discipline gate. A colour in src/ is a token, a hardcoded value fails, and so does a
// token name that does not exist. The rules and the exemption list (each with its reason) live
// in scripts/lib/token-discipline.mjs so they are unit-testable without a filesystem, the same
// split the other gates use. This file is the runner and the exit code.
//
// It reads the token names from public/manifest/tokens.json, which `npm run tokens` writes, so it
// runs after that step in prebuild. To check files outside src/ (a screen written elsewhere),
// pass paths: `node scripts/check-token-discipline.mjs path/to/Screen.tsx`.

const tokenNames = JSON.parse(readFileSync('public/manifest/tokens.json', 'utf8')).tokens.map(token => token.name)

const paths = process.argv.slice(2)
const files =
  paths.length > 0
    ? paths.map(path => ({ path: path.split('\\').join('/'), text: readFileSync(path, 'utf8') }))
    : sourceFiles(SCANNED_ROOTS, SCANNED_EXTENSIONS)
const violations = files.flatMap(({ path, text }) => findViolations(text, path, tokenNames))

if (violations.length > 0) {
  console.error(`\nToken-discipline gate FAILED: ${violations.length} violation(s).\n`)
  for (const violation of violations) console.error('  ' + formatViolation(violation))
  console.error(
    '\nEvery colour comes from a token, written as var(--name) inside a Tailwind arbitrary value.\n' +
      'The tokens, with one sentence each on when to use them, are in public/manifest/tokens.json\n' +
      '(and public/llms-tokens.txt). A file where literal colours are the point is listed in EXEMPT\n' +
      'in scripts/lib/token-discipline.mjs with its reason; do not add one to get past this.\n'
  )
  process.exit(1)
}

console.log(
  `Token-discipline gate passed: ${files.length} files, ${tokenNames.length} tokens, ${EXEMPT.length} exempt patterns, 0 matches.`
)
