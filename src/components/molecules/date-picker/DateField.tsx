import { Fragment, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode, type Ref } from 'react'
import { cn } from '../../../lib/cn'
import { daysInMonth, isValidDate, makeDate, parts, segmentOrder, today, type IsoDate, type SegmentKind } from './date-utils'

type Segments = Record<SegmentKind, string>

const EMPTY: Segments = { day: '', month: '', year: '' }
const LIMITS: Record<SegmentKind, { min: number; max: number; width: number; placeholder: string; name: string }> = {
  day: { min: 1, max: 31, width: 2, placeholder: 'dd', name: 'Day' },
  month: { min: 1, max: 12, width: 2, placeholder: 'mm', name: 'Month' },
  year: { min: 1, max: 9999, width: 4, placeholder: 'yyyy', name: 'Year' },
}

const fromIso = (iso: string | undefined): Segments => {
  const p = parts(iso)
  return p ? { day: String(p.day).padStart(2, '0'), month: String(p.month).padStart(2, '0'), year: String(p.year).padStart(4, '0') } : EMPTY
}
const toIso = (s: Segments): IsoDate | '' => {
  if (!s.day || !s.month || s.year.length !== 4) return ''
  const iso = makeDate(Number(s.year), Number(s.month), Number(s.day))
  return isValidDate(iso) ? iso : ''
}

export type DateFieldProps = {
  /** 'YYYY-MM-DD', or '' for no date. Controlled with `onValueChange`. */
  value?: IsoDate | ''
  defaultValue?: IsoDate | ''
  /** A whole, real date was typed, or the field was emptied (''). A half-typed date does not fire. */
  onValueChange?: (value: IsoDate | '') => void
  /** Earliest allowed date. A typed date before it marks the field invalid. */
  min?: IsoDate
  /** Latest allowed date. A typed date after it marks the field invalid. */
  max?: IsoDate
  /** A typed date this returns true for marks the field invalid. */
  isDateDisabled?: (date: IsoDate) => boolean
  /** A BCP 47 language tag. Sets the order of day, month and year and the separator. @default the browser's */
  locale?: string
  /** Required. The field's accessible name. Inside a FormField, FormField sets it. */
  label?: string
  disabled?: boolean
  invalid?: boolean
  required?: boolean
  /** Submits the ISO value with a form, through a hidden input. */
  name?: string
  id?: string
  'aria-describedby'?: string
  /** Sits inside the field's border, after the segments: DatePicker's calendar button. */
  trailing?: ReactNode
  /** No border, fill, padding or ring of its own, for two or more fields inside one border
   *  (DateRangePicker). The container then draws them. @default false */
  bare?: boolean
  className?: string
  ref?: Ref<HTMLDivElement>
}

/**
 * A date typed in three segments, in the order the locale writes them. Each segment is a
 * spinbutton: type digits and it moves on by itself once the segment is full or no further digit
 * could fit ("4" in the day is the 4th), the arrow keys step it, Backspace clears it. Left and
 * Right move between segments, and typing the separator jumps ahead. It cannot hold a string
 * that is not a date.
 *
 * Contrast rows: segments "text.primary on control fill" (component.control.text.rest); the
 * empty placeholders "control placeholder text on control fill"; the separators the same; the
 * border "control border on control fill"; the ring "focus.ring on surface.base".
 */
