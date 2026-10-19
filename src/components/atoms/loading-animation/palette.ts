/**
 * The loader's colours, read from the semantic tokens at runtime rather than restated here, so a
 * theme flip or a token change reaches the WebGL scene the same way it reaches every other
 * component. No three.js import: this runs on the page side, before the scene chunk loads.
 */

export type Rgba = { r: number; g: number; b: number; a: number }

/** The five roles every dial draws with. Three greys for structure, one faint for guides, and the
 *  signal accent for the single moving element that says "working". */
export type Role = 'bright' | 'mid' | 'dim' | 'faint' | 'accent'
export type Palette = Record<Role, Rgba>

/**
 * Role to token. `bright` is text.primary and `mid` text.secondary, the same two steps the docs
 * copy uses, so the dial reads at the page's own contrast in both themes. `dim` is border.control,
 * the grey every unbevelled control draws its outline in; `faint` is border.hairline.strong,
 * alpha included. `accent` is accent.signal.fill, as on Spinner's arc.
 */
const TOKENS: Record<Role, string> = {
  bright: '--color-text-primary',
  mid: '--color-text-secondary',
  dim: '--color-border-control',
  faint: '--color-border-hairline-strong',
  accent: '--color-accent-signal-fill',
}

/** Reads the `rgb()` / `rgba()` strings `getComputedStyle` produces, comma or space form. Returns
 *  null rather than a default colour, so an unreadable token is visible as a failure. */
export function parseCssColor(value: string): Rgba | null {
  const match = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/.exec(value.trim())
  if (!match) return null
  const [, r, g, b, alpha] = match
  const a = alpha === undefined ? 1 : alpha.endsWith('%') ? parseFloat(alpha) / 100 : parseFloat(alpha)
  return { r: Number(r) / 255, g: Number(g) / 255, b: Number(b) / 255, a }
}

/**
 * Resolves each role's token in the cascade of `host`, so a loader inside a section with its own
 * `data-theme` gets that section's colours. A probe span inherits the custom properties and
 * reports the computed colour; it lives for the length of this call only.
 */
export function readPalette(host: Element): Palette {
  const probe = document.createElement('span')
  probe.style.display = 'none'
  host.appendChild(probe)
  try {
    const out = {} as Palette
    for (const role of Object.keys(TOKENS) as Role[]) {
      probe.style.color = `var(${TOKENS[role]})`
      out[role] = parseCssColor(getComputedStyle(probe).color) ?? { r: 0.5, g: 0.5, b: 0.5, a: 1 }
    }
    return out
  } finally {
    probe.remove()
  }
}
