// The shadcn registry: one installable item per component, plus `division-ds-base` (helpers,
// tokens, styles), written to public/r/ so the docs site serves them next to itself.
//
//   npx shadcn@latest add <REGISTRY_URL>/button.json
//
// Every file lands under src/division-ds/ in the consumer's project with this repository's folder
// layout, so the relative imports inside the components resolve unchanged and no path alias is
// needed. Barrel imports ("../../atoms") are rewritten to the file that exports the name, so an
// organism brings only the atoms it uses. Items are "universal" (type registry:item, every file
// with an explicit target): installing one needs no components.json.
//
// REGISTRY_URL is where the JSON is served from; it only appears in registryDependencies. It has
// nothing to do with where files land, so the /systems/division-ds/ sub-path changes nothing here.
//
//   node scripts/build-registry.mjs           writes public/r/
//   node scripts/build-registry.mjs --check   fails if public/r/ is stale (run by verify)
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, posix } from 'node:path'
import { execFileSync } from 'node:child_process'
import { resolveTokens } from './lib/resolve-tokens.mjs'
import { contrastRatio } from './lib/contrast.mjs'

const REGISTRY_URL = (process.env.REGISTRY_URL ?? 'https://raw.githubusercontent.com/Victor-Ilioiu/division-ds/main/public/r').replace(/\/+$/, '')
const OUT = 'public/r'
const TARGET_ROOT = 'src/division-ds/'
const CHECK = process.argv.includes('--check')

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const versions = { ...pkg.devDependencies, ...pkg.dependencies }
const manifest = JSON.parse(readFileSync('public/manifest/components.json', 'utf8')).components

const read = path => readFileSync(path, 'utf8').replace(/\r\n/g, '\n')
const isSkipped = path => /\.(test|spec)\.tsx?$|Docs\.tsx$|\.meta\.ts$|\/testing\.tsx?$/.test(path)

// Resolve a relative specifier from a repo-relative file to a repo-relative file.
function resolve(from, spec) {
  const base = posix.join(posix.dirname(from), spec)
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]) {
    if (existsSync(candidate) && !readdirSafe(candidate)) return candidate
  }
  throw new Error(`${from}: cannot resolve "${spec}"`)
}
function readdirSafe(path) {
  try { readdirSync(path); return true } catch { return false }
}

// A barrel is an index.ts that only re-exports. Map each exported name to the file it comes from.
function barrelMap(barrel) {
  const map = new Map()
  for (const match of read(barrel).matchAll(/export\s*\{([^}]*)\}\s*from\s*'([^']+)'/g)) {
    const file = resolve(barrel, match[2])
    for (const raw of match[1].split(',')) {
      const name = raw.trim().replace(/^type\s+/, '').split(/\s+as\s+/).pop().trim()
      if (name) map.set(name, file)
    }
  }
  return map
}
const isBarrel = path => /\/index\.tsx?$/.test(path)

// Rewrite `import { A, type B } from '../../atoms'` into one import per source file.
function unbarrel(file, text) {
  return text.replace(/import\s+(type\s+)?\{([^}]*)\}\s*from\s*'(\.[^']*)'/g, (whole, typeOnly, names, spec) => {
    const target = resolve(file, spec)
    if (!isBarrel(target)) return whole
    const map = barrelMap(target)
    const groups = new Map()
    for (const raw of names.split(',').map(s => s.trim()).filter(Boolean)) {
      const name = raw.replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim()
      const source = map.get(name)
      if (!source) throw new Error(`${file}: ${name} is not exported by ${target}`)
      if (!groups.has(source)) groups.set(source, [])
      groups.get(source).push(raw)
    }
    return [...groups].map(([source, list]) => {
      let rel = posix.relative(posix.dirname(file), source).replace(/\.tsx?$/, '')
      if (!rel.startsWith('.')) rel = `./${rel}`
      return `import ${typeOnly ?? ''}{ ${list.join(', ')} } from '${rel}'`
    }).join('\n')
  })
}

