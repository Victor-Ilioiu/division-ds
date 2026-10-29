import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  componentMarkdown,
  componentsBundle,
  designFile,
  extractRules,
  helpersPage,
  guidelinesFile,
  llmsIndex,
  manifestEntry,
  rulesByTopic,
  searchIndex,
  skillFiles,
  tokensBundle,
} from './lib/agent-docs.mjs'
import { componentFolders, publicExports, REPO_ROOT, TIERS } from './lib/component-props.mjs'
import { extractExamples } from './lib/doc-examples.mjs'
import { exportedApi } from './lib/exported-api.mjs'

// Writes everything an agent reads, from the same sources the docs site renders:
//
//   <Name>.meta.ts      -> props, keyboard, do and don't, requirements, mistakes
//   <Name>Docs.tsx      -> the examples, as the source that is compiled and shown
//   the tier barrels    -> the import line
//   AGENTS.md (Rules)   -> llms-guidelines.txt, and the skill split by its topic markers:
//                          skills/division-ds/SKILL.md (core), topics/*.md, commands/*.md
//   manifest/tokens.json (from `npm run tokens`) -> llms-tokens.txt
//
// The outputs are committed, so an agent working in the repository has them without a build, and
// src/components/docs/agent-docs.test.ts fails when one is stale. `--check` does the same from
// the command line.

const posix = path => path.split('\\').join('/')

/** The skill folder. Everything in it is generated, so a file there that the generator no longer
 *  writes (a topic that was renamed) is an orphan and is removed, like a removed component's page. */
const SKILL_DIR = 'skills/division-ds'

/** Every output as `{ [repo-relative path]: text }`. Nothing is written here. */
export async function buildAgentDocs(root = REPO_ROOT) {
  const barrels = Object.fromEntries(TIERS.map(tier => [tier, publicExports(root, tier)]))
  const entries = []
  for (const folder of componentFolders(root)) {
    const { meta } = await import(pathToFileURL(folder.metaFile).href)
    const docsFile = readdirSync(folder.dir).find(file => file.endsWith('Docs.tsx'))
    const examples = extractExamples(readFileSync(join(folder.dir, docsFile), 'utf8'), docsFile).map(
      ({ caption, source }) => ({ caption, source })
    )
    // One import line per file the barrel re-exports from, values only: types are not needed to
    // use a component, and `import { type X }` in an example nobody asked for is noise.
    const barrel = readFileSync(join(root, 'src/components', folder.tier, 'index.ts'), 'utf8')
    const imports = barrels[folder.tier][folder.slug].from
      .map(from => {
        const block = barrel.match(new RegExp(`export \\{([^}]*)\\} from '${from.replace(/[.]/g, '\\.')}'`))[1]
        const names = block
          .split(',')
          .map(name => name.trim())
          .filter(name => name && !name.startsWith('type '))
        return { names, from: `src/components/${folder.tier}/${from.slice(2)}` }
      })
      .filter(line => line.names.length > 0)
    // The types and helpers the barrel exports beside the components. `<Name>Props` types are
    // left out: the props table already is that type, checked against it.
    const publicNames = [...barrels[folder.tier][folder.slug].values, ...barrels[folder.tier][folder.slug].types]
    const api = barrels[folder.tier][folder.slug].from.flatMap(from => {
      const file = join(root, 'src/components', folder.tier, `${from.slice(2)}.tsx`)
      return exportedApi(readFileSync(file, 'utf8'), file, publicNames.filter(name => !name.endsWith('Props'))).map(
        entry => ({ ...entry, from: `src/components/${folder.tier}/${from.slice(2)}` })
      )
    })
    entries.push(
      manifestEntry(meta, {
        imports,
        api,
        examples,
        source: posix(relative(root, join(folder.dir, `${meta.name}.tsx`))),
      })
    )
  }

  const agentsMd = readFileSync(join(root, 'AGENTS.md'), 'utf8')
  const rules = extractRules(agentsMd)
  const tokens = JSON.parse(readFileSync(join(root, 'public/manifest/tokens.json'), 'utf8'))

  const helpers = readdirSync(join(root, 'src/lib'))
    .filter(file => /\.tsx?$/.test(file) && !file.includes('.test.'))
    .sort()
    .map(file => ({
      from: `src/lib/${file.replace(/\.tsx?$/, '')}`,
      api: exportedApi(readFileSync(join(root, 'src/lib', file), 'utf8'), file),
    }))

  // The three font stacks, read from the theme rather than copied, so DESIGN.md follows a change.
  const fonts = [...readFileSync(join(root, 'src/styles/tailwind.css'), 'utf8').matchAll(/--font-([a-z]+):\s*([^;]+);/g)].map(
    ([, name, stack]) => ({ name, stack: stack.trim() })
  )

  const files = {
    'public/llms.txt': llmsIndex(entries, { rules }),
    'public/DESIGN.md': designFile(entries, tokens, { fonts, rules }),
    'public/docs/helpers.md': helpersPage(helpers),
    'public/llms-components.txt': componentsBundle(entries),
    'public/llms-tokens.txt': tokensBundle(tokens),
    'public/search-index.json': searchIndex(entries, tokens),
    'public/llms-guidelines.txt': guidelinesFile(rules),
    'public/manifest/components.json':
      JSON.stringify({ generatedBy: 'scripts/build-agent-docs.mjs', components: entries }, null, 2) + '\n',
  }
  for (const [path, text] of Object.entries(skillFiles(rulesByTopic(agentsMd), entries.length))) {
    files[`${SKILL_DIR}/${path}`] = text
  }
  for (const entry of entries) files[`public/docs/components/${entry.slug}.md`] = componentMarkdown(entry)
  return files
}

/** Every file under `dir`, recursively, as repo-relative posix paths. */
function filesUnder(root, dir) {
  const abs = join(root, dir)
  if (!existsSync(abs)) return []
  return readdirSync(abs, { withFileTypes: true }).flatMap(item =>
    item.isDirectory() ? filesUnder(root, `${dir}/${item.name}`) : [`${dir}/${item.name}`]
  )
}

/** The outputs that differ from what is on disk, plus pages left behind by a removed component. */
export function staleFiles(files, root = REPO_ROOT) {
  const stale = Object.entries(files)
    .filter(([path, text]) => !existsSync(join(root, path)) || readFileSync(join(root, path), 'utf8') !== text)
    .map(([path]) => path)
  // Two folders the generator owns whole: the component pages (public/docs/ itself also holds
  // helpers.md, which is in `files`) and the skill, with its topics/ and commands/.
  const orphans = ['public/docs/components', SKILL_DIR]
    .flatMap(dir => filesUnder(root, dir))
    .filter(path => !(path in files))
  return [...stale, ...orphans]
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const files = await buildAgentDocs()
  const stale = staleFiles(files)
  if (process.argv.includes('--check')) {
    if (stale.length > 0) {
      console.error(`Agent docs are stale: ${stale.length} file(s).\n  ${stale.join('\n  ')}\nRun: npm run agent-docs`)
      process.exit(1)
    }
    console.log(`Agent docs are current: ${Object.keys(files).length} files.`)
  } else {
    for (const path of stale) {
      const target = join(REPO_ROOT, path)
      if (path in files) {
        mkdirSync(dirname(target), { recursive: true })
        writeFileSync(target, files[path])
      } else rmSync(target)
    }
    const bytes = Object.values(files).reduce((sum, text) => sum + Buffer.byteLength(text), 0)
    console.log(`Agent docs: ${Object.keys(files).length} files, ${Math.round(bytes / 1024)} kB, ${stale.length} written.`)
  }
}
