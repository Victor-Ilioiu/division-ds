#!/usr/bin/env node
// division-ds: the system's gates and rules, for a project that USES the components.
//
//   division-ds check [files, dirs or globs...]   token discipline, touching buttons, props
//   division-ds rules [--target <dir>] ...         install the agent rules into a project
//   division-ds help
//
// Inside this repository `npm run verify` is the loop. A consumer project has none of that: an
// agent building a screen there gets no gate at all unless one is brought to it. This is that
// gate, reusing the same rule modules (scripts/lib/token-discipline.mjs, button-spacing.mjs) plus
// the props validator (props-validator.mjs), and the same AGENTS.md rules (agent-docs.mjs).
//
// Published to npm as `division-ds` (only this file, the modules it imports, the two manifests and
// AGENTS.md: scripts/build-cli-package.mjs), so `npx division-ds check src` works anywhere. From a
// clone, call it by path: `node <path-to-division-ds>/scripts/division-ds.mjs check src`. It needs
// Node 22+ (fs.globSync) and `typescript`, which the npm package declares as its one dependency.
import { existsSync, globSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { extractRules } from './lib/agent-docs.mjs'
import { findViolations as buttonSpacing, formatViolation as formatButtonSpacing } from './lib/button-spacing.mjs'
import { buildIndex, findPropViolations, formatPropViolation } from './lib/props-validator.mjs'
import { applyPlan, diff, planRules, TARGETS } from './lib/rules-installer.mjs'
import { findViolations as tokenDiscipline, formatViolation as formatTokenDiscipline } from './lib/token-discipline.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DEFAULT_MANIFEST = join(ROOT, 'public/manifest/components.json')
const CHECKED = /\.(tsx|jsx|ts)$/
const SKIPPED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage'])

const HELP = `division-ds: Division DS gates and agent rules for a project that uses the components.

Usage:
  division-ds check [paths...] [--manifest <path|url>] [--tokens <path|url>] [--json]
      Checks .tsx, .jsx and .ts files (default: ./src). A path may be a file, a directory or a
      glob ("src/**/*.tsx"). Runs three gates and exits 1 on any finding:
        token-discipline   raw colours, Tailwind palette classes, token names that do not exist
        button-spacing     two Buttons/IconButtons side by side with no gap on their parent
        props              an unknown prop or an enum value outside the union, on elements
                           imported from Division DS (components/atoms|molecules|organisms, or
                           the package name); a component of your own with the same name is skipped
      --manifest  components.json to check props against (default: the one beside this script)
      --tokens    tokens.json for token names (default: tokens.json beside the manifest)
      --json      one JSON object on stdout instead of text

  division-ds rules [--target <dir>] [--only agents,cursor,gemini] [--dry-run] [--remove]
      Writes the Division DS rules into a project: a marked block in AGENTS.md and GEMINI.md
      (created if missing, replaced on re-run, your text around it untouched) and the file
      .cursor/rules/division-ds.mdc. --dry-run prints the changes and writes nothing. --remove
      takes the blocks out and deletes the .mdc (and a file left holding nothing).

  division-ds help
`

function parseArgs(argv) {
  const options = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (!arg.startsWith('--')) options._.push(arg)
    else if (['--manifest', '--tokens', '--target', '--only'].includes(arg)) {
      if (argv[i + 1] === undefined) usage(`${arg} needs a value.`)
      options[arg.slice(2)] = argv[++i]
    } else if (['--json', '--dry-run', '--remove'].includes(arg)) options[arg.slice(2)] = true
    else usage(`Unknown option ${arg}.`)
  }
  return options
}

function usage(message) {
  console.error(`${message}\n\n${HELP}`)
  process.exit(2)
}

async function load(source) {
  if (/^https?:\/\//.test(source)) {
    const response = await fetch(source)
    if (!response.ok) throw new Error(`${source}: HTTP ${response.status}`)
    return response.json()
  }
  return JSON.parse(readFileSync(source, 'utf8'))
}