const SPEC = /(?:import|export)\s[^'"]*?from\s*'([^']+)'|import\(\s*'([^']+)'\s*\)|import\s*'([^']+)'/g
const packageOf = spec => (spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0])

// Which component folder owns a file, or null for shared files (lib, styles, fx).
const COMPONENT_DIR = /^src\/components\/(atoms|molecules|organisms)\/([^/]+)\//
const ownerOf = path => path.match(COMPONENT_DIR)?.[0] ?? null

const bySourceDir = new Map(manifest.map(c => [posix.dirname(c.source) + '/', c]))
const itemName = c => c.slug

// Walk from an entry, collecting files (rewritten), npm packages and the component folders reached.
function walk(entries, ownDir) {
  const files = new Map()
  const packages = new Set()
  const components = new Set()
  const queue = [...entries]
  while (queue.length) {
    const file = queue.shift()
    if (files.has(file)) continue
    const text = unbarrel(file, read(file))
    files.set(file, text)
    for (const m of text.matchAll(SPEC)) {
      const spec = m[1] ?? m[2] ?? m[3]
      if (!spec.startsWith('.')) { if (!spec.startsWith('node:')) packages.add(packageOf(spec)); continue }
      const target = resolve(file, spec)
      if (isSkipped(target)) throw new Error(`${file} imports test or docs code: ${target}`)
      const owner = ownerOf(target)
      if (owner && owner !== ownDir) { components.add(owner); continue }
      if (target.startsWith('src/lib/') || target.startsWith('src/styles/')) continue // in the base item
      queue.push(target)
    }
  }
  return { files, packages, components }
}

const dependencies = packages => [...packages].sort().map(name => {
  if (!versions[name]) throw new Error(`package ${name} is imported but not in package.json`)
  return `${name}@${versions[name].replace(/^[\^~]/, '^')}`
})
// A package whose types ship separately (three -> @types/three) needs them in the consumer too.
const devDependencies = packages => [...packages].sort().map(name => `@types/${name.replace(/^@/, '').replace('/', '__')}`)
  .filter(types => versions[types]).map(types => `${types}@${versions[types].replace(/^[\^~]/, '^')}`)
const fileEntry = (path, content) => ({ path, type: 'registry:file', target: TARGET_ROOT + path.slice('src/'.length), content })

const items = []

// The base item: helpers, generated tokens and style sheets, and one CSS entry for consumers.
const libFiles = readdirSync('src/lib').filter(f => /\.tsx?$/.test(f) && !isSkipped(`src/lib/${f}`)).map(f => `src/lib/${f}`)
// tokens.css is generated and gitignored, so a fresh clone has none yet. Make it rather than fail.
if (!existsSync('src/styles/tokens.css')) execFileSync(process.execPath, ['scripts/build-tokens.mjs'], { stdio: 'inherit' })
const styleFiles = readdirSync('src/styles').filter(f => f.endsWith('.css') && f !== 'tailwind.css').map(f => `src/styles/${f}`)
const baseWalk = walk(libFiles, null)
// A file outside every component folder that two components reach (src/fx/core/gate.ts: Switch
// and LoadingAnimation) would ship in both items, and `division-ds-all` then reported "Skipped 1
// file" in an empty project (the 2026-10-20 outside test). Such files go in the base instead,
// which every component already depends on.
const componentWalks = manifest.map(component => {
  const dir = posix.dirname(component.source) + '/'
  const entries = readdirSync(dir).map(f => dir + f).filter(p => /\.tsx?$/.test(p) && !isSkipped(p))
  return { component, dir, ...walk(entries, dir) }
})
const reach = new Map()
for (const { files } of componentWalks) for (const path of files.keys()) reach.set(path, (reach.get(path) ?? 0) + 1)
const sharedWalk = walk([...reach].filter(([path, count]) => count > 1 && !ownerOf(path)).map(([path]) => path), null)
const entryCss = read('src/styles/tailwind.css')
  .replace(/@import "tailwindcss"[^;]*;\n/, '')
  .replace(/@source "\.\.\/\.\.\/index\.html";\n/, '')
  .replace(/^\/\* `source\(none\)`[\s\S]*?\*\/\n/, '/* Division DS styles. Import this after `@import "tailwindcss";` in your own CSS entry. */\n')
items.push({
  name: 'division-ds-base',
  type: 'registry:item',
  title: 'Division DS base',
  description: 'Tokens, style sheets and shared helpers. Every component depends on it. Then add @import "./division-ds/styles/division-ds.css"; after @import "tailwindcss"; in your CSS entry.',
  dependencies: dependencies(new Set([...baseWalk.packages, ...sharedWalk.packages])),
  files: [
    ...[...baseWalk.files, ...sharedWalk.files].map(([path, content]) => fileEntry(path, content)),
    ...styleFiles.map(path => fileEntry(path, read(path))),
    { path: 'src/styles/division-ds.css', type: 'registry:file', target: `${TARGET_ROOT}styles/division-ds.css`, content: entryCss },
  ],
})

for (const { component, dir, files, packages, components } of componentWalks) {
  const deps = [...components].map(d => {
    const owner = bySourceDir.get(d)
    if (!owner) throw new Error(`${dir} imports ${d}, which is not a manifest component`)
    return `${REGISTRY_URL}/${itemName(owner)}.json`
  })
  items.push({
    name: itemName(component),
    type: 'registry:item',
    title: component.title,
    description: component.useWhen ? `${component.title}. Best for: ${component.useWhen}` : component.title,
    dependencies: dependencies(packages),
    ...(devDependencies(packages).length ? { devDependencies: devDependencies(packages) } : {}),
    registryDependencies: [`${REGISTRY_URL}/division-ds-base.json`, ...deps.sort()],
    files: [...files].filter(([path]) => !sharedWalk.files.has(path)).map(([path, content]) => fileEntry(path, content)),
  })
}

// One owner per installed path, or shadcn skips the second copy and says so.
const owners = new Map()
for (const item of items) for (const file of item.files) {
  if (owners.has(file.target)) throw new Error(`${file.target} ships in both ${owners.get(file.target)} and ${item.name}`)
  owners.set(file.target, item.name)
}

// The whole library in one command. No files of its own: it only depends on every other item.
items.push({
  name: 'division-ds-all',
  type: 'registry:item',
  title: 'Division DS, every component',
  description: 'Installs the base and all components in one command.',
  registryDependencies: items.map(item => `${REGISTRY_URL}/${item.name}.json`),
  files: [],
})

// The look without the components: a registry:theme whose cssVars map Division's semantic tokens
// onto shadcn's own variable names, so `shadcn add .../division-ds-theme.json` restyles an
// existing shadcn app. shadcn writes `light` to :root and `dark` to .dark. Not in
// division-ds-all: Division's own components read --color-*, which division-ds-base already ships.
const themeTokens = Object.fromEntries(['light', 'dark'].map(theme => [theme, resolveTokens(
  JSON.parse(read('tokens/primitive/color.json')), JSON.parse(read(`tokens/semantic/color.${theme}.json`)))]))
const SHADCN_VARS = {
  background: 'surface-base', foreground: 'text-primary',
  card: 'surface-raised', 'card-foreground': 'text-primary',
  popover: 'surface-sunken', 'popover-foreground': 'text-primary',
  primary: 'accent-signal-fill', 'primary-foreground': 'accent-signal-ink',
  secondary: 'surface-sunken', 'secondary-foreground': 'text-primary',
  muted: 'surface-sunken', 'muted-foreground': 'text-secondary',
  // shadcn's accent is the quiet hover/selected background (menu items, ghost buttons), not the brand.
  accent: 'surface-sunken', 'accent-foreground': 'text-primary',
  // shadcn's destructive Button paints this as TEXT on a 10% tint of itself (20% in dark), so it
  // is the text red, not the fill red: the fill measured 3.09:1 there in a real install.
  destructive: 'accent-hostile-text',
  border: 'border-hairline', input: 'border-control', ring: 'focus-ring',
  'chart-1': 'chart-series-1', 'chart-2': 'chart-series-2',
}
const shadcnVars = theme => Object.fromEntries(Object.entries(SHADCN_VARS).map(([name, token]) => [name, themeTokens[theme][`--color-${token}`]]))
const cssVars = { light: { radius: '0rem', ...shadcnVars('light') }, dark: shadcnVars('dark') }
// The mapping is new pairs of the same values, so measure the ones shadcn components paint
// together. A mapping that fails here fails the build (and check:registry), not a consumer's app.
for (const theme of ['light', 'dark']) {
  const v = cssVars[theme]
  const pairs = [
    ['foreground', 'background', 4.5], ['card-foreground', 'card', 4.5], ['popover-foreground', 'popover', 4.5],
    ['primary-foreground', 'primary', 4.5], ['secondary-foreground', 'secondary', 4.5],
    ['muted-foreground', 'muted', 4.5], ['muted-foreground', 'background', 4.5],
    ['accent-foreground', 'accent', 4.5], ['ring', 'background', 3], ['input', 'background', 3],
  ]
  for (const [fg, bg, min] of pairs) {
    const ratio = contrastRatio(v[fg], v[bg], v.background)
    if (ratio < min) throw new Error(`division-ds-theme (${theme}): --${fg} on --${bg} is ${ratio.toFixed(2)}:1, needs ${min}:1`)
  }
  // The destructive Button: text-destructive on bg-destructive/10 (dark: /20), over the page.
  const tint = `rgba(${[1, 3, 5].map(i => parseInt(v.destructive.slice(i, i + 2), 16)).join(', ')}, ${theme === 'light' ? 0.1 : 0.2})`
  for (const [bg, name] of [[v.background, '--background'], [tint, 'its own tint']]) {
    const ratio = contrastRatio(v.destructive, bg, v.background)
    if (ratio < 4.5) throw new Error(`division-ds-theme (${theme}): --destructive on ${name} is ${ratio.toFixed(2)}:1, needs 4.5:1`)
  }
}
items.push({
  name: 'division-ds-theme',
  type: 'registry:theme',
  title: 'Division DS theme',
  description: "Division DS's colours for an existing shadcn app: its semantic tokens mapped onto shadcn's variables, light and dark, with square corners.",
  cssVars,
  files: [],
})

const SCHEMA_ITEM ='https://ui.shadcn.com/schema/registry-item.json'
const outputs = new Map(items.map(item => [`${item.name}.json`, JSON.stringify({ $schema: SCHEMA_ITEM, ...item }, null, 2) + '\n']))
outputs.set('registry.json', JSON.stringify({
  $schema: 'https://ui.shadcn.com/schema/registry.json',
  name: 'division-ds',
  homepage: 'https://victor-ilioiu.vercel.app/systems/division-ds/',
  items: items.map(({ files, ...rest }) => ({ ...rest, files: files.map(({ content, ...f }) => f) })),
}, null, 2) + '\n')

if (CHECK) {
  const stale = [...outputs].filter(([name, text]) => !existsSync(join(OUT, name)) || read(join(OUT, name)) !== text).map(([n]) => n)
  const extra = existsSync(OUT) ? readdirSync(OUT).filter(n => !outputs.has(n)) : []
  if (stale.length || extra.length) {
    console.error(`Registry is stale: ${stale.length} changed, ${extra.length} extra.\n  ${[...stale, ...extra].slice(0, 10).join('\n  ')}\nRun: npm run registry`)
    process.exit(1)
  }
  console.log(`Registry is current: ${items.length} items.`)
} else {
  rmSync(OUT, { recursive: true, force: true })
  mkdirSync(OUT, { recursive: true })
  for (const [name, text] of outputs) writeFileSync(join(OUT, name), text)
  const kb = Math.round([...outputs.values()].reduce((n, t) => n + t.length, 0) / 1024)
  console.log(`Registry: ${items.length} items, ${kb} kB, written to ${OUT}/ (served from ${REGISTRY_URL}).`)
}
