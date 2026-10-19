/**
 * The render-loop backbone for anything that animates on a canvas. Today that is the
 * LoadingAnimation atom's three.js scene.
 *
 * Two rules: nothing runs while the tab is hidden, nothing runs while the element is
 * off screen. So at most one heavy effect animates at a time.
 */

export interface LoopHandle {
  start(): void
  stop(): void
  dispose(): void
  readonly running: boolean
}

interface LoopOptions {
  frame(dt: number): void
  el: Element
  threshold?: number
}

/** A long frame (tab wake, GC) must slow motion, not teleport it. */
const MAX_DT = 0.05

export function createLoop(opts: LoopOptions): LoopHandle {
  const { frame, el, threshold = 0.05 } = opts

  let raf = 0
  let last = 0
  // Optimistic: an IntersectionObserver that never fires must not strand the effect.
  let visible = true
  let wanted = false
  let disposed = false

  const tick = (now: number) => {
    if (disposed) return
    const dt = last === 0 ? 1 / 60 : Math.min((now - last) / 1000, MAX_DT)
    last = now
    frame(dt)
    // `frame` itself may call `stop()` from inside its own callback: `pause()` at that point cancels an id that has already fired, which does
    // nothing, so without this check the unconditional reschedule below would undo the stop on
    // the very same tick.
    if (!wanted || disposed) {
      raf = 0
      return
    }
    raf = requestAnimationFrame(tick)
  }

  const resume = () => {
    if (disposed || raf !== 0) return
    if (!wanted || !visible || document.hidden) return
    last = 0
    raf = requestAnimationFrame(tick)
  }

  const pause = () => {
    if (raf !== 0) cancelAnimationFrame(raf)
    raf = 0
  }

  const io = new IntersectionObserver(
    (entries) => {
      visible = entries.some((e) => e.isIntersecting)
      visible ? resume() : pause()
    },
    { threshold },
  )
  io.observe(el)

  const onVisibility = () => (document.hidden ? pause() : resume())
  document.addEventListener('visibilitychange', onVisibility)

  return {
    get running() {
      return raf !== 0
    },
    start() {
      wanted = true
      resume()
    },
    stop() {
      wanted = false
      pause()
    },
    dispose() {
      disposed = true
      pause()
      io.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    },
  }
}
