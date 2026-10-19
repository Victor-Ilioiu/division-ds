import { Link as RouterLink } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { Button } from '../../components/atoms/button/Button'
import { EmptyState } from '../../components/molecules/empty-state/EmptyState'
import { PageHeader } from '../../components/molecules/page-header/PageHeader'

/** Any `/crm/...` path no route claims: Corvane's own not-found, inside its shell. */
export function CrmNotFound() {
  return (
    <div className="flex max-w-screen-md flex-col gap-8">
      <PageHeader eyebrow="Corvane" title="Page not found" description="Nothing in Corvane lives at this address." />
      <EmptyState
        level={2}
        icon={<Compass />}
        title="This page does not exist"
        description="It may have been mistyped, or it never existed. The pipeline is the place to start."
        actions={
          <Button asChild>
            <RouterLink to="/crm">Back to the pipeline</RouterLink>
          </Button>
        }
      />
    </div>
  )
}
