import { describe, it, expect } from 'vitest'
import { TONES } from './tone'

describe('TONES', () => {
  it('covers the four status tones and nothing else', () => {
    expect(Object.keys(TONES).sort()).toEqual(['hostile', 'info', 'ok', 'warning'])
  })

  it('gives every tone an icon and a word, so colour is never the only cue', () => {
    for (const tone of Object.values(TONES)) {
      expect(tone.icon).toBeTruthy()
      expect(tone.word.length).toBeGreaterThan(0)
    }
  })

  it('reads the theme-adaptive .text step, never .fill', () => {
    for (const [name, tone] of Object.entries(TONES)) {
      expect(tone.text).toBe(`text-[var(--color-accent-${name}-text)]`)
      expect(tone.border).toBe(`border-[var(--color-accent-${name}-text)]`)
    }
  })
})
