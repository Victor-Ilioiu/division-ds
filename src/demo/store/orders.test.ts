import { describe, expect, it } from 'vitest'
import { ORDERS, ordersByMonth, SERVICES_BOOKED } from './orders'

describe('ORDERS', () => {
  it('is fourteen fictional orders, all dated in 2026', () => {
    expect(ORDERS).toHaveLength(14)
    expect(ORDERS.every(order => order.date.startsWith('2026-'))).toBe(true)
  })

  it('gives every order a unique id', () => {
    expect(new Set(ORDERS.map(order => order.id)).size).toBe(ORDERS.length)
  })
})

describe('SERVICES_BOOKED', () => {
  it('is 2', () => {
    expect(SERVICES_BOOKED).toBe(2)
  })
})

describe('ordersByMonth', () => {
  it('sums each order into its calendar month, in calendar order', () => {
    const rows = ordersByMonth()
    const months = rows.map(row => row.month)
    // Every entry sits later in the year than the one before it -- proof this is sorted by
    // calendar order, not by first appearance in ORDERS or by total spend.
    const MONTH_ORDER = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const indices = months.map(month => MONTH_ORDER.indexOf(month))
    expect(indices).toEqual([...indices].sort((a, b) => a - b))
  })

  it('adds up to the same total as ORDERS itself', () => {
    const total = ordersByMonth().reduce((sum, row) => sum + row.totalCents, 0)
    const expected = ORDERS.reduce((sum, order) => sum + order.totalCents, 0)
    expect(total).toBe(expected)
  })

  // Mutation: change `byMonth.get(monthIndex) ?? 0` to drop the `?? 0` fallback -> the very
  // first order in a month becomes `undefined + totalCents`, which is `NaN`, not that order's own
  // total.
  it('gives January its own two orders summed, not just the last one seen', () => {
    const jan = ordersByMonth().find(row => row.month === 'Jan')
    const expected = ORDERS.filter(order => order.date.startsWith('2026-01')).reduce((sum, o) => sum + o.totalCents, 0)
    expect(jan?.totalCents).toBe(expected)
  })
})
