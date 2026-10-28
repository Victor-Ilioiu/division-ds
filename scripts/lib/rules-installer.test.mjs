import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { extractRules } from './agent-docs.mjs'
import { applyPlan, cursorRule, diff, END, planRules, planSkill, removeBlock, START, upsertBlock } from './rules-installer.mjs'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const CLI = join(REPO_ROOT, 'scripts/division-ds.mjs')
const RULES = '## Rules\n\n**Imports.** Import a component from its own file.'

let dir
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'division-ds-rules-'))
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

const at = path => join(dir, path)
const run = options => applyPlan(planRules({ targetDir: dir, rules: RULES, ...options }))

describe('the marked block', () => {
  it('creates the file when it is missing, retitled and with the check command', () => {
    const text = upsertBlock(null, RULES)
    expect(text.startsWith(`${START}\n## Division DS rules\n`)).toBe(true)
    expect(text.trimEnd().endsWith(END)).toBe(true)
    expect(text).toMatch(/npx division-ds check <files>/)
  })

  it('appends after the project’s own text, and replaces in place on a re-run', () => {
    const own = '# My project\n\nOur own rules.\n'
    const first = upsertBlock(own, RULES)
    expect(first.startsWith(own.trimEnd() + '\n\n' + START)).toBe(true)
    const edited = first + '\n## After\n\nMore of ours.\n'
    const second = upsertBlock(edited, RULES.replace('own file', 'own file, by path'))
    expect(second).toMatch(/by path/)
    expect(second).toMatch(/## After\n\nMore of ours\.\n$/)
    expect(second.match(new RegExp(START, 'g'))).toHaveLength(1)
    expect(upsertBlock(second, RULES.replace('own file', 'own file, by path'))).toBe(second)
  })

  it('comes back out cleanly', () => {
    const own = '# My project\n\nOur own rules.\n'
    expect(removeBlock(upsertBlock(own, RULES))).toBe(own)
    expect(removeBlock(upsertBlock(null, RULES))).toBe('')
    expect(removeBlock(own)).toBe(own)
  })

  it('gives Cursor a rule attached to JSX and TSX files, not always on', () => {
    const rule = cursorRule(RULES)
    expect(rule.split('\n').slice(0, 5)).toEqual([
      '---',
      expect.stringMatching(/^description: Division DS rules\./),
      'globs: **/*.tsx, **/*.jsx',
      'alwaysApply: false',
      '---',
    ])
    expect(rule).toMatch(/## Division DS rules/)
  })
})

describe('planning and writing, in a temp dir', () => {
  it('writes all three files, then changes nothing on a second run', () => {
    expect(planRules({ targetDir: dir, rules: RULES }).map(change => change.action)).toEqual(['create', 'create', 'create'])
    run()
    expect(readFileSync(at('AGENTS.md'), 'utf8')).toMatch(START)
    expect(readFileSync(at('GEMINI.md'), 'utf8')).toMatch(START)
    expect(readFileSync(at('.cursor/rules/division-ds.mdc'), 'utf8')).toMatch(/^---\ndescription:/)
    expect(planRules({ targetDir: dir, rules: RULES }).map(change => change.action)).toEqual(['unchanged', 'unchanged', 'unchanged'])
  })

  it('honours --only and keeps a CRLF file in CRLF', () => {
    writeFileSync(at('AGENTS.md'), '# Ours\r\n\r\nText.\r\n')
    run({ only: ['agents'] })
    const text = readFileSync(at('AGENTS.md'), 'utf8')
    expect(text.startsWith('# Ours\r\n\r\nText.\r\n\r\n' + START)).toBe(true)
    expect(text.replace(/\r\n/g, '')).not.toMatch(/\n/)
    expect(existsSync(at('GEMINI.md'))).toBe(false)
    expect(existsSync(at('.cursor'))).toBe(false)
  })

  it('removes the blocks, deletes the .mdc, and deletes a file left holding nothing', () => {
    writeFileSync(at('AGENTS.md'), '# Ours\n')
    run()
    run({ remove: true })
    expect(readFileSync(at('AGENTS.md'), 'utf8')).toBe('# Ours\n')
    expect(existsSync(at('GEMINI.md'))).toBe(false)
    expect(existsSync(at('.cursor/rules/division-ds.mdc'))).toBe(false)
    expect(planRules({ targetDir: dir, rules: RULES, remove: true }).map(change => change.action)).toEqual([
      'unchanged',
      'absent',
      'absent',
    ])
  })

  it('shows a replacement as a diff of the changed lines only', () => {
    expect(diff('a\nb\nc', 'a\nB\nc')).toBe('@@ 1 unchanged line(s) @@\n- b\n+ B\n@@ 1 unchanged line(s) @@')
    expect(diff(null, 'x')).toBe('+ x')
  })
})

describe('the CLI', () => {
  const cli = (...args) => spawnSync(process.execPath, [CLI, ...args], { cwd: dir, encoding: 'utf8' })

  it('rules --dry-run writes nothing; rules writes the real AGENTS.md rules', () => {
    const dry = cli('rules', '--dry-run')
    expect(dry.status).toBe(0)
    expect(dry.stdout).toMatch(/would create\s+AGENTS\.md/)
    expect(existsSync(at('AGENTS.md'))).toBe(false)
    expect(cli('rules', '--only', 'agents').status).toBe(0)
    const real = extractRules(readFileSync(join(REPO_ROOT, 'AGENTS.md'), 'utf8').replace(/\r\n/g, '\n'))
    expect(readFileSync(at('AGENTS.md'), 'utf8')).toContain(real.split('\n').slice(2, 5).join('\n'))
    expect(cli('rules', '--only', 'nope').status).toBe(2)
  })

  it('check exits 1 with what to write instead, 0 on a clean file, and speaks JSON', () => {
    mkdirSync(at('src'))
    writeFileSync(
      at('src/Bad.tsx'),
      [
        "import { Button } from 'division-ds'",
        'export const Bad = () => (',
        '  <div className="bg-red-500">',
        '    <Button variant="hostile">Delete</Button>',
        '    <Button>Keep</Button>',
        '  </div>',
        ')',
        '',
      ].join('\n')
    )
    writeFileSync(at('src/Good.tsx'), "import { Button } from 'division-ds'\nexport const Good = () => <Button variant=\"danger\">Delete</Button>\n")

    const bad = cli('check')
    expect(bad.status).toBe(1)
    expect(bad.stderr).toMatch(/token-discipline \(1\)/)
    expect(bad.stderr).toMatch(/button-spacing \(1\)/)
    expect(bad.stderr).toMatch(/Write variant="danger"/)

    const json = JSON.parse(cli('check', 'src/**/*.tsx', '--json').stdout)
    expect(json.files).toBe(2)
    expect(json.findings.map(finding => `${finding.gate}:${finding.rule}`).sort()).toEqual([
      'button-spacing:touching-buttons',
      'props:invalid-value',
      'token-discipline:palette-class',
    ])

    expect(cli('check', 'src/Good.tsx').status).toBe(0)
    expect(cli('check', 'missing.tsx').status).toBe(2)
  })

  it('skill --dry-run writes nothing; skill refuses this repository', () => {
    const dry = cli('skill', '--dry-run')
    expect(dry.status).toBe(0)
    expect(dry.stdout).toMatch(/would create\s+\S*SKILL\.md/)
    expect(existsSync(at('.agents'))).toBe(false)
    expect(cli('skill', '--target', REPO_ROOT).status).toBe(2)
  })
})

describe('the skill installer', () => {
  const SOURCE = join(REPO_ROOT, 'skills/division-ds')
  const skill = options => planSkill({ targetDir: dir, sourceDir: SOURCE, ...options })

  it('copies the skill folder into both agent paths, then reports it unchanged', () => {
    applyPlan(skill(), dir)
    for (const base of ['.agents/skills/division-ds', '.claude/skills/division-ds']) {
      expect(readFileSync(at(`${base}/SKILL.md`), 'utf8')).toBe(readFileSync(join(SOURCE, 'SKILL.md'), 'utf8'))
      expect(existsSync(at(`${base}/topics/forms.md`))).toBe(true)
      expect(existsSync(at(`${base}/commands/review.md`))).toBe(true)
    }
    expect(skill().every(change => change.action === 'unchanged')).toBe(true)
  })

  it('deletes a file the skill no longer ships, and --remove leaves the project as it was', () => {
    mkdirSync(at('.claude'))
    writeFileSync(at('.claude/settings.json'), '{}')
    applyPlan(skill({ only: ['claude'] }), dir)
    writeFileSync(at('.claude/skills/division-ds/topics/old.md'), 'stale')
    const deleted = skill({ only: ['claude'] }).filter(change => change.action === 'delete')
    expect(deleted.map(change => change.path)).toEqual([at('.claude/skills/division-ds/topics/old.md')])
    applyPlan(skill({ remove: true }), dir)
    expect(existsSync(at('.claude/skills'))).toBe(false)
    expect(existsSync(at('.agents'))).toBe(false)
    expect(readFileSync(at('.claude/settings.json'), 'utf8')).toBe('{}')
  })
})
