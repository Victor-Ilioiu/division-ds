import { generateRamp } from './ramp.mjs'
import { resolveTokens } from './resolve-tokens.mjs'
import { checkPairs, contrastRatio } from './contrast.mjs'
import { pairsForTokens } from './pairs-for-tokens.mjs'

// A preset is every input that really changes the system's colour, packed into one short,
// versioned string, after shadcn create's `?preset=` code. Two inputs, because only two of
// generate-ramps' anchors change the look: `signal`, the one accent (fills, focus ring, links,
// charts, in both themes), and `neutral`, which the light theme's surfaces and text are aliased
// to. The four status anchors (hostile, ok, info, warning) carry meaning, not brand, and stay put.
// The dark theme's neutrals are literal hex values in tokens/semantic/color.dark.json, not ramp
// aliases, so `neutral` changes the light theme only.
//
//   1-f2550f-283445     version 1, signal anchor, neutral anchor
//
// No radius: the system has no radius token (cut corners are fixed bevels, see the Shape page).

export const PRESET_VERSION = 1
export const DEFAULT_PRESET = { signal: '#f2550f', neutral: '#283445' }
// Neutral is generated with tighter bounds than the accents: it has to carry the light theme's
// whole text/background range at its extremes. generate-ramps.mjs reads this too.
export const NEUTRAL_BOUNDS = { lightBound: 96, darkBound: 2 }

const HEX = /^#?([0-9a-f]{6})$/i

export function encodePreset({ signal, neutral }) {
  const parts = [signal, neutral].map(hex => {
    const match = HEX.exec(hex)
    if (!match) throw new Error(`Not a six-digit hex colour: ${hex}`)
    return match[1].toLowerCase()
  })
  return [PRESET_VERSION, ...parts].join('-')
}

export function decodePreset(code) {
  const parts = String(code).trim().split('-')
  if (parts[0] !== String(PRESET_VERSION)) {
    throw new Error(`Unknown preset version "${parts[0]}" in "${code}". This build reads version ${PRESET_VERSION}.`)
  }
  if (parts.length !== 3 || !parts.slice(1).every(p => HEX.test(p))) {
    throw new Error(`Malformed preset "${code}". Expected ${PRESET_VERSION}-<signal hex>-<neutral hex>, e.g. ${encodePreset(DEFAULT_PRESET)}.`)
  }
  return { signal: `#${parts[1].toLowerCase()}`, neutral: `#${parts[2].toLowerCase()}` }
}

// Text on the accent fill: white when it clears AA body text (4.5:1) on the fill, otherwise the
// shipped dark ink. Division's own orange fails white (3.4:1), so the default stays dark.
export const WHITE_INK = '#ffffff'
const INK_MIN_RATIO = 4.5
export function inkFor(fill, darkInk) {
  return contrastRatio(WHITE_INK, fill) >= INK_MIN_RATIO ? WHITE_INK : darkInk
}

const toDtcg = ramp => Object.fromEntries(Object.entries(ramp).map(([stop, hex]) => [stop, { $type: 'color', $value: hex }]))
const rgbOf = hex => [0, 2, 4].map(i => parseInt(hex.replace('#', '').slice(i, i + 2), 16))

/** The two semantic themes a preset produces, each run through the full AA pair gate. The text
 *  colour on the accent fill is picked per theme by `inkFor`.
 *
 *  Each token aliased to a signal ramp stop, except the brand fill, is checked against the gate
 *  pairs it reaches; if one fails, it moves to the nearest stop that passes them all (`adjustments`, per theme). When no
 *  stop passes, it stays put and the failures are reported as before.
 *
 *  `wash` and `glow` are the only signal-derived values written as literals (rgba of the default
 *  anchor) rather than ramp aliases, so they are re-tinted from the theme's fill, alpha kept.
 *
 *  @param tokenDocs the parsed token files: { primitives, dark, light, control } */
