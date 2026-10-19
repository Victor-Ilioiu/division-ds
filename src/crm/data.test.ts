import { describe, expect, it } from 'vitest'
import { ACCOUNTS, CURRENT_REP_ID, REPS, seedData, STALLED_DEAL_IDS } from './data'
import { daysBetween, dayGroup, formatDay, quarterOf, TODAY, weekStart } from './dates'
import { dealValue, hasSlipped, isOpen, isStalled, PRODUCTS, STAGES } from './model'

const seed = seedData()

function unique(ids: string[]) {
  return new Set(ids).size === ids.length
}

describe('Corvane demo data', () => {
  it('has the sizes the demo promises', () => {
    expect(REPS).toHaveLength(6)
    expect(ACCOUNTS).toHaveLength(18)
    expect(seed.contacts).toHaveLength(45)
    expect(seed.deals).toHaveLength(32)
    expect(seed.activities.length).toBeGreaterThanOrEqual(70)
    expect(seed.activities.length).toBeLessThanOrEqual(95)
  })

  it('uses unique ids in every collection', () => {
    expect(unique(REPS.map(r => r.id))).toBe(true)
    expect(unique(ACCOUNTS.map(a => a.id))).toBe(true)
    expect(unique(seed.contacts.map(c => c.id))).toBe(true)
    expect(unique(seed.deals.map(d => d.id))).toBe(true)
    expect(unique(seed.activities.map(a => a.id))).toBe(true)
    expect(unique(seed.tasks.map(t => t.id))).toBe(true)
    expect(unique(seed.contacts.map(c => c.name)), 'no two people share a name').toBe(true)
  })

  it('points every reference at a record that exists', () => {
    const accounts = new Set(ACCOUNTS.map(a => a.id))
    const reps = new Set(REPS.map(r => r.id))
    const contacts = new Map(seed.contacts.map(c => [c.id, c]))
    const deals = new Set(seed.deals.map(d => d.id))
    expect(reps.has(CURRENT_REP_ID)).toBe(true)
    for (const account of ACCOUNTS) expect(reps.has(account.ownerId)).toBe(true)
    for (const contact of seed.contacts) expect(accounts.has(contact.accountId)).toBe(true)
    for (const deal of seed.deals) {
      expect(accounts.has(deal.accountId), deal.id).toBe(true)
      expect(reps.has(deal.ownerId)).toBe(true)
      // The primary contact works at the deal's account.
      expect(contacts.get(deal.contactId)?.accountId).toBe(deal.accountId)
      for (const item of deal.lineItems) expect(PRODUCTS.some(p => p.id === item.productId)).toBe(true)
    }
    for (const activity of seed.activities) {
      expect(accounts.has(activity.accountId)).toBe(true)
      if (activity.dealId) expect(deals.has(activity.dealId)).toBe(true)
      if (activity.contactId) expect(contacts.has(activity.contactId)).toBe(true)
    }
    for (const task of seed.tasks) expect(deals.has(task.dealId)).toBe(true)
  })

  it('is deterministic: two seeds are equal', () => {
    expect(seedData()).toEqual(seed)
  })

  it('keeps people fictional: example.com addresses and 555 numbers', () => {
    for (const contact of seed.contacts) {
      expect(contact.email).toMatch(/^[a-z.]+@example\.com$/)
      expect(contact.phone).toMatch(/^\+1 555-01\d\d$/)
    }
  })

  it('keeps every activity inside the last three weeks, newest first', () => {
    for (const activity of seed.activities) {
      const ago = daysBetween(activity.at, TODAY)
      expect(ago).toBeGreaterThanOrEqual(0)
      expect(ago).toBeLessThanOrEqual(21)
    }
    const times = seed.activities.map(a => a.at)
    expect([...times].sort().reverse()).toEqual(times)
  })

  it('has every stage, a value on every deal, and the hygiene cases the forecast counts', () => {
    for (const stage of STAGES) expect(seed.deals.some(d => d.stage === stage)).toBe(true)
    for (const deal of seed.deals) expect(dealValue(deal)).toBeGreaterThan(0)
    const stalled = seed.deals.filter(d => isStalled(d, seed.activities)).map(d => d.id)
    expect(new Set(stalled)).toEqual(new Set(STALLED_DEAL_IDS))
    expect(seed.deals.filter(d => hasSlipped(d)).length).toBe(3)
    expect(seed.deals.filter(d => isOpen(d) && !d.nextStep).length).toBe(5)
    for (const deal of seed.deals.filter(d => d.stage === 'lost')) expect(deal.lostReason).toBeTruthy()
  })
})

describe('Corvane dates', () => {
  it('groups days relative to today', () => {
    expect(weekStart(TODAY)).toBe('2026-10-12')
    expect(dayGroup('2026-10-15T09:00')).toBe('Today')
    expect(dayGroup('2026-10-14')).toBe('Yesterday')
    expect(dayGroup('2026-10-12')).toBe('This week')
    expect(dayGroup('2026-10-11')).toBe('Earlier')
    expect(formatDay('2026-10-15')).toBe('Thu 15 Oct')
    expect(quarterOf(TODAY)).toEqual({ start: '2026-10-01', end: '2026-12-31', label: 'Q4 2026' })
  })
})
