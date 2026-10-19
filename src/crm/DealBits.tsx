import { Avatar } from '../components/atoms/avatar/Avatar'
import { Badge } from '../components/atoms/badge/Badge'
import { Button } from '../components/atoms/button/Button'
import { repById } from './data'
import { formatDate } from './dates'
import { hasSlipped, isOpen, isStalled, STAGE_LABEL, type Activity, type Deal, type Stage } from './model'

/** Small pieces a deal shows in more than one place: the board card, the table, an account page. */

export const STAGE_TONE: Record<Stage, 'neutral' | 'info' | 'signal' | 'ok' | 'hostile'> = {
  qualified: 'neutral',
  discovery: 'info',
  proposal: 'info',
  negotiation: 'signal',
  won: 'ok',
  lost: 'hostile',
}

export function StageBadge({ stage }: { stage: Stage }) {
  return (
    <Badge emphasis="subtle" tone={STAGE_TONE[stage]}>
      {STAGE_LABEL[stage]}
    </Badge>
  )
}

/** The deal's name as the one button that opens its sheet. */
export function DealName({ deal, onOpen }: { deal: Deal; onOpen: (id: string) => void }) {
  return (
    <Button variant="link" className="text-left" onClick={() => onOpen(deal.id)}>
      {deal.name}
    </Button>
  )
}

/** The close date; past it, in the warning text colour and with the word, since colour is not a status. */
export function CloseDate({ deal }: { deal: Deal }) {
  if (hasSlipped(deal)) {
    return (
      <span className="font-body text-sm text-[var(--color-accent-warning-text)]">
        {formatDate(deal.closeDate)} <span className="font-semibold">(passed)</span>
      </span>
    )
  }
  return <span className="font-body text-sm">{formatDate(deal.closeDate)}</span>
}

/** Stalled and No next step, the two flags a rep acts on. */
export function DealFlags({ deal, activities }: { deal: Deal; activities: readonly Activity[] }) {
  const stalled = isStalled(deal, activities)
  const noNext = isOpen(deal) && !deal.nextStep
  if (!stalled && !noNext) return null
  return (
    <span className="flex flex-wrap gap-1.5">
      {stalled ? <Badge tone="warning">Stalled</Badge> : null}
      {noNext ? <Badge tone="warning">No next step</Badge> : null}
    </span>
  )
}

/** An owner's avatar and name, with the avatar silent so the name is read once. */
export function Owner({ ownerId }: { ownerId: string }) {
  const rep = repById(ownerId)
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <Avatar name={rep.name} size="sm" aria-hidden="true" />
      <span>{rep.name}</span>
    </span>
  )
}
