// The `division-ds` npm package: only the checker and what it reads at run time, so
// `npx division-ds check` works in a project that installed the components with shadcn.
//
//   node scripts/build-cli-package.mjs <version>    writes cli-package/
//   cd cli-package && npm publish                   (see commands.md, "Publish the checker to npm")
//
// The files keep this repository's layout (scripts/, scripts/lib/, public/manifest/, AGENTS.md),
// so division-ds.mjs finds them beside itself exactly as it does here.
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, posix } from 'node:path'

const OUT = 'cli-package'
const ENTRY = 'scripts/division-ds.mjs'
const version = process.argv[2]
if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(version ?? '')) {
  console.error('Usage: node scripts/build-cli-package.mjs <version>   (e.g. 0.1.0)')
  process.exit(1)
}

// Every module the entry reaches through relative imports. Tests are never imported, so never copied.
const modules = new Set()
const queue = [ENTRY]
while (queue.length) {
  const file = queue.shift()
  if (modules.has(file)) continue
  modules.add(file)
  for (const m of readFileSync(file, 'utf8').matchAll(/^import\s[^'\n]*?from\s+'(\.[^']+)'/gm)) queue.push(posix.join(posix.dirname(file), m[1]))
}

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const versions = { ...pkg.dependencies, ...pkg.devDependencies }
const packages = new Set()
for (const file of modules) {
  for (const m of readFileSync(file, 'utf8').matchAll(/^import\s[^'\n]*?from\s+'([^.'][^']*)'/gm)) {
    if (!m[1].startsWith('node:')) packages.add(m[1])
  }
}

const files = [...modules, 'public/manifest/components.json', 'public/manifest/tokens.json', 'AGENTS.md']
rmSync(OUT, { recursive: true, force: true })
for (const file of files) {
  mkdirSync(join(OUT, dirname(file)), { recursive: true })
  copyFileSync(file, join(OUT, file))
}
copyFileSync('public-repo/LICENSE', join(OUT, 'LICENSE'))

writeFileSync(join(OUT, 'package.json'), JSON.stringify({
  name: 'division-ds',
  version,
  description: 'Checks a project that uses Division DS components: raw colours, invented tokens, touching buttons, unknown props.',
  license: 'MIT',
  author: 'Victor Ilioiu',
  homepage: 'https://victor-ilioiu.vercel.app/systems/division-ds/',
  repository: { type: 'git', url: 'git+https://github.com/Victor-Ilioiu/division-ds.git' },
  type: 'module',
  bin: { 'division-ds': ENTRY },
  engines: { node: '>=22' },
  dependencies: Object.fromEntries([...packages].sort().map(name => {
    if (!versions[name]) throw new Error(`${name} is imported by the checker but not in package.json`)
    return [name, versions[name]]
  })),
}, null, 2) + '\n')

writeFileSync(join(OUT, 'README.md'), `# division-ds

The checker for [Division DS](https://github.com/Victor-Ilioiu/division-ds), for a project that uses
its components (for example installed with shadcn).

\`\`\`bash
npx division-ds check src
\`\`\`

It flags a raw colour, a Tailwind palette class, a token name that does not exist, two buttons with
no gap between them, an unknown prop and a value outside a prop's union, and says what to write
instead. It exits 1 on any finding. Node 22 or newer.

\`\`\`bash
npx division-ds rules     # writes the Division DS rules into AGENTS.md / CLAUDE.md and similar
npx division-ds help
\`\`\`

The components, the docs and the agent skill: https://github.com/Victor-Ilioiu/division-ds
`)

if (!existsSync(join(OUT, ENTRY))) throw new Error('entry missing')
console.log(`cli-package/: division-ds@${version}, ${files.length} files, dependencies: ${[...packages].join(', ') || 'none'}.`)
