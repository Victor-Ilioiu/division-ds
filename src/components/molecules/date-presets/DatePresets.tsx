import { type Ref } from 'react'
import { cn } from '../../../lib/cn'
import { addDays, addMonths, daysInMonth, firstOfMonth, makeDate, parts, today as todayIso, type IsoDate } from '../date-picker/date-utils'
import { useDateRangePicker, type DateRange } from '../date-range-picker/DateRangePicker'

export type DatePreset = { label: string; range: DateRange }

const lastOfMonth = (iso: IsoDate) => {
  const p = parts(iso)!
  return makeDate(p.year, p.month, daysInMonth(p.year, p.month))
}

/** The usual periods, counted back from `today` (default: the reader's today). Each includes today. */
export function defaultPresets(today: IsoDate = todayIso()): DatePreset[] {
  const lastMonth = addMonths(firstOfMonth(today), -1)
  const year = parts(today)!.year
  return [
    { label: 'Today', range: { start: today, end: today } },
    { label: 'Yesterday', range: { start: addDays(today, -1), end: addDays(today, -1) } },
    { label: 'Last 7 days', range: { start: addDays(today, -6), end: today } },
    { label: 'Last 30 days', range: { start: addDays(today, -29), end: today } },
    { label: 'This month', range: { start: firstOfMonth(today), end: lastOfMonth(today) } },
    { label: 'Last month', range: { start: lastMonth, end: lastOfMonth(lastMonth) } },
    { label: 'This year', range: { start: makeDate(year, 1, 1), end: makeDate(year, 12, 31) } },
  ]
}

export type DatePresetsProps = {
  /** @default defaultPresets() */
  presets?: DatePreset[]
  /** The current range. Inside a DateRangePicker it comes from the picker. */
  value?: DateRange
  /** A preset was chosen. Inside a DateRangePicker the picker sets the range and closes; this still fires. */
  onSelect?: (range: DateRange) => void
  /** The list's accessible name. @default 'Presets' */
  label?: string
  className?: string
  ref?: Ref<HTMLDivElement>
}

/**
 * Named periods, one click each: Today, Last 7 days, This month... Put it in a DateRangePicker's
 * `aside` and it reads and sets the picker's range by itself; on its own, give it `value` and
 * `onSelect`. The preset that matches the current range is shown pressed.
 *
 * Contrast rows: a preset "text.primary on surface.base"; the pressed one "accent.signal.indicator-ink
 * on accent.signal.indicator" and its fill "sidebar active item fill on surface.base"; hover "hover
 * wash text (text.primary) on accent.signal.wash over surface.base"; the ring "focus.ring on surface.base".
 */
export function DatePresets({ presets, value, onSelect, label = 'Presets', className, ref }: DatePresetsProps) {
  const picker = useDateRangePicker()
  const list = presets ?? defaultPresets()
  const current = value ?? picker?.value
  return (
    <div ref={ref} role="group" aria-label={label} className={cn('flex flex-col gap-0.5 font-body text-sm sm:w-36', className)}>
      {list.map(preset => {
        const on = !!current && current.start === preset.range.start && current.end === preset.range.end
        return (
          <button
            key={preset.label}
            type="button"
            aria-pressed={on}
            onClick={() => {
              onSelect?.(preset.range)
              picker?.select(preset.range)
            }}
            className={cn(
              'flex min-h-[36px] items-center px-2 text-left transition-control',
              'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
              on
                ? 'bg-[var(--color-accent-signal-indicator)] font-semibold text-[var(--color-accent-signal-indicator-ink)] focus-visible:outline-[var(--color-accent-signal-indicator-ink)]'
                : 'text-[var(--color-text-primary)] hover:bg-[var(--color-accent-signal-wash)]'
            )}
          >
            {preset.label}
          </button>
        )
      })}
    </div>
  )
}
