import { useState } from 'react'
import { ComponentDocs } from '../../docs/ComponentDocs'
import { Example } from '../../docs/Example'
import { FormField } from '../form-field/FormField'
import { DatePresets } from '../date-presets/DatePresets'
import { DateRangePicker, type DateRange } from './DateRangePicker'
import { meta } from './DateRangePicker.meta'

/** A live example: the range, as the page receives it. */
function Controlled() {
  const [range, setRange] = useState<DateRange>({ start: '2026-11-09', end: '2026-11-13' })
  return (
    <div className="flex w-full max-w-sm flex-col gap-2">
      <DateRangePicker label="Leave" value={range} onValueChange={setRange} />
      <span className="font-mono text-xs text-[var(--color-text-secondary)]">
        start: {range.start || '—'}, end: {range.end || '—'}
      </span>
    </div>
  )
}

export function DateRangePickerDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Default">
        <div className="w-full max-w-sm">
          <DateRangePicker label="Stay" />
        </div>
      </Example>

      <Example caption="With DatePresets beside the months">
        <div className="w-full max-w-sm">
          <FormField label="Report period" help="Pick a preset, or two days.">
            <DateRangePicker label="Report period" aside={<DatePresets />} />
          </FormField>
        </div>
      </Example>

      <Example caption="Controlled: the page holds the range">
        <Controlled />
      </Example>

      <Example caption="Limits: November and December only">
        <div className="w-full max-w-sm">
          <DateRangePicker label="Rental" min="2026-11-01" max="2026-12-30" defaultValue={{ start: '2026-11-20', end: '2026-11-23' }} />
        </div>
      </Example>
    </ComponentDocs>
  )
}
