import { history, LAST_INDEX, OPERATOR, SCRIPTED_ALERT_ID, sensorById, siteById, SITES, STEP_MINUTES } from './data'
import { formatReading, type Alert } from './model'
import type { Readings } from './simulator'
import { formatTime, isoAt, offsetOf, WEEK_START } from './time'

/**
 * The console's assistant: scripted, deterministic, and labelled as such on screen. No model is
 * called. A script is a list of steps; `conversationReducer` runs them one tick at a time, and
 * the store's driver (`useAssistantDriver` in store.tsx) decides when the next tick comes: a few
 * milliseconds per word while text streams, about a second while a tool runs, never while an
 * approval waits for the person.
 *
 * Everything here is pure data: a step's output is stored as plain values (a table's rows, a
 * list of door events), and the panel draws it. So a test can run a script to the end with no
 * timers, and Stop, Retry, Approve and Reject are reducer cases like any other.
 */

export const SUGGESTIONS = ['Why is Cold room 2 at Brennick warm?', 'Which sites had the most alerts this week?'] as const

export const ASSISTANT_NAME = 'Assistant'

export type ToolOutput =
  | { type: 'history'; sensorId: string; values: number[]; rows: { time: string; value: string }[] }
  | { type: 'doors'; events: { time: string; text: string }[] }
  | { type: 'facts'; items: { term: string; description: string }[] }
  | { type: 'email'; to: string; at: string }
  | { type: 'counts'; rows: { siteId: string; site: string; total: number; critical: number }[] }

export type EmailDraft = { to: string; toName: string; subject: string; body: string; note: string }

export type Step =
  | { kind: 'user'; text: string }
  | { kind: 'say'; text: string }
  | { kind: 'tool'; name: string; title: string; input: string; duration: string; ms: number; output: ToolOutput }
  | { kind: 'links'; links: { label: string; href: string }[] }
  | { kind: 'approval'; title: string; draft: EmailDraft; onApprove: number; onReject: number }
  | { kind: 'effect'; effect: 'acknowledge'; alertId: string; note: string }
  | { kind: 'jump'; to: number }
  | { kind: 'end' }

export type Script = { id: string; steps: Step[] }

export type Part =
  | { id: string; kind: 'text'; text: string }
  | { id: string; kind: 'tool'; name: string; title: string; input: string; status: 'running' | 'done' | 'failed'; duration?: string; output: ToolOutput }
  | { id: string; kind: 'links'; links: { label: string; href: string }[] }
  | { id: string; kind: 'approval'; title: string; draft: EmailDraft; state: 'pending' | 'approved' | 'rejected' }

export type Message = {
  id: string
  role: 'user' | 'assistant' | 'system'
  /** Shown time, "10:02"; the live clock when it was posted. */
  time: string
  parts: Part[]
  streaming: boolean
}

export type RunStatus = 'running' | 'awaiting' | 'stopped' | 'done'

export type Run = {
  script: Script
  step: number
  status: RunStatus
  /** Characters of the current `say` step already shown. */
  chars: number
  /** The part the current step is working on (a running tool, a pending approval). */
  partId?: string
}

export type Conversation = { messages: Message[]; run: Run | null; seq: number }

export const emptyConversation = (): Conversation => ({ messages: [], run: null, seq: 1 })

export type ConversationAction =
  | { type: 'start'; script: Script; time: string }
  | { type: 'tick'; time: string; whole?: boolean }
  | { type: 'stop'; time: string }
  | { type: 'retry' }
  | { type: 'decide'; approved: boolean }
  | { type: 'clear' }

/* ------------------------------------------------------------------------------------------- */
/* Scripts                                                                                      */
/* ------------------------------------------------------------------------------------------- */

const DOOR_OPENED = '2026-10-15T07:40'
const DOOR_MINUTES = 22

/** The main investigation: why Cold room 2 at Brennick is warm. Built from the store's state at
 *  the moment it starts, so its numbers are the ones on screen. */
