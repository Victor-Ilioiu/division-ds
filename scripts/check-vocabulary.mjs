import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import {
  findViolations,
  formatViolation,
  BANNED_TERMS,
  SCANNED_ROOTS as ROOTS,
  SCANNED_EXTENSIONS as EXTENSIONS,
} from './lib/vocabulary.mjs'

// The IP-stance gate. PRODUCT.md's Anti-references section and design.md's IP stance both state
// that the source vocabulary appears in nothing public, "for legal rather than aesthetic reasons,
// and non-negotiable". This is the runner and the exit code; the word list, the idiom allowlist
// and the matching live in scripts/lib/vocabulary.mjs so they are unit-testable without a
// filesystem, the same split check-contrast.mjs uses.
//
// Scope is every directory whose contents a reader can reach: src/** renders, and scripts/** and
// e2e/** are read by anyone who opens the repository, which for a portfolio artifact is the point.
// The roots and the file extensions are SCANNED_ROOTS and SCANNED_EXTENSIONS in the lib, where a
// test pins them.
// An earlier version scanned src/** only and skipped all test files; that let
// scripts/lib/contrast.test.mjs carry the vocabulary in a test NAME for weeks. Excluding a whole
// category to protect one file is how a gate develops a blind spot.
//
// Exactly one exemption, and it is structural rather than a category: lib/vocabulary.* defines the
// banned list, so by construction it contains every term, and its own test must name them to
// assert the matching works. Nothing else is exempt. Real prose that needs a banned word is an
// ordinary English idiom and belongs in ALLOWED_IDIOMS, where the reason is written down.

const DEFINES_THE_LIST = /lib[\\/]vocabulary\./

function sourceFiles(dir, found = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) sourceFiles(path, found)
    else if (EXTENSIONS.test(entry) && !DEFINES_THE_LIST.test(path)) found.push(path)
  }
  return found
}

const files = ROOTS.flatMap(root => sourceFiles(root))
const violations = files.flatMap(path =>
  findViolations(readFileSync(path, 'utf8'), path.split('\\').join('/'))
)

if (violations.length > 0) {
  console.error(`\nVocabulary gate FAILED: ${violations.length} banned term(s) in ${ROOTS.map(r => r + '/').join(', ')}.\n`)
  for (const violation of violations) console.error('  ' + formatViolation(violation))
  console.error(
    '\nPRODUCT.md (Anti-references) and design.md (IP stance) forbid this vocabulary in anything\n' +
      'public, for legal rather than aesthetic reasons. Rewrite the line so it makes its own\n' +
      'positive case and implies no source, original or referent. If the match is an ordinary\n' +
      'English idiom, add the exact phrase to ALLOWED_IDIOMS in scripts/lib/vocabulary.mjs with a\n' +
      'comment saying why; do not weaken the pattern.\n'
  )
  process.exit(1)
}

console.log(
  `Vocabulary gate passed: ${files.length} files in ${ROOTS.map(r => r + '/').join(', ')}, ${BANNED_TERMS.length} banned terms, 0 matches.`
)
