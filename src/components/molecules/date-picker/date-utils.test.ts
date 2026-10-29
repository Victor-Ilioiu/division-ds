import { describe, expect, it } from 'vitest'
import {
  addDays,
  addMonths,
  clampDate,
  formatLong,
  formatMonth,
  isValidDate,
  monthGrid,
  segmentOrder,
  today,
  weekdayNames,
} from './date-utils'

describe('date-utils', () => {
  it('accepts real dates only, leap years included', () => {
    expect(isValidDate('2024-02-29')).toBe(true)
    expect(isValidDate('2026-02-29')).toBe(false)
    expect(isValidDate('2026-04-31')).toBe(false)
    expect(isValidDate('2026-13-01')).toBe(false)
    expect(isValidDate('14/11/2026')).toBe(false)
    expect(isValidDate('')).toBe(false)
  })

  it('adds days across months and years', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('adds months, pulling the day back to a shorter month', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29')
    expect(addMonths('2026-01-15', -1)).toBe('2025-12-15')
    expect(addMonths('2026-11-14', 12)).toBe('2027-11-14')
  })

  it('clamps to min and max', () => {
    expect(clampDate('2026-01-01', '2026-02-01', '2026-03-01')).toBe('2026-02-01')
    expect(clampDate('2026-05-01', '2026-02-01', '2026-03-01')).toBe('2026-03-01')
    expect(clampDate('2026-02-10', '2026-02-01')).toBe('2026-02-10')
  })

  it('lays out six weeks from the week start', () => {
    const monday = monthGrid('2026-11-14', 1)
    expect(monday).toHaveLength(6)
    expect(monday[0][0]).toBe('2026-10-26') // 1 Nov 2026 is a Sunday
    expect(monday[0][6]).toBe('2026-11-01')
    expect(monthGrid('2026-11-14', 0)[0][0]).toBe('2026-11-01')
  })

  it("reads today's date from the local wall clock", () => {
    expect(today(new Date(2026, 10, 14, 23, 59))).toBe('2026-11-14')
  })

  it('names months, days and weekdays in the given language', () => {
    expect(formatMonth('2026-11-14', 'en-GB')).toBe('November 2026')
    expect(formatLong('2026-11-14', 'en-GB')).toMatch(/^Saturday,? 14 November 2026$/)
    expect(weekdayNames(1, 'en-GB')[0]).toEqual({ short: 'Mo', long: 'Monday' })
    expect(weekdayNames(0, 'en-US')[0].long).toBe('Sunday')
  })

  it('orders the segments the way each locale writes a date', () => {
    expect(segmentOrder('en-GB')).toEqual({ order: ['day', 'month', 'year'], separator: '/' })
    expect(segmentOrder('en-US')).toEqual({ order: ['month', 'day', 'year'], separator: '/' })
    expect(segmentOrder('de-DE')).toEqual({ order: ['day', 'month', 'year'], separator: '.' })
    expect(segmentOrder('ja-JP').order).toEqual(['year', 'month', 'day'])
  })
})
