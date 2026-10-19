import { useState } from 'react'
import { Columns3, Table } from 'lucide-react'
import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './SegmentedControl.meta'
import { Example } from '../../docs/Example'
import { Button } from '../../atoms'
import { SegmentedControl } from './SegmentedControl'

const RANGES = [
  { value: '1h', label: '1 h' },
  { value: '24h', label: '24 h' },
  { value: '7d', label: '7 d' },
  { value: '30d', label: '30 d' },
]

function RangeExample() {
  const [range, setRange] = useState('24h')
  return (
    <div className="flex flex-col items-center gap-3">
      <SegmentedControl label="Range" options={RANGES} value={range} onValueChange={setRange} />
      <p className="font-body text-sm text-[var(--color-text-secondary)]">Showing the last {RANGES.find(option => option.value === range)?.label}.</p>
    </div>
  )
}

function ToolbarExample() {
  const [view, setView] = useState('board')
  return (
    <div className="flex flex-wrap items-center gap-3">
      <SegmentedControl
        label="View"
        size="sm"
        options={[
          { value: 'board', label: 'Board', icon: <Columns3 /> },
          { value: 'table', label: 'Table', icon: <Table /> },
        ]}
        value={view}
        onValueChange={setView}
      />
      <Button size="sm" variant="secondary">
        Export
      </Button>
    </div>
  )
}

export function SegmentedControlDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="A time range">
        <RangeExample />
      </Example>

      <Example caption="Small, with icons, lined up with a small Button">
        <ToolbarExample />
      </Example>
    </ComponentDocs>
  )
}
