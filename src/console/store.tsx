import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useToast } from '../components/molecules/toast/Toast'
import {
  conversationReducer,
  currentStep,
  emptyConversation,
  type Conversation,
  type ConversationAction,
  type Script,
} from './assistant'
import { OPERATOR, seedAlerts, siteById } from './data'
import type { Alert, AlertEvent } from './model'
import { initialReadings, simulateTick, TICK_MS, TICK_SECONDS, type Readings } from './simulator'
import { isoAt, liveClock } from './time'

/**
 * Halden Console's store: the alerts, the live readings, the live/paused switch and the
 * assistant's conversation, in memory. It resets on a reload, which the shell says on every page.
 *
 * Every alert change goes through `applyAction`, a pure function that returns the next state AND
 * the action that undoes it (a `restore` of the alerts it touched, as they were). The UI offers
 * that undo in a toast. The simulator's tick and the assistant's steps are actions too, so the
 * whole store is testable without a browser or a timer.
 */

export type ConsoleState = {
  alerts: Alert[]
  /** The latest reading per sensor id. */
  readings: Readings
  /** What readings wander around: the last stored value, or where a live alert moved it. */
  anchors: Readings
  /** Five-second ticks since the console opened. */
  tick: number
  live: boolean
  /** The last new-alert sentence, announced once in a polite status. */
  announcement: string
  conversation: Conversation
  seq: number
}

export type ConsoleAction =
  | { type: 'acknowledge'; alertIds: string[]; note?: string; by?: string }
  | { type: 'resolve'; alertIds: string[]; note?: string; by?: string }
  | { type: 'restore'; alerts: Alert[] }
  | { type: 'tick' }
  | { type: 'setLive'; live: boolean }
  | { type: 'assistant'; action: ConversationAction }

export type ActionResult = { state: ConsoleState; undo: ConsoleAction; changed: number }

export function initialState(): ConsoleState {
  const readings = initialReadings()
  return {
    alerts: seedAlerts(),
    readings,
    anchors: readings,
    tick: 0,
    live: true,
    announcement: '',
    conversation: emptyConversation(),
    seq: 1,
  }
}

/** The live clock's time, "10:00:35", and the matching minute stamp for new records. */
export function clockOf(state: Pick<ConsoleState, 'tick'>): { label: string; iso: string } {
  const seconds = state.tick * TICK_SECONDS
  return { label: liveClock(seconds), iso: isoAt(Math.floor(seconds / 60)) }
}

const noop = (state: ConsoleState): ActionResult => ({ state, undo: { type: 'restore', alerts: [] }, changed: 0 })

function changeAlerts(
  state: ConsoleState,
  ids: readonly string[],
  from: Alert['status'][],
  to: Alert['status'],
  note: string | undefined,
  by: string,
): ActionResult {
  const wanted = new Set(ids)
  const before = state.alerts.filter(a => wanted.has(a.id) && from.includes(a.status))
  if (before.length === 0) return noop(state)
  const touched = new Set(before.map(a => a.id))
  const at = clockOf(state).iso
  let seq = state.seq
  const alerts = state.alerts.map(alert => {
    if (!touched.has(alert.id)) return alert
    const event: AlertEvent = {
      id: `${alert.id}-s${seq++}`,
      kind: to === 'acknowledged' ? 'acknowledged' : 'resolved',
      at,
      by,
      note: note?.trim() || undefined,
    }
    return { ...alert, status: to, events: [...alert.events, event] }
  })
  return { state: { ...state, alerts, seq }, undo: { type: 'restore', alerts: before }, changed: before.length }
}

/**
 * The whole store as a pure function. Unknown or already-moved alerts are skipped, so a stale
 * button never throws, and `changed` says how many records really moved.
 */
export function applyAction(state: ConsoleState, action: ConsoleAction): ActionResult {
  switch (action.type) {
    case 'acknowledge':
      return changeAlerts(state, action.alertIds, ['open'], 'acknowledged', action.note, action.by ?? OPERATOR.name)
    case 'resolve':
      return changeAlerts(state, action.alertIds, ['open', 'acknowledged'], 'resolved', action.note, action.by ?? OPERATOR.name)
    case 'restore': {
      if (action.alerts.length === 0) return noop(state)
      const byId = new Map(action.alerts.map(a => [a.id, a]))
      return {
        state: { ...state, alerts: state.alerts.map(a => byId.get(a.id) ?? a) },
        undo: { type: 'restore', alerts: [] },
        changed: action.alerts.length,
      }
    }
    case 'tick': {
      const tick = state.tick + 1
      const { readings, anchors, alerts } = simulateTick(tick, state.anchors)
      const fresh = alerts.filter(a => !state.alerts.some(existing => existing.id === a.id))
      const announcement = fresh.length
        ? fresh.map(a => `New ${a.severity} alert: ${a.title}, ${siteById(a.siteId)?.name ?? a.siteId}.`).join(' ')
        : state.announcement
      return {
        state: { ...state, tick, readings, anchors, alerts: [...fresh, ...state.alerts], announcement },
        undo: { type: 'restore', alerts: [] },
        changed: fresh.length,
      }
    }
    case 'setLive':
      return state.live === action.live ? noop(state) : { state: { ...state, live: action.live }, undo: { type: 'setLive', live: state.live }, changed: 1 }
    case 'assistant':
      return { state: { ...state, conversation: conversationReducer(state.conversation, action.action) }, undo: { type: 'restore', alerts: [] }, changed: 0 }
  }
}

