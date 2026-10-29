import { useState } from 'react'
import { ComponentDocs } from '../../docs/ComponentDocs'
import { Example } from '../../docs/Example'
import { FormField } from '../form-field/FormField'
import { DatePicker } from '../date-picker/DatePicker'
import { TimeField } from './TimeField'
import { meta } from './TimeField.meta'

/** A live example: a date and a time, kept as two plain strings. */
function DateAndTime() {
  const [date, setDate] = useState('2026-11-14')
  const [time, setTime] = useState('09:30')
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
        <FormField label="Pickup date">
          <DatePicker value={date} onValueChange={setDate} />
        </FormField>
        <FormField label="Pickup time">
          <TimeField value={time} onValueChange={setTime} step={15} min="08:00" max="18:00" />
        </FormField>
      </div>
      <span className="font-mono text-xs text-[var(--color-text-secondary)]">
        {date && time ? `${date}T${time}` : 'Pick a date and a time'}
      </span>
    </div>
  )
}

export function TimeFieldDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Default, 24-hour">
        <div className="w-36">
          <TimeField label="Start time" hourCycle={24} />
        </div>
      </Example>

      <Example caption="12-hour, with AM and PM">
        <div className="w-40">
          <TimeField label="Call time" hourCycle={12} defaultValue="14:30" />
        </div>
      </Example>

      <Example caption="With a DatePicker: a date and a time">
        <DateAndTime />
      </Example>
    </ComponentDocs>
  )
}
