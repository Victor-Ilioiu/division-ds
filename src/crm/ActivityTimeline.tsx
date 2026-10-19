import type { ReactElement } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { ArrowRightLeft, CalendarDays, CircleCheck, Mail, Phone, StickyNote } from 'lucide-react'
import { Badge } from '../components/atoms/badge/Badge'
import { Button } from '../components/atoms/button/Button'
import { linkVariants } from '../components/atoms/link/Link'
import { Timeline, TimelineGroup, TimelineItem } from '../components/molecules/timeline/Timeline'
import { accountById, repById } from './data'
import { DAY_GROUPS, dayGroup, formatDay, formatTime } from './dates'
import { ACTIVITY_LABEL, OUTCOME_TONE, type Activity, type ActivityType, type Deal } from './model'
import { useOpenSheet } from './navigation'

const ICON: Record<ActivityType, ReactElement> = {
  call: <Phone />,
  email: <Mail />,
  meeting: <CalendarDays />,
  note: <StickyNote />,
  stage: <ArrowRightLeft />,
  task: <CircleCheck />,
}

type Tone = 'neutral' | 'signal' | 'ok' | 'warning' | 'hostile' | 'info'

function toneOf(activity: Activity): Tone {
  if (activity.type === 'stage') {
    if (activity.title.endsWith('to Won')) return 'ok'
    if (activity.title.endsWith('to Lost')) return 'hostile'
    return 'signal'
  }
  if (activity.type === 'task') return 'ok'
  return activity.outcome ? OUTCOME_TONE[activity.outcome] : 'neutral'
}

export type Grouping = 'day' | 'relative' | 'none'

function Item({
  activity,
  deals,
  context,
  timeWithDay,
}: {
  activity: Activity
  deals: readonly Deal[]
  context: boolean
  timeWithDay: boolean
}) {
  const openDeal = useOpenSheet('deal')
  const deal = activity.dealId ? deals.find(d => d.id === activity.dealId) : undefined
  const account = accountById(activity.accountId)
  const time = formatTime(activity.at)
  return (
    <TimelineItem
      icon={ICON[activity.type]}
      tone={toneOf(activity)}
      title={activity.title}
      meta={
        <span className="inline-flex flex-wrap items-center gap-2">
          <span className="font-body text-sm text-[var(--color-text-secondary)]">
            {ACTIVITY_LABEL[activity.type]} · {repById(activity.ownerId).name}
          </span>
          {activity.outcome ? (
            <Badge emphasis="subtle" tone={OUTCOME_TONE[activity.outcome]}>
              {activity.outcome}
            </Badge>
          ) : null}
        </span>
      }
      time={`${activity.at}:00`}
      timeLabel={timeWithDay ? `${formatDay(activity.at)}, ${time}` : time}
      details={
        context && (account || deal) ? (
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 font-body text-sm">
            {account ? (
              <>
                <dt className="text-[var(--color-text-secondary)]">Account</dt>
                <dd>
                  <RouterLink to={`/crm/accounts/${account.id}`} className={linkVariants()}>
                    {account.name}
                  </RouterLink>
                </dd>
              </>
            ) : null}
            {deal ? (
              <>
                <dt className="text-[var(--color-text-secondary)]">Deal</dt>
                <dd>
                  <Button variant="link" onClick={() => openDeal(deal.id)}>
                    {deal.name}
                  </Button>
                </dd>
              </>
            ) : null}
          </dl>
        ) : undefined
      }
    >
      {activity.body}
    </TimelineItem>
  )
}

/**
 * A run of activities as the system's Timeline: by calendar day (a deal, an account), by
 * Today / Yesterday / This week / Earlier (the activity feed), or flat. Newest first.
 *
 * `context` adds a "Show details" disclosure on each entry with the account and the deal, for the
 * feed, where entries from every account sit side by side.
 */
export function ActivityTimeline({
  label,
  activities,
  deals,
  grouping = 'day',
  groupLevel = 3,
  context = false,
}: {
  label: string
  activities: readonly Activity[]
  deals: readonly Deal[]
  grouping?: Grouping
  groupLevel?: 2 | 3 | 4
  context?: boolean
}) {
  const sorted = [...activities].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
  if (grouping === 'none') {
    return (
      <Timeline label={label}>
        {sorted.map(activity => (
          <Item key={activity.id} activity={activity} deals={deals} context={context} timeWithDay />
        ))}
      </Timeline>
    )
  }

  const groups = new Map<string, Activity[]>()
  if (grouping === 'relative') for (const name of DAY_GROUPS) groups.set(name, [])
  for (const activity of sorted) {
    const key = grouping === 'relative' ? dayGroup(activity.at) : activity.at.slice(0, 10)
    const list = groups.get(key) ?? []
    list.push(activity)
    groups.set(key, list)
  }

  return (
    <Timeline label={label}>
      {[...groups.entries()]
        .filter(([, list]) => list.length > 0)
        .map(([key, list]) => (
          <TimelineGroup key={key} title={grouping === 'relative' ? key : formatDay(key)} level={groupLevel}>
            {list.map(activity => (
              <Item
                key={activity.id}
                activity={activity}
                deals={deals}
                context={context}
                timeWithDay={grouping === 'relative' && (key === 'This week' || key === 'Earlier')}
              />
            ))}
          </TimelineGroup>
        ))}
    </Timeline>
  )
}
