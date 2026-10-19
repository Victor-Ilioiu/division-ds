import { describe, expect, it } from 'vitest'
import { brennickScript } from './assistant'
import { LIVE_ALERTS } from './data'
import { applyAction, consoleReducer, initialState, type ConsoleAction, type ConsoleState } from './store'

/** Applies the action, checks it moved something, applies its undo, and checks the alerts are back. */
function roundTrip(state: ConsoleState, action: ConsoleAction) {
  const { state: next, undo, changed } = applyAction(state, action)
  expect(changed).toBeGreaterThan(0)
  expect(next.alerts).not.toEqual(state.alerts)
  const back = applyAction(next, undo).state
  expect(back.alerts).toEqual(state.alerts)
  return next
}

const alert = (state: ConsoleState, id: string) => state.alerts.find(a => a.id === id)!

describe('Halden Console store', () => {
  it('acknowledges several open alerts with a note, by the signed-in operator, and undoes it', () => {
    const next = roundTrip(initialState(), { type: 'acknowledge', alertIds: ['a-01', 'a-03'], note: 'On it.' })
    for (const id of ['a-01', 'a-03']) {
      expect(alert(next, id).status).toBe('acknowledged')
      expect(alert(next, id).events.at(-1)).toMatchObject({ kind: 'acknowledged', by: 'Noor Aziz', note: 'On it.', at: '2026-10-15T10:00' })
    }
  })

  it('skips alerts that are not open when acknowledging, and says how many moved', () => {
    const { changed, state } = applyAction(initialState(), { type: 'acknowledge', alertIds: ['a-01', 'a-08', 'a-14', 'nope'] })
    expect(changed).toBe(1)
    expect(alert(state, 'a-08').events).toHaveLength(2)
  })

  it('resolves open and acknowledged alerts, and undoes it', () => {
    const next = roundTrip(initialState(), { type: 'resolve', alertIds: ['a-02', 'a-08'] })
    expect(alert(next, 'a-02').status).toBe('resolved')
    expect(alert(next, 'a-08').status).toBe('resolved')
    expect(alert(next, 'a-08').events.at(-1)?.note).toBeUndefined()
  })

  it('keeps a later change when an earlier one is undone', () => {
    const state = initialState()
    const first = applyAction(state, { type: 'acknowledge', alertIds: ['a-01'] })
    const second = applyAction(first.state, { type: 'resolve', alertIds: ['a-03'] })
    const back = applyAction(second.state, first.undo).state
    expect(alert(back, 'a-01').status).toBe('open')
    expect(alert(back, 'a-03').status).toBe('resolved')
  })

  it('treats an unknown or empty change as a no-op', () => {
    const state = initialState()
    expect(consoleReducer(state, { type: 'acknowledge', alertIds: ['nope'] })).toBe(state)
    expect(consoleReducer(state, { type: 'restore', alerts: [] })).toBe(state)
    expect(consoleReducer(state, { type: 'setLive', live: true })).toBe(state)
  })

  it('ticks the live feed: new readings, the clock, and a planned alert announced once', () => {
    let state = initialState()
    const plan = LIVE_ALERTS[0]
    for (let i = 1; i <= plan.tick; i++) state = consoleReducer(state, { type: 'tick' })
    expect(state.tick).toBe(plan.tick)
    expect(state.alerts[0]).toMatchObject({ id: plan.id, status: 'open' })
    expect(state.readings[plan.sensorId]).toBeCloseTo(plan.value, 0)
    expect(state.announcement).toBe('New warning alert: Cold room 2 above 8 °C, Saltmere Foods, Aarhus.')
    const later = consoleReducer(state, { type: 'tick' })
    expect(later.alerts).toHaveLength(state.alerts.length)
    expect(later.announcement).toBe(state.announcement)
  })

  it('pauses and resumes', () => {
    const paused = consoleReducer(initialState(), { type: 'setLive', live: false })
    expect(paused.live).toBe(false)
    const { state, undo } = applyAction(paused, { type: 'setLive', live: true })
    expect(state.live).toBe(true)
    expect(applyAction(state, undo).state.live).toBe(false)
  })

  it('runs the assistant through the store', () => {
    const state = initialState()
    const started = consoleReducer(state, { type: 'assistant', action: { type: 'start', script: brennickScript(state.readings), time: '10:00' } })
    expect(started.conversation.run?.status).toBe('running')
    const ticked = consoleReducer(started, { type: 'assistant', action: { type: 'tick', time: '10:00' } })
    expect(ticked.conversation.messages[0]).toMatchObject({ role: 'user' })
  })
})
