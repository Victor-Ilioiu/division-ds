import { describe, it, expect } from 'vitest'
import {
  findViolations,
  formatViolation,
  BANNED_TERMS,
  ALLOWED_IDIOMS,
  SOURCE_TERMS,
  REPLICA_TERMS,
  TRADEMARK_TERMS,
  SCANNED_ROOTS,
  SCANNED_EXTENSIONS,
} from './vocabulary.mjs'
import { sourceFiles } from './read-source-files.mjs'

/**
 * The matcher behind the IP-stance gate. What is asserted here is the part that decides whether
 * the gate is trustworthy: that it catches the shapes that actually shipped, that it does not
 * catch ordinary English, and that the allowlist suppresses one phrase rather than one word.
 */

describe('findViolations', () => {
  it('flags a banned term with its line, column and the term that matched', () => {
    const [hit] = findViolations('ok\nunrelated to any game\n', 'src/x.tsx')
    expect(hit).toMatchObject({ file: 'src/x.tsx', line: 2, column: 18, term: 'game' })
  })

  it('matches case-insensitively, which is how a specimen in caps would have slipped through', () => {
    expect(findViolations('GAMEPLAY 72')).toHaveLength(1)
  })

  it('matches multi-word phrases, not only single words', () => {
    const terms = findViolations("forbids anything resembling the source material's marks").map(v => v.term)
    expect(terms).toContain('source material')
  })

  it('respects word boundaries, so ordinary words containing a term are clean', () => {
    // "permission" contains "mission"; "framework" contains no term but proves the negative case
    // is a real one rather than a vacuous assertion.
    expect(findViolations('permission is granted by the framework')).toEqual([])
  })

  it('leaves an allowlisted idiom alone', () => {
    expect(findViolations('two targets in one chip is a guessing game.')).toEqual([])
  })

  it('still flags a banned term elsewhere on an allowlisted line', () => {
    // The allowlist suppresses the characters the idiom occupies, not the word everywhere on the
    // line. A phrase-level allowlist that silenced the whole line would be a hole the size of one
    // idiom per file.
    const hits = findViolations("a guessing game, and the game's own iconography")
    expect(hits).toHaveLength(1)
    expect(hits[0].column).toBe(26)
  })

  it('reports every match on a line, not just the first', () => {
    expect(findViolations('game gaming gameplay')).toHaveLength(3)
  })

  it('names the file, the line and the term in the printed message', () => {
    const message = formatViolation(findViolations('the game world', 'src/pages/P.tsx')[0])
    expect(message).toContain('src/pages/P.tsx')
    expect(message).toContain(':1:5')
    expect(message).toContain('"game"')
  })
})

describe('the lists themselves', () => {
  it('covers every term the IP stance names', () => {
    for (const required of [
      'game', 'gaming', 'gameplay', 'player', 'loot', 'HUD', 'respawn', 'mission',
      'source material', 'the original', 'lookalike',
    ]) {
      expect(BANNED_TERMS, `${required} must stay in the banned list`).toContain(required)
    }
  })

  it('keeps the replica rule: the real-world words for the products are banned', () => {
    for (const required of ['weapon', 'weapons', 'gun', 'guns', 'firearm', 'firearms', 'ammunition', 'lethal']) {
      expect(REPLICA_TERMS, `${required} must stay in the replica list`).toContain(required)
    }
    expect(findViolations('The best airsoft guns for a weekend skirmish').map(v => v.term)).toEqual(['guns'])
  })

  it('lets the airsoft category name through, and the word the products are sold as', () => {
    // `ammo` was banned before the store became a replica shop. It is the category every airsoft
    // shop uses for BBs and gas, so it is off the list on purpose; this pins that decision.
    expect(findViolations('Ammo: 0.28 g BBs, 2,700 per bottle. Carbine replica, 6 mm.')).toEqual([])
  })

  it('does not treat a list bullet as a banned word', () => {
    expect(findViolations('list-none removes the bullet')).toEqual([])
  })

  it('flags real makers and model marks, in any case', () => {
    expect(TRADEMARK_TERMS).toContain('G36')
    expect(findViolations('the g36c carbine by Heckler').map(v => v.term)).toEqual(['G36C', 'Heckler'])
  })

  it('lets the disclaimer name the real thing once, in its one exact form', () => {
    expect(findViolations('Airsoft replicas for sport. Not firearms.')).toEqual([])
    // The idiom covers the phrase, not the word: any other sentence about firearms still fails.
    expect(findViolations('These are not real firearms')).toHaveLength(1)
  })

  it('builds the banned list from the three groups and nothing else', () => {
    expect(BANNED_TERMS).toEqual([...SOURCE_TERMS, ...REPLICA_TERMS, ...TRADEMARK_TERMS])
  })

  it('flags the connector maker found on a 3D model marking', () => {
    // Added in the same change that took the name off the battery model's label.
    expect(findViolations('MINI TAMIYA plug').map(v => v.term)).toEqual(['Tamiya'])
  })

  it('keeps the allowlist narrow enough to read in one glance', () => {
    // Not a style rule. Every entry is a hole, so the list growing is the signal to ask whether
    // the copy should change instead.
    expect(ALLOWED_IDIOMS.length).toBeLessThanOrEqual(3)
  })
})

describe('what the gate scans', () => {
  it('covers src, scripts and e2e', () => {
    expect(SCANNED_ROOTS).toEqual(['src', 'scripts', 'e2e'])
  })

  // Mutation: change SCANNED_EXTENSIONS back to /\.(tsx?|css|mjs)$/ -> fails on 'hero.js'.
  it('reads every kind of source file, plain .js included, and nothing that is not source', () => {
    for (const name of ['Home.tsx', 'catalog.ts', 'motion.css', 'vocabulary.mjs', 'hero.js', 'hero.d.ts']) {
      expect(SCANNED_EXTENSIONS.test(name), name).toBe(true)
    }
    for (const name of ['README.md', 'tokens.json', 'poster.webp', 'notes.js.txt', 'cjs']) {
      expect(SCANNED_EXTENSIONS.test(name), name).toBe(false)
    }
  })

  // The pattern matching '.js' proves nothing if the walk never reaches the files. This reads
  // the real tree with the real scope and checks the homepage's 3D scene is in it: the scene
  // entry, a model that draws markings, and enough .js files to be the whole folder.
  // Mutation: change SCANNED_EXTENSIONS back to /\.(tsx?|css|mjs)$/ -> `scanned` loses every
  // file under src/demo/scene/ and the first assertion fails.
  it('reaches the 3D scene modules on disk, and they are clean', () => {
    const scanned = sourceFiles(SCANNED_ROOTS, SCANNED_EXTENSIONS)
    const paths = scanned.map(file => file.path)
    expect(paths).toContain('src/demo/scene/hero.js')
    expect(paths).toContain('src/demo/scene/models/battery.js')
    const scene = scanned.filter(file => file.path.startsWith('src/demo/scene/') && file.path.endsWith('.js'))
    expect(scene.length).toBeGreaterThanOrEqual(20)
    const hits = scene.flatMap(file => findViolations(file.text, file.path)).map(formatViolation)
    expect(hits).toEqual([])
  })
})
