import { useState } from 'react'
import { ComponentDocs } from '../../docs/ComponentDocs'
import { Example } from '../../docs/Example'
import { DateRangePicker, type DateRange } from '../date-range-picker/DateRangePicker'
import { DatePresets, defaultPresets } from './DatePresets'
import { meta } from './DatePresets.meta'

/** A live example: the list on its own, holding nothing itself. */
function OnItsOwn() {
  const [range, setRange] = useState<DateRange>(defaultPresets()[2].range)
  return (
    <div className="flex flex-col gap-3">
      <DatePresets value={range} onSelect={setRange} />
      <span className="font-mono text-xs text-[var(--color-text-secondary)]">
        {range.start} to {range.end}
      </span>
    </div>
  )
}

export function DatePresetsDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Inside a DateRangePicker: no wiring">
        <div className="w-full max-w-sm">
          <DateRangePicker label="Activity" aside={<DatePresets />} />
        </div>
      </Example>

      <Example caption="On its own">
        <OnItsOwn />
      </Example>

      <Example caption="Your own periods">
        <div className="w-full max-w-sm">
          <DateRangePicker
            label="Season"
            aside={
              <DatePresets
                label="Seasons"
                presets={[
                  { label: 'Winter 2026', range: { start: '2026-01-01', end: '2026-03-31' } },
                  { label: 'Spring 2026', range: { start: '2026-04-01', end: '2026-06-30' } },
                  { label: 'Summer 2026', range: { start: '2026-07-01', end: '2026-09-30' } },
                ]}
              />
            }
          />
        </div>
      </Example>
    </ComponentDocs>
  )
}
