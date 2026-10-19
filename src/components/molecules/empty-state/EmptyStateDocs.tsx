import { Heart, PackageSearch, StickyNote } from 'lucide-react'
import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './EmptyState.meta'
import { Example } from '../../docs/Example'
import { Button } from '../../atoms/button/Button'
import { Card, CardBody } from '../card/Card'
import { EmptyState } from './EmptyState'

export function EmptyStateDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="A page region, after a filter" className="block">
        <EmptyState
          level={4}
          icon={<PackageSearch />}
          title="No replicas match"
          description="Nothing in stock matches all three filters. Remove one, or clear them and start again."
          actions={
            <>
              <Button>Clear filters</Button>
              <Button variant="secondary">Browse all replicas</Button>
            </>
          }
        />
      </Example>

      <Example caption="First use, one action" className="block">
        <EmptyState
          level={4}
          icon={<Heart />}
          title="Your wishlist is empty"
          description="Save a replica from its page and it waits here, with its price and stock."
          actions={<Button variant="secondary">Browse replicas</Button>}
        />
      </Example>

      <Example caption="Small and unframed, inside a card" className="block">
        <Card as="div" className="max-w-md">
          <CardBody>
            <EmptyState
              level={4}
              size="sm"
              framed={false}
              icon={<StickyNote />}
              title="No notes on this order"
              description="Notes added at the counter show up here."
            />
          </CardBody>
        </Card>
      </Example>

      <Example caption="Title only" className="block">
        <EmptyState level={4} size="sm" title="No returns yet" />
      </Example>
    </ComponentDocs>
  )
}
