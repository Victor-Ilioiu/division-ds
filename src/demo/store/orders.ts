export type OrderStatus = 'Delivered' | 'Shipped' | 'Processing' | 'Returned'

export type Order = {
  id: string
  /** ISO date (yyyy-mm-dd), always in 2026: the account dashboard is a fixed slice of demo
   *  history, never derived from `Date.now()`, so it reads the same a year from now as it does
   *  today. */
  date: string
  status: OrderStatus
  items: number
  /** In cents, the same unit every other price in this demo holds -- see `lib/money.ts`. */
  totalCents: number
}

/**
 * Fourteen fictional orders for the one signed-in demo account, spread across 2026 so Overview's
 * chart has more than one bar to show. Never generated from `Date.now()` or a random source: a
 * fixed table is what lets a screenshot, a test assertion and a live reload all agree on the same
 * numbers.
 */
export const ORDERS: readonly Order[] = [
  { id: 'HX-100001', date: '2026-01-08', status: 'Delivered', items: 2, totalCents: 18800 },
  // No order in this fixed table is ever 'Returned' -- Orders' own status filter still offers it
  // (every `OrderStatus` is a real filter option, matched status or not), so this is what a
  // filter genuinely narrowing to zero looks like, and what its empty state exists to catch.
  { id: 'HX-100002', date: '2026-01-22', status: 'Delivered', items: 1, totalCents: 6500 },
  { id: 'HX-100003', date: '2026-02-14', status: 'Delivered', items: 3, totalCents: 24300 },
  { id: 'HX-100004', date: '2026-03-02', status: 'Delivered', items: 1, totalCents: 9900 },
  { id: 'HX-100005', date: '2026-03-19', status: 'Processing', items: 2, totalCents: 15400 },
  { id: 'HX-100006', date: '2026-04-11', status: 'Delivered', items: 4, totalCents: 32200 },
  { id: 'HX-100007', date: '2026-04-27', status: 'Shipped', items: 1, totalCents: 7200 },
  { id: 'HX-100008', date: '2026-05-05', status: 'Delivered', items: 2, totalCents: 19600 },
  { id: 'HX-100009', date: '2026-06-16', status: 'Delivered', items: 1, totalCents: 5400 },
  { id: 'HX-100010', date: '2026-07-01', status: 'Processing', items: 3, totalCents: 27800 },
  { id: 'HX-100011', date: '2026-07-20', status: 'Delivered', items: 2, totalCents: 16200 },
  { id: 'HX-100012', date: '2026-08-09', status: 'Shipped', items: 1, totalCents: 8800 },
  { id: 'HX-100013', date: '2026-08-30', status: 'Delivered', items: 5, totalCents: 41500 },
  { id: 'HX-100014', date: '2026-09-12', status: 'Delivered', items: 2, totalCents: 21300 },
]

/** Booked, not completed: a separate count from the order table above, the same way a workshop
 *  tracks appointments apart from purchases. Fixed, like `ORDERS` -- there is no services list to
 *  derive it from yet, only this number. */
export const SERVICES_BOOKED = 2

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const

export type MonthSpend = { month: string; totalCents: number }

/** One row per calendar month that has at least one order, in calendar order, spend summed in
 *  cents -- `ChartPanel`'s own `formatValue` turns that into money at render time, so this stays
 *  a plain sum with no currency formatting baked in. */
export function ordersByMonth(): MonthSpend[] {
  const byMonth = new Map<number, number>()
  for (const order of ORDERS) {
    const monthIndex = Number(order.date.slice(5, 7)) - 1
    byMonth.set(monthIndex, (byMonth.get(monthIndex) ?? 0) + order.totalCents)
  }
  return Array.from(byMonth.entries())
    .sort(([a], [b]) => a - b)
    .map(([monthIndex, totalCents]) => ({ month: MONTHS[monthIndex], totalCents }))
}
