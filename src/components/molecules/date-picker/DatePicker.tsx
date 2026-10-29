import { useState } from 'react'
import { Popover as RadixPopover } from 'radix-ui'
import { CalendarDays } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { Button } from '../../atoms/button/Button'
import { IconButton } from '../../atoms/icon-button/IconButton'
import { Calendar } from './Calendar'
import { DateField, type DateFieldProps } from './DateField'
import { formatLong, isValidDate, today as todayIso, type IsoDate } from './date-utils'

export type DatePickerProps = Omit<DateFieldProps, 'trailing' | 'bare'> & {
  /** 0 Sunday ... 6 Saturday. @default the locale's */
  weekStartsOn?: number
  /** Adds a Today button under the calendar when today can be picked. @default true */
  showToday?: boolean
}

/**
 * One date: type it in the segmented field, or open the calendar from the button inside it.
 * Picking a day fills the field, closes the calendar and puts focus back on the button. Escape
 * closes it without a change. The value is a plain 'YYYY-MM-DD' string, with no time and no time
 * zone, so it means the same day for everyone who reads it.
 *
 * Range, time and presets are separate add-ons on top of this (DateRangePicker, TimeField,
 * DatePresets), each installed on its own.
 *
 * Contrast rows: the field's (see DateField), the calendar's (see Calendar), and the popover's
 * edge "decorative" hairline-strong; the calendar sits on surface.base.
 */
export function DatePicker({
  value,
  defaultValue = '',
  onValueChange,
  weekStartsOn,
  showToday = true,
  disabled,
  locale,
  label,
  ref,
  ...field
}: DatePickerProps) {
  const [internal, setInternal] = useState<IsoDate | ''>(defaultValue)
  const current = value ?? internal
  const [open, setOpen] = useState(false)
  const set = (next: IsoDate | '') => {
    if (value === undefined) setInternal(next)
    onValueChange?.(next)
  }
  const today = todayIso()
  const todayAllowed =
    (!field.min || today >= field.min) && (!field.max || today <= field.max) && !field.isDateDisabled?.(today)
  const pick = (date: IsoDate) => {
    set(date)
    setOpen(false)
  }

  return (
    <RadixPopover.Root open={open && !disabled} onOpenChange={setOpen}>
      <RadixPopover.Anchor asChild>
        <DateField
          ref={ref}
          {...field}
          label={label}
          locale={locale}
          disabled={disabled}
          value={current}
          onValueChange={set}
          trailing={
            <RadixPopover.Trigger asChild>
              <IconButton
                label={isValidDate(current) ? `Choose date, ${formatLong(current, locale)}` : 'Choose date'}
                variant="ghost"
                size="sm"
                disabled={disabled}
                wrapperClassName="-mr-2"
              >
                <CalendarDays />
              </IconButton>
            </RadixPopover.Trigger>
          }
        />
      </RadixPopover.Anchor>
      <RadixPopover.Portal>
        <RadixPopover.Content
          side="bottom"
          align="start"
          sideOffset={6}
          collisionPadding={8}
          aria-label={`${label ?? 'Date'}, calendar`}
          // The calendar puts focus on the picked day (or today) itself.
          onOpenAutoFocus={event => event.preventDefault()}
          className={cn(
            'z-50 border border-[var(--color-border-hairline-strong)] bg-[var(--color-surface-base)] p-3',
            'crosshair anim-popover'
          )}
        >
          <Calendar
            value={isValidDate(current) ? current : null}
            onSelect={pick}
            min={field.min}
            max={field.max}
            isDateDisabled={field.isDateDisabled}
            locale={locale}
            weekStartsOn={weekStartsOn}
            autoFocus
          />
          {showToday && todayAllowed ? (
            <div className="mt-3 flex justify-end border-t border-[var(--color-border-hairline)] pt-3">
              <Button variant="secondary" size="sm" onClick={() => pick(today)}>
                Today
              </Button>
            </div>
          ) : null}
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  )
}

// FormField passes its own label in. With the marker it does so even when none was written
// here, so a DatePicker inside a FormField needs no label of its own.
DatePicker.namedByFormField = true
