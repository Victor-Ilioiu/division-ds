import { describe, expect, it } from 'vitest'
import { CURRENT_REP_ID } from './data'
import { TODAY } from './dates'
import { dealValue } from './model'
import { applyAction, crmReducer, initialState, type CrmAction, type CrmState } from './store'

/** Applies the action, checks it did something, applies its undo, and checks the state is back. */
function roundTrip(state: CrmState, action: CrmAction) {
  const { state: next, undo } = applyAction(state, action)
  expect(next).not.toEqual(state)
  const back = applyAction(next, undo).state
  // `seq` only ever moves forward, so a new id is never reused after an undo.
  expect({ ...back, seq: state.seq }).toEqual(state)
  return next
}

const column = (state: CrmState, stage: string) => state.deals.filter(d => d.stage === stage).map(d => d.id)

describe('Corvane store', () => {
  it('moves a deal to a stage at an index, logs the stage change, and undoes both', () => {
    const state = initialState()
    const next = roundTrip(state, { type: 'moveStage', dealId: 'd-04', stage: 'proposal', index: 1 })
    expect(column(next, 'proposal')[1]).toBe('d-04')
    expect(next.deals.find(d => d.id === 'd-04')?.stage).toBe('proposal')
    expect(next.activities[0]).toMatchObject({
      type: 'stage',
      dealId: 'd-04',
      ownerId: CURRENT_REP_ID,
      title: 'Moved from Qualified to Proposal',
    })
  })

  it('reorders within a column without logging a stage change', () => {
    const state = initialState()
    const first = column(state, 'qualified')[0]
    const { state: next, undo } = applyAction(state, { type: 'moveStage', dealId: first, stage: 'qualified', index: 2 })
    expect(column(next, 'qualified')[2]).toBe(first)
    expect(next.activities).toBe(state.activities)
    expect(applyAction(next, undo).state.deals).toEqual(state.deals)
  })

  it('moves to the end of a column without an index', () => {
    const state = initialState()
    const next = crmReducer(state, { type: 'moveStage', dealId: 'd-04', stage: 'won' })
    expect(column(next, 'won').at(-1)).toBe('d-04')
  })

  it('records "Not recorded" for a deal dropped into Lost, and clears it when it leaves', () => {
    const state = initialState()
    const lost = crmReducer(state, { type: 'moveStage', dealId: 'd-04', stage: 'lost' })
    expect(lost.deals.find(d => d.id === 'd-04')?.lostReason).toBe('Not recorded')
    const back = crmReducer(lost, { type: 'moveStage', dealId: 'd-04', stage: 'discovery' })
    expect(back.deals.find(d => d.id === 'd-04')?.lostReason).toBeUndefined()
  })

  it('assigns an owner to several deals at once, and undoes it', () => {
    const next = roundTrip(initialState(), { type: 'setOwner', dealIds: ['d-01', 'd-02', 'd-03'], ownerId: 'r-elias' })
    expect(next.deals.filter(d => ['d-01', 'd-02', 'd-03'].includes(d.id)).every(d => d.ownerId === 'r-elias')).toBe(true)
  })

  it('assigns an owner to several contacts at once, and undoes it', () => {
    const next = roundTrip(initialState(), { type: 'setContactOwner', contactIds: ['c-01', 'c-02'], ownerId: 'r-priya' })
    expect(next.contacts.find(c => c.id === 'c-02')?.ownerId).toBe('r-priya')
  })

  it('sets a close date, and undoes it', () => {
    const next = roundTrip(initialState(), { type: 'setCloseDate', dealId: 'd-05', closeDate: '2026-11-30' })
    expect(next.deals.find(d => d.id === 'd-05')?.closeDate).toBe('2026-11-30')
  })

  it('marks a deal won today, and undoes it', () => {
    const next = roundTrip(initialState(), { type: 'markWon', dealId: 'd-01' })
    expect(next.deals.find(d => d.id === 'd-01')).toMatchObject({ stage: 'won', closeDate: TODAY })
    expect(next.activities[0].title).toBe('Moved from Negotiation to Won')
  })

  it('marks a deal lost with its reason, and undoes it', () => {
    const next = roundTrip(initialState(), { type: 'markLost', dealId: 'd-02', reason: 'Budget' })
    expect(next.deals.find(d => d.id === 'd-02')).toMatchObject({ stage: 'lost', lostReason: 'Budget' })
    expect(next.activities[0].body).toBe('Reason: Budget.')
  })

  it('adds a line item (or adds to its quantity), and undoes it', () => {
    const state = initialState()
    const before = dealValue(state.deals.find(d => d.id === 'd-04')!)
    const next = roundTrip(state, { type: 'addLineItem', dealId: 'd-04', productId: 'gateway' })
    expect(dealValue(next.deals.find(d => d.id === 'd-04')!)).toBe(before + 145_000)
    const again = crmReducer(next, { type: 'addLineItem', dealId: 'd-04', productId: 'gateway', quantity: 2 })
    expect(again.deals.find(d => d.id === 'd-04')?.lineItems.find(i => i.productId === 'gateway')?.quantity).toBe(3)
  })

  it('changes a quantity, removes a line at zero or by removeLineItem, and undoes each', () => {
    const state = initialState()
    const changed = roundTrip(state, { type: 'setQuantity', dealId: 'd-04', productId: 'sensor-kit', quantity: 4 })
    expect(changed.deals.find(d => d.id === 'd-04')?.lineItems).toEqual([{ productId: 'sensor-kit', quantity: 4 }])
    const zero = roundTrip(state, { type: 'setQuantity', dealId: 'd-04', productId: 'sensor-kit', quantity: 0 })
    expect(zero.deals.find(d => d.id === 'd-04')?.lineItems).toEqual([])
    const removed = roundTrip(state, { type: 'removeLineItem', dealId: 'd-01', productId: 'licence' })
    expect(removed.deals.find(d => d.id === 'd-01')?.lineItems.some(i => i.productId === 'licence')).toBe(false)
  })

  it('logs a note, a call and an email, touching the contact, and undoes each', () => {
    const state = initialState()
    for (const kind of ['note', 'call', 'email'] as const) {
      const { state: next, undo, createdId } = applyAction(state, {
        type: 'addActivity',
        kind,
        accountId: 'acc-vellmark',
        dealId: 'd-01',
        contactId: 'c-01',
        body: 'Spoke about the pilot.',
      })
      expect(next.activities[0]).toMatchObject({ id: createdId, type: kind, body: 'Spoke about the pilot.', ownerId: CURRENT_REP_ID })
      expect(next.activities[0].at.startsWith(TODAY)).toBe(true)
      expect(next.contacts.find(c => c.id === 'c-01')?.lastTouch).toBe(TODAY)
      const back = applyAction(next, undo).state
      expect({ ...back, seq: state.seq }).toEqual(state)
    }
  })

  it('toggles a task, and undoes it', () => {
    const state = initialState()
    const task = state.tasks[0]
    const next = roundTrip(state, { type: 'toggleTask', taskId: task.id })
    expect(next.tasks[0].done).toBe(!task.done)
  })

  it('creates a deal at the top of Qualified, and undoes it', () => {
    const state = initialState()
    const { state: next, undo, createdId } = applyAction(state, {
      type: 'createDeal',
      accountId: 'acc-wexmoor',
      contactId: 'c-44',
      name: 'Tampere pilot',
      ownerId: 'r-sana',
      closeDate: '2026-12-31',
      lineItems: [{ productId: 'gateway', quantity: 2 }],
    })
    expect(column(next, 'qualified')[0]).toBe(createdId)
    expect(next.deals.find(d => d.id === createdId)).toMatchObject({ stage: 'qualified', created: TODAY, nextStep: null })
    const back = applyAction(next, undo).state
    expect(back.deals).toEqual(state.deals)
  })

  it('keeps a later change to another deal when an earlier change is undone', () => {
    const state = initialState()
    const first = applyAction(state, { type: 'setOwner', dealIds: ['d-01'], ownerId: 'r-elias' })
    const second = applyAction(first.state, { type: 'setCloseDate', dealId: 'd-02', closeDate: '2027-01-01' })
    const back = applyAction(second.state, first.undo).state
    expect(back.deals.find(d => d.id === 'd-01')?.ownerId).toBe('r-maren')
    expect(back.deals.find(d => d.id === 'd-02')?.closeDate).toBe('2027-01-01')
  })

  it('treats an unknown id as a no-op', () => {
    const state = initialState()
    expect(crmReducer(state, { type: 'markWon', dealId: 'nope' })).toBe(state)
    expect(crmReducer(state, { type: 'toggleTask', taskId: 'nope' })).toBe(state)
  })
})
