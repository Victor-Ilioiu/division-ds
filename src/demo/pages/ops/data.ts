import type { AvatarStatus } from '../../../components/atoms/avatar/Avatar'
import { CATALOG, CATEGORIES, type Category } from '../../store/catalog'

/**
 * The Hexline back office's demo data: the store's own catalogue seen from behind the counter,
 * plus the figures a shop's day produces. Every number here is fixed, never derived from
 * `Date.now()` or a random source, for the same reason `store/orders.ts` gives: a screenshot, a
 * test assertion and a live reload all have to agree. The one thing read live is the catalogue
 * itself, so a product added to the shop shows up in the inventory without a second edit.
 */

/** At or under this many units, a product is low on stock. One number for the whole store: a
 *  real shop sets it per product, and nothing on these pages needs that yet. */
export const REORDER_AT = 6

export type StockStatus = 'in-stock' | 'low' | 'sold-out' | 'discontinued'

export const STOCK_STATUS_LABEL: Record<StockStatus, string> = {
  'in-stock': 'In stock',
  low: 'Low stock',
  'sold-out': 'Sold out',
  discontinued: 'Discontinued',
}

export type InventoryItem = {
  id: string
  name: string
  sku: string
  category: Category['id']
  categoryLabel: string
  /** Cents, like every other price in the demo. */
  price: number
  stock: number
  /** Set by the inventory page's bulk action; never in the starting data. */
  discontinued: boolean
}

const CATEGORY_CODE: Record<Category['id'], string> = {
  replicas: 'RPL',
  optics: 'OPT',
  ammo: 'AMM',
  parts: 'PRT',
  tactical: 'TAC',
}

/** One row per catalogue product, in catalogue order. The SKU is the category code and a running
 *  number within the category, so it is stable for as long as the catalogue order is. */
export function inventoryFromCatalog(): InventoryItem[] {
  const counters = new Map<Category['id'], number>()
  return CATALOG.map(product => {
    const n = (counters.get(product.category) ?? 0) + 1
    counters.set(product.category, n)
    return {
      id: product.id,
      name: product.name,
      sku: `${CATEGORY_CODE[product.category]}-${String(n * 10).padStart(3, '0')}`,
      category: product.category,
      categoryLabel: CATEGORIES.find(c => c.id === product.category)?.label ?? product.category,
      price: product.price,
      stock: product.stock,
      discontinued: false,
    }
  })
}

export function stockStatus(item: Pick<InventoryItem, 'stock' | 'discontinued'>): StockStatus {
  if (item.discontinued) return 'discontinued'
  if (item.stock === 0) return 'sold-out'
  if (item.stock <= REORDER_AT) return 'low'
  return 'in-stock'
}

/** Low on stock but not out: what the dashboard's reorder list shows, fewest first. */
export function lowStock(items: readonly InventoryItem[]): InventoryItem[] {
  return items.filter(item => stockStatus(item) === 'low').sort((a, b) => a.stock - b.stock)
}

export type OpsOrderStatus = 'Paid' | 'Packed' | 'Shipped' | 'Refunded'

export type OpsOrder = {
  id: string
  customer: string
  /** "09:12": today's orders, so the time is the useful half of the timestamp. */
  time: string
  items: number
  totalCents: number
  status: OpsOrderStatus
}

/** This morning's orders, newest first. */
export const RECENT_ORDERS: readonly OpsOrder[] = [
  {
    id: 'HX-204118',
    customer: 'Mara Lindqvist',
    time: '09:38',
    items: 3,
    totalCents: 21700,
    status: 'Paid',
  },
  {
    id: 'HX-204117',
    customer: 'Tudor Enache',
    time: '09:21',
    items: 1,
    totalCents: 13900,
    status: 'Paid',
  },
  {
    id: 'HX-204116',
    customer: 'Ines Ferreira',
    time: '09:02',
    items: 2,
    totalCents: 4800,
    status: 'Packed',
  },
  {
    id: 'HX-204115',
    customer: 'Oskar Brandt',
    time: '08:47',
    items: 5,
    totalCents: 32900,
    status: 'Packed',
  },
  {
    id: 'HX-204114',
    customer: 'Lena Novak',
    time: '08:15',
    items: 1,
    totalCents: 2900,
    status: 'Shipped',
  },
  {
    id: 'HX-204113',
    customer: 'Radu Matei',
    time: '07:58',
    items: 2,
    totalCents: 17800,
    status: 'Refunded',
  },
]

