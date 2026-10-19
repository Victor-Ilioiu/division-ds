import { writeFileSync } from 'node:fs'
import { generateRamp } from './lib/ramp.mjs'

const ANCHORS = {
  signal: '#F2550F',
  hostile: '#F33636',
  ok: '#2FB577',
  info: '#5AA7FF',
  warning: '#FFAC2A',
}
// Neutral is generated with tighter bounds (2/96 not 3/97): it has to carry the entire
// light-theme text/background range at its extremes.
const NEUTRAL_ANCHOR = '#283445'

const toDtcg = ramp =>
  Object.fromEntries(
    Object.entries(ramp).map(([stop, hex]) => [stop, { $type: 'color', $value: hex }])
  )

const out = { color: { primitive: {} } }
for (const [name, hex] of Object.entries(ANCHORS)) {
  out.color.primitive[name] = toDtcg(generateRamp(hex))
}
out.color.primitive.neutral = toDtcg(generateRamp(NEUTRAL_ANCHOR, { lightBound: 96, darkBound: 2 }))

writeFileSync('tokens/primitive/color.json', JSON.stringify(out, null, 2) + '\n')
console.log('Wrote tokens/primitive/color.json')
