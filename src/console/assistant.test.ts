import { describe, expect, it } from 'vitest'
import {
  brennickScript,
  conversationReducer,
  emptyConversation,
  HONEST_REPLY,
  nextChunkEnd,
  runToRest,
  scriptFor,
  SUGGESTIONS,
  weeklyCountScript,
  type Conversation,
  type Part,
} from './assistant'
import { seedAlerts } from './data'
import { initialReadings } from './simulator'

const readings = initialReadings()
const alerts = seedAlerts()

function start(script = brennickScript(readings)): Conversation {
  return conversationReducer(emptyConversation(), { type: 'start', script, time: '10:00' })
}

function tick(conv: Conversation, times = 1, whole = false): Conversation {
  let next = conv
  for (let i = 0; i < times; i++) next = conversationReducer(next, { type: 'tick', time: '10:00', whole })
  return next
}

const parts = (conv: Conversation): Part[] => conv.messages.flatMap(m => m.parts)
const tools = (conv: Conversation) => parts(conv).filter((p): p is Extract<Part, { kind: 'tool' }> => p.kind === 'tool')
const texts = (conv: Conversation) => parts(conv).filter(p => p.kind === 'text').map(p => (p as Extract<Part, { kind: 'text' }>).text)

describe('the assistant runner', () => {
  it('streams two words a tick, or the whole text at once', () => {
    expect(nextChunkEnd('one two three four', 0)).toBe(7)
    expect(nextChunkEnd('one two three four', 7)).toBe(18)
    expect(nextChunkEnd('one two three four', 0, true)).toBe(18)
  })

  it('posts the question, streams the plan, then runs the three tools in order, each running then done', () => {
    let conv = tick(start()) // the user's question
    expect(conv.messages[0]).toMatchObject({ role: 'user', parts: [{ kind: 'text', text: SUGGESTIONS[0] }] })
    conv = tick(conv) // the first words of the plan
    expect(conv.messages[1]).toMatchObject({ role: 'assistant', streaming: true })
    expect(texts(conv)[1]).toBe('I will')
    while (conv.run?.script.steps[conv.run.step].kind === 'say') conv = tick(conv)
    conv = tick(conv) // the tool starts
    expect(tools(conv)).toEqual([expect.objectContaining({ name: 'query_sensor_history', status: 'running' })])
    conv = tick(conv) // and finishes
    expect(tools(conv)[0]).toMatchObject({ status: 'done', duration: '1.2 s' })
    conv = tick(conv, 4)
    expect(tools(conv).map(t => [t.name, t.status])).toEqual([
      ['query_sensor_history', 'done'],
      ['door_events', 'done'],
      ['compressor_status', 'done'],
    ])
  })

  it('stops at an approval, with the cause, the evidence and a draft email', () => {
    const { conv } = runToRest(start())
    expect(conv.run?.status).toBe('awaiting')
    const all = texts(conv).join(' ')
    expect(all).toContain('The door was left open after a delivery')
    expect(all).toContain('07:40')
    expect(parts(conv).find(p => p.kind === 'links')).toMatchObject({
      links: [{ href: '/console/alerts?alert=a-01' }, { href: '/console/sites/brennick' }],
    })
    // The Dockline app sits between the evidence and the proposal, inside the same reply.
    const kinds = parts(conv).map(p => p.kind)
    expect(kinds.indexOf('links')).toBeLessThan(kinds.indexOf('app'))
    expect(kinds.indexOf('app')).toBeLessThan(kinds.indexOf('approval'))
    expect(parts(conv).find(p => p.kind === 'app')).toMatchObject({ schedule: { app: 'Dockline', deliveries: { length: 3 } } })
    const approval = parts(conv).find(p => p.kind === 'approval')
    expect(approval).toMatchObject({ state: 'pending', draft: { to: 'm.lindqvist@brennick.example' } })
    expect(conv.messages.at(-1)?.streaming).toBe(false)
  })

  it('on Approve: sends the email, passes the acknowledge effect once, and ends', () => {
    const waiting = runToRest(start()).conv
    const approved = conversationReducer(waiting, { type: 'decide', approved: true })
    const { conv, effects } = runToRest(approved)
    expect(parts(conv).find(p => p.kind === 'approval')).toMatchObject({ state: 'approved' })
    expect(tools(conv).at(-1)).toMatchObject({ name: 'send_email', status: 'done', output: { type: 'email', at: '10:00' } })
    expect(effects).toEqual([expect.objectContaining({ effect: 'acknowledge', alertId: 'a-01' })])
    expect(texts(conv).at(-1)).toMatch(/^Done\./)
    expect(conv.run?.status).toBe('done')
  })

  it('on Reject: sends nothing, says so, and offers to edit', () => {
    const waiting = runToRest(start()).conv
    const { conv, effects } = runToRest(conversationReducer(waiting, { type: 'decide', approved: false }))
    expect(parts(conv).find(p => p.kind === 'approval')).toMatchObject({ state: 'rejected' })
    expect(effects).toEqual([])
    expect(tools(conv).some(t => t.name === 'send_email')).toBe(false)
    expect(texts(conv).at(-1)).toContain('I have not sent the email')
    expect(conv.run?.status).toBe('done')
  })

  it('Stop mid-stream freezes the text, adds "Stopped", and Retry runs that step again', () => {
    let conv = tick(start(), 3) // question, then two chunks of the plan
    const partial = texts(conv)[1]
    conv = conversationReducer(conv, { type: 'stop', time: '10:00' })
    expect(conv.run?.status).toBe('stopped')
    expect(conv.messages.at(-1)).toMatchObject({ role: 'system', parts: [{ text: 'Stopped' }] })
    expect(conv.messages.some(m => m.streaming)).toBe(false)
    // Stopped means stopped: a tick does nothing.
    expect(tick(conv)).toBe(conv)
    conv = conversationReducer(conv, { type: 'retry' })
    conv = tick(conv, 1, true)
    expect(conv.messages.at(-1)).toMatchObject({ role: 'assistant' })
    expect(texts(conv).at(-1)).toBe('I will check three things: the room’s temperature over the last six hours, the door on that room, and its compressor.')
    expect(texts(conv)[1]).toBe(partial)
  })

  it('Stop during a tool marks it failed; Retry runs the tool again', () => {
    let conv = start()
    while (!tools(conv).length) conv = tick(conv, 1, true)
    conv = conversationReducer(conv, { type: 'stop', time: '10:00' })
    expect(tools(conv)[0].status).toBe('failed')
    conv = tick(conversationReducer(conv, { type: 'retry' }), 2, true)
    expect(tools(conv).map(t => t.status)).toEqual(['failed', 'done'])
  })

  it('ignores a new script while one runs or waits for a decision', () => {
    const running = tick(start())
    expect(conversationReducer(running, { type: 'start', script: scriptFor('hello', readings, alerts), time: '10:00' })).toBe(running)
    const waiting = runToRest(start()).conv
    expect(conversationReducer(waiting, { type: 'start', script: scriptFor('hello', readings, alerts), time: '10:00' })).toBe(waiting)
  })

  it('answers the weekly question from the data, with a table', () => {
    const { conv } = runToRest(start(weeklyCountScript(alerts)))
    const counts = tools(conv)[0]
    expect(counts).toMatchObject({ name: 'count_alerts', status: 'done', output: { type: 'counts' } })
    const rows = (counts.output as Extract<typeof counts.output, { type: 'counts' }>).rows
    expect(rows).toHaveLength(8)
    expect(rows.reduce((sum, r) => sum + r.total, 0)).toBe(alerts.filter(a => a.firedAt >= '2026-10-12').length)
    expect(texts(conv).at(-1)).toContain(rows[0].site)
    expect(conv.run?.status).toBe('done')
  })

  it('gives a free-typed prompt the honest scripted reply', () => {
    const { conv } = runToRest(start(scriptFor('What is the weather in Basel?', readings, alerts)))
    expect(texts(conv)).toEqual(['What is the weather in Basel?', HONEST_REPLY])
  })
})
