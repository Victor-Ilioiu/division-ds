// Calendar dates as plain 'YYYY-MM-DD' strings. A date here has no time and no time zone: every
// calculation runs in UTC, so a day never shifts because the reader's clock is in another zone or
// crosses a daylight-saving change.

export type IsoDate = string

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/

const toUtc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d))
const fromUtc = (date: Date): IsoDate => date.toISOString().slice(0, 10)

/** { year, month (1-12), day } for a valid ISO date, otherwise null. */
export function parts(iso: string | null | undefined): { year: number; month: number; day: number } | null {
  const match = iso ? ISO.exec(iso) : null
  if (!match) return null
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null
  return { year, month, day }
}

export const isValidDate = (iso: string | null | undefined) => parts(iso) !== null

export function makeDate(year: number, month: number, day: number): IsoDate {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export const daysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate()

export function addDays(iso: IsoDate, days: number): IsoDate {
  const p = parts(iso)!
  return fromUtc(toUtc(p.year, p.month, p.day + days))
}

/** Same day in another month, pulled back to that month's last day when it has fewer. */
export function addMonths(iso: IsoDate, months: number): IsoDate {
  const p = parts(iso)!
  const index = p.year * 12 + (p.month - 1) + months
  const year = Math.floor(index / 12)
  const month = (index % 12) + 1
  return makeDate(year, month, Math.min(p.day, daysInMonth(year, month)))
}

/** 0 = Sunday ... 6 = Saturday. */
export const weekday = (iso: IsoDate) => {
  const p = parts(iso)!
  return toUtc(p.year, p.month, p.day).getUTCDay()
}

export const firstOfMonth = (iso: IsoDate) => {
  const p = parts(iso)!
  return makeDate(p.year, p.month, 1)
}

/** ISO strings compare correctly as text. */
export const compareDates = (a: IsoDate, b: IsoDate) => (a < b ? -1 : a > b ? 1 : 0)

export function clampDate(iso: IsoDate, min?: IsoDate, max?: IsoDate): IsoDate {
  if (min && iso < min) return min
  if (max && iso > max) return max
  return iso
}

/** Today in the reader's own time zone: the date their wall calendar shows. */
export function today(now = new Date()): IsoDate {
  return makeDate(now.getFullYear(), now.getMonth() + 1, now.getDate())
}

/** The first day of the week for a locale: 1 Monday (most of the world), 0 Sunday (US, Canada,
 *  Japan...), 6 Saturday. Read from Intl where the browser has it. */
export function weekStartFor(locale?: string): number {
  try {
    const info = new Intl.Locale(locale ?? navigator.language) as Intl.Locale & {
      weekInfo?: { firstDay: number }
      getWeekInfo?: () => { firstDay: number }
    }
    const firstDay = info.getWeekInfo?.().firstDay ?? info.weekInfo?.firstDay
    if (firstDay) return firstDay % 7
  } catch {
    // An unknown locale tag: fall through to Monday.
  }
  return 1
}

/** The six weeks a month grid shows, each seven ISO dates, starting on `weekStart`. */
export function monthGrid(month: IsoDate, weekStart: number): IsoDate[][] {
  const first = firstOfMonth(month)
  const start = addDays(first, -((weekday(first) - weekStart + 7) % 7))
  return Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)))
}

const formatter = (locale: string | undefined, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(locale, { timeZone: 'UTC', ...options })

const asDate = (iso: IsoDate) => {
  const p = parts(iso)!
  return toUtc(p.year, p.month, p.day)
}

/** "November 2026". */
export const formatMonth = (iso: IsoDate, locale?: string) => formatter(locale, { month: 'long', year: 'numeric' }).format(asDate(iso))

/** "Saturday, 14 November 2026": what a screen reader hears for a day. */
export const formatLong = (iso: IsoDate, locale?: string) =>
  formatter(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(asDate(iso))

/** Weekday column headings from `weekStart`: short ("Mo") and long ("Monday"). */
export function weekdayNames(weekStart: number, locale?: string) {
  // 2023-01-01 was a Sunday.
  return Array.from({ length: 7 }, (_, i) => {
    const date = toUtc(2023, 1, 1 + ((weekStart + i) % 7))
    return {
      short: formatter(locale, { weekday: 'short' }).format(date).slice(0, 2),
      long: formatter(locale, { weekday: 'long' }).format(date),
    }
  })
}

export type SegmentKind = 'day' | 'month' | 'year'

/** The order of day, month and year for a locale, and the separator between them: en-GB gives
 *  day / month / year with '/', en-US month / day / year, de day.month.year. */
export function segmentOrder(locale?: string): { order: SegmentKind[]; separator: string } {
  const formatted = formatter(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }).formatToParts(toUtc(2026, 11, 14))
  const order = formatted.filter(part => part.type === 'day' || part.type === 'month' || part.type === 'year').map(part => part.type as SegmentKind)
  const separator = formatted.find(part => part.type === 'literal')?.value.trim() || '/'
  return { order: order.length === 3 ? order : ['day', 'month', 'year'], separator }
}
