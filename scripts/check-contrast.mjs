import { checkPairs } from './lib/contrast.mjs'
import { pairsForTheme } from './lib/contrast-pairs.mjs'

// The pair list itself lives in scripts/lib/contrast-pairs.mjs so it is importable: the
// Overview prints the number of checks this gate runs, and a unit test recomputes that number
// from the same source rather than trusting a literal. This file is the runner and the exit
// code, nothing else.

let anyFail = false
let total = 0
for (const [theme, file] of [['dark', 'tokens/semantic/color.dark.json'], ['light', 'tokens/semantic/color.light.json']]) {
  console.log(`\n${theme} theme:`)
  for (const result of checkPairs(pairsForTheme(file))) {
    total++
    const status = result.pass ? 'PASS' : 'FAIL'
    // Most pairs are a floor. One is a band: see `numeral.pad` in contrast-pairs.mjs, where the
    // rule is that the colour stays UNDER a ceiling, and printing only the minimum would describe
    // the wrong half of it.
    const bounds =
      result.maxRatio === undefined
        ? `needs ${result.minRatio}:1`
        : `needs ${result.minRatio}:1 to ${result.maxRatio}:1`
    console.log(`  [${status}] ${result.name} -- ${result.ratio.toFixed(2)}:1 (${bounds})`)
    if (!result.pass) anyFail = true
  }
}

if (anyFail) {
  console.error('\nContrast gate failed.')
  process.exit(1)
}
// `total` counts ROWS, and every pair is measured once per theme, so it is twice the pair list.
// This line used to call the row count "pairs", which made it the one place on this surface that
// got the unit wrong: PRODUCT.md, design.md and the Overview all state pairs and measurements
// separately and correctly.
console.log(
  `\nContrast gate passed in both themes: ${total / 2} pairs, ${total} measurements.`
)
