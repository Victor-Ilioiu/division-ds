import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './Stat.meta'
import { Example } from '../../docs/Example'
import { Stat } from './Stat'

export function StatDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="A row of stats">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 w-full">
          <Stat
            label="Kits dispatched"
            value={18}
            padTo={3}
            delta={{ value: '12%', direction: 'up', sentiment: 'positive', period: 'last week' }}
          />
          <Stat
            label="Failed syncs"
            value={3}
            delta={{ value: '40%', direction: 'down', sentiment: 'positive', period: 'last week' }}
          />
          <Stat
            label="Depots offline"
            value={2}
            delta={{ value: '1', direction: 'up', sentiment: 'negative', period: 'last week' }}
          />
          <Stat label="Payload" value={24} unit="kg" />
        </div>
      </Example>

      <Example caption="Without a delta">
        <div className="max-w-[10rem] w-full">
          <Stat label="Kits dispatched" value={18} padTo={3} />
        </div>
      </Example>
    </ComponentDocs>
  )
}