export function brennickScript(readings: Readings, userText = SUGGESTIONS[0]): Script {
  const sensorId = 'brennick-cr2'
  const sensor = sensorById(sensorId)!
  const site = siteById(sensor.siteId)!
  const values = history(sensorId)
  const six = values.slice(LAST_INDEX - (6 * 60) / STEP_MINUTES, LAST_INDEX + 1)
  const rows = []
  for (let h = 6; h >= 0; h--) {
    const i = LAST_INDEX - (h * 60) / STEP_MINUTES
    rows.push({ time: formatTime(isoAt(-h * 60)), value: formatReading('temperature', values[i]) })
  }
  const peakIndex = six.reduce((best, v, i) => (v > six[best] ? i : best), 0)
  const peakAt = formatTime(isoAt(-(six.length - 1 - peakIndex) * STEP_MINUTES))
  const now = readings[sensorId] ?? values[LAST_INDEX]
  const contact = site.contact
  const note = `Door left open ${DOOR_MINUTES} min after the ${formatTime(DOOR_OPENED)} delivery. Compressor normal; room recovering.`
  const draft: EmailDraft = {
    to: contact.email,
    toName: contact.name,
    subject: 'Cold room 2 warmed after this morning’s delivery',
    body: [
      `Hello ${contact.name.split(' ')[0]},`,
      `Cold room 2 went above 8 °C at 08:02 today and peaked at ${formatReading('temperature', six[peakIndex])}. The door was open for ${DOOR_MINUTES} minutes from ${formatTime(DOOR_OPENED)}, after a delivery. The compressor is working normally and the room is recovering.`,
      'Could you remind the dock team to close the cold room door between pallets? We will keep watching the readings.',
      `${OPERATOR.name}, Halden Systems operations`,
    ].join('\n\n'),
    note,
  }
  const steps: Step[] = [
    { kind: 'user', text: userText },
    { kind: 'say', text: 'I will check three things: the room’s temperature over the last six hours, the door on that room, and its compressor.' },
    {
      kind: 'tool',
      name: 'query_sensor_history',
      title: 'Read 6 h of Cold room 2 readings',
      input: `sensor: ${sensorId}\nwindow: 6 h`,
      duration: '1.2 s',
      ms: 1200,
      output: { type: 'history', sensorId, values: six.filter((_, i) => i % 3 === 0), rows },
    },
    {
      kind: 'tool',
      name: 'door_events',
      title: 'List the door events on Cold room 2',
      input: 'door: brennick-cr2door\nsince: 06:00',
      duration: '0.8 s',
      ms: 800,
      output: {
        type: 'doors',
        events: [
          { time: '07:40', text: 'Opened' },
          { time: '07:55', text: 'Open 15 min: alert raised' },
          { time: '08:02', text: `Closed, after ${DOOR_MINUTES} min` },
        ],
      },
    },
    {
      kind: 'tool',
      name: 'compressor_status',
      title: 'Check the compressor',
      input: 'unit: brennick-cr2-compressor',
      duration: '0.6 s',
      ms: 600,
      output: {
        type: 'facts',
        items: [
          { term: 'State', description: 'Running, normal' },
          { term: 'Duty cycle', description: '71% this hour, up from 48%' },
          { term: 'Last defrost', description: '06:00, completed' },
          { term: 'Faults', description: 'None' },
        ],
      },
    },
    {
      kind: 'say',
      text: `The door was left open after a delivery. It opened at ${formatTime(DOOR_OPENED)} and stayed open ${DOOR_MINUTES} minutes; the room started warming five minutes later, crossed 8 °C at 08:02 and peaked at ${formatReading('temperature', six[peakIndex])} at ${peakAt}. The compressor is working normally and harder than usual, so the room is recovering on its own: it reads ${formatReading('temperature', now)} now.`,
    },
    {
      kind: 'links',
      links: [
        { label: 'The Cold room 2 alert', href: `/console/alerts?alert=${SCRIPTED_ALERT_ID}` },
        { label: `${site.name}, site readings`, href: `/console/sites/${site.id}` },
      ],
    },
    {
      kind: 'say',
      text: `I suggest two things: acknowledge the alert with a note, and email ${contact.name}, the ${contact.role.toLowerCase()}, so the dock team closes the door between pallets. Nothing is sent until you approve.`,
    },
  ]
  const approved: Step[] = [
    {
      kind: 'tool',
      name: 'send_email',
      title: `Send the email to ${contact.name}`,
      input: `to: ${contact.email}\nsubject: ${draft.subject}`,
      duration: '0.9 s',
      ms: 900,
      output: { type: 'email', to: contact.email, at: '' },
    },
    { kind: 'effect', effect: 'acknowledge', alertId: SCRIPTED_ALERT_ID, note },
    {
      kind: 'say',
      text: 'Done. The email is sent and the alert is acknowledged with the note. It stays acknowledged until someone resolves it, once the room is back under 8 °C.',
    },
  ]
  const rejected: Step[] = [
    {
      kind: 'say',
      text: 'Understood: I have not sent the email or acknowledged the alert. I can change the draft if you tell me what to say differently, or you can act on the alert yourself from its page.',
    },
  ]
  // The approval jumps to one branch or the other; the approved branch then jumps past the
  // rejected one to the shared end.
  const onApprove = steps.length + 1
  const onReject = onApprove + approved.length + 1
  const end = onReject + rejected.length
  return {
    id: 'brennick',
    steps: [
      ...steps,
      { kind: 'approval', title: `Acknowledge the alert and email ${contact.name}?`, draft, onApprove, onReject },
      ...approved,
      { kind: 'jump', to: end },
      ...rejected,
      { kind: 'end' },
    ],
  }
}

