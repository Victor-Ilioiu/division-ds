/**
 * Should an effect run at all?
 *
 * Every effect has a static fallback that the component itself always renders as an
 * alternative — a still frame, a plain block. The effect enhances it; it never replaces
 * content that would otherwise be missing. A "no" here is the same page, still legible and
 * still usable. (This is a client-rendered app — `index.html` ships an empty `#root` — so the
 * fallback exists for a reader who has JS but not motion, not for a reader with no JS at all.)
 */

export function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

export function prefersSaveData(): boolean {
  const c = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
  return c?.saveData === true
}

/** `?fx=force` lets a reviewer see effects with OS reduced-motion on. Never overrides save-data. */
function forced(): boolean {
  try {
    return new URLSearchParams(location.search).get('fx') === 'force'
  } catch {
    return false
  }
}

/**
 * A data-saver user's bytes are never spent, even for a reviewer forcing effects —
 * save-data is checked before `?fx=force` and short-circuits it.
 */
export function motionAllowed(reduced = prefersReducedMotion()): boolean {
  if (prefersSaveData()) return false
  if (forced()) return true
  return !reduced
}

export function onReducedMotionChange(fn: (reduced: boolean) => void): () => void {
  if (!window.matchMedia) return () => {}
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  const handler = (e: MediaQueryListEvent) => fn(e.matches)
  mq.addEventListener('change', handler)
  return () => mq.removeEventListener('change', handler)
}
