/**
 * Halden Console's clock. "Now" is a constant, 2026-10-15 10:00, read as a wall-clock time with no
 * time zone, so the demo reads the same in every zone and in jsdom. Every time in the data is a
 * minute offset from `NOW` (negative is earlier) or a `YYYY-MM-DDTHH:MM` string made from one.
 * The live simulator moves a separate, seconds-only clock forward from `NOW`; it never changes
 * what "now" means for the seeded history.
 */
export const NOW = '2026-10-15T10:00'

const MINUTE_MS = 60_000
const NOW_MS = Date.UTC(2026, 9, 15, 10, 0)

/** The calendar time `offset` minutes from `NOW`: "2026-10-15T08:02". */
export function isoAt(offset: number): string {
  return new Date(NOW_MS + offset * MINUTE_MS).toISOString().slice(0, 16)
}

/** Minutes from `NOW` to `iso` (negative when earlier). Seconds, if any, are ignored. */
export function offsetOf(iso: string): number {
  const [date, time = '00:00'] = iso.split('T')
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  return Math.round((Date.UTC(y, m - 1, d, hh, mm) - NOW_MS) / MINUTE_MS)
}

const dayFormat = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
const shortDay = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: 'UTC' })

function asDate(iso: string): Date {
  return new Date(NOW_MS + offsetOf(iso) * MINUTE_MS)
}

/** "08:02". */
export function formatTime(iso: string): string {
  return iso.slice(11, 16)
}

/** "Thu 15 Oct". */
export function formatDay(iso: string): string {
  return dayFormat.format(asDate(iso)).replace(',', '')
}

/** "15 Oct". */
export function formatShortDay(iso: string): string {
  return shortDay.format(asDate(iso))
}

/** "Thu". */
export function formatWeekday(iso: string): string {
  return weekday.format(asDate(iso))
}

/** "Today 08:02", "Yesterday 22:40", "Mon 12 Oct 14:30". */
export function formatWhen(iso: string): string {
  const day = iso.slice(0, 10)
  if (day === NOW.slice(0, 10)) return `Today ${formatTime(iso)}`
  if (day === isoAt(-24 * 60).slice(0, 10)) return `Yesterday ${formatTime(iso)}`
  return `${formatDay(iso)} ${formatTime(iso)}`
}

/** "22 min", "3 h 15 min", "2 d 4 h". */
export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes))
  if (m < 60) return `${m} min`
  if (m < 24 * 60) return m % 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m / 60} h`
  const days = Math.floor(m / 1440)
  const hours = Math.floor((m % 1440) / 60)
  return hours ? `${days} d ${hours} h` : `${days} d`
}

/** The live clock: `NOW` plus `seconds`, as "10:00:35". */
export function liveClock(seconds: number): string {
  const total = 10 * 3600 + seconds
  const hh = Math.floor(total / 3600) % 24
  const mm = Math.floor(total / 60) % 60
  const ss = total % 60
  return [hh, mm, ss].map(n => String(n).padStart(2, '0')).join(':')
}

/** The first minute of the day `iso` falls on, as an offset from NOW. */
export function dayStartOffset(iso: string): number {
  return offsetOf(`${iso.slice(0, 10)}T00:00`)
}

/** Monday 12 October 2026, 00:00: the start of "this week" for the demo's NOW (a Thursday). */
export const WEEK_START = '2026-10-12T00:00'