/** Which sites raised the most alerts since Monday, counted from the store's alerts. */
export function weeklyCountScript(alerts: readonly Alert[], userText = SUGGESTIONS[1]): Script {
  const since = offsetOf(WEEK_START)
  const rows = SITES.map(site => {
    const mine = alerts.filter(a => a.siteId === site.id && offsetOf(a.firedAt) >= since)
    return { siteId: site.id, site: site.name, total: mine.length, critical: mine.filter(a => a.severity === 'critical').length }
  }).sort((a, b) => b.total - a.total || b.critical - a.critical || a.site.localeCompare(b.site))
  const [first, second] = rows
  const total = rows.reduce((sum, r) => sum + r.total, 0)
  const tie = first.total === second.total
  const summary = tie
    ? `${first.site} and ${second.site} had the most, ${first.total} each, out of ${total} across all eight sites since Monday.`
    : `${first.site} had the most: ${first.total} of the ${total} alerts since Monday, ${first.critical} of them critical. ${second.site} is next with ${second.total}.`
  return {
    id: 'weekly',
    steps: [
      { kind: 'user', text: userText },
      { kind: 'say', text: 'I will count the alerts raised since Monday 12 October, by site.' },
      {
        kind: 'tool',
        name: 'count_alerts',
        title: 'Count alerts by site, this week',
        input: 'since: Mon 12 Oct 00:00\ngroup by: site',
        duration: '0.7 s',
        ms: 700,
        output: { type: 'counts', rows },
      },
      { kind: 'say', text: summary },
      { kind: 'links', links: [{ label: 'Every alert', href: '/console/alerts?status=resolved' }] },
      { kind: 'end' },
    ],
  }
}

export const HONEST_REPLY = 'This demo only runs its scripted investigations; try one of the suggestions.'

/** Anything typed that is not a suggestion: the honest answer. */
export function freeScript(text: string): Script {
  return { id: 'free', steps: [{ kind: 'user', text }, { kind: 'say', text: HONEST_REPLY }, { kind: 'end' }] }
}

/** "Investigate with Assistant" on an alert other than the scripted one. */
export function unscriptedAlertScript(alert: Alert): Script {
  const site = siteById(alert.siteId)
  return {
    id: 'unscripted',
    steps: [
      { kind: 'user', text: `Investigate: ${alert.title} at ${site?.name ?? alert.siteId}` },
      {
        kind: 'say',
        text: 'This demo scripts one investigation, the Cold room 2 alert at Brennick Pharma, Basel. Open that alert, or try one of the suggestions.',
      },
      { kind: 'end' },
    ],
  }
}

