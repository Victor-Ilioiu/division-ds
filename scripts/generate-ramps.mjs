import { writeFileSync } from 'node:fs'
import { generateRamp } from './lib/ramp.mjs'
import { DEFAULT_PRESET, NEUTRAL_BOUNDS } from './lib/preset.mjs'

// signal and neutral are the preset's inputs (scripts/lib/preset.mjs), so their defaults live
// there: the configurator page and this script cannot disagree about the shipped anchors.
const ANCHORS = {
  signal: DEFAULT_PRESET.signal,
  hostile: '#F33636',
  ok: '#2FB577',
  info: '#5AA7FF',
  warning: '#FFAC2A',
}

const toDtcg = ramp =>
  Object.fromEntries(
    Object.entries(ramp).map(([stop, hex]) => [stop, { $type: 'color', $value: hex }])
  )

const out = { color: { primitive: {} } }
for (const [name, hex] of Object.entries(ANCHORS)) {
  out.color.primitive[name] = toDtcg(generateRamp(hex))
}
out.color.primitive.neutral = toDtcg(generateRamp(DEFAULT_PRESET.neutral, NEUTRAL_BOUNDS))

writeFileSync('tokens/primitive/color.json', JSON.stringify(out, null, 2) + '\n')
console.log('Wrote tokens/primitive/color.json')
