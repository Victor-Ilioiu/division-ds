function get(obj, path) {
  return path.split('.').reduce((node, key) => node?.[key], obj)
}

function resolveValue(value, primitives, semantic) {
  const alias = typeof value === 'string' && value.match(/^\{(.+)\}$/)
  if (!alias) return value
  const path = alias[1]
  const node = get(primitives, path) ?? get(semantic, path)
  if (!node) throw new Error(`Token alias points nowhere: {${path}}`)
  return resolveValue(node.$value, primitives, semantic)
}

// OKLab mixing, for a semantic token that sits BETWEEN two ramp stops. The token keeps a ramp
// alias as its $value and names the second stop and the amount in
// $extensions['division-ds'].mix = { with: '{alias}', amount: 0..1 }, so a preset that regenerates
// the ramp (scripts/lib/preset.mjs) re-tints the mix too. Used by the light surface.sunken: the
// neutral ramp has no stop close enough to neutral.50 for a field fill.
const srgbToLinear = c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const linearToSrgb = c => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)

function hexToOklab(hex) {
  const [r, g, b] = [1, 3, 5].map(i => srgbToLinear(parseInt(hex.slice(i, i + 2), 16) / 255))
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720453 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

function oklabToHex([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
  return '#' + rgb.map(c => Math.round(Math.min(1, Math.max(0, linearToSrgb(c))) * 255).toString(16).padStart(2, '0')).join('')
}

export function mixOklab(fromHex, toHex, amount) {
  const a = hexToOklab(fromHex), b = hexToOklab(toHex)
  return oklabToHex(a.map((v, i) => v + (b[i] - v) * amount))
}

function resolveNode(node, primitives, semantic) {
  const base = resolveValue(node.$value, primitives, semantic)
  const mix = node.$extensions?.['division-ds']?.mix
  if (!mix) return base
  const other = resolveValue(mix.with, primitives, semantic)
  const hex = /^#[0-9a-f]{6}$/i
  if (!hex.test(base) || !hex.test(other) || !(mix.amount >= 0 && mix.amount <= 1)) {
    throw new Error(`A mix needs two 6-digit hex colours and an amount from 0 to 1; got ${base}, ${other}, ${mix.amount}`)
  }
  return mixOklab(base, other, mix.amount)
}

function flatten(node, prefix, primitives, semantic, out) {
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith('$')) continue
    const path = prefix ? `${prefix}-${key}` : key
    if (value && typeof value === 'object' && '$value' in value) {
      out[`--${path}`] = resolveNode(value, primitives, semantic)
    } else if (value && typeof value === 'object') {
      flatten(value, path, primitives, semantic, out)
    }
  }
  return out
}

export function resolveTokens(primitives, semantic) {
  return flatten(semantic.color.semantic, 'color', primitives, semantic, {})
}
