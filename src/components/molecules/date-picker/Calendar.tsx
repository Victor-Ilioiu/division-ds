import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type Ref } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { IconButton } from '../../atoms/icon-button/IconButton'
import {
  addDays,
  addMonths,
  clampDate,
  firstOfMonth,
  formatLong,
  formatMonth,
  monthGrid,
  parts,
  today as todayIso,
  weekday,
  weekStartFor,
  weekdayNames,
  type IsoDate,
} from './date-utils'

/** How a day is drawn. `single` is one picked day; the rest belong to a range. */
export type DayState = 'single' | 'start' | 'end' | 'start-end' | 'middle'

export type CalendarProps = {
  /** The picked day, 'YYYY-MM-DD'. Ignored when `dayState` is given. */
  value?: IsoDate | null
  /** A day was picked with a click, Enter or Space. */
  onSelect?: (date: IsoDate) => void
  /** The first month shown, any day in it. Controlled with `onMonthChange`. */
  month?: IsoDate
  /** The first month shown when the calendar holds it itself. @default the value's month, or today's */
  defaultMonth?: IsoDate
  onMonthChange?: (month: IsoDate) => void
  /** Earliest day that can be picked. */
  min?: IsoDate
  /** Latest day that can be picked. */
  max?: IsoDate
  /** Days that cannot be picked, e.g. weekends. Each still shows, struck through and announced as unavailable. */
  isDateDisabled?: (date: IsoDate) => boolean
  /** Draws each day for a range or any other selection. Replaces `value`. */
  dayState?: (date: IsoDate) => DayState | undefined
  /** The keyboard or the pointer moved onto a day. A range uses it to preview the band. */
  onDayEnter?: (date: IsoDate) => void
  /** Months side by side; two from the sm breakpoint up, stacked below it. @default 1 */
  numberOfMonths?: 1 | 2
  /** A BCP 47 language tag for the names and the first day of the week. @default the browser's */
  locale?: string
  /** 0 Sunday ... 6 Saturday. @default the locale's */
  weekStartsOn?: number
  /** Moves focus to the focused day when the calendar mounts (a popover opening). @default false */
  autoFocus?: boolean
  className?: string
  ref?: Ref<HTMLDivElement>
}

/**
 * A month grid you pick a day from. The grid is one tab stop: the arrow keys move a day or a week,
 * Page Up / Page Down a month (with Shift, a year), Home / End to the start or end of the week.
 * Each day is a button whose name is the full date, so a screen reader hears "Saturday,
 * 14 November 2026" rather than "14". Today carries aria-current="date" and a short bar under it.
 *
 * Contrast rows: day numbers "text.primary on surface.base"; weekday headings "text.label on
 * surface.base"; a picked day "accent.signal.indicator-ink on accent.signal.indicator" and its
 * fill "checked/on fill (accent.signal.indicator) on surface.base"; the range band "hover wash
 * text (text.primary) on accent.signal.wash over surface.base"; the ring "focus.ring on
 * surface.base". Put the calendar on surface.base, the surface those rows are measured on.
 */
