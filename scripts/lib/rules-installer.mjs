// The rules installer: writes the Rules section of this repository's AGENTS.md into a consumer
// project, for the three agents that read a file by convention. Run through
// `division-ds rules` (scripts/division-ds.mjs); this file plans every change as data, so the
// runner's dry run and its real run are the same code, and the tests need only a temp dir.
//
// Why markers and not a copy. The rules change when an agent gets something new wrong; a copy
// pasted into another project goes stale the day it is pasted. Between namespaced markers the
// block is replaced on every run (idempotent: a second run with the same rules changes nothing)
// and the consumer's own text around it is never touched. `--remove` takes the block back out.
//
// Targets:
//   agents  AGENTS.md                       Codex, Claude Code (via AGENTS.md), Copilot, Jules, ...
//   cursor  .cursor/rules/division-ds.mdc   Cursor project rules; the whole file is ours
//   gemini  GEMINI.md                       Gemini CLI
import { existsSync, mkdirSync, readdirSync, readFileSync, rmdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'

export const START = '<!-- division-ds:start -->'
export const END = '<!-- division-ds:end -->'
export const TARGETS = ['agents', 'cursor', 'gemini']

const FILES = {
  agents: 'AGENTS.md',
  cursor: '.cursor/rules/division-ds.mdc',
  gemini: 'GEMINI.md',
}

const NOTE =
  '> Installed by `division-ds rules`. Re-run it to update; anything between the division-ds markers is ' +
  'overwritten. Before finishing a screen, run `npx division-ds check <files>` (Node 22 or newer): it flags a raw colour, an ' +
  'invented token, touching buttons, an unknown prop and a wrong enum value, and says what to write instead.'

/** The rules as they read in someone else's file: titled with the system's name, since "## Rules"
 *  alone means nothing in a project with rules of its own. */
export function rulesBody(rules) {
  return [rules.replace(/^## Rules\b/, '## Division DS rules'), '', NOTE].join('\n')
}

/** The marked block, start and end markers included. */
export const markedBlock = rules => `${START}\n${rulesBody(rules)}\n${END}`

/** The Cursor rule file: frontmatter that attaches it to JSX/TSX files, then the rules. */
export function cursorRule(rules) {
  return [
    '---',
    'description: Division DS rules. Which component and token to use, and the composition rules prop types cannot express. Apply when writing or changing UI built with Division DS components.',
    'globs: **/*.tsx, **/*.jsx',
    'alwaysApply: false',
    '---',
    '',
    rulesBody(rules),
    '',
  ].join('\n')
}

const BLOCK = new RegExp(`${escapeRegExp(START)}[\\s\\S]*?${escapeRegExp(END)}`)
function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** `existing` with the block inserted (appended after a blank line) or replaced in place. */
export function upsertBlock(existing, rules) {
  const block = markedBlock(rules)
  if (existing === null || existing.trim() === '') return block + '\n'
  if (BLOCK.test(existing)) return existing.replace(BLOCK, () => block)
  return existing.replace(/\s*$/, '') + '\n\n' + block + '\n'
}

/** `existing` with the block and the blank lines that framed it taken out. */
export function removeBlock(existing) {
  if (!BLOCK.test(existing)) return existing
  const without = existing.replace(new RegExp(`\\n*${escapeRegExp(START)}[\\s\\S]*?${escapeRegExp(END)}\\n*`), '\n\n')
  return without.replace(/^\n+/, '').replace(/\n{3,}/g, '\n\n').replace(/\s*$/, '') + (without.trim() ? '\n' : '')
}

const read = path => (existsSync(path) ? readFileSync(path, 'utf8') : null)

/**
 * Every file change for one run, without writing anything:
 * `[{ target, path, action, before, after }]`, where `action` is 'create', 'update', 'unchanged',
 * 'delete' or 'absent' and `after` is null for a deletion. A file in CRLF stays in CRLF.
 */
export function planRules({ targetDir, rules, only = TARGETS, remove = false }) {
  return only.map(target => {
    const path = join(targetDir, FILES[target])
    const raw = read(path)
    const crlf = raw !== null && raw.includes('\r\n')
    const before = raw === null ? null : raw.replace(/\r\n/g, '\n')
    let after
    if (target === 'cursor') after = remove ? null : cursorRule(rules)
    else if (remove) after = before === null ? null : removeBlock(before)
    else after = upsertBlock(before, rules)
    // A file holding nothing but the block is ours: removing the block removes the file.
    if (remove && after !== null && after.trim() === '') after = null

    let action
    if (before === null) action = after === null ? 'absent' : 'create'
    else if (after === null) action = 'delete'
    else action = after === before ? 'unchanged' : 'update'
    const restore = text => (text !== null && crlf ? text.replace(/\n/g, '\r\n') : text)
    return { target, path, action, before: raw, after: restore(after) }
  })
}

// The skill installer (`division-ds skill`): the generated skills/division-ds/ folder, copied whole
// into the folders agents scan for skills. Checked 2026-10-26 against each agent's docs:
//   agents  .agents/skills/division-ds/   Codex (repo scope), Cursor (also reads .claude/skills)
//   claude  .claude/skills/division-ds/   Claude Code project skills
// The folder is ours whole, like the .mdc: a file in it that the skill no longer ships is deleted.
export const SKILL_TARGETS = ['agents', 'claude']
const SKILL_DIRS = { agents: '.agents/skills/division-ds', claude: '.claude/skills/division-ds' }

const filesUnder = dir =>
  !existsSync(dir)
    ? []
    : readdirSync(dir, { recursive: true }).map(String).filter(name => statSync(join(dir, name)).isFile()).map(name => name.split('\\').join('/')).sort()

/** Every file change to install (or `remove`) the skill in `sourceDir` into each target, in the
 *  same shape as planRules: `[{ target, path, action, before, after }]`. */
export function planSkill({ targetDir, sourceDir, only = SKILL_TARGETS, remove = false }) {
  const source = filesUnder(sourceDir)
  return only.flatMap(target => {
    const dir = join(targetDir, SKILL_DIRS[target])
    const names = [...new Set([...source, ...filesUnder(dir)])].sort()
    return names.map(name => {
      const path = join(dir, name)
      const before = read(path)
      const after = remove || !source.includes(name) ? null : readFileSync(join(sourceDir, name), 'utf8')
      let action
      if (before === null) action = after === null ? 'absent' : 'create'
      else if (after === null) action = 'delete'
      else action = after === before ? 'unchanged' : 'update'
      return { target, path, action, before, after }
    })
  })
}

/** Writes a plan to disk. A deletion also removes the folders it left empty, up to `stopAt`. */
export function applyPlan(plan, stopAt) {
  for (const change of plan) {
    if (change.action === 'create' || change.action === 'update') {
      mkdirSync(dirname(change.path), { recursive: true })
      writeFileSync(change.path, change.after)
    } else if (change.action === 'delete') {
      rmSync(change.path)
      if (!stopAt) continue
      for (let dir = dirname(change.path); relative(stopAt, dir) && !relative(stopAt, dir).startsWith('..'); dir = dirname(dir)) {
        if (readdirSync(dir).length > 0) break
        rmdirSync(dir)
      }
    }
  }
}

/** A line diff between two texts: the common head and tail are skipped, the middle is shown as
 *  `-` and `+` lines. Enough to review a block being replaced, which is the only change made. */
export function diff(before, after) {
  const a = before === null ? [] : before.replace(/\r\n/g, '\n').split('\n')
  const b = after === null ? [] : after.replace(/\r\n/g, '\n').split('\n')
  let head = 0
  while (head < a.length && head < b.length && a[head] === b[head]) head++
  let tail = 0
  while (tail < a.length - head && tail < b.length - head && a[a.length - 1 - tail] === b[b.length - 1 - tail]) tail++
  const lines = []
  if (head > 0) lines.push(`@@ ${head} unchanged line(s) @@`)
  for (const line of a.slice(head, a.length - tail)) lines.push(`- ${line}`)
  for (const line of b.slice(head, b.length - tail)) lines.push(`+ ${line}`)
  if (tail > 0) lines.push(`@@ ${tail} unchanged line(s) @@`)
  return lines.join('\n')
}
