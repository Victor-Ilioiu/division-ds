function hexToHsl(hex) {
  hex = hex.replace('#', '')
  const r = parseInt(hex.slice(0, 2), 16) / 255
  const g = parseInt(hex.slice(2, 4), 16) / 255
  const b = parseInt(hex.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h, s
  const l = (max + min) / 2
  if (max === min) {
    h = s = 0
  } else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      default: h = (r - g) / d + 4
    }
    h /= 6
  }
  return [h * 360, s * 100, l * 100]
}

function hslToHex(h, s, l) {
  h /= 360; s /= 100; l /= 100
  let r, g, b
  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3); g = hue2rgb(p, q, h); b = hue2rgb(p, q, h - 1 / 3)
  }
  const toHex = v => Math.round(v * 255).toString(16).padStart(2, '0')
  return '#' + toHex(r) + toHex(g) + toHex(b)
}

const LIGHT_STOPS = { 400: 0.2, 300: 0.4, 200: 0.6, 100: 0.8, 50: 1.0 }
const DARK_STOPS = { 600: 0.2, 700: 0.4, 800: 0.6, 900: 0.8, 950: 1.0 }

// Anchor's own lightness lands exactly at stop 500. Every other stop is a piecewise-linear
// interpolation from that lightness toward lightBound (light side) or darkBound (dark side),
// holding hue/saturation constant -- so stops are always monotonic and never collide, regardless
// of how light or dark the anchor itself is.
export function generateRamp(anchorHex, opts = {}) {
  const lightBound = opts.lightBound ?? 97
  const darkBound = opts.darkBound ?? 3
  const [h, s, l0] = hexToHsl(anchorHex)
  const ramp = { 500: anchorHex.toLowerCase() }
  for (const [stop, pos] of Object.entries(LIGHT_STOPS)) {
    ramp[stop] = hslToHex(h, s, l0 + (lightBound - l0) * pos)
  }
  for (const [stop, pos] of Object.entries(DARK_STOPS)) {
    ramp[stop] = hslToHex(h, s, l0 - (l0 - darkBound) * pos)
  }
  return ramp
}
