// The banned-vocabulary matcher: the word list, the idiom allowlist, and the scan over one file's
// text. `scripts/check-vocabulary.mjs` is the CLI that walks src/** and owns the exit code; this
// file is the pure function it wraps, the same split `ramp.mjs` and `contrast.mjs` already use, so
// the matching rules can be unit-tested without a filesystem.
//
// Why a gate at all. PRODUCT.md's Anti-references and design.md's IP stance both state, as a legal
// constraint rather than a style preference, that this vocabulary appears in nothing public. That
// was a sentence in two documents for the whole of G1 to G3, and seven violations shipped anyway,
// on four rendered pages. PRODUCT.md's first design principle is "enforce, don't document: a rule
// that is not a gate is a suggestion", and this is the rule with the highest cost of being wrong.

/** Terms that must not appear in shipped source, matched on word boundaries, case-insensitively.
 *
 *  Multi-word entries are matched as phrases: `the original` is here because naming an original
 *  asserts that one exists, which is the specific claim the stance is built to avoid, and it is
 *  the shape the Iconography lede shipped in. Plurals are listed explicitly rather than folded
 *  into an optional-`s` pattern, so the list reads as the list it is.
 *
 *  Deliberately NOT here: `reload` and `target`. `reload` is ordinary web vocabulary ("reload the
 *  page") and `target` is a WCAG term this system uses constantly (SC 2.5.8, target size). A gate
 *  that cries wolf on legitimate copy gets weakened or skipped, which costs more than the terms it
 *  would have caught. `mission` IS here, so "mission-critical" fails too: that is the intended
 *  reading, and the phrase has no use on this surface.
 *
 *  Three groups since the demo store became an airsoft replica shop (2026-10-02). The split is
 *  exported so the test can assert each group separately and the reason for a term is never a
 *  guess. */

/** The IP stance. Unchanged by the pivot, and more important after it: a replica shop on this
 *  visual language is one careless word from reading as a derivative work. An airsoft shop
 *  would naturally say two of these (the people who take part, and the day they do it); the copy
 *  says "team", "field day" and "skirmish" instead. */
export const SOURCE_TERMS = [
  'game',
  'games',
  'gamer',
  'gamers',
  'gaming',
  'gameplay',
  'player',
  'players',
  'loot',
  'HUD',
  'respawn',
  'mission',
  'source material',
  'the original',
  'lookalike',
]

/** The replica rule. The store sells airsoft replicas and says so in those words: everything on
 *  it fires 6 mm plastic BBs and nothing on it is described in the vocabulary of the real thing.
 *  A product is a "replica", a "carbine replica", a "rifle replica"; it is never one of these.
 *
 *  `ammo` was on the banned list before the pivot and is deliberately off it now: "Ammo" is the
 *  ordinary name of the BB-and-gas category in every airsoft shop. `ammunition` stays banned
 *  because it is the real-world word. `bullet` is NOT here: it is ordinary web vocabulary for a
 *  list marker and this codebase uses it that way; cartridge-shaped content is kept out by
 *  review (the magazines show BBs, by Victor's instruction), not by this list. */
export const REPLICA_TERMS = ['weapon', 'weapons', 'gun', 'guns', 'firearm', 'firearms', 'ammunition', 'lethal']

/** Real makers and model marks. Every product name on the store is invented, because the real
 *  ones are registered trademarks and a portfolio piece has no licence to any of them. Not
 *  exhaustive and not meant to be: it holds the names most likely to be typed from habit, the
 *  first of which is the model the spike was built from. A new real name found in review is
 *  added here in the same commit that removes it. */
export const TRADEMARK_TERMS = [
  'Heckler',
  'Koch',
  'G36',
  'G36C',
  'Umarex',
  'Glock',
  'Kalashnikov',
  'Colt',
  'Beretta',
  'EOTech',
  'Aimpoint',
  'Magpul',
  'Specna',
  'Tamiya',
]

export const BANNED_TERMS = [...SOURCE_TERMS, ...REPLICA_TERMS, ...TRADEMARK_TERMS]

/** What the gate scans: every directory whose contents a reader can reach, and every kind of
 *  source file in them. Held here, next to the list, so the test can assert the scope and the CLI
 *  cannot quietly narrow it.
 *
 *  Plain `.js` is in since the homepage's 3D scene moved into `src/demo/scene/`: the models are
 *  JavaScript modules that draw their own markings, and while the pattern read
 *  `tsx?|css|mjs` every one of them was invisible to the gate, in the one place a real maker's
 *  name is most likely to be typed from habit. */
export const SCANNED_ROOTS = ['src', 'scripts', 'e2e']
export const SCANNED_EXTENSIONS = /\.(tsx?|css|m?js)$/

/** Exact strings that contain a banned term while carrying none of its meaning.
 *
 *  Narrow on purpose: an entry here suppresses the term only inside this exact phrase, at the
 *  character positions the phrase occupies, so `game` on the rest of the same line still fails.
 *  Weakening the pattern instead (dropping `game`, or requiring a preceding "video") would buy
 *  the same quiet at the cost of the gate.
 *
 *  - "a guessing game" (src/components/atoms/tag/TagDocs.tsx) is an ordinary English idiom for an
 *    ambiguous interface, and it is the right sentence for that do/don't.
 *  - "not firearms" is the store's own disclaimer ("Airsoft replicas for sport. Not firearms."),
 *    the one sentence that has to name the real thing in order to say the products are not it.
 *    Only that exact wording is let through, so the disclaimer stays one sentence in one form. */
export const ALLOWED_IDIOMS = ['a guessing game', 'not firearms']

function escape(term) {
  return term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Character ranges on `line` covered by an allowlisted idiom, as [start, end) pairs. */
function allowedRanges(line) {
  const ranges = []
  const haystack = line.toLowerCase()
  for (const idiom of ALLOWED_IDIOMS) {
    const needle = idiom.toLowerCase()
    let from = 0
    for (;;) {
      const at = haystack.indexOf(needle, from)
      if (at === -1) break
      ranges.push([at, at + needle.length])
      from = at + 1
    }
  }
  return ranges
}

/**
 * Every banned term in `text`, as `{ file, line, column, term, excerpt }`, one per match.
 *
 * `line` and `column` are 1-based so the message pastes into an editor. `excerpt` is the trimmed
 * source line, capped, because a failure that names only the file sends the reader hunting.
 */
export function findViolations(text, file = '<input>') {
  const violations = []
  text.split(/\r?\n/).forEach((line, index) => {
    const skip = allowedRanges(line)
    for (const term of BANNED_TERMS) {
      const pattern = new RegExp(`\\b${escape(term)}\\b`, 'gi')
      for (const match of line.matchAll(pattern)) {
        const start = match.index
        if (skip.some(([from, to]) => start >= from && start + match[0].length <= to)) continue
        violations.push({
          file,
          line: index + 1,
          column: start + 1,
          term,
          excerpt: line.trim().slice(0, 120),
        })
      }
    }
  })
  return violations.sort((a, b) => a.line - b.line || a.column - b.column)
}

/** The one-line form the CLI prints per violation. */
export function formatViolation({ file, line, column, term, excerpt }) {
  return `${file}:${line}:${column}  banned term "${term}"\n      ${excerpt}`
}
