import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './MeterRow.meta'
import { Example } from '../../docs/Example'
import { MeterAxis, MeterRow } from './MeterRow'

const ROWS = [
  { label: 'North depot', value: 1240, display: '1,240' },
  { label: 'Harbour store', value: 860, display: '860' },
  { label: 'East yard', value: 410, display: '410' },
  { label: 'Hill annex', value: 95, display: '95' },
]

const SPEND = [
  { label: 'Spring restock', value: 182000, display: '182K' },
  { label: 'Warehouse move', value: 24500, display: '24.5K' },
  { label: 'Label printer', value: 3100, display: '3.1K' },
]

export function MeterRowDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Parcels per site, linear" className="block">
        <div className="w-full max-w-sm">
          {ROWS.map((row, index) => (
            <MeterRow key={row.label} {...row} max={1240} color="blue" state={index === 0 ? 'active' : 'rest'} />
          ))}
        </div>
      </Example>

      <Example caption="Spend per project, log scale with an axis" className="block">
        <div className="w-full max-w-sm">
          {SPEND.map(row => (
            <MeterRow key={row.label} {...row} max={200000} scale="log" color="teal" href={`#${row.label}`} />
          ))}
          <MeterAxis max={200000} className="mt-1" />
        </div>
      </Example>

      <Example caption="States: active, rest, pending" className="block">
        <div className="w-full max-w-sm">
          <MeterRow label="Packing" value={8} max={10} state="active" />
          <MeterRow label="Picking" value={5} max={10} />
          <MeterRow label="Loading" value={0} max={10} state="pending" />
        </div>
      </Example>
    </ComponentDocs>
  )
}
