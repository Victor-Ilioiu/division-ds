import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { checkPairs, composite, contrastRatio } from './contrast.mjs'
import { pairsForTheme } from './contrast-pairs.mjs'
import { resolveTokens } from './resolve-tokens.mjs'

const THEMES = {
  dark: 'tokens/semantic/color.dark.json',
  light: 'tokens/semantic/color.light.json',
}
const WASH_ROWS = [
  'hover wash text (text.primary) on accent.signal.wash over surface.base',
  'hover wash text (text.primary) on accent.signal.wash over surface.raised (over surface.base)',
]

describe('the hover wash', () => {
  for (const [theme, file] of Object.entries(THEMES)) {
    it(`gates text on the wash on both surfaces it lands on, in ${theme} theme`, () => {
      const results = checkPairs(pairsForTheme(file))
      for (const name of WASH_ROWS) {
        const row = results.find(result => result.name === name)
        expect(row, name).toBeDefined()
        expect(row.pass, `${name}: ${row.ratio.toFixed(2)}:1`).toBe(true)
      }
    })
  }
})

describe('field errors', () => {
  const primitives = JSON.parse(readFileSync('tokens/primitive/color.json', 'utf8'))
  for (const [theme, file] of Object.entries(THEMES)) {
    it(`clear 4.5:1 on surface.base and on surface.raised in ${theme} theme`, () => {
      const t = resolveTokens(primitives, JSON.parse(readFileSync(file, 'utf8')))
      const page = t['--color-surface-base']
      const error = t['--color-accent-hostile-text']
      expect(contrastRatio(error, page)).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(error, t['--color-surface-raised'], page)).toBeGreaterThanOrEqual(4.5)
    })
  }
})

const BADGE_ROWS = ['signal', 'ok', 'info', 'warning', 'hostile'].map(
  tone => `badge subtle text (accent.${tone}.text) on surface.raised (over surface.base)`
)

describe("Badge's subtle text", () => {
  for (const [theme, file] of Object.entries(THEMES)) {
    it(`is gated at 4.5:1 on surface.raised for every tone in ${theme} theme`, () => {
      const results = checkPairs(pairsForTheme(file))
      for (const name of BADGE_ROWS) {
        const row = results.find(result => result.name === name)
        expect(row, name).toBeDefined()
        expect(row.minRatio, name).toBe(4.5)
        expect(row.pass, `${name}: ${row.ratio.toFixed(2)}:1`).toBe(true)
      }
    })
  }
})

const CHART_ROWS = ['1', '2'].flatMap(n => [
  `chart series ${n} (chart.series-${n}) on surface.base`,
  `chart series ${n} (chart.series-${n}) on surface.raised (over surface.base)`,
  `chart series ${n} (chart.series-${n}) on surface.raised nested in surface.raised (over surface.base)`,
])

describe('chart series', () => {
  for (const [theme, file] of Object.entries(THEMES)) {
    it(`are gated at 3:1 on every surface a chart panel lands on in ${theme} theme`, () => {
      const results = checkPairs(pairsForTheme(file))
      for (const name of CHART_ROWS) {
        const row = results.find(result => result.name === name)
        expect(row, name).toBeDefined()
        expect(row.minRatio, name).toBe(3)
        expect(row.pass, `${name}: ${row.ratio.toFixed(2)}:1`).toBe(true)
      }
    })
  }
})
