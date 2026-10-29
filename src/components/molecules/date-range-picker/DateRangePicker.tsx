import { createContext, useContext, useState, type ReactNode, type Ref } from 'react'
import { Popover as RadixPopover } from 'radix-ui'
import { CalendarRange } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { IconButton } from '../../atoms/icon-button/IconButton'
import { Calendar, type DayState } from '../date-picker/Calendar'
import { DateField } from '../date-picker/DateField'
import { formatLong, isValidDate, type IsoDate } from '../date-picker/date-utils'

/** A start and an end, each 'YYYY-MM-DD' or '' while not chosen. */
export type DateRange = { start: IsoDate | ''; end: IsoDate | '' }

export const EMPTY_RANGE: DateRange = { start: '', end: '' }

type RangeContext = { value: DateRange; select: (range: DateRange) => void }
const Context = createContext<RangeContext | null>(null)

/** The open picker's range, and a way to set it and close. DatePresets reads it, so a preset in
 *  `aside` needs no wiring. null outside a DateRangePicker. */
export const useDateRangePicker = () => useContext(Context)

export type DateRangePickerProps = {
  /** Required. Names the whole field. Inside a FormField, FormField sets it. */
  label: string
  value?: DateRange
  defaultValue?: DateRange
  /** Fires when either end changes. Two days picked in the calendar arrive in order; a typed end
   *  before the start is kept as typed and marks the field invalid. */
  onValueChange?: (range: DateRange) => void
  min?: IsoDate
  max?: IsoDate
  isDateDisabled?: (date: IsoDate) => boolean
  locale?: string
  weekStartsOn?: number
  /** Next to the calendars, inside the popover: DatePresets, or anything else. */
  aside?: ReactNode
  /** The two segment groups' names. @default ['Start date', 'End date'] */
  partLabels?: [string, string]
  disabled?: boolean
  invalid?: boolean
  required?: boolean
  /** Submits `${name}-start` and `${name}-end` with a form. */
  name?: string
  id?: string
  'aria-describedby'?: string
  className?: string
  ref?: Ref<HTMLDivElement>
}

/**
 * A start and an end date in one field: two segmented dates and a button that opens two months
 * side by side. The first day picked is the start; the band then follows the pointer or the
 * keyboard until the second pick sets the end and closes the calendar. Picking an end before the
 * start swaps them; typing one marks the field invalid instead. The ends are solid accent squares, the days between a light accent band.
 *
 * Contrast rows: as DatePicker (the field, the calendar), plus the band "hover wash text
 * (text.primary) on accent.signal.wash over surface.base".
 */
