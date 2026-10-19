import { describe, expect, it } from 'vitest'
import { sensorById } from '../data'
import { chartRows, chartSummary, type Range } from './SiteChart'

const ostwind = () => [sensorById('ostwind-cr1')!, sensorById('ostwind-cr2')!] as const
const brennick = () => [sensorById('brennick-cr1')!, sensorById('brennick-cr2')!] as const

describe('SiteChart rows', () => {
  // The gateway went quiet at 09:12: no point may be drawn after that, in any range.
  it.each<Range>(['1h', '24h', '7d'])('draws nothing after an offline gateway went quiet (%s)', range => {
    const [a, b] = ostwind()
    const rows = chartRows(a, b, range, {})
    expect(rows.length).toBeGreaterThan(0)
    const last = rows[rows.length - 1].time.slice(-5)
    expect(last <= '09:12').toBe(true)
  })

  it('says when an offline site stopped reporting', () => {
    const [a, b] = ostwind()
    expect(chartSummary(a, b, chartRows(a, b, '24h', {}), '24h')).toMatch(/No readings since 09:1\d\.$/)
  })

  it('runs to now for a site that is reporting', () => {
    const [a, b] = brennick()
    const rows = chartRows(a, b, '24h', {})
    expect(rows[rows.length - 1].time).toBe('10:00')
    expect(chartSummary(a, b, rows, '24h')).not.toMatch(/No readings since/)
  })
})
