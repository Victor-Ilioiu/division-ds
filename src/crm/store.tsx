import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { applyKanbanMove } from '../components/organisms/kanban-board/KanbanBoard'
import { CURRENT_REP_ID, seedData } from './data'
import { TODAY } from './dates'
import {
  STAGE_LABEL,
  type Activity,
  type Contact,
  type Deal,
  type LineItem,
  type LostReason,
  type ProductId,
  type Stage,
  type Task,
} from './model'

/**
 * Corvane's store: deals, contacts, activities and tasks, in memory. It resets on a reload, which
 * the demo says in its data note.
 *
 * Every change goes through `applyAction`, a pure function that returns the next state AND the
 * action that undoes it. The UI keeps that undo and offers it in a toast ("Undo"), and the tests
 * apply it and compare. An undo is a `restore`: it puts back the records the action changed, as
 * they were, and removes anything the action added. It never replays the whole state, so a change
 * made to some other record in between survives an undo.
 */

export type CrmState = {
  deals: Deal[]
  contacts: Contact[]
  activities: Activity[]
  tasks: Task[]
  /** The next number for an id this session creates. */
  seq: number
}

export type ComposerType = 'note' | 'call' | 'email'

export type CrmAction =
  | { type: 'moveStage'; dealId: string; stage: Stage; index?: number }
  | { type: 'setOwner'; dealIds: string[]; ownerId: string }
  | { type: 'setContactOwner'; contactIds: string[]; ownerId: string }
  | { type: 'setCloseDate'; dealId: string; closeDate: string }
  | { type: 'markWon'; dealId: string }
  | { type: 'markLost'; dealId: string; reason: LostReason }
  | { type: 'addLineItem'; dealId: string; productId: ProductId; quantity?: number }
  | { type: 'setQuantity'; dealId: string; productId: ProductId; quantity: number }
  | { type: 'removeLineItem'; dealId: string; productId: ProductId }
  | {
      type: 'addActivity'
      kind: ComposerType
      accountId: string
      dealId?: string
      contactId?: string
      body: string
      /** "2026-10-15T16:05"; defaults to today at the session's clock. */
      at?: string
    }
  | { type: 'toggleTask'; taskId: string }
  | {
      type: 'createDeal'
      accountId: string
      contactId: string
      name: string
      ownerId: string
      closeDate: string
      lineItems: LineItem[]
    }
  | {
      type: 'restore'
      deals?: Deal[]
      dealsOrder?: string[]
      contacts?: Contact[]
      tasks?: Task[]
      removeActivityIds?: string[]
      removeDealIds?: string[]
    }

export type ActionResult = { state: CrmState; undo: CrmAction; /** The id of a record the action created. */ createdId?: string }

export function initialState(): CrmState {
  return { ...seedData(), seq: 1 }
}