export function buildTheme(preset, { primitives, dark, light, control }) {
  const ramps = {
    ...primitives,
    color: {
      ...primitives.color,
      primitive: {
        ...primitives.color.primitive,
        signal: toDtcg(generateRamp(preset.signal)),
        neutral: toDtcg(generateRamp(preset.neutral, NEUTRAL_BOUNDS)),
      },
    },
  }
  const from = `rgba(${rgbOf(DEFAULT_PRESET.signal).join(', ')}, `
  const shippedInk = Object.fromEntries(Object.entries({ dark, light }).map(([name, semantic]) => [name, resolveTokens(ramps, semantic)['--color-accent-signal-ink']]))
  // One theme's tokens with the signal aliases at `stops`. The wash/glow literals follow the
  // resolved fill rather than the raw anchor, so a fill the solver darkens tints them too.
  function resolve(name, semantic, stops) {
    const raw = resolveTokens(ramps, withStops(semantic, stops))
    const to = `rgba(${rgbOf(raw['--color-accent-signal-fill']).join(', ')}, `
    const tokens = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, value.startsWith(from) ? to + value.slice(from.length) : value]))
    tokens['--color-accent-signal-ink'] = inkFor(tokens['--color-accent-signal-fill'], shippedInk[name])
    tokens['--color-accent-signal-indicator-ink'] = inkFor(tokens['--color-accent-signal-indicator'], shippedInk[name])
    return tokens
  }

  const themes = {}
  const adjustments = {}
  for (const [name, semantic] of Object.entries({ dark, light })) {
    const shipped = signalStops(semantic)
    const stops = { ...shipped }
    const pairsAt = s => pairsForTokens(resolve(name, semantic, s), control)
    adjustments[name] = []
    for (const [token, stop] of Object.entries(shipped)) {
      // The brand colour stays exactly as chosen; only its ink adapts. States that rely on the
      // accent read accent.signal.indicator, which is free to move.
      if (FIXED.has(token)) continue
      // The pairs this token reaches: those whose colours move when only this token moves.
      const lo = pairsAt({ ...stops, [token]: RAMP_STOPS[0] })
      const hi = pairsAt({ ...stops, [token]: RAMP_STOPS.at(-1) })
      const involved = lo.map((p, i) => (p.fg !== hi[i].fg || p.bg !== hi[i].bg || p.backdrop !== hi[i].backdrop ? i : -1)).filter(i => i >= 0)
      const passesAt = s => {
        const results = checkPairs(pairsAt({ ...stops, [token]: s }))
        return involved.every(i => results[i].pass)
      }
      if (passesAt(stop)) continue
      // Nearest stop first; on a tie the darker one, which is the likelier fix on a light page.
      const at = RAMP_STOPS.indexOf(stop)
      const candidates = RAMP_STOPS.map((s, i) => [s, Math.abs(i - at) - (i > at ? 0.5 : 0)]).sort((a, b) => a[1] - b[1]).map(([s]) => s)
      const fix = candidates.find(passesAt)
      if (fix === undefined) continue
      const before = checkPairs(pairsAt(stops))
      stops[token] = fix
      adjustments[name].push({ token, from: stop, to: fix, fixed: involved.filter(i => !before[i].pass).map(i => before[i].name) })
    }
    const tokens = resolve(name, semantic, stops)
    themes[name] = { tokens, results: checkPairs(pairsForTokens(tokens, control)) }
  }
  const failures = Object.entries(themes).flatMap(([theme, { results }]) => results.filter(r => !r.pass).map(r => ({ theme, ...r })))
  return { themes, failures, adjustments }
}

const FIXED = new Set(['accent.signal.fill'])
const RAMP_STOPS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']
const SIGNAL_ALIAS = /^\{color\.primitive\.signal\.(\d+)\}$/

/** Every semantic token aliased straight to a signal ramp stop, as { 'accent.signal.fill': '500' }. */
function signalStops(semantic, node = semantic.color.semantic, prefix = '', out = {}) {
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith('$') || !value || typeof value !== 'object') continue
    const path = prefix ? `${prefix}.${key}` : key
    if ('$value' in value) {
      const match = SIGNAL_ALIAS.exec(value.$value)
      if (match) out[path] = match[1]
    } else signalStops(semantic, value, path, out)
  }
  return out
}

function withStops(semantic, stops) {
  const copy = structuredClone(semantic)
  for (const [path, stop] of Object.entries(stops)) {
    path.split('.').reduce((node, key) => node[key], copy.color.semantic).$value = `{color.primitive.signal.${stop}}`
  }
  return copy
}

/** The CSS a consumer pastes after the Division DS stylesheet import. Same selectors as the
 *  generated tokens.css, so the later rule wins and nothing else needs to change. */
export function themeCss(preset, themes) {
  const block = tokens => Object.entries(tokens).map(([key, value]) => `  ${key}: ${value};`).join('\n')
  return `/* Division DS theme, preset ${encodePreset(preset)}. Paste after the division-ds.css import. */
:root, [data-theme="dark"] {
${block(themes.dark.tokens)}
}

[data-theme="light"] {
${block(themes.light.tokens)}
}
`
}
