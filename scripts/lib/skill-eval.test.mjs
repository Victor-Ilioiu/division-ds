import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { AI_TASK, parseTasks, prompt, scoreFolder, scoreTable } from './skill-eval.mjs'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

describe('the skill eval', () => {
  it('reads the eight tasks from docs/agent-eval/tasks.md and adds the assistant task', () => {
    const tasks = parseTasks(readFileSync(join(REPO_ROOT, 'docs/agent-eval/tasks.md'), 'utf8'))
    expect(tasks.map(task => task.name)).toEqual([
      'SettingsForm', 'OrdersTable', 'DeleteAccountDialog', 'PricingPlans', 'NotificationPanel', 'OpsDashboard', 'TeamMembers', 'SetupWizard', 'AssistantPanel',
    ])
  })

  it('never names the skill in the prompt', () => {
    expect(prompt(AI_TASK)).not.toMatch(/skill/i)
    expect(prompt(AI_TASK)).toContain('./AssistantPanel.tsx')
  })

  it('scores a folder with division-ds check findings, and reports a missing answer', () => {
    const dir = mkdtempSync(join(tmpdir(), 'division-ds-eval-'))
    try {
      writeFileSync(join(dir, 'A.tsx'), 'export const A = () => <button className="bg-red-500">Ask AI</button>\n')
      const rows = scoreFolder(dir, [{ name: 'A' }, { name: 'B' }], new Map(), [])
      expect(rows[0].findings.map(f => f.rule).sort()).toEqual(['ai-in-cta', 'palette-class'])
      expect(rows[1]).toEqual({ name: 'B', missing: true, findings: [] })
      const table = scoreTable(rows, [{ name: 'A', missing: false, findings: [] }, { name: 'B', missing: false, findings: [] }])
      expect(table).toContain('| A | 2 | 0 |')
      expect(table).toContain('| B | missing | 0 |')
      expect(table).toContain('| ai-copy | 1 | 0 |')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