export function DateRangePicker({
  label,
  value,
  defaultValue = EMPTY_RANGE,
  onValueChange,
  min,
  max,
  isDateDisabled,
  locale,
  weekStartsOn,
  aside,
  partLabels = ['Start date', 'End date'],
  disabled = false,
  invalid = false,
  required,
  name,
  id,
  'aria-describedby': describedBy,
  className,
  ref,
}: DateRangePickerProps) {
  const [internal, setInternal] = useState<DateRange>(defaultValue)
  const range = value ?? internal
  const [open, setOpen] = useState(false)
  // Between the first and the second pick: the start, and the day the band reaches to.
  const [anchor, setAnchor] = useState<IsoDate | null>(null)
  const [reach, setReach] = useState<IsoDate | null>(null)

  const set = (next: DateRange) => {
    if (value === undefined) setInternal(next)
    onValueChange?.(next)
  }
  const close = () => {
    setAnchor(null)
    setReach(null)
    setOpen(false)
  }

  const pick = (date: IsoDate) => {
    if (!anchor) {
      setAnchor(date)
      setReach(date)
      set({ start: date, end: '' })
      return
    }
    set(date < anchor ? { start: date, end: anchor } : { start: anchor, end: date })
    close()
  }

  const dayState = (date: IsoDate): DayState | undefined => {
    const [a, b] = anchor ? [anchor, reach ?? anchor].sort() : [range.start, range.end]
    if (!a) return undefined
    if (!b) return date === a ? 'single' : undefined
    if (a === b) return date === a ? 'start-end' : undefined
    if (date === a) return 'start'
    if (date === b) return 'end'
    return date > a && date < b ? 'middle' : undefined
  }

  const backwards = isValidDate(range.start) && isValidDate(range.end) && range.end < range.start
  const describe = isValidDate(range.start) && isValidDate(range.end) ? `${formatLong(range.start, locale)} to ${formatLong(range.end, locale)}` : ''

  return (
    <Context.Provider value={{ value: range, select: next => (set(next), close()) }}>
      <RadixPopover.Root open={open && !disabled} onOpenChange={next => (next ? setOpen(true) : close())}>
        <RadixPopover.Anchor asChild>
          <div
            ref={ref}
            id={id}
            role="group"
            aria-label={label}
            aria-describedby={describedBy}
            aria-invalid={invalid || backwards || undefined}
            className={cn(
              // Two dates and a button do not fit a phone's width on one line: there they wrap.
              'flex w-full flex-wrap items-center gap-x-2 gap-y-0 rounded-[var(--shape-radius,0px)] border px-3 py-px transition-control',
              'min-h-[var(--component-control-height-md)] bg-[var(--component-control-fill-rest)]',
              invalid || backwards
                ? 'border-[var(--component-control-border-invalid)]'
                : 'border-[var(--component-control-border-rest)] hover:border-[var(--component-control-border-hover)]',
              'has-[[role=spinbutton]:focus-visible]:outline-2 has-[[role=spinbutton]:focus-visible]:outline-offset-2 has-[[role=spinbutton]:focus-visible]:outline-[var(--color-focus-ring)]',
              disabled && 'bg-[var(--component-control-fill-disabled)]',
              className
            )}
          >
            <DateField
              bare
              label={partLabels[0]}
              value={range.start}
              onValueChange={start => set({ ...range, start })}
              min={min}
              max={max}
              isDateDisabled={isDateDisabled}
              locale={locale}
              disabled={disabled}
              required={required}
              name={name ? `${name}-start` : undefined}
            />
            <span aria-hidden="true" className="text-[var(--component-control-text-placeholder)]">
              –
            </span>
            <DateField
              bare
              label={partLabels[1]}
              value={range.end}
              onValueChange={end => set({ ...range, end })}
              min={min}
              max={max}
              isDateDisabled={isDateDisabled}
              locale={locale}
              disabled={disabled}
              required={required}
              name={name ? `${name}-end` : undefined}
            />
            <RadixPopover.Trigger asChild>
              <IconButton
                label={describe ? `Choose dates, ${describe}` : 'Choose dates'}
                variant="ghost"
                size="sm"
                disabled={disabled}
                className="-mr-2 ml-auto"
              >
                <CalendarRange />
              </IconButton>
            </RadixPopover.Trigger>
          </div>
        </RadixPopover.Anchor>
        <RadixPopover.Portal>
          <RadixPopover.Content
            side="bottom"
            align="start"
            sideOffset={6}
            collisionPadding={8}
            aria-label={`${label}, calendar`}
            onOpenAutoFocus={event => event.preventDefault()}
            className="z-50 flex flex-col gap-4 border border-[var(--color-border-hairline-strong)] bg-[var(--color-surface-base)] p-3 crosshair anim-popover sm:flex-row"
          >
            {aside ? <div className="border-b border-[var(--color-border-hairline)] pb-3 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-3">{aside}</div> : null}
            <div className="flex flex-col gap-2">
              <Calendar
                value={range.start || null}
                defaultMonth={range.start || undefined}
                dayState={dayState}
                onSelect={pick}
                onDayEnter={date => anchor && setReach(date)}
                numberOfMonths={2}
                min={min}
                max={max}
                isDateDisabled={isDateDisabled}
                locale={locale}
                weekStartsOn={weekStartsOn}
                autoFocus
              />
              {/* Says what the next pick does, for everyone, and is announced as it changes. */}
              <p aria-live="polite" className="font-body text-xs text-[var(--color-text-secondary)]">
                {anchor ? 'Pick the last day.' : 'Pick the first day.'}
              </p>
            </div>
          </RadixPopover.Content>
        </RadixPopover.Portal>
      </RadixPopover.Root>
    </Context.Provider>
  )
}