export function Calendar({
  value,
  onSelect,
  month,
  defaultMonth,
  onMonthChange,
  min,
  max,
  isDateDisabled,
  dayState,
  onDayEnter,
  numberOfMonths = 1,
  locale,
  weekStartsOn,
  autoFocus = false,
  className,
  ref,
}: CalendarProps) {
  const today = todayIso()
  const start = clampDate(parts(value) ? value! : today, min, max)
  const [internalMonth, setInternalMonth] = useState(() => firstOfMonth(defaultMonth ?? start))
  const shown = firstOfMonth(month ?? internalMonth)
  const setShown = (next: IsoDate) => {
    if (month === undefined) setInternalMonth(firstOfMonth(next))
    onMonthChange?.(firstOfMonth(next))
  }
  const [focused, setFocused] = useState<IsoDate>(start)
  // Only a key press moves real focus; a re-render from outside must not steal it.
  const moveFocus = useRef(autoFocus)
  const grid = useRef<HTMLDivElement>(null)
  const id = useId()

  const weekStart = weekStartsOn ?? weekStartFor(locale)
  const names = useMemo(() => weekdayNames(weekStart, locale), [weekStart, locale])
  const months = Array.from({ length: numberOfMonths }, (_, i) => addMonths(shown, i))
  const lastShown = months[months.length - 1]
  const inView = (date: IsoDate) => date.slice(0, 7) >= shown.slice(0, 7) && date.slice(0, 7) <= lastShown.slice(0, 7)
  // The roving tab stop has to be a day that is on screen.
  const tabStop = inView(focused) ? focused : inView(start) ? start : shown

  const disabled = (date: IsoDate) => (min !== undefined && date < min) || (max !== undefined && date > max) || !!isDateDisabled?.(date)
  const stateOf = (date: IsoDate): DayState | undefined => (dayState ? dayState(date) : value === date ? 'single' : undefined)

  useEffect(() => {
    if (!moveFocus.current) return
    moveFocus.current = false
    grid.current?.querySelector<HTMLButtonElement>(`[data-date="${tabStop}"]`)?.focus()
  }, [tabStop])

  const go = (date: IsoDate) => {
    const next = clampDate(date, min, max)
    moveFocus.current = true
    setFocused(next)
    if (!inView(next)) setShown(next < shown ? next : addMonths(next, -(numberOfMonths - 1)))
    onDayEnter?.(next)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, date: IsoDate) => {
    const offset = (weekday(date) - weekStart + 7) % 7
    const moves: Record<string, () => IsoDate> = {
      ArrowLeft: () => addDays(date, -1),
      ArrowRight: () => addDays(date, 1),
      ArrowUp: () => addDays(date, -7),
      ArrowDown: () => addDays(date, 7),
      PageUp: () => addMonths(date, event.shiftKey ? -12 : -1),
      PageDown: () => addMonths(date, event.shiftKey ? 12 : 1),
      Home: () => addDays(date, -offset),
      End: () => addDays(date, 6 - offset),
    }
    const move = moves[event.key]
    if (!move) return
    event.preventDefault()
    go(move())
  }

  const pick = (date: IsoDate) => {
    if (disabled(date)) return
    setFocused(date)
    onSelect?.(date)
  }

  const canPrev = !min || addMonths(shown, -1).slice(0, 7) >= min.slice(0, 7)
  const canNext = !max || addMonths(lastShown, 1).slice(0, 7) <= max.slice(0, 7)

  return (
    <div ref={ref} className={cn('inline-flex flex-col gap-3 font-body', className)}>
      <div className="flex items-center justify-between gap-2">
        <IconButton label="Previous month" variant="ghost" size="sm" disabled={!canPrev} onClick={() => setShown(addMonths(shown, -1))}>
          <ChevronLeft />
        </IconButton>
        {/* Announced when it changes, so Page Down is heard as "December 2026". */}
        <p aria-live="polite" className="flex-1 text-center font-display text-sm font-semibold uppercase tracking-[0.12em] text-[var(--color-text-primary)]">
          {months.map(m => formatMonth(m, locale)).join(' – ')}
        </p>
        <IconButton label="Next month" variant="ghost" size="sm" disabled={!canNext} onClick={() => setShown(addMonths(shown, 1))}>
          <ChevronRight />
        </IconButton>
      </div>
      <div ref={grid} className="flex flex-col gap-5 sm:flex-row sm:gap-6">
        {months.map(m => {
          const captionId = `${id}-${m}`
          const thisMonth = m.slice(0, 7)
          return (
            <div key={m} className="flex flex-col gap-1">
              {numberOfMonths > 1 ? (
                <p id={captionId} className="text-center font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-label)]">
                  {formatMonth(m, locale)}
                </p>
              ) : (
                <span id={captionId} className="sr-only">
                  {formatMonth(m, locale)}
                </span>
              )}
              <table role="grid" aria-labelledby={captionId} className="border-collapse">
                <thead>
                  <tr>
                    {names.map(name => (
                      <th key={name.long} scope="col" abbr={name.long} className="h-8 w-9 sm:w-10 text-center font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-label)]">
                        {name.short}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {monthGrid(m, weekStart)
                    .filter(week => week.some(date => date.slice(0, 7) === thisMonth))
                    .map(week => (
                      <tr key={week[0]}>
                        {week.map(date => {
                          if (date.slice(0, 7) !== thisMonth) return <td key={date} aria-hidden="true" className="h-9 w-9 sm:h-10 sm:w-10" />
                          const state = stateOf(date)
                          const off = disabled(date)
                          const filled = state === 'single' || state === 'start' || state === 'end' || state === 'start-end'
                          return (
                            <td
                              key={date}
                              role="gridcell"
                              aria-selected={state ? true : undefined}
                              className={cn(
                                'relative h-9 w-9 p-0 sm:h-10 sm:w-10',
                                // The band runs behind the days between the ends, and half into each end.
                                state === 'middle' && 'bg-[var(--color-accent-signal-wash)]',
                                state === 'start' && 'bg-[linear-gradient(to_right,transparent_50%,var(--color-accent-signal-wash)_50%)]',
                                state === 'end' && 'bg-[linear-gradient(to_left,transparent_50%,var(--color-accent-signal-wash)_50%)]'
                              )}
                            >
                              <button
                                type="button"
                                data-date={date}
                                tabIndex={date === tabStop ? 0 : -1}
                                aria-label={`${formatLong(date, locale)}${off ? ', unavailable' : ''}`}
                                aria-current={date === today ? 'date' : undefined}
                                aria-disabled={off || undefined}
                                onClick={() => pick(date)}
                                onKeyDown={event => onKeyDown(event, date)}
                                onFocus={() => setFocused(date)}
                                onPointerEnter={() => !off && onDayEnter?.(date)}
                                className={cn(
                                  'group relative flex h-9 w-9 items-center sm:h-10 sm:w-10 justify-center text-sm tabular-nums transition-control',
                                  'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
                                  off
                                    ? 'cursor-not-allowed text-[var(--component-control-text-disabled)] line-through'
                                    : cn('cursor-pointer text-[var(--color-text-primary)]', !filled && 'hover:bg-[var(--color-accent-signal-wash)]'),
                                  date === today && 'font-semibold',
                                  // On the accent square the ring would vanish: it takes the square's ink.
                                  filled && 'focus-visible:outline-[var(--color-accent-signal-indicator-ink)]'
                                )}
                              >
                                {filled ? <span aria-hidden="true" className="bevel-sm absolute inset-1 bg-[var(--color-accent-signal-indicator)]" /> : null}
                                <span className={cn('relative', filled && 'font-semibold text-[var(--color-accent-signal-indicator-ink)]')}>
                                  {parts(date)!.day}
                                </span>
                                {date === today ? (
                                  <span
                                    aria-hidden="true"
                                    className={cn(
                                      'absolute bottom-1.5 left-1/2 h-0.5 w-3 -translate-x-1/2',
                                      filled ? 'bg-[var(--color-accent-signal-indicator-ink)]' : 'bg-[var(--color-accent-signal-indicator)]'
                                    )}
                                  />
                                ) : null}
                              </button>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )
        })}
      </div>
    </div>
  )
}
