import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './StatusTracker.meta'
import { Example } from '../../docs/Example'
import { StatusTracker, type StatusTrackerItem } from './StatusTracker'

/** Thirty days ending 15 Oct, deterministic: two degraded days, one down, one with no data. */
const THIRTY: StatusTrackerItem[] = Array.from({ length: 30 }, (_, index) => {
  const day = new Date(Date.UTC(2026, 8, 16 + index))
  const date = day.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
  if (index === 8) return { id: `d${index}`, status: 'warning', label: `${date}: 2 alerts, 14 min degraded` }
  if (index === 19) return { id: `d${index}`, status: 'hostile', label: `${date}: 41 min down` }
  if (index === 23) return { id: `d${index}`, status: 'warning', label: `${date}: 1 alert, 6 min degraded` }
  if (index === 26) return { id: `d${index}`, status: 'neutral', label: `${date}: no readings` }
  return { id: `d${index}`, status: 'ok', label: `${date}: no alerts` }
})

/** Ninety days, the same shape repeated: what the row looks like at its densest. */
const NINETY: StatusTrackerItem[] = Array.from({ length: 90 }, (_, index) => ({
  id: `n${index}`,
  status: index % 37 === 12 ? 'hostile' : index % 23 === 5 ? 'warning' : 'ok',
  label: `Day ${index + 1} of 90`,
}))

export function StatusTrackerDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Thirty days, with a summary">
        <div className="w-full max-w-xl">
          <StatusTracker label="Uptime, last 30 days" summary="99.2% up" items={THIRTY} />
        </div>
      </Example>

      <Example caption="Ninety days in the same width">
        <div className="w-full max-w-xl">
          <StatusTracker label="Uptime, last 90 days" summary="99.6% up" items={NINETY} />
        </div>
      </Example>

      <Example caption="Other status words">
        <div className="w-full max-w-xs">
          <StatusTracker
            label="Door sensor, last 8 hours"
            statusLabels={{ ok: 'Closed', warning: 'Left open', hostile: 'Forced', neutral: 'Offline' }}
            items={[
              { id: 'h1', status: 'ok', label: '02:00 to 03:00' },
              { id: 'h2', status: 'ok', label: '03:00 to 04:00' },
              { id: 'h3', status: 'warning', label: '04:00 to 05:00, open 9 min' },
              { id: 'h4', status: 'ok', label: '05:00 to 06:00' },
              { id: 'h5', status: 'neutral', label: '06:00 to 07:00' },
              { id: 'h6', status: 'ok', label: '07:00 to 08:00' },
              { id: 'h7', status: 'ok', label: '08:00 to 09:00' },
              { id: 'h8', status: 'ok', label: '09:00 to 10:00' },
            ]}
          />
        </div>
      </Example>
    </ComponentDocs>
  )
}
