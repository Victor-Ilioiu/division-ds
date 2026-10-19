import { useState } from 'react'
import { Inbox } from 'lucide-react'
import { Button } from '../../components/atoms/button/Button'
import { Select } from '../../components/atoms/select/Select'
import { EmptyState } from '../../components/molecules/empty-state/EmptyState'
import { FormField } from '../../components/molecules/form-field/FormField'
import { MultiSelect } from '../../components/molecules/multi-select/MultiSelect'
import { PageHeader } from '../../components/molecules/page-header/PageHeader'
import { ActivityTimeline } from '../ActivityTimeline'
import { REPS, WORKSPACE } from '../data'
import { ACTIVITY_LABEL, ACTIVITY_TYPES, type ActivityType } from '../model'
import { useCrm } from '../store'

const TYPE_OPTIONS = ACTIVITY_TYPES.map(type => ({ value: type, label: ACTIVITY_LABEL[type] }))
const OWNER_OPTIONS = [{ value: 'all', label: 'Everyone' }, ...REPS.map(rep => ({ value: rep.id, label: rep.name }))]

/** How many entries the feed shows at first, and how many more each "Show more" adds. */
const PAGE = 20

/**
 * Everything the team did in the last three weeks, newest first, in four groups: Today, Yesterday,
 * This week and Earlier. Filter by kind and by who did it; each entry's account and deal sit behind
 * its "Show details" disclosure, so the feed stays one line per thing that happened. The newest
 * twenty first, and twenty more per "Show more": three weeks of a team is a long page. A filter
 * change starts again from twenty.
 */
export function ActivityFeed() {
  const { state } = useCrm()
  const [types, setTypes] = useState<string[]>([])
  const [owner, setOwner] = useState('all')
  const [limit, setLimit] = useState(PAGE)
  const shown = state.activities.filter(
    a => (types.length === 0 || types.includes(a.type as ActivityType)) && (owner === 'all' || a.ownerId === owner),
  )
  const filtering = types.length > 0 || owner !== 'all'

  return (
    <div className="flex max-w-screen-md flex-col gap-8">
      <PageHeader eyebrow={WORKSPACE} title="Activity" description="Calls, emails, meetings, notes and stage changes across every account." />
      <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2">
        <FormField label="Kinds">
          <MultiSelect
            label="Kinds"
            options={TYPE_OPTIONS}
            value={types}
            placeholder="Every kind"
            onValueChange={next => {
              setTypes(next)
              setLimit(PAGE)
            }}
          />
        </FormField>
        <FormField label="Who">
          <Select
            id="activity-owner"
            label="Who"
            options={OWNER_OPTIONS}
            value={owner}
            onValueChange={next => {
              setOwner(next)
              setLimit(PAGE)
            }}
          />
        </FormField>
      </div>
      <p role="status" className="font-body text-sm font-semibold">
        {filtering ? `${shown.length} of ${state.activities.length} entries match` : `${state.activities.length} entries`}
      </p>
      {shown.length === 0 ? (
        <EmptyState
          level={2}
          icon={<Inbox />}
          title="Nothing matches"
          description="No entry is of those kinds by that person. Widen either filter."
          actions={
            <Button
              onClick={() => {
                setTypes([])
                setOwner('all')
                setLimit(PAGE)
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col items-start gap-6">
          <ActivityTimeline
            label="Team activity"
            activities={shown.slice(0, limit)}
            deals={state.deals}
            grouping="relative"
            groupLevel={2}
            context
          />
          {shown.length > limit ? (
            <Button variant="secondary" onClick={() => setLimit(limit + PAGE)}>
              Show more ({shown.length - limit} left)
            </Button>
          ) : null}
        </div>
      )}
    </div>
  )
}
