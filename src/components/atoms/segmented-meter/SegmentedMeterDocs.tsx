import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './SegmentedMeter.meta'
import { Example } from '../../docs/Example'
import { SegmentedMeter } from './SegmentedMeter'

export function SegmentedMeterDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Checks passed, in the accent">
        <SegmentedMeter label="Checks passed" value={3} max={5} />
        <span className="font-data text-sm text-[var(--color-text-secondary)]">3/5</span>
      </Example>

      <Example caption="Struck squares: steps that do not apply">
        <SegmentedMeter label="Release steps" value={2} max={6} none={2} valueText="2 of 6 done, 2 not needed" tone="teal" />
      </Example>

      <Example caption="Category tones">
        <SegmentedMeter label="Blue" value={4} max={8} tone="blue" />
        <SegmentedMeter label="Green" value={6} max={8} tone="green" />
        <SegmentedMeter label="Purple" value={2} max={8} tone="purple" />
      </Example>
    </ComponentDocs>
  )
}