/** The script a prompt starts: a suggestion's own, or the honest reply. */
export function scriptFor(text: string, readings: Readings, alerts: readonly Alert[]): Script {
  const trimmed = text.trim()
  if (trimmed === SUGGESTIONS[0]) return brennickScript(readings, trimmed)
  if (trimmed === SUGGESTIONS[1]) return weeklyCountScript(alerts, trimmed)
  return freeScript(trimmed)
}

/* ------------------------------------------------------------------------------------------- */
/* The runner                                                                                   */
/* ------------------------------------------------------------------------------------------- */

/** Where the next streamed chunk ends: two more words, or the whole text. */
export function nextChunkEnd(text: string, from: number, whole = false): number {
  if (whole) return text.length
  let end = from
  for (let words = 0; words < 2 && end < text.length; words++) {
    while (end < text.length && text[end] === ' ') end++
    while (end < text.length && text[end] !== ' ') end++
  }
  return end
}

function withMessage(conv: Conversation, message: Omit<Message, 'id'>): Conversation {
  return { ...conv, messages: [...conv.messages, { ...message, id: `m-${conv.seq}` }], seq: conv.seq + 1 }
}

/** The assistant message the run is writing into, opening a new one if the last message is not
 *  an assistant message still in progress. */
function openAssistant(conv: Conversation, time: string): Conversation {
  const last = conv.messages.at(-1)
  if (last && last.role === 'assistant' && last.streaming) return conv
  return withMessage(conv, { role: 'assistant', time, parts: [], streaming: true })
}

function updateLast(conv: Conversation, change: (message: Message) => Message): Conversation {
  const messages = [...conv.messages]
  messages[messages.length - 1] = change(messages[messages.length - 1])
  return { ...conv, messages }
}

/** A part before it has an id: `Omit` that keeps the union apart. */
type NewPart = Part extends infer P ? (P extends Part ? Omit<P, 'id'> : never) : never

function addPart(conv: Conversation, part: NewPart): { conv: Conversation; id: string } {
  const id = `p-${conv.seq}`
  const next = updateLast({ ...conv, seq: conv.seq + 1 }, m => ({ ...m, parts: [...m.parts, { ...part, id } as Part] }))
  return { conv: next, id }
}

function updatePart(conv: Conversation, id: string, change: (part: Part) => Part): Conversation {
  return {
    ...conv,
    messages: conv.messages.map(m => (m.parts.some(p => p.id === id) ? { ...m, parts: m.parts.map(p => (p.id === id ? change(p) : p)) } : m)),
  }
}

function closeStreaming(conv: Conversation): Conversation {
  const last = conv.messages.at(-1)
  return last?.streaming ? updateLast(conv, m => ({ ...m, streaming: false })) : conv
}

function setRun(conv: Conversation, run: Partial<Run>): Conversation {
  return conv.run ? { ...conv, run: { ...conv.run, ...run } } : conv
}

