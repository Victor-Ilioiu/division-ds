// The chunk-graph matcher behind decision D4 in design.md: three.js never lands in a chunk every
// page loads. `scripts/check-chunks.mjs` is the CLI that reads `dist/` after a build and owns the
// exit code; this file is the pure part (parse the built index.html, parse a built chunk's static
// imports, walk the graph, look for the renderer), the same split check-contrast.mjs,
// check-vocabulary.mjs and check-button-spacing.mjs use, so the rules are unit-tested without a
// build.
//
// Why a gate. three.js is about 580 kB minified. It is used in four places (the loader atom, the
// homepage hero, the product viewer, the footer's terrain) and every one of them reaches it
// through a dynamic `import()`, so a visitor who never sees a scene never downloads it. One
// static `import` of a scene module from a file the app loads eagerly undoes that for every page,
// silently: the build still passes, every test still passes, and the main chunk is 580 kB
// heavier. Until 2026-10-02 the check was `grep -c WebGLRenderer dist/assets/index-*.js`, typed
// by hand by whoever remembered to.
//
// What "every page loads" means here: the module script in the built index.html, every
// `<link rel="modulepreload">` beside it (Vite lists the entry's static dependencies there), and
// everything any of those reaches through STATIC imports. A dynamic `import()` is the boundary
// the rule exists to keep, so it is not followed.
//
// What this does not cover, stated so nobody reads more into a green line than is there:
// - It finds the renderer by a marker string, not by resolving modules. If three.js stopped
//   containing that string the gate would be blind, so the runner fails when NO chunk contains
//   it.
// - It reads Vite's ES-module output with regular expressions. A different output format (IIFE,
//   SystemJS) is not parsed and would have to be handled before it could pass.
// - It says nothing about a chunk that a ROUTE loads eagerly. The product page's chunk reaching
//   the viewer statically would be caught only if the entry reaches that chunk statically, which
//   it does not; `e2e/product-viewer.spec.ts` holds that case against the dev server.
// - It does not measure size. A large chunk that is not three.js passes.

/** A string every build of three.js's WebGL renderer contains (its own warning and error
 *  messages name the class), and that application code has no reason to contain. */
export const RENDERER_MARKERS = ['WebGLRenderer']

/** Strips a query string or hash and a leading `./` or `/`, and resolves `..` and `.` segments,
 *  so `/assets/index-abc.js?v=1` and `assets/index-abc.js` are one key. */
export function normalizePath(path) {
  const clean = path.replace(/[?#].*$/, '')
  const out = []
  for (const part of clean.split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') out.pop()
    else out.push(part)
  }
  return out.join('/')
}

/** `spec` as written inside the chunk at `from`, as a path from the build's root. A relative
 *  specifier resolves against the importing chunk's folder; an absolute one against the root. */
export function resolveSpecifier(from, spec) {
  if (spec.startsWith('/')) return normalizePath(spec)
  const folder = from.split('/').slice(0, -1).join('/')
  return normalizePath(`${folder}/${spec}`)
}

const attribute = (tag, name) => new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i').exec(tag)

/**
 * The JavaScript files the built index.html makes every page fetch: each `<script type="module"
 * src>` and each `<link rel="modulepreload" href>`. Local files only: a script on another origin
 * is not part of this build.
 */
export function entryChunks(html) {
  const found = []
  const add = value => {
    if (!value || /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(value)) return
    const path = normalizePath(value)
    if (/\.m?js$/.test(path) && !found.includes(path)) found.push(path)
  }
  for (const [tag] of html.matchAll(/<script\b[^>]*>/gi)) {
    const type = attribute(tag, 'type')
    if ((type?.[1] ?? type?.[2]) !== 'module') continue
    const src = attribute(tag, 'src')
    add(src?.[1] ?? src?.[2])
  }
  for (const [tag] of html.matchAll(/<link\b[^>]*>/gi)) {
    const rel = attribute(tag, 'rel')
    if (!/\bmodulepreload\b/i.test(rel?.[1] ?? rel?.[2] ?? '')) continue
    const href = attribute(tag, 'href')
    add(href?.[1] ?? href?.[2])
  }
  return found
}

// `import{a}from"./x.js"`, `import x from"./x.js"`, `import*as x from"./x.js"`, `import"./x.js"`,
// `export{a}from"./x.js"`, `export*from"./x.js"`. The clause between the keyword and the
// specifier may hold neither a quote, a parenthesis nor a semicolon: that is what keeps a
// dynamic `import("./x.js")` out, and what stops an `export{a};` from being joined to a `from`
// further along the same minified line.
const STATIC_IMPORT = /(?<![\w$.])(?:import|export)\s*(?:[^"'`();]*?\bfrom\s*)?(?:"([^"]+)"|'([^']+)')/g

/** The specifiers a built ES-module chunk imports statically, in order, without duplicates.
 *  Only relative and root-absolute specifiers: a bare one would be an unbundled dependency, which
 *  Vite's browser build does not emit. */
export function staticImports(code) {
  const found = []
  for (const match of code.matchAll(STATIC_IMPORT)) {
    const spec = match[1] ?? match[2]
    if (!/^\.{0,2}\//.test(spec)) continue
    if (!found.includes(spec)) found.push(spec)
  }
  return found
}

/** The first marker `code` contains, or null. */
export function rendererMarker(code, markers = RENDERER_MARKERS) {
  return markers.find(marker => code.includes(marker)) ?? null
}

/**
 * Walks from the entry chunks through static imports and reports every reached chunk that
 * contains the renderer.
 *
 * `readChunk(path)` returns the chunk's text, or null when the file does not exist (reported as
 * `missing`, since a graph with a hole in it has not been checked).
 *
 * Returns `entries` (from the HTML), `reached` (every chunk a page loads, entries included, in
 * the order found), `violations` (`{ file, marker, chain }`, where `chain` is the import path
 * from an entry to the file) and `missing`.
 */
export function findRendererInEntryGraph({ html, readChunk, markers = RENDERER_MARKERS }) {
  const entries = entryChunks(html)
  const chains = new Map(entries.map(entry => [entry, [entry]]))
  const queue = [...entries]
  const violations = []
  const missing = []
  while (queue.length > 0) {
    const file = queue.shift()
    const chain = chains.get(file)
    const code = readChunk(file)
    if (code == null) {
      missing.push({ file, chain })
      continue
    }
    const marker = rendererMarker(code, markers)
    if (marker) violations.push({ file, marker, chain })
    for (const spec of staticImports(code)) {
      const target = resolveSpecifier(file, spec)
      if (!/\.m?js$/.test(target) || chains.has(target)) continue
      chains.set(target, [...chain, target])
      queue.push(target)
    }
  }
  return { entries, reached: [...chains.keys()], violations, missing }
}

export function formatViolation({ file, marker, chain }) {
  const how = chain.length > 1 ? `reached by static import: ${chain.join(' -> ')}` : 'named in index.html'
  return `${file} contains "${marker}" (${how})`
}
