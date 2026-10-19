/**
 * Device tiering for canvas effects. Crude, stable signals read once and cached —
 * not a benchmark loop, which would cost the first frames of the effect it is tuning.
 */

export type Tier = 1 | 2 | 3

type NavigatorWithHints = Navigator & { deviceMemory?: number }

let cached: Tier | null = null

export function tier(): Tier {
  if (cached !== null) return cached
  const nav = navigator as NavigatorWithHints
  const mem = nav.deviceMemory ?? 4
  const cores = navigator.hardwareConcurrency ?? 4
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false
  const narrow = window.innerWidth < 768
  if (coarse || narrow || mem <= 4) cached = 1
  else if (mem >= 8 && cores >= 8) cached = 3
  else cached = 2
  return cached
}

/** Cap device pixel ratio: the cheapest single performance lever. */
export function dprCap(max = 2): number {
  const cap = tier() === 1 ? 1.5 : max
  return Math.min(window.devicePixelRatio || 1, cap)
}
