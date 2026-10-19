import { daysBetween, TODAY } from './dates'

/**
 * Corvane's types and the rules derived from them: a deal's value, its probability, whether it is
 * stalled. Pure functions over plain data, so the store, the pages and the tests all agree.
 */

export type Rep = { id: string; name: string; title: string }

export type Industry = 'Logistics' | 'Cold storage' | 'Manufacturing' | 'Food distribution' | 'Pharma distribution'
export type Health = 'healthy' | 'watch' | 'at-risk'

export type Account = {
  id: string
  name: string
  industry: Industry
  city: string
  employees: number
  ownerId: string
  health: Health
}

export type Contact = {
  id: string
  name: string
  title: string
  accountId: string
  email: string
  phone: string
  ownerId: string
  /** The last day anyone spoke to them. */
  lastTouch: string
}

export type Stage = 'qualified' | 'discovery' | 'proposal' | 'negotiation' | 'won' | 'lost'
export const STAGES: readonly Stage[] = ['qualified', 'discovery', 'proposal', 'negotiation', 'won', 'lost']
export const OPEN_STAGES: readonly Stage[] = ['qualified', 'discovery', 'proposal', 'negotiation']

export const STAGE_LABEL: Record<Stage, string> = {
  qualified: 'Qualified',
  discovery: 'Discovery',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
}

/** Win probability by stage, in percent. One table, so the board, the sheet and the forecast agree. */
export const PROBABILITY: Record<Stage, number> = {
  qualified: 10,
  discovery: 25,
  proposal: 50,
  negotiation: 75,
  won: 100,
  lost: 0,
}

export function isStage(value: string | null | undefined): value is Stage {
  return value != null && (STAGES as readonly string[]).includes(value)
}

export type ProductId = 'gateway' | 'sensor-kit' | 'probe' | 'licence' | 'onboarding'
export type Product = { id: ProductId; name: string; unitPrice: number }

/** What Halden Systems sells. Prices in cents (EUR). */
export const PRODUCTS: readonly Product[] = [
  { id: 'gateway', name: 'Halden Gateway', unitPrice: 145_000 },
  { id: 'sensor-kit', name: 'Sensor kit (12)', unitPrice: 89_000 },
  { id: 'probe', name: 'Cold-chain probe', unitPrice: 16_500 },
  { id: 'licence', name: 'Fleet licence (per site/year)', unitPrice: 420_000 },
  { id: 'onboarding', name: 'Onboarding package', unitPrice: 250_000 },
]

export function productById(id: ProductId): Product {
  const product = PRODUCTS.find(p => p.id === id)
  if (!product) throw new Error(`Unknown product ${id}`)
  return product
}

export type LineItem = { productId: ProductId; quantity: number }

export const LOST_REASONS = ['Budget', 'Chose a competitor', 'No decision', 'Timing', 'Not recorded'] as const
export type LostReason = (typeof LOST_REASONS)[number]

export type Deal = {
  id: string
  accountId: string
  /** The primary contact on the deal. */
  contactId: string
  name: string
  stage: Stage
  ownerId: string
  closeDate: string
  nextStep: string | null
  created: string
  lineItems: LineItem[]
  lostReason?: LostReason
}

export type ActivityType = 'call' | 'email' | 'meeting' | 'note' | 'stage' | 'task'
export const ACTIVITY_TYPES: readonly ActivityType[] = ['call', 'email', 'meeting', 'note', 'stage', 'task']
export const ACTIVITY_LABEL: Record<ActivityType, string> = {
  call: 'Call',
  email: 'Email',
  meeting: 'Meeting',
  note: 'Note',
  stage: 'Stage change',
  task: 'Task done',
}

export type Outcome = 'Connected' | 'No answer' | 'Left voicemail' | 'Sent' | 'Replied' | 'Held' | 'Rescheduled' | 'Done'

export const OUTCOME_TONE: Record<Outcome, 'ok' | 'warning' | 'info' | 'neutral'> = {
  Connected: 'ok',
  Replied: 'ok',
  Held: 'ok',
  Done: 'ok',
  'No answer': 'warning',
  Rescheduled: 'warning',
  'Left voicemail': 'neutral',
  Sent: 'info',
}

export type Activity = {
  id: string
  type: ActivityType
  /** "2026-10-15T09:40", local to the workspace. */
  at: string
  accountId: string
  dealId?: string
  contactId?: string
  /** Who did it. */
  ownerId: string
  title: string
  body?: string
  outcome?: Outcome
}

export type Task = { id: string; dealId: string; title: string; due: string; done: boolean; ownerId: string }

export function dealValue(deal: Pick<Deal, 'lineItems'>): number {
  return deal.lineItems.reduce((sum, item) => sum + productById(item.productId).unitPrice * item.quantity, 0)
}

export function weightedValue(deal: Deal): number {
  return Math.round((dealValue(deal) * PROBABILITY[deal.stage]) / 100)
}

export function isOpen(deal: Pick<Deal, 'stage'>): boolean {
  return deal.stage !== 'won' && deal.stage !== 'lost'
}

/** The deal's most recent activity date, or undefined when it has none. */
export function lastActivityOn(dealId: string, activities: readonly Activity[]): string | undefined {
  let latest: string | undefined
  for (const activity of activities) {
    if (activity.dealId === dealId && (latest === undefined || activity.at > latest)) latest = activity.at
  }
  return latest
}

export const STALLED_AFTER_DAYS = 14

/** An open deal with no activity for more than 14 days (counted from its creation if it has none). */
export function isStalled(deal: Deal, activities: readonly Activity[], today = TODAY): boolean {
  if (!isOpen(deal)) return false
  const last = lastActivityOn(deal.id, activities) ?? deal.created
  return daysBetween(last, today) > STALLED_AFTER_DAYS
}

/** An open deal whose close date is already behind it. */
export function hasSlipped(deal: Deal, today = TODAY): boolean {
  return isOpen(deal) && daysBetween(deal.closeDate, today) > 0
}
