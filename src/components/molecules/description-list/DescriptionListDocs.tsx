import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './DescriptionList.meta'
import { Example } from '../../docs/Example'
import { Badge } from '../../atoms'
import { DescriptionList } from './DescriptionList'

export function DescriptionListDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="One column">
        <div className="w-full max-w-sm">
          <DescriptionList
            items={[
              { term: 'Serial', description: 'HS-4471-B' },
              { term: 'Status', description: <Badge tone="ok">Online</Badge> },
              { term: 'Firmware', description: '2.8.1' },
              { term: 'Last seen', description: '15 Oct, 09:58' },
            ]}
          />
        </div>
      </Example>

      <Example caption="Three columns, fewer as the container narrows">
        <div className="w-full">
          <DescriptionList
            columns={3}
            items={[
              { term: 'Order', description: 'ORD-2291' },
              { term: 'Placed', description: '12 Oct 2026' },
              { term: 'Ships', description: '16 Oct 2026' },
              { term: 'Depot', description: 'Cluj, bay 4' },
              { term: 'Carrier', description: 'Regular courier' },
              { term: 'Weight', description: '22.1 kg' },
            ]}
          />
        </div>
      </Example>
    </ComponentDocs>
  )
}
