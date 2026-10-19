import { describe, it, expect } from 'vitest'
import { generateRamp } from './ramp.mjs'

describe('generateRamp', () => {
  it('places the exact anchor hex at stop 500', () => {
    const ramp = generateRamp('#F2550F')
    expect(ramp['500']).toBe('#f2550f')
  })

  it('produces 11 strictly monotonic-lightening stops from 950 to 50', () => {
    const ramp = generateRamp('#2FB577')
    const stops = ['950', '900', '800', '700', '600', '500', '400', '300', '200', '100', '50']
    const lightnessOf = hex => {
      const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
      return (Math.max(...c) + Math.min(...c)) / 2
    }
    const lightnesses = stops.map(s => lightnessOf(ramp[s]))
    for (let i = 1; i < lightnesses.length; i++) {
      expect(lightnesses[i]).toBeGreaterThan(lightnesses[i - 1])
    }
  })

  it('holds hue constant across every stop', () => {
    const ramp = generateRamp('#5AA7FF')
    const hueOf = hex => {
      const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
      const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
      if (d === 0) return 0
      let h
      if (max === r) h = ((g - b) / d) % 6
      else if (max === g) h = (b - r) / d + 2
      else h = (r - g) / d + 4
      return Math.round(h * 60)
    }
    const hue500 = hueOf(ramp['500'])
    for (const stop of ['100', '300', '700', '900']) {
      expect(Math.abs(hueOf(ramp[stop]) - hue500)).toBeLessThanOrEqual(1)
    }
  })
})
