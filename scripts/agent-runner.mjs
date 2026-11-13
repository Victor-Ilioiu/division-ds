// Helpers for .github/workflows/agent-runner.yml. Trusted code: the workflow runs
// this file from a clean checkout of main, never from the agent's working copy.
//
//   node scripts/agent-runner.mjs slug "<issue title>"        -> issue-title-slug
//   node scripts/agent-runner.mjs approver events.json <label> -> login that last added <label>, or ""
//   node scripts/agent-runner.mjs files <name-status.txt> <numstat.txt>
//        -> the change as GitHub "list PR files" JSON, the input scripts/policy-tier.mjs reads
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

/** Lowercase ASCII words joined by "-", at most 40 characters. Never empty. */
export function slugify(title) {
  const s = String(title)
    .normalize('NFKD')
    .replace(/[^\x00-\x7f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '')
  return s || 'change'
}

/**
 * events: GitHub "list issue events" output (oldest first).
 * Returns the login of whoever added `label` most recently, or '' if it was
 * removed after that or never added. Only this login decides whether a run counts.
 */
export function lastLabeler(events, label) {
  let who = ''
  for (const e of events) {
    if (e?.label?.name !== label) continue
    if (e.event === 'labeled') who = e.actor?.login ?? ''
    else if (e.event === 'unlabeled') who = ''
  }
  return who
}

const STATUS = { A: 'added', M: 'modified', D: 'removed', R: 'renamed', C: 'added', T: 'modified' }

/** `git diff --cached --name-status -M` + `--numstat -M` -> [{ filename, status, previous_filename?, additions, deletions }] */
export function filesFromGit(nameStatus, numstat) {
  const counts = new Map()
  for (const line of numstat.split('\n').filter(Boolean)) {
    const [add, del, ...rest] = line.split('\t')
    // a rename prints "old\tnew" here when -z is not used
    const path = rest[rest.length - 1]
    counts.set(path, { additions: Number(add) || 0, deletions: Number(del) || 0 })
  }
  return nameStatus.split('\n').filter(Boolean).map((line) => {
    const [code, a, b] = line.split('\t')
    const status = STATUS[code[0]] ?? 'modified'
    const filename = b ?? a
    const out = { filename, status, ...(counts.get(filename) ?? { additions: 0, deletions: 0 }) }
    if (code[0] === 'R') out.previous_filename = a
    return out
  })
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [cmd, ...args] = process.argv.slice(2)
  if (cmd === 'slug') process.stdout.write(slugify(args.join(' ')) + '\n')
  else if (cmd === 'approver') process.stdout.write(lastLabeler(JSON.parse(readFileSync(args[0], 'utf8')), args[1]) + '\n')
  else if (cmd === 'files') process.stdout.write(JSON.stringify(filesFromGit(readFileSync(args[0], 'utf8'), readFileSync(args[1], 'utf8'))) + '\n')
  else { console.error('usage: agent-runner.mjs slug|approver|files ...'); process.exit(2) }
}
