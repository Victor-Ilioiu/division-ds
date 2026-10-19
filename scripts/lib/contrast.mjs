// Contrast maths for the AA gate. Two jobs: parse a colour, and composite it over whatever it is
// actually painted on before measuring.
//
// The compositing half exists because this design system writes real translucent tokens
// (`border.hairline`, `surface.raised`), and a hex-only parser silently could not evaluate them —
// which is how a whole class of SC 1.4.11 failure on the form controls' boundaries stayed
// invisible to a gate that reported 28/28 green. A translucent colour has no contrast ratio of
// its own; it only has one against a named backdrop. So every alpha-carrying colour here must be
// given one, and the gate names it explicitly rather than guessing.

/** Parses #rgb, #rrggbb, #rrggbbaa, rgb()/rgba() (comma or space separated, alpha as number or
 *  percentage) into `[r, g, b, a]` with channels 0–255 and alpha 0–1. */
function parseColor(color) {
  if (typeof color !== 'string') throw new Error(`Not a colour: ${String(color)}`)
  const value = color.trim()

  if (value.startsWith('#')) {
    const hex = value.slice(1)
    if (hex.length === 3 || hex.length === 4) {
      const channels = [...hex].map(c => parseInt(c + c, 16))
      return [channels[0], channels[1], channels[2], channels[3] === undefined ? 1 : channels[3] / 255]
    }
    if (hex.length === 6 || hex.length === 8) {
      const channels = [0, 2, 4, 6]
        .filter(i => i < hex.length)
        .map(i => parseInt(hex.slice(i, i + 2), 16))
      return [channels[0], channels[1], channels[2], channels[3] === undefined ? 1 : channels[3] / 255]
    }
    throw new Error(`Unparseable hex colour: ${color}`)
  }

  const fn = value.match(/^rgba?\(([^)]*)\)$/i)
  if (fn) {
    const parts = fn[1].split(/[\s,/]+/).filter(Boolean)
    if (parts.length < 3) throw new Error(`Unparseable rgb() colour: ${color}`)
    const channel = part =>
      part.endsWith('%') ? (parseFloat(part) / 100) * 255 : parseFloat(part)
    const alpha = parts[3] === undefined
      ? 1
      : parts[3].endsWith('%')
        ? parseFloat(parts[3]) / 100
        : parseFloat(parts[3])
    const [r, g, b] = parts.slice(0, 3).map(channel)
    if ([r, g, b, alpha].some(Number.isNaN)) throw new Error(`Unparseable rgb() colour: ${color}`)
    return [r, g, b, alpha]
  }

  throw new Error(`Unsupported colour format: ${color} (expected #hex or rgb()/rgba())`)
}

const toHex = n => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0')

/** Source-over compositing: paints `color` onto `backdrop` and returns the resulting opaque hex.
 *  An opaque `color` is returned unchanged (and needs no backdrop). A translucent one without a
 *  backdrop throws rather than silently measuring its own nominal RGB, which is exactly the
 *  mistake the old hex-only parser could not even make visible. */
export function composite(color, backdrop) {
  const [r, g, b, a] = parseColor(color)
  if (a >= 1) return `#${toHex(r)}${toHex(g)}${toHex(b)}`
  if (backdrop === undefined || backdrop === null) {
    throw new Error(
      `${color} is translucent (alpha ${a}) and has no contrast ratio on its own — ` +
        'pass the colour it is painted over as the backdrop.'
    )
  }
  const [br, bg, bb] = parseColor(composite(backdrop))
  return `#${toHex(r * a + br * (1 - a))}${toHex(g * a + bg * (1 - a))}${toHex(b * a + bb * (1 - a))}`
}

function relativeLuminance(color) {
  const [r, g, b] = parseColor(color)
  const linear = [r, g, b]
    .map(v => v / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
}

/**
 * Contrast ratio between `a` (the foreground) and `b` (its background).
 *
 * `backdrop` is what `b` itself is painted on, and is only needed when a translucent colour is
 * involved: `b` is composited over `backdrop`, then `a` is composited over that result — the
 * same order the browser paints them in. Two opaque hexes behave exactly as before, so every
 * existing caller (`generate-ramps.mjs`, `ColorGuideline.tsx`) is unaffected.
 */
export function contrastRatio(a, b, backdrop) {
  const bg = composite(b, backdrop)
  const fg = composite(a, bg)
  const [lighter, darker] = [relativeLuminance(fg), relativeLuminance(bg)].sort((x, y) => y - x)
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Measures every pair and says whether each one holds.
 *
 * `maxRatio` is optional and is a CEILING, which most pairs have no use for: an accessibility
 * minimum is a floor and more contrast is never a failure. One role in this system is the
 * exception. The dimmed leading-zero pad on a hero numeral is decorative and `aria-hidden`, so no
 * SC 1.4.3 obligation attaches to it at all, and its actual design rule is the opposite shape:
 * it must stay well UNDER the ink it pads or it stops reading as padding and starts reading as a
 * digit. That is exactly what happened in light theme, where the pad measured 65% of ink contrast
 * while dark measured 31%, and a floor-only gate could not see it. A rule that is not a gate is a
 * suggestion, so the gate learned to express a band.
 */
export function checkPairs(pairs) {
  return pairs.map(({ name, fg, bg, backdrop, minRatio, maxRatio }) => {
    const ratio = contrastRatio(fg, bg, backdrop)
    const pass = ratio >= minRatio && (maxRatio === undefined || ratio <= maxRatio)
    return { name, ratio, minRatio, maxRatio, pass }
  })
}
