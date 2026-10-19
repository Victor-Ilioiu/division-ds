import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { RENDERER_MARKERS, findRendererInEntryGraph, formatViolation, rendererMarker } from './lib/chunk-graph.mjs'

// The chunk gate: decision D4 in design.md says three.js never lands in a chunk every page
// loads. This runs after `vite build` (it is `postbuild` in package.json) and reads what the
// build wrote: the entry chunks from dist/index.html, then everything they reach through static
// imports. Any of those containing the renderer fails the build. The parsing and the walk live in
// scripts/lib/chunk-graph.mjs so they are unit-tested without a build, the same split
// check-contrast.mjs, check-vocabulary.mjs and check-button-spacing.mjs use. This file is the
// runner and the exit code. What the gate does not cover is listed at the top of the lib.

const DIST = process.argv[2] ?? 'dist'
const htmlPath = join(DIST, 'index.html')

function fail(lines) {
  console.error(`\nChunk gate FAILED: ${lines[0]}\n`)
  for (const line of lines.slice(1)) console.error(line)
  console.error('')
  process.exit(1)
}

if (!existsSync(htmlPath)) {
  fail([
    `${htmlPath} does not exist.`,
    'This gate reads a finished build. Run `npm run build`, which runs it afterwards, or',
    '`npx vite build` and then `npm run check:chunks`.',
  ])
}

const html = readFileSync(htmlPath, 'utf8')
// A sub-path build (DIVISION_BASE, see vite.config.ts) writes its URLs with the base in front,
// but the files sit at the root of dist/. Strip the base so the walk reads what was written.
const BASE = (process.env.DIVISION_BASE ?? '/').replace(/^\/+|\/+$/g, '')
const readChunk = path => {
  const file = join(DIST, BASE && path.startsWith(BASE + '/') ? path.slice(BASE.length + 1) : path)
  return existsSync(file) ? readFileSync(file, 'utf8') : null
}
const { entries, reached, violations, missing } = findRendererInEntryGraph({ html, readChunk })

if (entries.length === 0) {
  fail([
    `no module script or modulepreload found in ${htmlPath}.`,
    'The gate has nothing to start from, so it has checked nothing. If the build output changed',
    'shape, teach scripts/lib/chunk-graph.mjs to read it before trusting a pass.',
  ])
}

if (missing.length > 0) {
  fail([
    `${missing.length} chunk(s) the entry reaches could not be read from ${DIST}/.`,
    ...missing.map(({ file, chain }) => `  ${file} (${chain.join(' -> ')})`),
    'A graph with a hole in it has not been checked.',
  ])
}

if (violations.length > 0) {
  fail([
    `three.js is in ${violations.length} chunk(s) that every page loads.`,
    ...violations.map(violation => '  ' + formatViolation(violation)),
    '',
    'design.md, D4: three.js is reached only through a dynamic import(), so a visitor who never',
    'sees a scene never downloads it. Something an eager file imports now imports a scene module',
    'statically. Find the import the path above names and make it `import()` again, the way',
    'src/demo/pages/HomeHero.tsx, src/demo/pages/shop/ProductMedia.tsx, src/demo/terrain/Terrain.tsx',
    'and src/components/atoms/loading-animation/LoadingAnimation.tsx do.',
  ])
}

// A gate that cannot fail is not a gate. If no chunk at all contains the marker, either three.js
// is gone from the build or it no longer contains this string; in both cases a pass above would
// mean nothing.
const assetsDir = join(DIST, 'assets')
const scripts = existsSync(assetsDir) ? readdirSync(assetsDir).filter(name => /\.m?js$/.test(name)) : []
const carriers = scripts.filter(name => rendererMarker(readFileSync(join(assetsDir, name), 'utf8')))
if (carriers.length === 0) {
  fail([
    `no chunk in ${assetsDir} contains ${RENDERER_MARKERS.map(m => `"${m}"`).join(' or ')}.`,
    'Either three.js is no longer in the build (then remove this gate and D4 with it), or it no',
    'longer contains the marker and this gate is blind. Update RENDERER_MARKERS in',
    'scripts/lib/chunk-graph.mjs.',
  ])
}

console.log(
  `Chunk gate passed: ${entries.length} entry chunks in index.html, ${reached.length} loaded by every page ` +
    `(static imports followed), ${scripts.length} JavaScript files in ${DIST}/assets, renderer in ` +
    `${carriers.join(', ')} only.`
)
