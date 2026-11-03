import { useState } from 'react'
import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './KanbanBoard.meta'
import { Example } from '../../docs/Example'
import { docsProse } from '../../docs/PageChrome'
import { ArrowRightLeft, Eye, Pencil, Tag, Trash2 } from 'lucide-react'
import { Avatar, Badge } from '../../atoms'
import {
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '../../molecules/dropdown-menu/DropdownMenu'
import { KanbanBoard, applyKanbanMove, type KanbanColumn } from './KanbanBoard'

type Stage = 'applied' | 'screen' | 'interview' | 'offer'
/** `recruiter`: who owns the candidate, the card's corner avatar. */
type Candidate = { id: string; name: string; role: string; stage: Stage; recruiter: string; referral?: boolean }

const STAGES: { id: Stage; title: string }[] = [
  { id: 'applied', title: 'Applied' },
  { id: 'screen', title: 'Screening' },
  { id: 'interview', title: 'Interview' },
  { id: 'offer', title: 'Offer' },
]

const CANDIDATES: Candidate[] = [
  { id: 'c1', name: 'Ilse Varga', role: 'Depot lead, Cluj', stage: 'applied', recruiter: 'Dana Holm', referral: true },
  { id: 'c2', name: 'Tomas Reyes', role: 'Forklift driver, Arad', stage: 'applied', recruiter: 'Radu Mares' },
  { id: 'c3', name: 'Mara Lind', role: 'Stock planner, Sibiu', stage: 'applied', recruiter: 'Dana Holm' },
  { id: 'c4', name: 'Oskar Behn', role: 'Depot lead, Cluj', stage: 'screen', recruiter: 'Radu Mares' },
  { id: 'c5', name: 'Ana Petrescu', role: 'Dispatcher, Brasov', stage: 'interview', recruiter: 'Dana Holm', referral: true },
  { id: 'c6', name: 'Jon Arvid', role: 'Stock planner, Sibiu', stage: 'interview', recruiter: 'Radu Mares' },
]

const accessors = {
  getItemId: (candidate: Candidate) => candidate.id,
  getColumnId: (candidate: Candidate) => candidate.stage,
  setColumnId: (candidate: Candidate, stage: string) => ({ ...candidate, stage: stage as Stage }),
}

function CandidateCard({ candidate }: { candidate: Candidate }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="font-semibold">{candidate.name}</p>
      <p className="text-[var(--color-text-secondary)]">{candidate.role}</p>
      {candidate.referral ? (
        <Badge tone="signal" emphasis="solid" className="self-start mt-1">
          Referral
        </Badge>
      ) : null}
    </div>
  )
}

/** Controlled, as every board is: the docs page holds the candidates and applies each move. */
function HiringBoard() {
  const [candidates, setCandidates] = useState(CANDIDATES)
  const columns: KanbanColumn[] = STAGES.map(stage => ({
    ...stage,
    meta: candidates.filter(candidate => candidate.stage === stage.id).length,
  }))
  return (
    <div className="w-full min-w-0">
      <KanbanBoard
        label="Hiring board"
        columns={columns}
        items={candidates}
        getItemId={accessors.getItemId}
        getColumnId={accessors.getColumnId}
        getItemLabel={candidate => candidate.name}
        renderCard={candidate => <CandidateCard candidate={candidate} />}
        renderCardCorner={candidate => <Avatar name={candidate.recruiter} size="sm" />}
        onMove={(id, stage, index) => setCandidates(current => applyKanbanMove(current, id, stage, index, accessors))}
        columnHeadingLevel={4}
      />
    </div>
  )
}

type Order = { id: string; title: string; bay: string; status: 'open' | 'parts' | 'done' }

const ORDER_COLUMNS: KanbanColumn[] = [
  { id: 'open', title: 'Open' },
  { id: 'parts', title: 'Waiting for parts' },
  { id: 'done', title: 'Done' },
]

const ORDERS: Order[] = [
  { id: 'wo-31', title: 'Replace dock door seal', bay: 'Bay 2', status: 'open' },
  { id: 'wo-32', title: 'Recalibrate floor scale', bay: 'Bay 5', status: 'open' },
  { id: 'wo-29', title: 'Service pallet jack', bay: 'Bay 1', status: 'done' },
]

