import { describe, it, expect } from 'vitest'
import {
  RENDERER_MARKERS,
  entryChunks,
  findRendererInEntryGraph,
  formatViolation,
  normalizePath,
  rendererMarker,
  resolveSpecifier,
  staticImports,
} from './chunk-graph.mjs'

/**
 * The matcher behind the post-build chunk gate (design.md, D4). What is asserted here is what
 * decides whether a green line means anything: that the entry set is read from the HTML the way
 * Vite writes it, that a static import is followed and a dynamic one is not, that the renderer
 * is found at any depth with the path that led to it, and that a hole in the graph is reported
 * instead of being read as clean.
 */

// The shape of a real build's index.html (2026-10-02), cut down.
const HTML = `<!doctype html>
<html lang="en">
  <head>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Saira" rel="stylesheet" />
    <script type="module" crossorigin src="/assets/index-CmHquggc.js"></script>
    <link rel="modulepreload" crossorigin href="/assets/rolldown-runtime-hePW80VL.js">
    <link rel="modulepreload" crossorigin href="/assets/atoms-CqV7KkzI.js">
    <link rel="stylesheet" crossorigin href="/assets/index-BtyLxGwl.css">
  </head>
  <body><div id="root"></div></body>
</html>`

const graph = files => path => files[path] ?? null

describe('normalizePath and resolveSpecifier', () => {
  it('reads a root-absolute path, a relative one and one with a query as the same file', () => {
    expect(normalizePath('/assets/index-a.js')).toBe('assets/index-a.js')
    expect(normalizePath('./assets/index-a.js?v=3#x')).toBe('assets/index-a.js')
  })

  it('resolves a specifier against the importing chunk, not against the root', () => {
    expect(resolveSpecifier('assets/index-a.js', './atoms-b.js')).toBe('assets/atoms-b.js')
    expect(resolveSpecifier('assets/nested/a.js', '../b.js')).toBe('assets/b.js')
    expect(resolveSpecifier('assets/index-a.js', '/assets/c.js')).toBe('assets/c.js')
  })
})

describe('entryChunks', () => {
  it('returns the module script and every modulepreload, and nothing else', () => {
    expect(entryChunks(HTML)).toEqual([
      'assets/index-CmHquggc.js',
      'assets/rolldown-runtime-hePW80VL.js',
      'assets/atoms-CqV7KkzI.js',
    ])
  })

  it('ignores a classic script, an inline module, a stylesheet and a script on another origin', () => {
    const html = `
      <script src="/legacy.js"></script>
      <script type="module">console.log(1)</script>
      <script type="module" src="https://cdn.example.com/x.js"></script>
      <script type="module" src="//cdn.example.com/y.js"></script>
      <link rel="stylesheet" href="/assets/index.css">
      <link rel="preload" as="script" href="/assets/later.js">`
    expect(entryChunks(html)).toEqual([])
  })

  it('reads single-quoted attributes in either order, and lists a file once', () => {
    const html = `<script src='/assets/a.js' type='module'></script><link href="/assets/a.js" rel="modulepreload">`
    expect(entryChunks(html)).toEqual(['assets/a.js'])
  })
})

describe('staticImports', () => {
  it('finds every static form a minified ES chunk uses', () => {
    const code = [
      'import{a as b,c}from"./one.js";',
      'import d from"./two.js";',
      'import*as e from"./three-ns.js";',
      'import"./four.js";',
      'export{f}from"./five.js";',
      'export*from"./six.js";',
      "import{g}from'./seven.js';",
    ].join('')
    expect(staticImports(code)).toEqual([
      './one.js',
      './two.js',
      './three-ns.js',
      './four.js',
      './five.js',
      './six.js',
      './seven.js',
    ])
  })

  // The boundary the whole rule rests on.
  it('does not follow a dynamic import, in either shape Vite writes', () => {
    const code =
      'const s=()=>import("./scene-a.js");' +
      'const t=()=>__vite__mapDeps(()=>import("./hero-b.js"),[0,1]);' +
      'const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/scene-a.js","assets/loop-c.js"])))=>i.map(i=>d[i]);'
    expect(staticImports(code)).toEqual([])
  })

  it('does not join an export list to a later string, or read a property called import', () => {
    expect(staticImports('export{a as b};const from="./not-an-import.js";')).toEqual([])
    expect(staticImports('x.import"./nope.js";y.$import("./nope.js")')).toEqual([])
  })

  it('lists a specifier once however often it is imported', () => {
    expect(staticImports('import{a}from"./x.js";import{b}from"./x.js";')).toEqual(['./x.js'])
  })
})

describe('rendererMarker', () => {
  it('names the marker a chunk contains, and null for a chunk without one', () => {
    expect(RENDERER_MARKERS).toContain('WebGLRenderer')
    expect(rendererMarker('z(`WebGLRenderer:`,l,`not supported`)')).toBe('WebGLRenderer')
    expect(rendererMarker('const loader="LoadingAnimation"')).toBeNull()
  })
})

