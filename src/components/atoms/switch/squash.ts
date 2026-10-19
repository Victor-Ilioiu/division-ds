import { motionAllowed } from '../../../fx/core/gate'
import { readCssVar } from '../../../lib/tokens-runtime'

/**
 * Squash and stretch for the Switch thumb, at its minimum: enough that the handle reads as an
 * object that arrives somewhere, and no more.
 *
 * The thumb's position is a CSS transition on the Radix Thumb (it arrives in `--duration-base`).
 * This runs beside it, on the thumb's inner body, and changes shape only:
 *
 *   it flies          slightly longer along the axis of travel, slightly thinner across it
 *   it hits the end   slightly compressed against the boundary, slightly taller across it
 *   it recovers       straight back to its own shape
 *
 * One give, no rebound. The first version overshot the other way and came back twice over
 * 480ms; on the owner's review that was "too bouncy", and a switch is flipped often enough that
 * anything which keeps moving after the state has landed reads as the control being unsure.
 *
 * Every keyframe scales about the LEADING edge (the right edge when turning on), so the stretch
 * leaves the trailing edge behind and the impact flattens the body against the wall it has just
 * reached. Nothing here can push the body past that edge: scaled about the edge it is touching,
 * it can only grow away from it.
 *
 * The two scales move in opposite directions, roughly preserving area, which is what stops it
 * reading as the thumb growing.
 *
 * There is no keyframe at offset 0. The animation starts from whatever the body's transform is at
 * that instant, so it cannot jump.
 */

type Frame = { offset: number; x: number; y: number }

/** The shape over time. `x` is along the travel, `y` across it. The thumb arrives at 0.5625 of
 *  the run (180ms of 320ms): the stretch peaks just before that, and the squash just after. */
export const SQUASH_FRAMES: readonly Frame[] = [
  { offset: 0.45, x: 1.1, y: 0.96 },
  { offset: 0.7, x: 0.92, y: 1.04 },
  { offset: 1, x: 1, y: 1 },
]

export function squashKeyframes(): Keyframe[] {
  return SQUASH_FRAMES.map(({ offset, x, y }) => ({
    offset,
    transform: `scale(${x}, ${y})`,
    // Between frames, not across the whole run: each change of shape eases in and out, which is
    // what keeps three frames from reading as three steps.
    easing: 'ease-in-out',
  }))
}

/** `320ms` -> 320. The token is read at the moment of the flip, so a retune in tokens/ needs no
 *  edit here; the fallback is for a test environment with no stylesheet. */
function settleDuration(): number {
  const value = parseFloat(readCssVar('--duration-slow'))
  return Number.isFinite(value) && value > 0 ? value : 320
}

/**
 * Plays the settle on the thumb's body. `checked` is the state it is travelling TO.
 *
 * Does nothing under reduced motion or save-data (the thumb still moves; it just keeps its
 * shape), and nothing where the Web Animations API is missing.
 */
export function playSquash(body: HTMLElement | null, checked: boolean): void {
  if (!body || typeof body.animate !== 'function' || !motionAllowed()) return
  body.style.transformOrigin = checked ? '100% 50%' : '0% 50%'
  // A second flip before the first has settled replaces it; two would fight over one transform.
  // Only this function's own animation is cancelled, by reference. `body.getAnimations()` also
  // returns the body's CSS transitions, and by the time `onCheckedChange` fires the colour fade
  // has already started: cancelling everything killed the fade on its first frame, and the thumb
  // changed colour in one step.
  running.get(body)?.cancel()
  running.set(body, body.animate(squashKeyframes(), { duration: settleDuration() }))
}

const running = new WeakMap<HTMLElement, Animation>()
