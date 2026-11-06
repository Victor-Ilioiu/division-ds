// Works out a pull request's trust tier from the paths it changes.
// The tier comes from the diff, never from what the agent says about it.
//
//   node scripts/policy-tier.mjs files.json      files.json = GitHub "list PR files" output
//   -> prints {"tier":"auto|review|human","reasons":[...]} and exits 0
//
// In CI this runs from a checkout of the BASE branch (trusted code), so the
// existence check for "new component folder" looks at main, not at the PR.
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

export function globToRegExp(glob) {
  let re = ''
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i]
    if (c === '*' && glob[i + 1] === '*') { re += '.*'; i++ }
    else if (c === '*') re += '[^/]*'
    else re += c.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
  }
  return new RegExp(`^${re}$`)
}

const matches = (path, globs) => globs.some((g) => globToRegExp(g).test(path))

/**
 * files: [{ filename, status, previous_filename?, additions?, deletions? }]
 * existsInBase: (path) => boolean
 */
export function classify(files, policy, existsInBase = () => true) {
  const rank = (t) => policy.order.indexOf(t)
  let tier = files.length ? 'auto' : 'review'
  const reasons = []
  const raise = (t, why) => {
    reasons.push(`${t}: ${why}`)
    if (rank(t) > rank(tier)) tier = t
  }
  if (!files.length) reasons.push('review: no changed files')

  for (const f of files) {
    const paths = [f.filename, f.previous_filename].filter(Boolean)
    if (paths.some((p) => matches(p, policy.human))) { raise('human', `${f.filename} is a human-only path`); continue }
    if (policy.rules.deletedOrRenamedIsHuman && (f.status === 'removed' || f.status === 'renamed')) {
      raise('human', `${f.filename} was ${f.status}`); continue
    }
    if (policy.rules.newComponentFolderIsHuman && f.status === 'added') {
      const root = policy.rules.componentRoots.find((r) => f.filename.startsWith(r + '/'))
      if (root) {
        const folder = f.filename.slice(root.length + 1).split('/')[0]
        if (f.filename.slice(root.length + 1).includes('/') && !existsInBase(`${root}/${folder}`)) {
          raise('human', `${f.filename} creates a new component folder`); continue
        }
      }
    }
    if (matches(f.filename, policy.auto)) { reasons.push(`auto: ${f.filename}`); continue }
    raise('review', `${f.filename} needs review`)
  }
  return { tier, reasons }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const policy = JSON.parse(readFileSync(resolve(ROOT, 'policy/tiers.json'), 'utf8'))
  const files = JSON.parse(readFileSync(process.argv[2], 'utf8'))
  const out = classify(files, policy, (p) => existsSync(resolve(ROOT, p)))
  process.stdout.write(JSON.stringify(out) + '\n')
}
