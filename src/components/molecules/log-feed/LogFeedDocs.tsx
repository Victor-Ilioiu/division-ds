import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './LogFeed.meta'
import { Example } from '../../docs/Example'
import { LogFeed } from './LogFeed'

const EVENTS = [
  { name: 'sync', detail: 'pulled 12 orders' },
  { name: 'stock', detail: 'North depot below 40' },
  { name: 'export', detail: 'wrote stock-2026-11.csv' },
  { name: 'label', detail: 'printed 8 shipping labels' },
]

export function LogFeedDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Recent events" className="block">
        <div className="w-full max-w-md">
          <LogFeed label="Recent events" entries={EVENTS} />
        </div>
      </Example>

      <Example caption="With a prompt line, numbered from 41" className="block">
        <div className="w-full max-w-md">
          <LogFeed label="Order watch" prompt="watch orders --site north" entries={EVENTS.slice(0, 2)} start={41} />
        </div>
      </Example>
    </ComponentDocs>
  )
}