export function DateField({
  value,
  defaultValue = '',
  onValueChange,
  min,
  max,
  isDateDisabled,
  locale,
  label,
  disabled = false,
  invalid = false,
  required,
  name,
  id,
  'aria-describedby': describedBy,
  trailing,
  bare = false,
  className,
  ref,
}: DateFieldProps) {
  const [segments, setSegments] = useState<Segments>(() => fromIso(value ?? defaultValue))
  // What this field last reported, so a controlled value echoing it back does not reset the
  // segments someone is halfway through typing.
  const reported = useRef<string>(toIso(segments))
  const buffer = useRef('')
  const refs = useRef<Partial<Record<SegmentKind, HTMLSpanElement | null>>>({})
  const { order, separator } = useMemo(() => segmentOrder(locale), [locale])

  useEffect(() => {
    if (value === undefined || value === reported.current) return
    reported.current = value
    setSegments(fromIso(value))
  }, [value])

  const iso = toIso(segments)
  const complete = order.every(kind => segments[kind] !== '') && segments.year.length === 4
  const outOfRange = iso !== '' && ((min !== undefined && iso < min) || (max !== undefined && iso > max) || !!isDateDisabled?.(iso))
  const isInvalid = invalid || outOfRange || (complete && iso === '')

  const update = (next: Segments) => {
    setSegments(next)
    const out = toIso(next)
    if (out !== reported.current) {
      reported.current = out
      onValueChange?.(out)
    }
  }

  const focusSegment = (kind: SegmentKind | undefined) => kind && refs.current[kind]?.focus()
  const neighbour = (kind: SegmentKind, step: 1 | -1) => order[order.indexOf(kind) + step]

  const maxFor = (kind: SegmentKind, s: Segments) =>
    kind === 'day' && s.month && s.year.length === 4 ? daysInMonth(Number(s.year), Number(s.month)) : LIMITS[kind].max

  const typeDigit = (kind: SegmentKind, digit: string) => {
    const limit = LIMITS[kind]
    const next = buffer.current + digit
    if (kind === 'year') {
      buffer.current = next.length >= 4 ? '' : next
      update({ ...segments, year: next.slice(-4).padStart(next.length >= 4 ? 4 : next.length, '0') })
      if (next.length >= 4) focusSegment(neighbour(kind, 1))
      return
    }
    const max = maxFor(kind, segments)
    const number = Number(next)
    if (next.length === 2 && number === 0) return
    // Full, or no second digit could make a valid number ("4" in a day, "2" in a month).
    if (next.length >= 2 || Number(`${next}0`) > max) {
      buffer.current = ''
      update({ ...segments, [kind]: String(Math.min(Math.max(number, limit.min), max)).padStart(2, '0') })
      focusSegment(neighbour(kind, 1))
    } else {
      buffer.current = next
      update({ ...segments, [kind]: next })
    }
  }

  const step = (kind: SegmentKind, by: 1 | -1) => {
    const limit = LIMITS[kind]
    const current = segments[kind]
    const now = parts(today())!
    const max = maxFor(kind, segments)
    let next: number
    if (!current) next = kind === 'year' ? now.year : kind === 'month' ? now.month : now.day
    else {
      next = Number(current) + by
      if (kind !== 'year') next = next > max ? limit.min : next < limit.min ? max : next
    }
    buffer.current = ''
    update({ ...segments, [kind]: String(Math.max(next, limit.min)).padStart(limit.width, '0') })
  }

  const onKeyDown = (event: KeyboardEvent<HTMLSpanElement>, kind: SegmentKind) => {
    if (disabled) return
    const key = event.key
    if (/^\d$/.test(key)) {
      event.preventDefault()
      typeDigit(kind, key)
    } else if (key === 'ArrowUp' || key === 'ArrowDown') {
      event.preventDefault()
      step(kind, key === 'ArrowUp' ? 1 : -1)
    } else if (key === 'ArrowLeft' || key === 'ArrowRight') {
      event.preventDefault()
      focusSegment(neighbour(kind, key === 'ArrowLeft' ? -1 : 1))
    } else if (key === 'Backspace' || key === 'Delete') {
      event.preventDefault()
      buffer.current = ''
      if (segments[kind]) update({ ...segments, [kind]: '' })
      else if (key === 'Backspace') focusSegment(neighbour(kind, -1))
    } else if (key === separator || key === '/' || key === '.' || key === '-' || key === ' ') {
      event.preventDefault()
      buffer.current = ''
      focusSegment(neighbour(kind, 1))
    }
  }

  return (
    <div
      ref={ref}
      id={id}
      role="group"
      aria-label={label}
      aria-describedby={describedBy}
      aria-invalid={isInvalid || undefined}
      aria-disabled={disabled || undefined}
      data-disabled={disabled ? '' : undefined}
      className={cn(
        'flex items-center gap-1 font-body text-sm tabular-nums text-[var(--component-control-text-rest)]',
        bare
          ? cn('w-auto', isInvalid && 'text-[var(--color-accent-hostile-text)]')
          : cn(
              'w-full rounded-[var(--shape-radius,0px)] border px-3 transition-control',
              'h-[var(--component-control-height-md)] bg-[var(--component-control-fill-rest)]',
              isInvalid ? 'border-[var(--component-control-border-invalid)]' : 'border-[var(--component-control-border-rest)] hover:border-[var(--component-control-border-hover)]',
              'has-[[role=spinbutton]:focus-visible]:outline-2 has-[[role=spinbutton]:focus-visible]:outline-offset-2 has-[[role=spinbutton]:focus-visible]:outline-[var(--color-focus-ring)]',
              disabled && 'bg-[var(--component-control-fill-disabled)]'
            ),
        disabled && 'text-[var(--component-control-text-disabled)]',
        className
      )}
    >
      {order.map((kind, i) => {
        const limit = LIMITS[kind]
        const text = segments[kind]
        return (
          <Fragment key={kind}>
            {i > 0 ? (
              <span aria-hidden="true" className="text-[var(--component-control-text-placeholder)]">
                {separator}
              </span>
            ) : null}
            <span
              ref={node => {
                refs.current[kind] = node
              }}
              role="spinbutton"
              tabIndex={disabled ? -1 : 0}
              inputMode="numeric"
              aria-label={limit.name}
              aria-valuemin={limit.min}
              aria-valuemax={kind === 'day' ? maxFor('day', segments) : limit.max}
              aria-valuenow={text ? Number(text) : undefined}
              aria-valuetext={text ? text : 'Empty'}
              aria-required={required || undefined}
              aria-disabled={disabled || undefined}
              onKeyDown={event => onKeyDown(event, kind)}
              onFocus={() => {
                buffer.current = ''
              }}
              onBlur={() => {
                // A lone digit left behind ("4" in the month) is padded when focus leaves.
                if (buffer.current && kind !== 'year') update({ ...segments, [kind]: buffer.current.padStart(2, '0') })
                buffer.current = ''
              }}
              className={cn(
                'rounded-[2px] px-0.5 text-center outline-none caret-transparent',
                kind === 'year' ? 'min-w-[4ch]' : 'min-w-[2ch]',
                'focus:bg-[var(--color-accent-signal-indicator)] focus:text-[var(--color-accent-signal-indicator-ink)]',
                !text && 'text-[var(--component-control-text-placeholder)]'
              )}
            >
              {text || limit.placeholder}
            </span>
          </Fragment>
        )
      })}
      {name ? <input type="hidden" name={name} value={iso} /> : null}
      {trailing ? <span className="ml-auto flex items-center">{trailing}</span> : null}
    </div>
  )
}

// FormField passes its own label in. With the marker it does so even when none was written
// here, so a DateField inside a FormField needs no label of its own.
DateField.namedByFormField = true