/** Revenue per day for the last fourteen days, in cents, oldest first. Two series: this
 *  fortnight and the one before, so the line chart has something to compare against. */
export type RevenueDay = { day: string; current: number; previous: number }

export const REVENUE_BY_DAY: readonly RevenueDay[] = [
  { day: '1 Oct', current: 184000, previous: 151000 },
  { day: '2 Oct', current: 162000, previous: 158000 },
  { day: '3 Oct', current: 241000, previous: 196000 },
  { day: '4 Oct', current: 298000, previous: 244000 },
  { day: '5 Oct', current: 207000, previous: 171000 },
  { day: '6 Oct', current: 149000, previous: 139000 },
  { day: '7 Oct', current: 171000, previous: 166000 },
  { day: '8 Oct', current: 188000, previous: 149000 },
  { day: '9 Oct', current: 176000, previous: 162000 },
  { day: '10 Oct', current: 263000, previous: 205000 },
  { day: '11 Oct', current: 312000, previous: 251000 },
  { day: '12 Oct', current: 226000, previous: 188000 },
  { day: '13 Oct', current: 158000, previous: 147000 },
  { day: '14 Oct', current: 121000, previous: 136000 },
]

/** Units sold per category, this month against last. */
export type CategoryUnits = {
  category: string
  thisMonth: number
  lastMonth: number
}

export const UNITS_BY_CATEGORY: readonly CategoryUnits[] = [
  { category: 'Replicas', thisMonth: 38, lastMonth: 31 },
  { category: 'Optics', thisMonth: 24, lastMonth: 27 },
  { category: 'Ammo', thisMonth: 112, lastMonth: 96 },
  { category: 'Parts', thisMonth: 71, lastMonth: 64 },
  { category: 'Tactical', thisMonth: 29, lastMonth: 22 },
]

export type TeamRole = 'owner' | 'manager' | 'packer' | 'support'

export const ROLE_LABEL: Record<TeamRole, string> = {
  owner: 'Owner',
  manager: 'Manager',
  packer: 'Packer',
  support: 'Support',
}

export type TeamMember = {
  id: string
  name: string
  email: string
  role: TeamRole
  status: AvatarStatus
  /** On today's shift: the dashboard's group shows these people only. */
  onShift: boolean
}

export const TEAM: readonly TeamMember[] = [
  {
    id: 'ana',
    name: 'Ana Popescu',
    email: 'ana@hexline.example',
    role: 'owner',
    status: 'online',
    onShift: true,
  },
  {
    id: 'ilse',
    name: 'Ilse Varga',
    email: 'ilse@hexline.example',
    role: 'manager',
    status: 'online',
    onShift: true,
  },
  {
    id: 'tomas',
    name: 'Tomas Reyes',
    email: 'tomas@hexline.example',
    role: 'packer',
    status: 'busy',
    onShift: true,
  },
  {
    id: 'mei',
    name: 'Mei Tanaka',
    email: 'mei@hexline.example',
    role: 'packer',
    status: 'away',
    onShift: true,
  },
  {
    id: 'ravi',
    name: 'Ravi Okonkwo',
    email: 'ravi@hexline.example',
    role: 'support',
    status: 'online',
    onShift: true,
  },
  {
    id: 'dana',
    name: 'Dana Iverson',
    email: 'dana@hexline.example',
    role: 'support',
    status: 'offline',
    onShift: false,
  },
]

/** The store's own name, which the danger zone asks to be typed before it closes the store. */
export const STORE_HANDLE = 'hexline'

/** How long a simulated back-office request takes, the dashboard's first load included: long
 *  enough that the skeleton and the busy buttons are seen, short enough not to be a wait. Tests
 *  set it to 0 with `setOpsLatency`, the same seam `store/api.ts` gives the store's own calls. */
const DEFAULT_LATENCY_MS = 600
let latencyMs = DEFAULT_LATENCY_MS

export function setOpsLatency(ms: number): void {
  latencyMs = Number.isFinite(ms) ? Math.max(0, ms) : DEFAULT_LATENCY_MS
}

export function opsLatency(): number {
  return latencyMs
}

export function opsRequest(): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, latencyMs))
}
