import { Avatar } from '../../components/atoms/avatar/Avatar'
import { useToast } from '../../components/molecules/toast/Toast'
import { KanbanBoard, type KanbanColumn } from '../../components/organisms/kanban-board/KanbanBoard'
import { formatEuros } from '../money'
import { accountById, repById } from '../data'
import { CloseDate, DealFlags, DealName } from '../DealBits'
import { dealValue, isStage, STAGE_LABEL, STAGES, type Activity, type Deal } from '../model'
import { useCrm } from '../store'

function DealCard({ deal, activities, onOpen }: { deal: Deal; activities: readonly Activity[]; onOpen: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <DealName deal={deal} onOpen={onOpen} />
      <span className="font-body text-sm text-[var(--color-text-secondary)]">{accountById(deal.accountId)?.name}</span>
      <span className="font-mono text-sm font-semibold tabular-nums">{formatEuros(dealValue(deal))}</span>
      <CloseDate deal={deal} />
      <DealFlags deal={deal} activities={activities} />
    </div>
  )
}

/**
 * The pipeline as a board: one column per stage, a card per deal, drag or the card's Move menu to
 * change stage. The board is controlled: a move goes through the store, which logs the stage change,
 * and a toast offers Undo. A move into Lost records "Not recorded" as the reason, and the deal sheet
 * is where a rep sets the real one.
 */
export function PipelineBoard({
  deals,
  activities,
  onOpen,
}: {
  deals: readonly Deal[]
  activities: readonly Activity[]
  onOpen: (id: string) => void
}) {
  const { state, run } = useCrm()
  const { toast } = useToast()
  const columns: KanbanColumn[] = STAGES.map(stage => {
    const inStage = deals.filter(deal => deal.stage === stage)
    const total = inStage.reduce((sum, deal) => sum + dealValue(deal), 0)
    return {
      id: stage,
      title: STAGE_LABEL[stage],
      meta: `${inStage.length} ${inStage.length === 1 ? 'deal' : 'deals'} · ${formatEuros(total)}`,
    }
  })

  return (
    <KanbanBoard<Deal>
      label="Pipeline board"
      columnHeadingLevel={2}
      columns={columns}
      items={deals}
      getItemId={deal => deal.id}
      getColumnId={deal => deal.stage}
      getItemLabel={deal => deal.name}
      renderCard={deal => <DealCard deal={deal} activities={activities} onOpen={onOpen} />}
      renderCardCorner={deal => <Avatar name={repById(deal.ownerId).name} size="sm" />}
      emptyColumnMessage="No deals in this stage"
      onMove={(dealId, toColumnId, toIndex) => {
        if (!isStage(toColumnId)) return
        const deal = state.deals.find(d => d.id === dealId)
        if (!deal) return
        // The index the board reports is among the cards it shows, which a filter may have
        // thinned; translate it into the full column so the deal lands beside the same neighbour.
        const shown = deals.filter(d => d.stage === toColumnId && d.id !== dealId)
        const neighbour = shown[toIndex]
        const full = state.deals.filter(d => d.stage === toColumnId && d.id !== dealId)
        const index = neighbour ? full.findIndex(d => d.id === neighbour.id) : full.length
        const sameStage = deal.stage === toColumnId
        const { undo } = run({ type: 'moveStage', dealId, stage: toColumnId, index })
        if (sameStage) return
        toast({
          tone: 'ok',
          title: `${deal.name} moved to ${STAGE_LABEL[toColumnId]}`,
          description:
            toColumnId === 'lost' ? 'Open the deal to record why it was lost.' : `From ${STAGE_LABEL[deal.stage]}.`,
          action: { label: 'Undo', altText: `Move ${deal.name} back to ${STAGE_LABEL[deal.stage]} from its Move menu.`, onAction: undo },
        })
      }}
    />
  )
}
