import { useEffect, useState } from 'react'
import { prefersReducedMotion } from './exit'

export type StreamedTextOptions = {
  /** Words revealed per second. @default 14 */
  speed?: number
  /** Starts the reveal; set it back to false and the text is empty again. @default true */
  active?: boolean
}

export type StreamedText = {
  /** What has arrived so far. */
  text: string
  /** Still arriving: pass it to ChatMessage's `streaming`. */
  streaming: boolean
  /** Everything has arrived, or the reveal was stopped. */
  done: boolean
  /** Stopped before the end, by `stop()`. */
  stopped: boolean
  /** Freezes the text where it is, the way a Stop button ends a real stream. */
  stop: () => void
}

/**
 * A scripted reply for a demo or a docs example: reveals `text` a word at a time while `active`, so
 * a ChatThread can be shown streaming without a model behind it. Changing `text` or turning
 * `active` on again starts over.
 *
 * Under `prefers-reduced-motion` the whole text arrives at once: words appearing one by one are
 * motion, and a reader who asked for less of it gets the reply the moment it exists.
 */
export function useStreamedText(text: string, { speed = 14, active = true }: StreamedTextOptions = {}): StreamedText {
  const words = text.split(/(?<=\s)/)
  const source = `${active}\u0000${text}`
  // Reset during render when the source changes, rather than in an effect, so no frame ever shows
  // the previous reply's text under the new one.
  const [state, setState] = useState({ source, count: 0, stopped: false })
  if (state.source !== source) setState({ source, count: 0, stopped: false })
  const current = state.source === source ? state : { source, count: 0, stopped: false }

  const total = words.length
  const running = active && !current.stopped && current.count < total

  useEffect(() => {
    if (!running) return
    if (prefersReducedMotion()) {
      setState(value => (value.source === source ? { ...value, count: total } : value))
      return
    }
    const timer = window.setInterval(() => {
      setState(value => (value.source === source ? { ...value, count: Math.min(total, value.count + 1) } : value))
    }, 1000 / speed)
    return () => window.clearInterval(timer)
  }, [running, source, speed, total])

  return {
    text: active ? words.slice(0, current.count).join('') : '',
    streaming: running,
    done: active && (current.stopped || current.count >= total),
    stopped: current.stopped,
    stop: () => setState(value => (value.source === source ? { ...value, stopped: true } : value)),
  }
}
