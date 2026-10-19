import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './PageHeader.meta'
import { Example } from '../../docs/Example'
import { Button } from '../../atoms/button/Button'
import { Breadcrumbs } from '../breadcrumbs/Breadcrumbs'
import { PageHeader } from './PageHeader'

// Each example renders a real h1, because a PageHeader is one: a docs page is the one place a
// screen holds more than one, and axe's AA tag set does not count them.
export function PageHeaderDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Title and description" className="block">
        <PageHeader level={2} title="Orders" description="Every order from the last 90 days, newest first." />
      </Example>

      <Example caption="With an eyebrow and actions" className="block">
        <PageHeader
          level={2}
          eyebrow="Operations"
          title="Inventory"
          description="Stock across both depots, counted at close of day."
          actions={
            <>
              <Button variant="secondary">Export</Button>
              <Button>Add replica</Button>
            </>
          }
        />
      </Example>

      <Example caption="Under a breadcrumb trail" className="block">
        <PageHeader
          level={2}
          breadcrumbs={
            <Breadcrumbs
              items={[
                { label: 'Account', href: '#account' },
                { label: 'Settings', href: '#settings' },
                { label: 'Notifications' },
              ]}
            />
          }
          title="Notifications"
          description="What we send, and where."
          actions={<Button variant="secondary">Reset to defaults</Button>}
        />
      </Example>
    </ComponentDocs>
  )
}
