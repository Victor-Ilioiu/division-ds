// Helpers for .github/workflows/agent-runner.yml. Trusted code: the workflow runs
// this file from a clean checkout of main, never from the agent's working copy.
//
//   node scripts/agent-runner.mjs slug "<issue title>"        -> issue-title-slug
//   node scripts/agent-runner.mjs approver events.json <label> -> login that last added <label>, or ""
//   node scripts/agent-runner.mjs files <name-status.txt> <numstat.txt>
//        -> the change as GitHub "list PR files" JSON, the input scripts/policy-tier.mjs reads
//   node scripts/agent-runner.mjs outcome   (reads CHANGE, CHANGE_KIND, VERIFY, BUILD, COMMIT, COMMIT_KIND from env)
//        -> { kind, label, message } for the public issue after a failed run
//   node scripts/agent-runner.mjs screens-md <manifest.json> <raw-url-base>
//        -> the PR body's "Screenshots" section, from scripts/agent-screens.mjs's manifest
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

/**
 * What went wrong, as the public issue should hear it. Generic on purpose: it never
 * quotes the agent, the diff or a log, because the issue is public and the code is not.
 * Inputs are GitHub step outcomes ('success' | 'failure' | 'skipped' | ''), plus the
 * kind a step wrote before failing: change_kind 'none' (no diff) or 'human' (human-tier
 * paths), commit_kind 'changed' (verify/build changed files after the tier check).
 */
export const OUTCOMES = {
  declined: {
    kind: 'declined',
    label: 'agent:declined',
    message: 'The automated agent did not propose a change: this request needs a maintainer decision (for example, a new component). A maintainer will look at it.',
  },
  checks: {
    kind: 'checks',
    label: 'agent:failed',
    message: "The automated fix did not produce a change that passes this project's checks, so no change was proposed. A maintainer will look at it by hand.",
  },
  runner: {
    kind: 'runner',
    label: 'agent:failed',
    message: 'The automated run failed for a setup reason on our side, before it could propose anything. This is not a problem with the report. A maintainer will look at it.',
  },
}

export function failureOutcome(s = {}) {
  if (s.change === 'failure') {
    if (s.changeKind === 'none') return OUTCOMES.declined
    if (s.changeKind === 'human') return OUTCOMES.checks
    return OUTCOMES.runner
  }
  if (s.verify === 'failure' || s.build === 'failure') return OUTCOMES.checks
  if (s.commit === 'failure' && s.commitKind === 'changed') return OUTCOMES.checks
  return OUTCOMES.runner
}

/** The docs routes src/docsPages.ts registers, e.g. "/components/progress". */
export function docsRoutes(docsPagesSource) {
  return [...String(docsPagesSource).matchAll(/path:\s*'(\/components\/[a-z0-9-]+)'/g)].map((m) => m[1])
}

/**
 * Changed files -> the component docs slugs worth a screenshot: every
 * src/components/<tier>/<name>/ folder the change touches whose /components/<name> route
 * exists. At most `max`, in the order first touched.
 */
export function componentSlugs(filenames, routes, max = 3) {
  const known = new Set(routes)
  const out = []
  for (const f of filenames) {
    const m = /^src\/components\/(?:atoms|molecules|organisms|shell)\/([a-z0-9-]+)\//.exec(f)
    if (!m || out.includes(m[1]) || !known.has(`/components/${m[1]}`)) continue
    out.push(m[1])
    if (out.length === max) break
  }
  return out
}

/** Captions of <Example caption="..."> lines a unified diff adds: the examples to crop to. */
export function addedCaptions(diff) {
  const out = []
  for (const line of String(diff).split('\n')) {
    if (!line.startsWith('+') || line.startsWith('+++')) continue
    const m = /<Example\b[^>]*\bcaption=(?:"([^"]+)"|\{'([^']+)'\}|\{"([^"]+)"\})/.exec(line)
    const c = m && (m[1] ?? m[2] ?? m[3])
    if (c && !out.includes(c)) out.push(c)
  }
  return out
}

/**
 * manifest: [{ slug, caption|null, theme, width, file, overflow }] (file relative to the
 * screens folder). base: URL the files are served under, no trailing slash.
 * Shows the cropped examples when there are any, else the whole page; links every file.
 */
export function screensMarkdown(manifest, base) {
  const url = (f) => `${base}/${f.split('/').map(encodeURIComponent).join('/')}?raw=true`
  const lines = []
  const slugs = [...new Set(manifest.map((s) => s.slug))]
  if (!slugs.length) return '_No component docs page was touched, so there is nothing to screenshot._\n'
  for (const slug of slugs) {
    const mine = manifest.filter((s) => s.slug === slug)
    const crops = mine.filter((s) => s.caption)
    const shown = crops.length ? crops : mine.filter((s) => !s.caption)
    lines.push(`### \`/components/${slug}\``, '')
    for (const caption of [...new Set(shown.map((s) => s.caption))]) {
      const set = shown.filter((s) => s.caption === caption)
      if (caption) lines.push(`Example: **${caption}**`, '')
      const widths = [...new Set(set.map((s) => s.width))].sort((a, b) => b - a)
      lines.push(`| | ${widths.map((w) => `${w}px`).join(' | ')} |`, `|---|${widths.map(() => '---').join('|')}|`)
      for (const theme of ['light', 'dark']) {
        const cells = widths.map((w) => {
          const s = set.find((x) => x.theme === theme && x.width === w)
          return s ? `<img src="${url(s.file)}" width="${w === Math.max(...widths) ? 480 : 240}" alt="${slug} ${caption ?? 'page'}, ${theme}, ${w}px">` : '(missing)'
        })
        lines.push(`| ${theme} | ${cells.join(' | ')} |`)
      }
      lines.push('')
    }
    const wide = mine.filter((s) => s.overflow)
    if (wide.length) lines.push(`**Horizontal scroll at ${[...new Set(wide.map((s) => `${s.width}px ${s.theme}`))].join(', ')}** (page wider than the viewport).`, '')
    lines.push(`Full pages: ${mine.filter((s) => !s.caption).map((s) => `[${s.theme} ${s.width}px](${url(s.file)})`).join(' · ')}`, '')
  }
  return lines.join('\n') + '\n'
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [cmd, ...args] = process.argv.slice(2)
  if (cmd === 'slug') process.stdout.write(slugify(args.join(' ')) + '\n')
  else if (cmd === 'approver') process.stdout.write(lastLabeler(JSON.parse(readFileSync(args[0], 'utf8')), args[1]) + '\n')
  else if (cmd === 'files') process.stdout.write(JSON.stringify(filesFromGit(readFileSync(args[0], 'utf8'), readFileSync(args[1], 'utf8'))) + '\n')
  else if (cmd === 'outcome') {
    const e = process.env
    process.stdout.write(JSON.stringify(failureOutcome({
      change: e.CHANGE, changeKind: e.CHANGE_KIND, verify: e.VERIFY, build: e.BUILD, commit: e.COMMIT, commitKind: e.COMMIT_KIND,
    })) + '\n')
  }
  else if (cmd === 'screens-md') process.stdout.write(screensMarkdown(JSON.parse(readFileSync(args[0], 'utf8')), args[1]))
  else { console.error('usage: agent-runner.mjs slug|approver|files|outcome|screens-md ...'); process.exit(2) }
}