/** One tick of the current step. Only a running script moves. */
function tick(conv: Conversation, time: string, whole: boolean): Conversation {
  const run = conv.run
  if (!run || run.status !== 'running') return conv
  const step = run.script.steps[run.step]
  if (!step) return setRun(closeStreaming(conv), { status: 'done' })
  switch (step.kind) {
    case 'user': {
      const next = withMessage(closeStreaming(conv), { role: 'user', time, parts: [{ id: `p-${conv.seq}-u`, kind: 'text', text: step.text }], streaming: false })
      return setRun(next, { step: run.step + 1, chars: 0 })
    }
    case 'say': {
      let next = openAssistant(conv, time)
      const end = nextChunkEnd(step.text, run.chars, whole)
      if (run.chars === 0 || !run.partId) {
        const added = addPart(next, { kind: 'text', text: step.text.slice(0, end) })
        next = setRun(added.conv, { partId: added.id })
      } else {
        next = updatePart(next, run.partId, p => ({ ...p, text: step.text.slice(0, end) }) as Part)
      }
      return end >= step.text.length
        ? setRun(next, { step: run.step + 1, chars: 0, partId: undefined })
        : setRun(next, { chars: end })
    }
    case 'tool': {
      if (!run.partId) {
        const added = addPart(openAssistant(conv, time), {
          kind: 'tool',
          name: step.name,
          title: step.title,
          input: step.input,
          status: 'running',
          output: step.output,
        })
        return setRun(added.conv, { partId: added.id })
      }
      const output = step.output.type === 'email' ? { ...step.output, at: time } : step.output
      const done = updatePart(conv, run.partId, p => ({ ...p, status: 'done', duration: step.duration, output }) as Part)
      return setRun(done, { step: run.step + 1, partId: undefined })
    }
    case 'links': {
      const added = addPart(openAssistant(conv, time), { kind: 'links', links: step.links })
      return setRun(added.conv, { step: run.step + 1 })
    }
    case 'approval': {
      const added = addPart(openAssistant(conv, time), { kind: 'approval', title: step.title, draft: step.draft, state: 'pending' })
      return setRun(closeStreaming(added.conv), { status: 'awaiting', partId: added.id })
    }
    case 'effect':
      return setRun(conv, { step: run.step + 1 })
    case 'jump':
      return setRun(conv, { step: step.to, chars: 0, partId: undefined })
    case 'end':
      return setRun(closeStreaming(conv), { status: 'done', partId: undefined })
  }
}

export function conversationReducer(conv: Conversation, action: ConversationAction): Conversation {
  switch (action.type) {
    case 'start': {
      // A script can start while the last one is stopped or done; never over a running one or
      // one waiting for a decision (the panel does not offer it then).
      if (conv.run && (conv.run.status === 'running' || conv.run.status === 'awaiting')) return conv
      return { ...conv, run: { script: action.script, step: 0, status: 'running', chars: 0 } }
    }
    case 'tick':
      return tick(conv, action.time, action.whole ?? false)
    case 'stop': {
      const run = conv.run
      if (!run || run.status !== 'running') return conv
      let next = conv
      const step = run.script.steps[run.step]
      if (step?.kind === 'tool' && run.partId) next = updatePart(next, run.partId, p => ({ ...p, status: 'failed' }) as Part)
      next = closeStreaming(next)
      next = withMessage(next, { role: 'system', time: action.time, parts: [{ id: `p-${next.seq}-s`, kind: 'text', text: 'Stopped' }], streaming: false })
      return setRun(next, { status: 'stopped', chars: 0, partId: undefined })
    }
    case 'retry':
      return conv.run?.status === 'stopped' ? setRun(conv, { status: 'running', chars: 0, partId: undefined }) : conv
    case 'decide': {
      const run = conv.run
      if (!run || run.status !== 'awaiting' || !run.partId) return conv
      const step = run.script.steps[run.step]
      if (step?.kind !== 'approval') return conv
      const decided = updatePart(conv, run.partId, p => ({ ...p, state: action.approved ? 'approved' : 'rejected' }) as Part)
      return setRun(decided, { status: 'running', step: action.approved ? step.onApprove : step.onReject, chars: 0, partId: undefined })
    }
    case 'clear':
      return conv.run && (conv.run.status === 'running' || conv.run.status === 'awaiting') ? conv : emptyConversation()
  }
}

/** The step the run is on, if it is running. */
export function currentStep(conv: Conversation): Step | undefined {
  return conv.run?.status === 'running' ? conv.run.script.steps[conv.run.step] : undefined
}

/** Runs a script to the end (or to an approval) with no timers: for tests and for reduced motion
 *  checks. Returns the conversation and the effects it passed. */
export function runToRest(conv: Conversation, time = '10:00', limit = 500): { conv: Conversation; effects: Extract<Step, { kind: 'effect' }>[] } {
  const effects: Extract<Step, { kind: 'effect' }>[] = []
  let next = conv
  for (let i = 0; i < limit && next.run?.status === 'running'; i++) {
    const step = currentStep(next)
    if (step?.kind === 'effect') effects.push(step)
    next = conversationReducer(next, { type: 'tick', time, whole: true })
  }
  return { conv: next, effects }
}
