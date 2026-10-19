import { Link as RouterLink } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { Button } from '../../components/atoms/button/Button'
import { EmptyState } from '../../components/molecules/empty-state/EmptyState'
import { PageHeader } from '../../components/molecules/page-header/PageHeader'

/** Any `/console/...` path no route claims: the console's own not-found, inside its shell. */
export function ConsoleNotFound() {
  return (
    <div className="flex max-w-screen-md flex-col gap-8">
      <PageHeader eyebrow="Halden Console" title="Page not found" description="Nothing in the console lives at this address." />
      <EmptyState
        level={2}
        icon={<Compass />}
        title="This page does not exist"
        description="It may have been mistyped, or it never existed. The overview is the place to start."
        actions={
          <Button asChild>
            <RouterLink to="/console">Back to the overview</RouterLink>
          </Button>
        }
      />
    </div>
  )
}
