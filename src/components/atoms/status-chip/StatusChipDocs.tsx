import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './StatusChip.meta'
import { Example } from '../../docs/Example'
import { StatusChip } from './StatusChip'

export function StatusChipDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Tones">
        <StatusChip label="Idle" />
        <StatusChip tone="signal" label="New" />
        <StatusChip tone="ok" label="Done" />
        <StatusChip tone="warning" label="Cap" />
        <StatusChip tone="hostile" label="Fail" />
        <StatusChip tone="info" label="Trend" />
      </Example>

      <Example caption="Beside a value">
        <span className="font-data text-sm text-[var(--color-text-primary)]">12.4K</span>
        <StatusChip tone="warning" label="Cap" />
      </Example>
    </ComponentDocs>
  )
}