describe('findRendererInEntryGraph', () => {
  const CLEAN = {
    'assets/index-CmHquggc.js':
      'import{r}from"./rolldown-runtime-hePW80VL.js";import{B}from"./atoms-CqV7KkzI.js";const s=()=>import("./loop-x.js");',
    'assets/rolldown-runtime-hePW80VL.js': 'export const r=1;',
    'assets/atoms-CqV7KkzI.js': 'import{c}from"./shared-y.js";export const B=c;',
    'assets/shared-y.js': 'export const c=2;',
    'assets/loop-x.js': 'class Q{}z(`WebGLRenderer:`);export{Q}',
  }

  it('passes when the renderer is only behind a dynamic import, and reports what it reached', () => {
    const result = findRendererInEntryGraph({ html: HTML, readChunk: graph(CLEAN) })
    expect(result.violations).toEqual([])
    expect(result.missing).toEqual([])
    expect(result.entries).toHaveLength(3)
    // The three from the HTML and the one atoms imports. Not loop: nothing reaches it statically.
    expect(result.reached).toEqual([
      'assets/index-CmHquggc.js',
      'assets/rolldown-runtime-hePW80VL.js',
      'assets/atoms-CqV7KkzI.js',
      'assets/shared-y.js',
    ])
  })

  it('fails when the entry chunk itself contains the renderer', () => {
    const files = { ...CLEAN, 'assets/index-CmHquggc.js': CLEAN['assets/index-CmHquggc.js'] + 'z(`WebGLRenderer:`)' }
    const { violations } = findRendererInEntryGraph({ html: HTML, readChunk: graph(files) })
    expect(violations).toEqual([
      { file: 'assets/index-CmHquggc.js', marker: 'WebGLRenderer', chain: ['assets/index-CmHquggc.js'] },
    ])
  })

  // What a static `import './scene'` in an eager file produces: the entry stays small and a
  // chunk it imports carries three.js. A grep of index-*.js alone passes on this.
  it('fails when a chunk reached through two static imports contains it, and gives the path', () => {
    const files = {
      ...CLEAN,
      'assets/shared-y.js': 'import{Q}from"./loop-x.js";export const c=Q;',
    }
    const { violations, reached } = findRendererInEntryGraph({ html: HTML, readChunk: graph(files) })
    expect(reached).toContain('assets/loop-x.js')
    expect(violations).toEqual([
      {
        file: 'assets/loop-x.js',
        marker: 'WebGLRenderer',
        // From atoms, not from index: atoms is a modulepreload, so it is an entry in its own
        // right and the path is the shortest one.
        chain: ['assets/atoms-CqV7KkzI.js', 'assets/shared-y.js', 'assets/loop-x.js'],
      },
    ])
    expect(formatViolation(violations[0])).toBe(
      'assets/loop-x.js contains "WebGLRenderer" (reached by static import: ' +
        'assets/atoms-CqV7KkzI.js -> assets/shared-y.js -> assets/loop-x.js)'
    )
  })

  it('fails on a modulepreload that is the renderer, and says index.html named it', () => {
    const html = HTML.replace('atoms-CqV7KkzI.js', 'loop-x.js')
    const { violations } = findRendererInEntryGraph({ html, readChunk: graph(CLEAN) })
    expect(violations).toHaveLength(1)
    expect(formatViolation(violations[0])).toBe('assets/loop-x.js contains "WebGLRenderer" (named in index.html)')
  })

  it('reports a chunk it could not read instead of treating it as clean', () => {
    const { ['assets/shared-y.js']: _gone, ...files } = CLEAN
    const { missing, violations } = findRendererInEntryGraph({ html: HTML, readChunk: graph(files) })
    expect(violations).toEqual([])
    expect(missing).toEqual([
      {
        file: 'assets/shared-y.js',
        chain: ['assets/atoms-CqV7KkzI.js', 'assets/shared-y.js'],
      },
    ])
  })

  it('terminates on an import cycle', () => {
    const files = {
      'assets/index-CmHquggc.js': 'import"./a.js";',
      'assets/rolldown-runtime-hePW80VL.js': '',
      'assets/atoms-CqV7KkzI.js': '',
      'assets/a.js': 'import"./b.js";',
      'assets/b.js': 'import"./a.js";',
    }
    const { reached } = findRendererInEntryGraph({ html: HTML, readChunk: graph(files) })
    expect(reached.filter(file => file === 'assets/a.js' || file === 'assets/b.js')).toEqual(['assets/a.js', 'assets/b.js'])
  })

  it('finds no entry in a page without a module script', () => {
    expect(findRendererInEntryGraph({ html: '<html></html>', readChunk: () => null }).entries).toEqual([])
  })
})
