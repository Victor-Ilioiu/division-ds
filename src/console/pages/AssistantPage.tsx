import { PageHeader } from '../../components/molecules/page-header/PageHeader'
import { AssistantView } from '../AssistantView'
import { WORKSPACE } from '../data'

/**
 * The assistant as a page: what the docked panel is below `lg`, and the whole width above it.
 * The thread scrolls inside its own box, so the prompt stays in view under it.
 */
export function AssistantPage() {
  return (
    <div className="flex max-w-screen-md flex-col gap-6">
      <PageHeader
        eyebrow={WORKSPACE}
        title="Assistant"
        description="Investigates an alert from the readings, the door log and the equipment, and asks before it acts."
      />
      <div className="flex h-[max(28rem,calc(100vh-18rem))] flex-col">
        <AssistantView variant="page" />
      </div>
    </div>
  )
}
