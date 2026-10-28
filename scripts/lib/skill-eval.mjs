// The skill eval, as data: which tasks, which prompt, and the score of a folder of answers. The
// runner is scripts/skill-eval.mjs; this half is pure so it can be tested without running agents.
//
// The question it answers: does an agent that has the installed skill (`division-ds skill`) write
// screens with fewer `division-ds check` findings than the same agent, same prompt, without it?
// Both conditions get the same generated docs; only the skill folders differ.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { checkText } from './check-text.mjs'

/** A ninth task beside the eight in docs/agent-eval/tasks.md: the only one with assistant copy, so
 *  the ai-copy gate has something to score. */
export const AI_TASK = {
  name: 'AssistantPanel',
  task: 'An assistant side panel for a reporting tool: a conversation of four messages (two from the person, two from the assistant, one of which used a tool and one of which asks to email a report and waits for approval), a prompt box with three suggested prompts, a working state while a reply streams, and a button in the page header that opens the panel.',
}

/** The tasks: the rows of the table in docs/agent-eval/tasks.md, then AI_TASK. */
export function parseTasks(tasksMd) {
  const rows = [...tasksMd.matchAll(/^\| \d+ \| `(\w+)` \| (.+) \|$/gm)].map(m => ({ name: m[1], task: m[2] }))
  if (rows.length === 0) throw new Error('docs/agent-eval/tasks.md: no task rows found.')
  return [...rows, AI_TASK]
}

/** The prompt, word for word the same in both conditions. It never names the skill: whether the
 *  agent finds and loads it is part of what is measured. */
export function prompt(task) {
  return [
    'You are building a screen with a design system called Division DS. Its documentation is in',
    'this folder: start with llms.txt.',
    '',
    `Task: ${task.task}`,
    '',
    `Write one React component file at ./${task.name}.tsx, exporting a component named ${task.name}. It`,
    'will be placed at src/eval/' + task.name + '.tsx in a project where the design system\'s files are at the',
    'paths the documentation gives (so src/components/... is ../components/... from your file). Use the',
    'design system\'s components wherever one fits. The screen must work in both the light and the dark',
    'theme. Sample data can be hardcoded in the file.',
    '',
    'Rules:',
    '- Read only the files in this folder.',
    '- Create only that one file. Do not install packages or run a dev server.',
  ].join('\n')
}

/** Findings per task for one condition's folder: `[{ name, missing, findings }]`. */
export function scoreFolder(dir, tasks, index, tokenNames) {
  return tasks.map(({ name }) => {
    const file = join(dir, `${name}.tsx`)
    if (!existsSync(file)) return { name, missing: true, findings: [] }
    return { name, missing: false, findings: checkText(readFileSync(file, 'utf8'), `${name}.tsx`, index, tokenNames) }
  })
}

/** The before/after table, as markdown: findings per task in each condition, then per gate. */
export function scoreTable(without, withSkill) {
  const cell = row => (row.missing ? 'missing' : String(row.findings.length))
  const lines = ['| Task | Without skill | With skill |', '|---|---|---|']
  without.forEach((row, i) => lines.push(`| ${row.name} | ${cell(row)} | ${cell(withSkill[i])} |`))
  const total = rows => rows.reduce((sum, row) => sum + row.findings.length, 0)
  lines.push(`| **Total** | ${total(without)} | ${total(withSkill)} |`)
  const gates = [...new Set([...without, ...withSkill].flatMap(row => row.findings.map(f => f.gate)))].sort()
  if (gates.length) {
    lines.push('', '| Gate | Without skill | With skill |', '|---|---|---|')
    const ofGate = (rows, gate) => rows.flatMap(row => row.findings).filter(f => f.gate === gate).length
    for (const gate of gates) lines.push(`| ${gate} | ${ofGate(without, gate)} | ${ofGate(withSkill, gate)} |`)
  }
  return lines.join('\n')
}
