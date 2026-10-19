import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

// Resolved from this file's own location, not `process.cwd()`, so the result is the same whether
// the caller runs from the repo root (a CLI script) or from wherever a test runner's working
// directory happens to be.
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

/**
 * Reads every file matching `extensions` under each of `roots` (repo-root-relative, e.g. 'src'),
 * recursively, with real filesystem content.
 *
 * Exists because `import.meta.glob(..., { query: '?raw' })` cannot be trusted for `.css` in this
 * project: Vitest's default `test.css` handling stubs out CSS imports for speed, regardless of the
 * raw query -- these files are consumed only through `@import` in `tailwind.css`, and under that
 * default Vitest returns them empty rather than as text -- so a scan built on that glob silently
 * sees zero bytes of CSS, comments included, with no error to say so. A direct filesystem read has
 * no dependency on the test runner's CSS handling and returns the same bytes a reader on disk
 * would see.
 */
export function sourceFiles(roots, extensions) {
  const found = []
  function walk(dir) {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry)
      if (statSync(path).isDirectory()) walk(path)
      else if (extensions.test(entry)) found.push(path)
    }
  }
  for (const root of roots) walk(join(REPO_ROOT, root))
  return found.map(path => ({
    path: relative(REPO_ROOT, path).split('\\').join('/'),
    text: readFileSync(path, 'utf8'),
  }))
}
