// Reads each component's real props from the TypeScript program, so a docs table can be checked
// against them. Used by src/components/docs/meta.test.ts and scripts/build-agent-docs.mjs.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

export const TIERS = ['atoms', 'molecules', 'organisms']

/** The Type cell of a row that documents a prop as deliberately not offered. */
export const NOT_OFFERED = '—'

/** Every component folder: `{ tier, slug, dir, metaFile, sourceFiles }`. */
export function componentFolders(root) {
  const folders = []
  for (const tier of TIERS) {
    const tierDir = path.join(root, 'src/components', tier)
    for (const slug of fs.readdirSync(tierDir).sort()) {
      const dir = path.join(tierDir, slug)
      if (!fs.statSync(dir).isDirectory()) continue
      const files = fs.readdirSync(dir)
      folders.push({
        tier,
        slug,
        dir,
        metaFile: files.filter(f => f.endsWith('.meta.ts')).map(f => path.join(dir, f))[0],
        sourceFiles: files
          .filter(f => f.endsWith('.tsx') && !f.endsWith('.test.tsx') && !f.endsWith('Docs.tsx'))
          .map(f => path.join(dir, f)),
      })
    }
  }
  return folders
}

export function createProgram(root) {
  const config = ts.readConfigFile(path.join(root, 'tsconfig.app.json'), ts.sys.readFile)
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root)
  return ts.createProgram(parsed.fileNames, parsed.options)
}

const isOwn = (declaration, root) => {
  const file = path.resolve(declaration.getSourceFile().fileName)
  return file.startsWith(path.resolve(root, 'src')) && !file.includes('node_modules')
}

/** What a tier's barrel exports from each folder: `{ [slug]: { values, types } }`. The barrel is
 *  the public surface; anything a component file exports for its neighbours only is not in it. */
export function publicExports(root, tier) {
  const file = path.join(root, 'src/components', tier, 'index.ts')
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
  const bySlug = {}
  for (const statement of source.statements) {
    if (!ts.isExportDeclaration(statement) || !statement.exportClause || !statement.moduleSpecifier) continue
    const slug = statement.moduleSpecifier.text.split('/')[1]
    const entry = (bySlug[slug] ??= { values: [], types: [], from: [] })
    entry.from.push(statement.moduleSpecifier.text)
    for (const element of statement.exportClause.elements) {
      const isType = statement.isTypeOnly || element.isTypeOnly
      entry[isType ? 'types' : 'values'].push(element.name.text)
    }
  }
  return bySlug
}

/** What a folder's files export, read from the type checker:
 *  - `components[name] = { all, own }` for everything callable with a props object. `all` is every
 *    prop the type accepts; `own` is the subset declared in this repository, which is what a docs
 *    table has to cover (nobody lists every native attribute). A prop typed `never` is one a
 *    union member forbids, not one it takes, so it is in neither.
 *  - `types[name] = [members]` for exported object types, such as the options a hook takes. */
export function exportsOfFolder(program, root, sourceFiles) {
  const checker = program.getTypeChecker()
  const components = {}
  const types = {}
  for (const file of sourceFiles) {
    const source = program.getSourceFile(file)
    const moduleSymbol = source && checker.getSymbolAtLocation(source)
    if (!moduleSymbol) continue
    for (const exported of checker.getExportsOfModule(moduleSymbol)) {
      const symbol = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported
      if (symbol.flags & (ts.SymbolFlags.TypeAlias | ts.SymbolFlags.Interface)) {
        types[exported.name] = checker.getPropertiesOfType(checker.getDeclaredTypeOfSymbol(symbol)).map(p => p.name)
        continue
      }
      const declaration = symbol.valueDeclaration
      if (!declaration || !/^[A-Z]/.test(exported.name)) continue
      const signature = checker.getTypeOfSymbolAtLocation(symbol, declaration).getCallSignatures()[0]
      if (!signature || signature.parameters.length === 0) continue
      const propsType = checker.getTypeOfSymbolAtLocation(signature.parameters[0], declaration)
      const all = new Set()
      const own = new Set()
      for (const member of propsType.isUnion() ? propsType.types : [propsType]) {
        for (const prop of checker.getPropertiesOfType(member)) {
          const type = checker.getNonNullableType(checker.getTypeOfSymbolAtLocation(prop, declaration))
          if (type.flags & ts.TypeFlags.Never) continue
          all.add(prop.name)
          if ((prop.declarations ?? []).some(d => isOwn(d, root))) own.add(prop.name)
        }
      }
      components[exported.name] = { all: [...all].sort(), own: [...own].sort() }
    }
  }
  return { components, types }
}

