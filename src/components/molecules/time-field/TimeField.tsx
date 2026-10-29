import { Fragment, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type Ref } from 'react'
import { Popover as RadixPopover } from 'radix-ui'
import { Clock } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { IconButton } from '../../atoms/icon-button/IconButton'

/** 'HH:MM', 24-hour, or '' for no time. */
export type TimeValue = string

type Kind = 'hour' | 'minute' | 'period'
type Parts = { hour: string; minute: string; period: '' | 'AM' | 'PM' }

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/
const pad = (n: number) => String(n).padStart(2, '0')
const toMinutes = (time: string) => {
  const match = TIME.exec(time)
  return match ? Number(match[1]) * 60 + Number(match[2]) : null
}
const fromMinutes = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`

/** 12 or 24, from the locale's own clock. */
export function hourCycleFor(locale?: string): 12 | 24 {
  try {
    const cycle = new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hourCycle
    return cycle === 'h11' || cycle === 'h12' ? 12 : 24
  } catch {
    return 24
  }
}

const split = (time: string, cycle: 12 | 24): Parts => {
  const minutes = toMinutes(time)
  if (minutes === null) return { hour: '', minute: '', period: '' }
  const h = Math.floor(minutes / 60)
  if (cycle === 24) return { hour: pad(h), minute: pad(minutes % 60), period: '' }
  return { hour: pad(h % 12 === 0 ? 12 : h % 12), minute: pad(minutes % 60), period: h < 12 ? 'AM' : 'PM' }
}
const join = (p: Parts, cycle: 12 | 24): TimeValue => {
  if (!p.hour || p.minute.length !== 2 || (cycle === 12 && !p.period)) return ''
  let h = Number(p.hour)
  if (cycle === 12) h = (h % 12) + (p.period === 'PM' ? 12 : 0)
  return `${pad(h)}:${p.minute}`
}
/** "2:30 PM" or "14:30", for names and the slot list. */
const display = (time: string, cycle: 12 | 24) => {
  const p = split(time, cycle)
  return cycle === 24 ? `${p.hour}:${p.minute}` : `${Number(p.hour)}:${p.minute} ${p.period}`
}

export type TimeFieldProps = {
  /** Required. The field's accessible name. Inside a FormField, FormField sets it. */
  label?: string
  /** 'HH:MM', 24-hour, or ''. Controlled with `onValueChange`. */
  value?: TimeValue
  defaultValue?: TimeValue
  /** A whole time was typed or picked, or the field was emptied (''). */
  onValueChange?: (value: TimeValue) => void
  /** 12 shows an AM/PM segment. The value stays 24-hour either way. @default the locale's */
  hourCycle?: 12 | 24
  /** Minutes between the times in the slot list. @default 30 */
  step?: number
  /** Earliest time, 'HH:MM'. Earlier slots are left out; typing one marks the field invalid. */
  min?: TimeValue
  /** Latest time, 'HH:MM'. */
  max?: TimeValue
  /** Shows the button that opens the list of times. @default true */
  showSlots?: boolean
  locale?: string
  disabled?: boolean
  invalid?: boolean
  required?: boolean
  /** Submits the 'HH:MM' value with a form. */
  name?: string
  id?: string
  'aria-describedby'?: string
  className?: string
  ref?: Ref<HTMLDivElement>
}

const NAMES: Record<Kind, string> = { hour: 'Hour', minute: 'Minute', period: 'AM or PM' }

/**
 * A time of day: hours and minutes as segments you type into or step with the arrow keys (the
 * same way DateField works), and a button that opens a list of times every `step` minutes. With a
 * 12-hour clock there is an AM/PM segment: A or P sets it. The value is 'HH:MM' on a 24-hour
 * clock whatever is shown. Pair it with DatePicker for a date and a time.
 *
 * Contrast rows: as DateField for the field; the list "text.primary on surface.base", the picked
 * time "accent.signal.indicator-ink on accent.signal.indicator", the ring "focus.ring on surface.base".
 */
export function TimeField({
  label,
  value,
  defaultValue = '',
  onValueChange,
  hourCycle,
  step = 30,
  min,
  max,
  showSlots = true,
  locale,
  disabled = false,
  invalid = false,
  required,
  name,
  id,
  'aria-describedby': describedBy,
  className,
  ref,
}: TimeFieldProps) {
  const cycle = hourCycle ?? hourCycleFor(locale)
  const kinds: Kind[] = cycle === 12 ? ['hour', 'minute', 'period'] : ['hour', 'minute']
  const [segments, setSegments] = useState<Parts>(() => split(value ?? defaultValue, cycle))
  const reported = useRef(join(segments, cycle))
  const buffer = useRef('')
  const refs = useRef<Partial<Record<Kind, HTMLSpanElement | null>>>({})
  const [open, setOpen] = useState(false)
  const listId = useId()

  useEffect(() => {
    if (value === undefined || value === reported.current) return
    reported.current = value
    setSegments(split(value, cycle))
  }, [value, cycle])

  const time = join(segments, cycle)
  const minutes = toMinutes(time)
  const outOfRange = minutes !== null && ((min && minutes < toMinutes(min)!) || (max && minutes > toMinutes(max)!))
  const isInvalid = invalid || !!outOfRange

  const update = (next: Parts) => {
    setSegments(next)
    const out = join(next, cycle)
    if (out !== reported.current) {
      reported.current = out
      onValueChange?.(out)
    }
  }
  const choose = (slot: TimeValue) => {
    reported.current = ''
    update(split(slot, cycle))
    setOpen(false)
  }

  const neighbour = (kind: Kind, by: 1 | -1) => kinds[kinds.indexOf(kind) + by]
  const focus = (kind?: Kind) => kind && refs.current[kind]?.focus()
  const hourMin = cycle === 12 ? 1 : 0
  const hourMax = cycle === 12 ? 12 : 23

  const typeDigit = (kind: 'hour' | 'minute', digit: string) => {
    const [lo, hi] = kind === 'hour' ? [hourMin, hourMax] : [0, 59]
    const next = buffer.current + digit
    if (next.length >= 2 || Number(`${next}0`) > hi) {
      buffer.current = ''
      update({ ...segments, [kind]: pad(Math.min(Math.max(Number(next), lo), hi)) })
      focus(neighbour(kind, 1))
    } else {
      buffer.current = next
      update({ ...segments, [kind]: next })
    }
  }

  const stepSegment = (kind: Kind, by: 1 | -1) => {
    buffer.current = ''
    if (kind === 'period') {
      update({ ...segments, period: segments.period === 'AM' ? 'PM' : 'AM' })
      return
    }
    const [lo, hi] = kind === 'hour' ? [hourMin, hourMax] : [0, 59]
    const current = segments[kind]
    const now = new Date()
    let n = current ? Number(current) + by : kind === 'hour' ? Number(split(fromMinutes(now.getHours() * 60), cycle).hour) : 0
    if (n > hi) n = lo
    if (n < lo) n = hi
    update({ ...segments, [kind]: pad(n), period: cycle === 12 && !segments.period ? (now.getHours() < 12 ? 'AM' : 'PM') : segments.period })
  }

  const onKeyDown = (event: KeyboardEvent<HTMLSpanElement>, kind: Kind) => {
    if (disabled) return
    const key = event.key
    if (kind !== 'period' && /^\d$/.test(key)) {
      event.preventDefault()
      typeDigit(kind, key)
    } else if (kind === 'period' && /^[ap]$/i.test(key)) {
      event.preventDefault()
      update({ ...segments, period: key.toLowerCase() === 'a' ? 'AM' : 'PM' })
    } else if (key === 'ArrowUp' || key === 'ArrowDown') {
      event.preventDefault()
      stepSegment(kind, key === 'ArrowUp' ? 1 : -1)
    } else if (key === 'ArrowLeft' || key === 'ArrowRight') {
      event.preventDefault()
      focus(neighbour(kind, key === 'ArrowLeft' ? -1 : 1))
    } else if (key === 'Backspace' || key === 'Delete') {
      event.preventDefault()
      buffer.current = ''
      if (segments[kind]) update({ ...segments, [kind]: '' })
      else if (key === 'Backspace') focus(neighbour(kind, -1))
    } else if (key === ':' || key === '.' || key === ' ') {
      event.preventDefault()
      buffer.current = ''
      focus(neighbour(kind, 1))
    }
  }

  const slots = useMemo(() => {
    const out: TimeValue[] = []
    const lo = min ? toMinutes(min)! : 0
    const hi = max ? toMinutes(max)! : 24 * 60 - 1
    for (let m = Math.ceil(lo / step) * step; m <= hi; m += step) out.push(fromMinutes(m))
    return out
  }, [min, max, step])

  return (
    <RadixPopover.Root open={open && !disabled} onOpenChange={setOpen}>
      <RadixPopover.Anchor asChild>
        <div
          ref={ref}
          id={id}
          role="group"
          aria-label={label}
          aria-describedby={describedBy}
          aria-invalid={isInvalid || undefined}
          aria-disabled={disabled || undefined}
          className={cn(
            'flex w-full items-center gap-1 rounded-[var(--shape-radius,0px)] border px-3 font-body text-sm tabular-nums transition-control',
            'h-[var(--component-control-height-md)] bg-[var(--component-control-fill-rest)] text-[var(--component-control-text-rest)]',
            isInvalid ? 'border-[var(--component-control-border-invalid)]' : 'border-[var(--component-control-border-rest)] hover:border-[var(--component-control-border-hover)]',
            'has-[[role=spinbutton]:focus-visible]:outline-2 has-[[role=spinbutton]:focus-visible]:outline-offset-2 has-[[role=spinbutton]:focus-visible]:outline-[var(--color-focus-ring)]',
            disabled && 'bg-[var(--component-control-fill-disabled)] text-[var(--component-control-text-disabled)]',
            className
          )}
        >
          {kinds.map((kind, i) => {
            const text = segments[kind]
            return (
              <Fragment key={kind}>
                {i === 1 ? (
                  <span aria-hidden="true" className="text-[var(--component-control-text-placeholder)]">
                    :
                  </span>
                ) : null}
                <span
                  ref={node => {
                    refs.current[kind] = node
                  }}
                  role="spinbutton"
                  tabIndex={disabled ? -1 : 0}
                  inputMode={kind === 'period' ? 'text' : 'numeric'}
                  aria-label={NAMES[kind]}
                  aria-valuemin={kind === 'hour' ? hourMin : kind === 'minute' ? 0 : undefined}
                  aria-valuemax={kind === 'hour' ? hourMax : kind === 'minute' ? 59 : undefined}
                  aria-valuenow={text && kind !== 'period' ? Number(text) : undefined}
                  aria-valuetext={text || 'Empty'}
                  aria-required={required || undefined}
                  aria-disabled={disabled || undefined}
                  onKeyDown={event => onKeyDown(event, kind)}
                  onFocus={() => {
                    buffer.current = ''
                  }}
                  onBlur={() => {
                    if (buffer.current && kind !== 'period') update({ ...segments, [kind]: buffer.current.padStart(2, '0') })
                    buffer.current = ''
                  }}
                  className={cn(
                    'rounded-[2px] px-0.5 text-center outline-none caret-transparent',
                    kind === 'period' ? 'ml-1 min-w-[2.5ch]' : 'min-w-[2ch]',
                    'focus:bg-[var(--color-accent-signal-indicator)] focus:text-[var(--color-accent-signal-indicator-ink)]',
                    !text && 'text-[var(--component-control-text-placeholder)]'
                  )}
                >
                  {text || (kind === 'hour' ? 'hh' : kind === 'minute' ? 'mm' : 'AM')}
                </span>
              </Fragment>
            )
          })}
          {name ? <input type="hidden" name={name} value={time} /> : null}
          {showSlots ? (
            <RadixPopover.Trigger asChild>
              <IconButton
                label={time ? `Choose time, ${display(time, cycle)}` : 'Choose time'}
                variant="ghost"
                size="sm"
                disabled={disabled}
                aria-haspopup="listbox"
                wrapperClassName="-mr-2 ml-auto"
              >
                <Clock />
              </IconButton>
            </RadixPopover.Trigger>
          ) : null}
        </div>
      </RadixPopover.Anchor>
      <RadixPopover.Portal>
        <RadixPopover.Content
          side="bottom"
          align="end"
          sideOffset={6}
          collisionPadding={8}
          onOpenAutoFocus={event => event.preventDefault()}
          className="z-50 border border-[var(--color-border-hairline-strong)] bg-[var(--color-surface-base)] p-1 crosshair anim-popover"
        >
          <SlotList id={listId} label={`${label ?? 'Time'}, times`} slots={slots} value={time} cycle={cycle} onChoose={choose} />
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  )
}

/** The times, as a listbox with one tab stop. Opens on the picked time, or the nearest slot after it. */
function SlotList({ id, label, slots, value, cycle, onChoose }: { id: string; label: string; slots: TimeValue[]; value: TimeValue; cycle: 12 | 24; onChoose: (slot: TimeValue) => void }) {
  const start = Math.max(0, value ? slots.findIndex(slot => slot >= value) : slots.findIndex(slot => slot >= fromMinutes(new Date().getHours() * 60)))
  const [active, setActive] = useState(start === -1 ? 0 : start)
  const list = useRef<HTMLUListElement>(null)

  useEffect(() => {
    const option = list.current?.children[active] as HTMLElement | undefined
    option?.focus()
    option?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const moves: Record<string, number> = { ArrowDown: active + 1, ArrowUp: active - 1, Home: 0, End: slots.length - 1, PageDown: active + 6, PageUp: active - 6 }
    if (event.key in moves) {
      event.preventDefault()
      setActive(Math.min(Math.max(moves[event.key], 0), slots.length - 1))
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onChoose(slots[active])
    }
  }

  return (
    <ul ref={list} id={id} role="listbox" aria-label={label} onKeyDown={onKeyDown} className="max-h-64 w-32 overflow-y-auto font-body text-sm tabular-nums">
      {slots.map((slot, i) => {
        const picked = slot === value
        return (
          <li
            key={slot}
            role="option"
            aria-selected={picked}
            tabIndex={i === active ? 0 : -1}
            onClick={() => onChoose(slot)}
            onFocus={() => setActive(i)}
            className={cn(
              'flex min-h-[36px] cursor-pointer items-center px-3 transition-control',
              'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
              picked
                ? 'bg-[var(--color-accent-signal-indicator)] font-semibold text-[var(--color-accent-signal-indicator-ink)] focus-visible:outline-[var(--color-accent-signal-indicator-ink)]'
                : 'text-[var(--color-text-primary)] hover:bg-[var(--color-accent-signal-wash)]'
            )}
          >
            {display(slot, cycle)}
          </li>
        )
      })}
    </ul>
  )
}

// FormField passes its own label in. With the marker it does so even when none was written
// here, so a TimeField inside a FormField needs no label of its own.
TimeField.namedByFormField = true
