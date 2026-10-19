import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './Spinner.meta'
import { Example } from '../../docs/Example'
import { Spinner } from './Spinner'

export function SpinnerDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Ring, three sizes">
        <Spinner size="sm" label="Loading field kits" />
        <Spinner size="md" label="Loading field kits" />
        <Spinner size="lg" label="Loading field kits" />
      </Example>

      <Example caption="Conveyor, three sizes">
        <Spinner variant="conveyor" size="sm" label="Syncing manifest" />
        <Spinner variant="conveyor" size="md" label="Syncing manifest" />
        <Spinner variant="conveyor" size="lg" label="Syncing manifest" />
      </Example>

      <Example caption="Decorative, inside a control">
        <span className="inline-flex items-center gap-2 border border-[var(--color-border-hairline-strong)] px-3 py-2">
          <Spinner aria-hidden="true" />
          <span className="text-sm">Dispatching…</span>
        </span>
      </Example>
    </ComponentDocs>
  )
}