/** The session's clock: today, at a time that moves on with each entry, so new rows sort first. */
function sessionStamp(seq: number): string {
  const minutes = 16 * 60 + seq
  return `${TODAY}T${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

function replaceById<T extends { id: string }>(list: readonly T[], next: readonly T[]): T[] {
  const byId = new Map(next.map(item => [item.id, item]))
  return list.map(item => byId.get(item.id) ?? item)
}

function stageActivity(state: CrmState, deal: Deal, to: Stage, body?: string): Activity {
  return {
    id: `a-new-${state.seq}`,
    type: 'stage',
    at: sessionStamp(state.seq),
    accountId: deal.accountId,
    dealId: deal.id,
    ownerId: CURRENT_REP_ID,
    title: `Moved from ${STAGE_LABEL[deal.stage]} to ${STAGE_LABEL[to]}`,
    body,
  }
}

/** Puts `deal` (already carrying its new stage) at `index` among the deals already in that
 *  column, or last without one: the board's own reorder rule, so the store and the board agree. */
function placeDeal(deals: readonly Deal[], deal: Deal, index: number | undefined): Deal[] {
  const withDeal = deals.some(d => d.id === deal.id) ? deals : [...deals, deal]
  return applyKanbanMove(withDeal, deal.id, deal.stage, index ?? Number.MAX_SAFE_INTEGER, {
    getItemId: d => d.id,
    getColumnId: d => d.stage,
    setColumnId: () => deal,
  })
}

const noop = (state: CrmState): ActionResult => ({ state, undo: { type: 'restore' } })

/**
 * The whole store as a pure function. Unknown ids are no-ops (their undo restores nothing), so a
 * stale button never throws.
 */
export function applyAction(state: CrmState, action: CrmAction): ActionResult {
  switch (action.type) {
    case 'moveStage': {
      const deal = state.deals.find(d => d.id === action.dealId)
      if (!deal) return noop(state)
      const order = state.deals.map(d => d.id)
      const sameStage = deal.stage === action.stage
      const moved: Deal = { ...deal, stage: action.stage }
      if (action.stage === 'lost' && !sameStage) moved.lostReason = deal.lostReason ?? 'Not recorded'
      if (action.stage !== 'lost') delete moved.lostReason
      const deals = placeDeal(state.deals, moved, action.index)
      if (sameStage) {
        return { state: { ...state, deals }, undo: { type: 'restore', deals: [deal], dealsOrder: order } }
      }
      const activity = stageActivity(state, deal, action.stage)
      return {
        state: { ...state, deals, activities: [activity, ...state.activities], seq: state.seq + 1 },
        undo: { type: 'restore', deals: [deal], dealsOrder: order, removeActivityIds: [activity.id] },
      }
    }
    case 'setOwner': {
      const ids = new Set(action.dealIds)
      const before = state.deals.filter(d => ids.has(d.id))
      return {
        state: { ...state, deals: state.deals.map(d => (ids.has(d.id) ? { ...d, ownerId: action.ownerId } : d)) },
        undo: { type: 'restore', deals: before },
      }
    }
    case 'setContactOwner': {
      const ids = new Set(action.contactIds)
      const before = state.contacts.filter(c => ids.has(c.id))
      return {
        state: {
          ...state,
          contacts: state.contacts.map(c => (ids.has(c.id) ? { ...c, ownerId: action.ownerId } : c)),
        },
        undo: { type: 'restore', contacts: before },
      }
    }
    case 'setCloseDate': {
      const deal = state.deals.find(d => d.id === action.dealId)
      if (!deal) return noop(state)
      return {
        state: { ...state, deals: replaceById(state.deals, [{ ...deal, closeDate: action.closeDate }]) },
        undo: { type: 'restore', deals: [deal] },
      }
    }
    case 'markWon':
    case 'markLost': {
      const deal = state.deals.find(d => d.id === action.dealId)
      if (!deal) return noop(state)
      const stage: Stage = action.type === 'markWon' ? 'won' : 'lost'
      const next: Deal = { ...deal, stage, closeDate: TODAY }
      if (action.type === 'markLost') next.lostReason = action.reason
      else delete next.lostReason
      const order = state.deals.map(d => d.id)
      const activity = stageActivity(
        state,
        deal,
        stage,
        action.type === 'markLost' ? `Reason: ${action.reason}.` : 'Marked won.',
      )
      return {
        state: {
          ...state,
          deals: placeDeal(state.deals, next, undefined),
          activities: [activity, ...state.activities],
          seq: state.seq + 1,
        },
        undo: { type: 'restore', deals: [deal], dealsOrder: order, removeActivityIds: [activity.id] },
      }
    }
    case 'addLineItem': {
      const deal = state.deals.find(d => d.id === action.dealId)
      if (!deal) return noop(state)
      const quantity = action.quantity ?? 1
      const existing = deal.lineItems.find(item => item.productId === action.productId)
      const lineItems = existing
        ? deal.lineItems.map(item =>
            item.productId === action.productId ? { ...item, quantity: item.quantity + quantity } : item,
          )
        : [...deal.lineItems, { productId: action.productId, quantity }]
      return {
        state: { ...state, deals: replaceById(state.deals, [{ ...deal, lineItems }]) },
        undo: { type: 'restore', deals: [deal] },
      }
    }
    case 'setQuantity': {
      const deal = state.deals.find(d => d.id === action.dealId)
      if (!deal) return noop(state)
      const lineItems =
        action.quantity <= 0
          ? deal.lineItems.filter(item => item.productId !== action.productId)
          : deal.lineItems.map(item =>
              item.productId === action.productId ? { ...item, quantity: action.quantity } : item,
            )
      return {
        state: { ...state, deals: replaceById(state.deals, [{ ...deal, lineItems }]) },
        undo: { type: 'restore', deals: [deal] },
      }
    }
    case 'removeLineItem':
      return applyAction(state, { type: 'setQuantity', dealId: action.dealId, productId: action.productId, quantity: 0 })
    case 'addActivity': {
      const at = action.at ?? sessionStamp(state.seq)
      const activity: Activity = {
        id: `a-new-${state.seq}`,
        type: action.kind,
        at,
        accountId: action.accountId,
        dealId: action.dealId,
        contactId: action.contactId,
        ownerId: CURRENT_REP_ID,
        title:
          action.kind === 'note' ? 'Note' : action.kind === 'call' ? 'Call logged' : 'Email logged',
        body: action.body,
        outcome: action.kind === 'call' ? 'Connected' : action.kind === 'email' ? 'Sent' : undefined,
      }
      const touched = action.contactId ? state.contacts.find(c => c.id === action.contactId) : undefined
      const contacts = touched
        ? replaceById(state.contacts, [{ ...touched, lastTouch: at.slice(0, 10) }])
        : state.contacts
      return {
        state: { ...state, activities: [activity, ...state.activities], contacts, seq: state.seq + 1 },
        undo: { type: 'restore', removeActivityIds: [activity.id], contacts: touched ? [touched] : undefined },
        createdId: activity.id,
      }
    }
    case 'toggleTask': {
      const task = state.tasks.find(t => t.id === action.taskId)
      if (!task) return noop(state)
      return {
        state: { ...state, tasks: replaceById(state.tasks, [{ ...task, done: !task.done }]) },
        undo: { type: 'restore', tasks: [task] },
      }
    }
    case 'createDeal': {
      const id = `d-new-${state.seq}`
      const deal: Deal = {
        id,
        accountId: action.accountId,
        contactId: action.contactId,
        name: action.name,
        stage: 'qualified',
        ownerId: action.ownerId,
        closeDate: action.closeDate,
        nextStep: null,
        created: TODAY,
        lineItems: action.lineItems,
      }
      return {
        state: { ...state, deals: placeDeal(state.deals, deal, 0), seq: state.seq + 1 },
        undo: { type: 'restore', removeDealIds: [id] },
        createdId: id,
      }
    }
    case 'restore': {
      let deals = state.deals
      if (action.removeDealIds) {
        const gone = new Set(action.removeDealIds)
        deals = deals.filter(d => !gone.has(d.id))
      }
      if (action.deals) deals = replaceById(deals, action.deals)
      if (action.dealsOrder) {
        const rank = new Map(action.dealsOrder.map((id, i) => [id, i]))
        deals = [...deals].sort((a, b) => (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity))
      }
      const removed = new Set(action.removeActivityIds ?? [])
      return {
        state: {
          ...state,
          deals,
          contacts: action.contacts ? replaceById(state.contacts, action.contacts) : state.contacts,
          tasks: action.tasks ? replaceById(state.tasks, action.tasks) : state.tasks,
          activities: removed.size ? state.activities.filter(a => !removed.has(a.id)) : state.activities,
        },
        undo: { type: 'restore' },
      }
    }
  }
}

/** The store as a plain reducer, for anyone who only wants the next state. */
export function crmReducer(state: CrmState, action: CrmAction): CrmState {
  return applyAction(state, action).state
}

type CrmContextValue = {
  state: CrmState
  /** Applies the action and returns a function that undoes it, plus any id it created. */
  run: (action: CrmAction) => { undo: () => void; createdId?: string }
}

const CrmContext = createContext<CrmContextValue | null>(null)

export function CrmProvider({ children, initial }: { children: ReactNode; initial?: () => CrmState }) {
  const [state, setState] = useState<CrmState>(initial ?? initialState)
  // The latest state, read synchronously, so two actions in one event each see the other's result.
  const current = useRef(state)
  current.current = state

  const run = useCallback((action: CrmAction) => {
    const result = applyAction(current.current, action)
    current.current = result.state
    setState(result.state)
    return {
      createdId: result.createdId,
      undo: () => {
        const back = applyAction(current.current, result.undo)
        current.current = back.state
        setState(back.state)
      },
    }
  }, [])

  const value = useMemo(() => ({ state, run }), [state, run])
  return <CrmContext.Provider value={value}>{children}</CrmContext.Provider>
}

export function useCrm(): CrmContextValue {
  const value = useContext(CrmContext)
  if (!value) throw new Error('useCrm() needs a <CrmProvider> above it (CrmLayout mounts one).')
  return value
}
