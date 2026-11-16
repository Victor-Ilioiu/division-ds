import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './PanelHeader.meta'
import { Example } from '../../docs/Example'
import { PanelHeader } from './PanelHeader'

export function PanelHeaderDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Numbered, with a readout" className="block">
        <div className="flex w-full max-w-md flex-col gap-4">
          <PanelHeader index={1} title="Open orders" meta="42 open" />
          <PanelHeader index={2} title="Shipments" meta="updated 12:04" />
        </div>
      </Example>

      <Example caption="Title only, at level 3" className="block">
        <div className="w-full max-w-md">
          <PanelHeader title="Warehouse stock" level={3} />
        </div>
      </Example>
    </ComponentDocs>
  )
}
