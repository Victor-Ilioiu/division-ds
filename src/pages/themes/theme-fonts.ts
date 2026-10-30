/** Font choices for the theme builder. Kept out of the preset code on purpose: a font never
 *  changes a contrast result, so it travels in its own URL params (`heading`, `body`). */

/** Google Fonts that read well in product UI and ship every weight the components use. */
export const FONTS = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Source Sans 3',
  'IBM Plex Sans',
  'Manrope',
  'DM Sans',
  'Work Sans',
  'Plus Jakarta Sans',
  'Space Grotesk',
  'Outfit',
  'Figtree',
  'Nunito Sans',
] as const

export type Font = (typeof FONTS)[number]

const WEIGHTS = '400;500;600;700'

/** A URL value back to a known font, or undefined for "Division default". */
export function readFont(value: string | null): Font | undefined {
  return FONTS.find(font => font === value)
}

/** One css2 URL for the chosen fonts, each family once, or undefined when nothing is chosen. */
export function fontsUrl(fonts: (Font | undefined)[]): string | undefined {
  const families = [...new Set(fonts.filter((f): f is Font => f !== undefined))]
  if (families.length === 0) return undefined
  const query = families.map(f => `family=${f.replace(/ /g, '+')}:wght@${WEIGHTS}`).join('&')
  return `https://fonts.googleapis.com/css2?${query}&display=swap`
}

/** The variable overrides for a choice. Mono is never touched. */
export function fontVars({ heading, body }: { heading?: Font; body?: Font }): Record<string, string> {
  const vars: Record<string, string> = {}
  if (heading) vars['--font-display'] = `"${heading}", system-ui, sans-serif`
  if (body) vars['--font-body'] = `"${body}", system-ui, sans-serif`
  return vars
}

/** The CSS to prepend to the copied theme: the import first (it must lead the file), then the vars. */
export function fontCss(choice: { heading?: Font; body?: Font }): string {
  const url = fontsUrl([choice.heading, choice.body])
  if (!url) return ''
  const vars = Object.entries(fontVars(choice)).map(([k, v]) => `  ${k}: ${v};`).join('\n')
  return `@import url("${url}");\n\n:root {\n${vars}\n}\n\n`
}

/** Add the stylesheet <link> once per URL, so switching back and forth never stacks copies. */
export function loadFonts(url: string | undefined, doc: Document = document): void {
  if (!url) return
  const links = Array.from(doc.querySelectorAll<HTMLLinkElement>('link[data-theme-font]'))
  if (links.some(link => link.dataset.themeFont === url)) return
  const link = doc.createElement('link')
  link.rel = 'stylesheet'
  link.href = url
  link.dataset.themeFont = url
  doc.head.appendChild(link)
}
