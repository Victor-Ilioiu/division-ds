/**
 * Corvane's calendar. Every date in the demo is a plain `YYYY-MM-DD` (or `YYYY-MM-DDTHH:MM` for an
 * activity), read as a calendar day with no time zone, so the demo reads the same in every zone
 * and in jsdom. "Today" is a constant: the data was written around it, and a clock would make the
 * stalled deals, the slipped dates and the "Today" group drift away from the copy that names them.
 */
export const TODAY = '2026-10-15'

const DAY_MS = 86_400_000

/** Days since 1970-01-01 for a calendar date (the time part, if any, is ignored). */
export function dayNumber(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS)
}

/** Whole days from `from` to `to`: positive when `to` is later. */
export function daysBetween(from: string, to: string): number {
  return dayNumber(to) - dayNumber(from)
}

export function addDays(iso: string, days: number): string {
  return new Date((dayNumber(iso) + days) * DAY_MS).toISOString().slice(0, 10)
}

const dayFormat = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
const longFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

/** "Thu 15 Oct". */
export function formatDay(iso: string): string {
  return dayFormat.format(new Date(dayNumber(iso) * DAY_MS)).replace(',', '')
}

/** "15 Oct 2026". */
export function formatDate(iso: string): string {
  return longFormat.format(new Date(dayNumber(iso) * DAY_MS))
}

/** "09:40" from "2026-10-15T09:40". */
export function formatTime(isoDateTime: string): string {
  return isoDateTime.slice(11, 16)
}

/** The Monday of the week `iso` falls in. */
export function weekStart(iso: string): string {
  const weekday = (dayNumber(iso) + 3) % 7 // 1970-01-01 was a Thursday; 0 = Monday
  return addDays(iso, -weekday)
}

export type DayGroup = 'Today' | 'Yesterday' | 'This week' | 'Earlier'
export const DAY_GROUPS: readonly DayGroup[] = ['Today', 'Yesterday', 'This week', 'Earlier']

/** Which of the activity feed's four groups a date belongs to, counted from `TODAY`. */
export function dayGroup(iso: string, today = TODAY): DayGroup {
  const ago = daysBetween(iso, today)
  if (ago <= 0) return 'Today'
  if (ago === 1) return 'Yesterday'
  if (dayNumber(iso) >= dayNumber(weekStart(today))) return 'This week'
  return 'Earlier'
}

/** The calendar quarter holding `iso`: its first and last day. */
export function quarterOf(iso: string): { start: string; end: string; label: string } {
  const y = Number(iso.slice(0, 4))
  const q = Math.floor((Number(iso.slice(5, 7)) - 1) / 3)
  const start = `${y}-${String(q * 3 + 1).padStart(2, '0')}-01`
  const nextStart = q === 3 ? `${y + 1}-01-01` : `${y}-${String(q * 3 + 4).padStart(2, '0')}-01`
  return { start, end: addDays(nextStart, -1), label: `Q${q + 1} ${y}` }
}

export function inRange(iso: string, start: string, end: string): boolean {
  const n = dayNumber(iso)
  return n >= dayNumber(start) && n <= dayNumber(end)
}