const orderAccessors = {
  getItemId: (order: Order) => order.id,
  getColumnId: (order: Order) => order.status,
  setColumnId: (order: Order, status: string) => ({ ...order, status: status as Order['status'] }),
}

function WorkOrders() {
  const [orders, setOrders] = useState(ORDERS)
  return (
    <div className="w-full min-w-0">
      <KanbanBoard
        label="Depot work orders"
        columns={ORDER_COLUMNS}
        items={orders}
        getItemId={orderAccessors.getItemId}
        getColumnId={orderAccessors.getColumnId}
        getItemLabel={order => order.title}
        renderCard={order => (
          <div className="flex flex-col gap-1">
            <p className="font-semibold">{order.title}</p>
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">{order.bay}</p>
          </div>
        )}
        onMove={(id, status, index) => setOrders(current => applyKanbanMove(current, id, status, index, orderAccessors))}
        emptyColumnMessage="No orders waiting"
        columnHeadingLevel={4}
      />
    </div>
  )
}

const ORDER_LABELS = ['Urgent', 'Safety', 'Contractor'] as const

/** A card menu of the app's own: what an order needs besides moving, with the move kept as a
 *  submenu built on `moveTo`. */
function WorkOrdersWithMenu() {
  const [orders, setOrders] = useState(ORDERS)
  const [labels, setLabels] = useState<Record<string, string[]>>({ 'wo-31': ['Safety'] })
  const [note, setNote] = useState('')
  const toggleLabel = (id: string, label: string, on: boolean) =>
    setLabels(current => ({
      ...current,
      [id]: on ? [...(current[id] ?? []), label] : (current[id] ?? []).filter(other => other !== label),
    }))
  return (
    <div className="w-full min-w-0 flex flex-col gap-3">
      <KanbanBoard
        label="Depot work orders, with a card menu"
        columns={ORDER_COLUMNS}
        items={orders}
        getItemId={orderAccessors.getItemId}
        getColumnId={orderAccessors.getColumnId}
        getItemLabel={order => order.title}
        renderCard={order => (
          <div className="flex flex-col gap-1">
            <p className="font-semibold">{order.title}</p>
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
              {[order.bay, ...(labels[order.id] ?? [])].join(' · ')}
            </p>
          </div>
        )}
        renderCardMenu={(order, moveTo, columnId) => (
          <>
            <DropdownMenuItem icon={<Eye />} onSelect={() => setNote(`Opened ${order.title}.`)}>
              View
            </DropdownMenuItem>
            <DropdownMenuItem icon={<Pencil />} onSelect={() => setNote(`Editing ${order.title}.`)}>
              Edit
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger icon={<Tag />}>Labels</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {ORDER_LABELS.map(label => (
                  <DropdownMenuCheckboxItem
                    key={label}
                    checked={(labels[order.id] ?? []).includes(label)}
                    onCheckedChange={on => toggleLabel(order.id, label, on === true)}
                    onSelect={event => event.preventDefault()}
                  >
                    {label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger icon={<ArrowRightLeft />}>Move to</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {ORDER_COLUMNS.filter(column => column.id !== columnId).map(column => (
                  <DropdownMenuItem key={column.id} onSelect={() => moveTo(column.id)}>
                    {column.title}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              tone="hostile"
              icon={<Trash2 />}
              onSelect={() => {
                setOrders(current => current.filter(other => other.id !== order.id))
                setNote(`Deleted ${order.title}.`)
              }}
            >
              Delete
            </DropdownMenuItem>
          </>
        )}
        onMove={(id, status, index) => setOrders(current => applyKanbanMove(current, id, status, index, orderAccessors))}
        emptyColumnMessage="No orders waiting"
        columnHeadingLevel={4}
      />
      <p className={docsProse}>{note}</p>
    </div>
  )
}

export function KanbanBoardDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Hiring board">
        <HiringBoard />
      </Example>

      <Example caption="Work orders, with an empty column">
        <WorkOrders />
      </Example>

      <Example caption="Your own card menu, with renderCardMenu">
        <WorkOrdersWithMenu />
      </Example>
    </ComponentDocs>
  )
}
