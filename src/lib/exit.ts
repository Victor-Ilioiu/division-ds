import { readCssVar } from './tokens-runtime'

/**
 * The JavaScript half of M7 (motion.css, "M7 exits"): the exits whose second act is layout, which
 * a CSS keyframe on the leaving element cannot do on its own.
 *
 * - `exitTag`: the tag fades and shrinks in place; once it is gone, its neighbours slide from
 *   where they stood into the space it left (`slideIntoPlace`, a FLIP run by each neighbour).
 * - `exitAlert`: the alert fades, then its height collapses so the content below rises into its
 *   place instead of jumping.
 *
 * Both run on the Web Animations API and read the motion tokens at the moment they run, so a
 * changed token changes them too. Where nothing can animate -- reduced motion, or an environment
 * with no `Element.animate` (jsdom) -- `onDone` runs at once, so a dismiss never waits on a
 * motion that will not play.
 */

export function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function canAnimate(el: HTMLElement | null): el is HTMLElement {
  return !!el && typeof el.animate === 'function' && !prefersReducedMotion()
}

function ms(token: string, fallback: number): number {
  const value = Number.parseFloat(readCssVar(token))
  return Number.isFinite(value) ? value : fallback
}

function ease(token: string, fallback: string): string {
  return readCssVar(token) || fallback
}

const SNAP = 'cubic-bezier(0.2, 0.8, 0.2, 1)'
const ACCELERATE = 'cubic-bezier(0.4, 0, 1, 1)'

/** Where each sibling stood when an exit finished, per parent. Read once by `slideIntoPlace` in
 *  the render that removes the leaving element; anything older than `STALE_MS` is ignored, so a
 *  snapshot that was never consumed (the parent kept the element) cannot fire on a later,
 *  unrelated render. */
const snapshots = new WeakMap<Element, { at: number; positions: Map<Element, { x: number; y: number }> }>()
const STALE_MS = 1000

function snapshotSiblings(el: HTMLElement) {
  const parent = el.parentElement
  if (!parent) return
  const positions = new Map<Element, { x: number; y: number }>()
  for (const child of Array.from(parent.children)) {
    if (child !== el && child instanceof HTMLElement) {
      positions.set(child, { x: child.offsetLeft, y: child.offsetTop })
    }
  }
  snapshots.set(parent, { at: performance.now(), positions })
}

/**
 * FLIP for a sibling of an element that just left: called from the sibling's own layout effect,
 * after the render that removed the leaver. If the sibling moved, it is put back where it stood and
 * slid to where it now is. Offsets, not client rects, so a page scroll in between is not a move.
 */
export function slideIntoPlace(el: HTMLElement | null) {
  const parent = el?.parentElement
  if (!el || !parent) return
  const snapshot = snapshots.get(parent)
  const from = snapshot?.positions.get(el)
  if (!snapshot || !from) return
  snapshot.positions.delete(el)
  if (performance.now() - snapshot.at > STALE_MS || !canAnimate(el)) return
  const dx = from.x - el.offsetLeft
  const dy = from.y - el.offsetTop
  if (dx === 0 && dy === 0) return
  el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], {
    duration: ms('--duration-base', 180),
    easing: ease('--ease-snap', SNAP),
  })
}

/** Holds the final frame until the parent removes the element. If the parent keeps it (a
 *  controlled list that ignored the dismiss), the element comes back on the next frame rather than
 *  staying invisible and still focusable. */
function releaseIfKept(el: HTMLElement, animations: Animation[]) {
  requestAnimationFrame(() => {
    if (el.isConnected) animations.forEach(animation => animation.cancel())
  })
}

export function exitTag(el: HTMLElement | null, onDone: () => void) {
  if (!canAnimate(el)) return onDone()
  const fade = el.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(0.85)' }], {
    duration: ms('--duration-fast', 120),
    easing: ease('--ease-accelerate', ACCELERATE),
    fill: 'forwards',
  })
  fade.onfinish = () => {
    snapshotSiblings(el)
    onDone()
    releaseIfKept(el, [fade])
  }
}

export function exitAlert(el: HTMLElement | null, onDone: () => void) {
  if (!canAnimate(el)) return onDone()
  const fade = el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-4px)' }], {
    duration: ms('--duration-fast', 120),
    easing: ease('--ease-accelerate', ACCELERATE),
    fill: 'forwards',
  })
  fade.onfinish = () => {
    const style = getComputedStyle(el)
    el.style.overflow = 'hidden'
    const collapse = el.animate(
      [
        {
          height: `${el.offsetHeight}px`,
          paddingTop: style.paddingTop,
          paddingBottom: style.paddingBottom,
          marginTop: style.marginTop,
          marginBottom: style.marginBottom,
          borderTopWidth: style.borderTopWidth,
          borderBottomWidth: style.borderBottomWidth,
        },
        {
          height: '0px',
          paddingTop: '0px',
          paddingBottom: '0px',
          marginTop: '0px',
          marginBottom: '0px',
          borderTopWidth: '0px',
          borderBottomWidth: '0px',
        },
      ],
      { duration: ms('--duration-base', 180), easing: ease('--ease-snap', SNAP), fill: 'forwards' }
    )
    collapse.onfinish = () => {
      onDone()
      requestAnimationFrame(() => {
        if (el.isConnected) {
          el.style.overflow = ''
          fade.cancel()
          collapse.cancel()
        }
      })
    }
  }
}
