import { describe, expect, it } from 'vitest'
import { fontCss, fontVars, fontsUrl, loadFonts, readFont } from './theme-fonts'

describe('theme-fonts', () => {
  it('reads only known fonts', () => {
    expect(readFont('Inter')).toBe('Inter')
    expect(readFont('Comic Sans')).toBeUndefined()
    expect(readFont(null)).toBeUndefined()
  })

  it('builds one URL with each family once', () => {
    expect(fontsUrl([undefined, undefined])).toBeUndefined()
    expect(fontsUrl(['DM Sans', 'DM Sans'])).toBe('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap')
    expect(fontsUrl(['Inter', 'Manrope'])).toContain('family=Inter:wght@400;500;600;700&family=Manrope:')
  })

  it('overrides display and body only, never mono', () => {
    expect(fontVars({ body: 'Inter' })).toEqual({ '--font-body': '"Inter", system-ui, sans-serif' })
    expect(fontCss({})).toBe('')
    const css = fontCss({ heading: 'Outfit' })
    expect(css.startsWith('@import url("https://fonts.googleapis.com/css2?family=Outfit')).toBe(true)
    expect(css).toContain('--font-display: "Outfit"')
    expect(css).not.toContain('--font-mono')
  })

  it('adds a link once per URL', () => {
    const url = fontsUrl(['Figtree'])
    loadFonts(url)
    loadFonts(url)
    const links = Array.from(document.head.querySelectorAll('link')).filter(link => link.getAttribute('href') === url)
    expect(links).toHaveLength(1)
  })
})
