/** The theme builder's corner shape. Kept out of the preset code, in its own `shape` URL param:
 *  `cut` (the default, also when absent or unreadable) or `r0` to `r12`, the corner radius once
 *  the cut is off. See docs/improvements/14-theme-shape.md. */
export const RADII = [0, 2, 4, 8, 12] as const

/** The radius in px, or null for the cut corner. */
export function readShape(value: string | null): number | null {
  const match = value?.match(/^r(\d+)$/)
  const radius = match ? Number(match[1]) : NaN
  return (RADII as readonly number[]).includes(radius) ? radius : null
}

/** The variables bevel.css, elevation.css, Input, Textarea and Badge read. Empty for the cut,
 *  which is what the stylesheet already does with neither set. */
export function shapeVars(radius: number | null): Record<string, string> {
  return radius === null ? {} : { '--shape-bevel': '0', '--shape-radius': `${radius}px` }
}

/** The CSS to append to the theme CSS. Empty for the cut. */
export function shapeCss(radius: number | null): string {
  if (radius === null) return ''
  const lines = Object.entries(shapeVars(radius)).map(([name, value]) => `  ${name}: ${value};`)
  return `\n\n/* Shape: no cut corner, ${radius}px radius */\n:root {\n${lines.join('\n')}\n}\n`
}
