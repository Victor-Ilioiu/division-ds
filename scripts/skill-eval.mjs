#!/usr/bin/env node
// The skill before/after eval (docs/improvements/09-skill-install-and-eval.md).
//
//   node scripts/skill-eval.mjs prepare <out>   two folders, without/ and with/, plus prompts/
//   (run one fresh agent per task in each folder, by hand: see commands.md "Run the skill eval")
//   node scripts/skill-eval.mjs score <out>     division-ds check findings per task, both folders
//
// Both folders hold the same generated docs (llms*.txt, docs/components/, manifest/); with/ also
// holds the skill, installed by the same code as `division-ds skill`. This script never starts an
// agent: running nine agents twice is a cost a person decides to spend.
import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { buildIndex } from './lib/props-validator.mjs'
import { applyPlan, planSkill } from './lib/rules-installer.mjs'
import { parseTasks, prompt, scoreFolder, scoreTable } from './lib/skill-eval.mjs'

const [command, out] = process.argv.slice(2)
if (!['prepare', 'score'].includes(command) || !out) {
  console.error('Usage: node scripts/skill-eval.mjs prepare|score <out-dir>')
  process.exit(2)
}
const dir = resolve(out)
const tasks = parseTasks(readFileSync('docs/agent-eval/tasks.md', 'utf8'))

if (command === 'prepare') {
  if (existsSync(dir) && readdirSync(dir).length > 0) {
    console.error(`${dir} is not empty. Prepare into a new folder, outside this repository.`)
    process.exit(2)
  }
  for (const condition of ['without', 'with']) {
    const folder = join(dir, condition)
    mkdirSync(folder, { recursive: true })
    for (const name of readdirSync('public').filter(name => /^llms.*\.txt$/.test(name))) copyFileSync(join('public', name), join(folder, name))
    cpSync('public/docs', join(folder, 'docs'), { recursive: true })
    cpSync('public/manifest', join(folder, 'manifest'), { recursive: true })
  }
  applyPlan(planSkill({ targetDir: join(dir, 'with'), sourceDir: 'skills/division-ds' }), join(dir, 'with'))
  mkdirSync(join(dir, 'prompts'))
  for (const task of tasks) writeFileSync(join(dir, 'prompts', `${task.name}.txt`), prompt(task) + '\n')
  console.log(`Prepared ${dir}: without/, with/ (the skill in .claude/skills and .agents/skills), prompts/ (${tasks.length} tasks).`)
} else {
  const manifest = JSON.parse(readFileSync('public/manifest/components.json', 'utf8'))
  const tokenNames = JSON.parse(readFileSync('public/manifest/tokens.json', 'utf8')).tokens.map(token => token.name)
  const index = buildIndex(manifest)
  const without = scoreFolder(join(dir, 'without'), tasks, index, tokenNames)
  const withSkill = scoreFolder(join(dir, 'with'), tasks, index, tokenNames)
  console.log(scoreTable(without, withSkill))
  for (const [label, rows] of [['without', without], ['with', withSkill]]) {
    for (const row of rows) for (const finding of row.findings) console.log(`\n${label}/${finding.text}`)
  }
}