/** One docs row name, in the forms the tables use:
 *  `'...rest'` -> `{ rest: true }`; `'useToast()'` -> `{ call: 'useToast' }`;
 *  `'side (Content)'` -> `{ props: ['side'], part: 'Content' }`;
 *  `'aria-label / aria-labelledby'` -> `{ props: ['aria-label', 'aria-labelledby'] }`. */
export function parseRowName(name) {
  if (name.startsWith('...')) return { rest: true }
  if (name.endsWith('()')) return { call: name.slice(0, -2) }
  const match = name.match(/^(.+) \(([^)]+)\)$/)
  const props = (match ? match[1] : name).split(' / ')
  return match ? { props, part: match[2] } : { props }
}

const pascal = text => text.replace(/(^|\s+)(\w)/g, (_, _space, letter) => letter.toUpperCase())

/** Which export a `(Part)` qualifier names. Tried in order: the part as written, prefixed with
 *  the component's name, `Root` for the component itself, then the one export ending in it
 *  (`Grid` -> `ProductGrid`). Returns `{ kind: 'component' | 'type', name }` or undefined. */
export function resolvePart(part, componentName, { components, types }) {
  const names = [part, componentName + part, pascal(part), componentName + pascal(part)]
  for (const name of names) if (components[name]) return { kind: 'component', name }
  for (const name of names) if (types[name]) return { kind: 'type', name }
  if (part === 'Root' && components[componentName]) return { kind: 'component', name: componentName }
  const ending = Object.keys(components).filter(name => name.endsWith(pascal(part)))
  return ending.length === 1 ? { kind: 'component', name: ending[0] } : undefined
}

/** Every disagreement between one docs props table and the real props, as sentences that say
 *  what to change. An empty array is a pass. `publicNames` is the barrel's value exports for the
 *  folder: an unqualified row is looked up on those, and coverage is asked of those only. */
export function checkPropsTable(meta, folderExports, publicNames) {
  const { components, types } = folderExports
  const publicComponents = publicNames.filter(name => components[name])
  const problems = []
  const listed = new Set()
  for (const row of meta.props) {
    const parsed = parseRowName(row.name)
    if (parsed.rest) continue
    if (parsed.call) {
      if (!publicNames.includes(parsed.call)) {
        problems.push(`"${row.name}": nothing named ${parsed.call} is exported from the barrel.`)
      }
      continue
    }
    let holders = publicComponents
    let members
    if (parsed.part) {
      const target = resolvePart(parsed.part, meta.name, folderExports)
      if (!target) {
        problems.push(`"${row.name}": no export matches the part "${parsed.part}". Name an exported component or type.`)
        continue
      }
      if (target.kind === 'type') members = types[target.name]
      holders = target.kind === 'component' ? [target.name] : []
    }
    const absent = row.type === NOT_OFFERED
    for (const prop of parsed.props) {
      const accepted = members ? members.includes(prop) : holders.some(name => components[name].all.includes(prop))
      if (absent && accepted) problems.push(`"${row.name}" is documented as not offered, but the type accepts it.`)
      if (!absent && !accepted) {
        problems.push(`"${row.name}": no such prop on ${members ? parsed.part : holders.join(', ')}. Remove the row or fix the name.`)
      }
      for (const name of holders) listed.add(`${name}.${prop}`)
    }
  }
  for (const name of publicComponents) {
    for (const prop of components[name].own) {
      if (prop !== 'children' && !listed.has(`${name}.${prop}`)) {
        problems.push(`${name} takes "${prop}", which the props table does not list. Add a row.`)
      }
    }
  }
  return problems
}