export function consoleReducer(state: ConsoleState, action: ConsoleAction): ConsoleState {
  return applyAction(state, action).state
}

type ConsoleContextValue = {
  state: ConsoleState
  /** Applies the action and returns a function that undoes it, and how many records moved. */
  run: (action: ConsoleAction) => { undo: () => void; changed: number }
  /** Starts a script in the assistant (ignored while one is running or waiting on a decision). */
  startScript: (script: Script) => void
}

const ConsoleContext = createContext<ConsoleContextValue | null>(null)

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** How long before the next tick of the assistant's current step. */
function stepDelay(conv: Conversation, reduced: boolean): number {
  const step = currentStep(conv)
  if (!step) return 0
  switch (step.kind) {
    case 'user':
      return 150
    case 'say':
      return reduced ? 60 : 35
    case 'tool':
      return conv.run?.partId ? step.ms : 60
    default:
      return 0
  }
}

export function ConsoleProvider({
  children,
  initial,
  live: startLive,
}: {
  children: ReactNode
  initial?: () => ConsoleState
  /** Starts paused when false (tests). */
  live?: boolean
}) {
  const [state, setState] = useState<ConsoleState>(() => {
    const seed = (initial ?? initialState)()
    return startLive === undefined ? seed : { ...seed, live: startLive }
  })
  // The latest state, read synchronously, so two actions in one event each see the other's result.
  const current = useRef(state)
  current.current = state
  const { toast } = useToast()

  const run = useCallback((action: ConsoleAction) => {
    const result = applyAction(current.current, action)
    current.current = result.state
    setState(result.state)
    return {
      changed: result.changed,
      undo: () => {
        const back = applyAction(current.current, result.undo)
        current.current = back.state
        setState(back.state)
      },
    }
  }, [])

  const startScript = useCallback(
    (script: Script) => run({ type: 'assistant', action: { type: 'start', script, time: clockOf(current.current).label.slice(0, 5) } }),
    [run],
  )

  // The live feed: one tick every five seconds while live.
  useEffect(() => {
    if (!state.live) return
    const id = window.setInterval(() => run({ type: 'tick' }), TICK_MS)
    return () => window.clearInterval(id)
  }, [state.live, run])

  // The assistant's driver: schedules the next tick of the running script. An effect step (the
  // approved acknowledgement) runs here, against the store, with its toast and Undo.
  const conv = state.conversation
  const runKey = conv.run ? `${conv.run.status}:${conv.run.step}:${conv.run.chars}:${conv.run.partId ?? ''}:${conv.messages.length}` : ''
  useEffect(() => {
    if (conv.run?.status !== 'running') return
    const reduced = prefersReducedMotion()
    const step = currentStep(conv)
    const timer = window.setTimeout(() => {
      const time = clockOf(current.current).label.slice(0, 5)
      if (step?.kind === 'effect') {
        const result = run({ type: 'acknowledge', alertIds: [step.alertId], note: step.note, by: `${OPERATOR.name}, via the assistant` })
        if (result.changed) {
          const alert = current.current.alerts.find(a => a.id === step.alertId)
          toast({
            tone: 'ok',
            title: 'Alert acknowledged',
            description: alert ? `${alert.title}, ${siteById(alert.siteId)?.name ?? ''}` : undefined,
            action: { label: 'Undo', altText: 'Reopen it from the alert sheet.', onAction: result.undo },
          })
        }
      }
      run({ type: 'assistant', action: { type: 'tick', time, whole: reduced } })
    }, stepDelay(conv, reduced))
    return () => window.clearTimeout(timer)
    // runKey changes exactly when the run moves; `conv` is read from the render that changed it.
  }, [runKey, run, toast])

  const value = useMemo(() => ({ state, run, startScript }), [state, run, startScript])
  return <ConsoleContext.Provider value={value}>{children}</ConsoleContext.Provider>
}

export function useConsole(): ConsoleContextValue {
  const value = useContext(ConsoleContext)
  if (!value) throw new Error('useConsole() needs a <ConsoleProvider> above it (ConsoleLayout mounts one).')
  return value
}

/** Runs an alert change and confirms it in a toast with Undo. The toast is never the only record:
 *  the alert's status changes on the page the moment it runs. */
export function useAlertChange() {
  const { run, state } = useConsole()
  const { toast } = useToast()
  return useCallback(
    (action: Extract<ConsoleAction, { type: 'acknowledge' | 'resolve' }>) => {
      const result = run(action)
      if (!result.changed) return result
      const verb = action.type === 'acknowledge' ? 'acknowledged' : 'resolved'
      const one = result.changed === 1 ? state.alerts.find(a => a.id === action.alertIds[0]) : undefined
      toast({
        tone: 'ok',
        title: one ? `Alert ${verb}` : `${result.changed} alerts ${verb}`,
        description: one ? `${one.title}, ${siteById(one.siteId)?.name ?? ''}` : undefined,
        action: { label: 'Undo', altText: `Change it back from the alert sheet.`, onAction: result.undo },
      })
      return result
    },
    [run, toast, state.alerts],
  )
}
