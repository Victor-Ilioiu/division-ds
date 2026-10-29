import { useState } from 'react'
import { ComponentDocs } from '../../docs/ComponentDocs'
import { Example } from '../../docs/Example'
import { FormField } from '../form-field/FormField'
import { Calendar } from './Calendar'
import { DatePicker } from './DatePicker'
import { meta } from './DatePicker.meta'
import { formatLong } from './date-utils'

const weekend = (date: string) => [0, 6].includes(new Date(`${date}T12:00:00Z`).getUTCDay())

/** A live example: the picked value, as the page receives it. */
function Controlled() {
  const [date, setDate] = useState('2026-11-14')
  return (
    <div className="flex w-full max-w-xs flex-col gap-2">
      <DatePicker label="Dispatch date" value={date} onValueChange={setDate} />
      <span className="font-mono text-xs text-[var(--color-text-secondary)]">value: {date ? `'${date}'` : "''"}</span>
    </div>
  )
}

/** A live example: the calendar on its own. */
function InlineCalendar() {
  const [date, setDate] = useState<string | null>(null)
  return (
    <div className="flex flex-col gap-2">
      <Calendar value={date} onSelect={setDate} />
      <span className="font-mono text-xs text-[var(--color-text-secondary)]">{date ? formatLong(date) : 'No day picked'}</span>
    </div>
  )
}

export function DatePickerDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Default">
        <div className="w-full max-w-xs">
          <DatePicker label="Delivery date" />
        </div>
      </Example>

      <Example caption="In a FormField, with help text">
        <div className="w-full max-w-xs">
          <FormField label="Trip date" help="Type it, or open the calendar.">
            <DatePicker />
          </FormField>
        </div>
      </Example>

      <Example caption="Controlled: the page holds the value">
        <Controlled />
      </Example>

      <Example caption="Limits: weekdays only, within the next two months">
        <div className="w-full max-w-xs">
          <DatePicker label="Collection day" min="2026-11-02" max="2026-12-31" defaultValue="2026-11-16" isDateDisabled={weekend} />
        </div>
      </Example>

      <Example caption="US order and a Sunday start, from the locale">
        <div className="w-full max-w-xs">
          <DatePicker label="Ship date" locale="en-US" defaultValue="2026-11-14" />
        </div>
      </Example>

      <Example caption="The calendar on its own">
        <InlineCalendar />
      </Example>
    </ComponentDocs>
  )
}