/** The files a list of arguments names: each a file, a directory (walked) or a glob. */
function expand(args) {
  const files = new Set()
  const walk = dir => {
    for (const entry of readdirSync(dir)) {
      if (SKIPPED_DIRS.has(entry)) continue
      const path = join(dir, entry)
      if (statSync(path).isDirectory()) walk(path)
      else if (CHECKED.test(entry) && !entry.endsWith('.d.ts')) files.add(path)
    }
  }
  for (const arg of args) {
    if (/[*?{[]/.test(arg)) {
      for (const path of globSync(arg, { exclude: name => SKIPPED_DIRS.has(name.split(/[\\/]/).pop()) })) {
        if (CHECKED.test(path) && !path.endsWith('.d.ts') && statSync(path).isFile()) files.add(resolve(path))
      }
    } else if (!existsSync(arg)) usage(`No such file or directory: ${arg}`)
    else if (statSync(arg).isDirectory()) walk(resolve(arg))
    else files.add(resolve(arg))
  }
  return [...files].sort()
}

async function check(options) {
  const manifestSource = options.manifest ?? DEFAULT_MANIFEST
  const tokensSource = options.tokens ?? manifestSource.replace(/components\.json$/, 'tokens.json')
  const [manifest, tokens] = await Promise.all([load(manifestSource), load(tokensSource)])
  const index = buildIndex(manifest)
  const tokenNames = tokens.tokens.map(token => token.name)

  const args = options._.length > 0 ? options._ : existsSync('src') ? ['src'] : usage('No paths given and no ./src here.')
  const files = expand(args)
  const findings = []
  for (const file of files) {
    const path = relative(process.cwd(), file).split('\\').join('/')
    const text = readFileSync(file, 'utf8')
    for (const v of tokenDiscipline(text, path, tokenNames)) {
      findings.push({ gate: 'token-discipline', path, line: v.line, rule: v.rule, found: v.found, fix: v.fix, text: formatTokenDiscipline(v) })
    }
    if (/\.[jt]sx$/.test(path)) {
      for (const v of buttonSpacing(text, path)) {
        findings.push({
          gate: 'button-spacing',
          path,
          line: v.line,
          column: v.column,
          rule: 'touching-buttons',
          found: `<${v.tag}> with ${v.count} button-like children`,
          fix: 'Wrap the buttons in one parent with a flex/grid class and a gap- utility (flex flex-wrap items-center gap-3), and move any margin from the buttons onto it.',
          text: formatButtonSpacing({ ...v, file: path }),
        })
      }
    }
    for (const v of findPropViolations(text, path, index)) {
      findings.push({ gate: 'props', path, line: v.line, column: v.column, rule: v.rule, found: v.found, fix: v.fix, text: formatPropViolation(v) })
    }
  }

  if (options.json) {
    const out = findings.map(({ text: _text, ...finding }) => finding)
    console.log(JSON.stringify({ files: files.length, manifest: manifestSource, findings: out }, null, 2))
  } else if (findings.length > 0) {
    console.error(`\ndivision-ds check FAILED: ${findings.length} finding(s) in ${files.length} file(s).\n`)
    for (const gate of ['token-discipline', 'button-spacing', 'props']) {
      const ofGate = findings.filter(finding => finding.gate === gate)
      if (ofGate.length === 0) continue
      console.error(`${gate} (${ofGate.length})`)
      for (const finding of ofGate) console.error('  ' + finding.text)
      if (gate === 'button-spacing') console.error(`      ${ofGate[0].fix}`)
      console.error('')
    }
    console.error('Each component\'s props, values and examples: /docs/components/<slug>.md. Tokens: public/manifest/tokens.json.')
  } else {
    console.log(`division-ds check passed: ${files.length} file(s), ${index.size} components, ${tokenNames.length} tokens, 0 findings.`)
  }
  process.exit(findings.length > 0 ? 1 : 0)
}

function rules(options) {
  const only = options.only ? options.only.split(',').map(target => target.trim()) : TARGETS
  const unknown = only.filter(target => !TARGETS.includes(target))
  if (unknown.length) usage(`--only takes ${TARGETS.join(', ')}; not ${unknown.join(', ')}.`)
  const targetDir = resolve(options.target ?? '.')
  if (!existsSync(targetDir) || !statSync(targetDir).isDirectory()) usage(`--target is not a directory: ${targetDir}`)
  // This repository's AGENTS.md is the source; a block of its own rules appended to it would be
  // read twice by every agent here, and regenerated nowhere.
  if (resolve(targetDir) === resolve(ROOT)) usage('--target is Division DS itself. Point it at the project that uses the components.')
  const source = readFileSync(join(ROOT, 'AGENTS.md'), 'utf8').replace(/\r\n/g, '\n')
  const plan = planRules({ targetDir, rules: extractRules(source), only, remove: Boolean(options.remove) })

  for (const change of plan) {
    const shown = relative(process.cwd(), change.path) || change.path
    console.log(`${options['dry-run'] ? 'would ' : ''}${change.action.padEnd(9)} ${shown}`)
    if (options['dry-run'] && change.action !== 'unchanged' && change.action !== 'absent') {
      console.log(diff(change.before, change.after).replace(/^/gm, '    '))
    }
  }
  if (!options['dry-run']) applyPlan(plan)
}

const [command, ...rest] = process.argv.slice(2)
const options = parseArgs(rest)
if (command === 'check') await check(options)
else if (command === 'rules') rules(options)
else if (command === undefined || command === 'help' || command === '--help' || command === '-h') console.log(HELP)
else usage(`Unknown command "${command}".`)
