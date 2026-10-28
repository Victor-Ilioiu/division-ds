import { readFileSync } from 'node:fs'
import { resolveTokens } from './resolve-tokens.mjs'
import { pairsForTokens } from './pairs-for-tokens.mjs'

/** Every gated colour pair, per theme, as data.
 *
 * Split out of `check-contrast.mjs` so the CLI gate is not the only thing that can read the
 * list: `src/pages/Overview.test.tsx` imports it to assert that the count the Overview prints
 * is the count the gate actually runs. The front door states this number in 52px type, and a
 * number nothing recomputes is a number that goes stale the first time a pair is added.
 *
 * Same shape as `scripts/lib/ramp.mjs`: the CLI script stays a thin wrapper around a pure
 * function that something else can call. */

const primitives = JSON.parse(readFileSync('tokens/primitive/color.json', 'utf8'))
const control = JSON.parse(readFileSync('tokens/component/control.json', 'utf8'))

export function pairsForTheme(themeFile) {
  const semantic = JSON.parse(readFileSync(themeFile, 'utf8'))
  return pairsForTokens(resolveTokens(primitives, semantic), control)
}
