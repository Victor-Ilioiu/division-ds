/**
 * The three loader dials. Each builder lays its elements out once, through the kit, and returns
 * `update(t)`: a pure function of seconds since mount that poses every moving part. Nothing reads
 * the previous frame, so any moment can be reproduced from `t` alone (the reduced-motion still
 * frame is exactly that, one call at a fixed `t`).
 *
 * Shared grammar, so the three read as one family:
 *   - Everything draws itself on at mount, outside in, as the system's draw-on motif (M2) does
 *     for a hairline. `delay` staggers the layers.
 *   - Two tempos. Continuous drift for the structure, and an indexed snap (`stepped`) for the one
 *     mechanism in each dial that "clicks" to its next detent on `--ease-snap`.
 *   - One accent element per dial, and it is always the one reporting progress. Greys do the rest.
 *
 * Angles are radians, counter-clockwise from 3 o'clock; clockwise motion is negative. Radii are
 * dial units, 1 at the outer edge.
 */

import { TAU, breathe, polar, stepped, type Kit } from './kit'

export type LoaderVariant = 'aperture' | 'gyro' | 'reticle'
type Builder = (kit: Kit) => (t: number) => void

const TOP = Math.PI / 2

/**
 * Aperture. A tick crown, a heavy outer ring carrying the progress arc, and five shaded blades that
 * index round one detent at a time around a spinning segmented core, like a lens stopping down.
 */
const aperture: Builder = k => {
  // Crown: 72 fine ticks, and every sixth a longer one. The accent arc's head lights the ticks it
  // passes, so the crown reads the sweep instead of ignoring it.
  k.layer(0)
  const crown = k.band({ r: 0.958, w: 0.045, role: 'dim', count: 72, duty: 0.2, head: { role: 'accent', width: 0.32 } })
  k.band({ r: 0.95, w: 0.065, role: 'mid', count: 12, duty: 0.035 })
  k.band({ r: 0.905, w: k.px(2), role: 'mid', delay: 0.05 })

  // Progress track: a faint hairline, grey segments drifting one way, the accent arc sweeping the
  // other and breathing as it goes.
  k.layer(0.03)
  k.band({ r: 0.868, w: k.px(1), role: 'faint', delay: 0.1 })
  const drift = k.node()
  k.band({ r: 0.868, w: k.px(5), role: 'faint', start: -0.45, length: 1.05, parent: drift, delay: 0.12 })
  k.band({ r: 0.868, w: k.px(5), role: 'dim', start: 3.5, length: 0.8, parent: drift, delay: 0.14 })
  const sweep = k.band({ r: 0.868, w: k.px(5), role: 'accent', delay: 0.1 })

  k.layer(0.05)
  const guides = k.node()
  for (const [start, length] of [[2.3, 1.25], [4.05, 0.85], [5.25, 0.5]] as const) {
    k.band({ r: 0.83, w: k.px(1), role: 'dim', start, length, parent: guides, delay: 0.16 })
  }
  const orbit = k.node()
  k.dot(...polar(0.775, 1.0), k.px(2.5), 'bright', { parent: orbit, delay: 0.3 })
  k.dot(...polar(0.775, -1.62), k.px(2), 'bright', { parent: orbit, delay: 0.34 })
  k.circle(...polar(0.775, 3.35), k.px(3.5), k.px(1), 'mid', { parent: orbit, delay: 0.38 })

  k.layer(0.08)
  k.band({ r: 0.645, w: k.px(1.5), role: 'mid', delay: 0.18 })
  k.band({ r: 0.615, w: k.px(1), role: 'faint', delay: 0.2 })

  // Blades: a lit sector fading along its sweep, and a fan of hairline stripes whose starts step
  // back from ring to ring.
  k.layer(0.11)
  const blades = k.node()
  const bladeSpan = TAU / 5 - 0.09
  for (let i = 0; i < 5; i++) {
    const start = (i * TAU) / 5
    k.band({ r: 0.39, w: 0.38, role: 'bright', start, length: bladeSpan, fade: 1, opacity: 0.14, parent: blades, delay: 0.25 + i * 0.04 })
    for (let j = 0; j < 6; j++) {
      const offset = 0.34 - j * 0.055
      k.band({
        r: 0.3 + j * 0.048,
        w: k.px(1),
        role: 'dim',
        start: start + offset,
        length: bladeSpan - offset - 0.03,
        parent: blades,
        delay: 0.3 + i * 0.04 + j * 0.02,
      })
    }
  }

  k.layer(0.15)
  const core = k.node()
  const coreRoles = ['bright', 'dim', 'mid', 'bright', 'faint'] as const
  coreRoles.forEach((role, i) =>
    k.band({ r: 0.155, w: 0.055, role, start: (i * TAU) / 5, length: TAU / 5 - 0.16, parent: core, delay: 0.4 + i * 0.03 })
  )
  k.band({ r: 0.215, w: k.px(1), role: 'faint', delay: 0.42 })

  return t => {
    // Clockwise sweep. Moving clockwise, the leading end is the window's start (its lowest angle),
    // so the head is `start` and the arc trails counter-clockwise behind it, stretching and
    // shortening every 2.2s. The crown lights at the head, ahead of the arc, never at its tail.
    const head = TOP - t * 1.35
    sweep.length = breathe(t, 0.55, 1.9, 2.2)
    sweep.start = head
    crown.head = head
    drift.rotation.z = t * 0.16
    guides.rotation.z = -t * 0.07
    orbit.rotation.z = t * 0.28
    // One blade width per detent, every 1.8s, plus a slow creep so the blades never fully rest.
    blades.rotation.z = -stepped(t, 1.8, 0.55, TAU / 5) - t * 0.06
    core.rotation.z = t * 1.7
  }
}

/**
 * Gyro. Nested thick rings turning against each other, thin orbit arcs that carry a bead at each
 * end and stretch as they run, and a dotted trace chasing round the lower half.
 */
const gyro: Builder = k => {
  k.layer(0)
  const outer = k.node()
  k.band({ r: 0.93, w: k.px(1), role: 'faint', start: 1.9, length: 2.5, parent: outer })
  k.band({ r: 0.93, w: k.px(1), role: 'faint', start: 5.0, length: 0.9, parent: outer, delay: 0.04 })

  // Long orbit arc on the right, bead at its leading end. The bead rides a node rotated to the
  // arc's end, so it moves by rotation and never by a per-frame position write.
  k.layer(0.02)
  const arcC = k.band({ r: 0.86, w: k.px(1), role: 'mid', delay: 0.06 })
  const beadC = k.node()
  k.dot(0.86, 0, k.px(2.5), 'mid', { parent: beadC, delay: 0.3 })

  const trace = k.band({ r: 0.79, w: k.px(2.2), role: 'bright', count: 90, duty: 0.4, opacity: 0.8, delay: 0.1 })

  k.layer(0.05)
  const arcA = k.band({ r: 0.72, w: k.px(1.5), role: 'bright', delay: 0.12 })
  const beadA1 = k.node()
  const beadA2 = k.node()
  k.dot(0.72, 0, k.px(3), 'bright', { parent: beadA1, delay: 0.35 })
  k.dot(0.72, 0, k.px(3), 'bright', { parent: beadA2, delay: 0.35 })

  const arcB = k.band({ r: 0.665, w: k.px(1), role: 'mid', delay: 0.14 })
  const beadB = k.node()
  k.dot(0.665, 0, k.px(2.5), 'mid', { parent: beadB, delay: 0.38 })

  // Middle ring: a faint full band, three grey segments and the accent segment, all turning
  // together counter-clockwise, with the spokes fixed to it.
  k.layer(0.08)
  const middle = k.node()
  k.band({ r: 0.59, w: 0.055, role: 'faint', opacity: 0.6, parent: middle, delay: 0.16 })
  k.band({ r: 0.59, w: 0.055, role: 'mid', start: 2.2, length: 0.85, parent: middle, delay: 0.2 })
  k.band({ r: 0.59, w: 0.055, role: 'dim', start: 3.15, length: 1.0, parent: middle, delay: 0.22 })
  k.band({ r: 0.59, w: 0.055, role: 'accent', start: 0.35, length: 1.15, parent: middle, delay: 0.18 })
  k.line(...polar(0.41, 0.52), ...polar(0.86, 0.52), k.px(1), 'mid', { parent: middle, delay: 0.3 })
  k.line(...polar(0.41, -TOP), ...polar(0.97, -TOP), k.px(1), 'faint', { parent: middle, delay: 0.32 })
  k.line(...polar(0.62, 2.62), ...polar(0.74, 2.62), k.px(1), 'mid', { parent: middle, delay: 0.34 })
  k.dot(...polar(0.745, 2.62), k.px(2.5), 'mid', { parent: middle, delay: 0.4 })

  // Inner segmented ring: eight thick blocks, two lit, turning clockwise on an indexed step.
  k.layer(0.12)
  const inner = k.node()
  const innerRoles = ['faint', 'bright', 'faint', 'faint', 'faint', 'bright', 'faint', 'dim'] as const
  innerRoles.forEach((role, i) =>
    k.band({ r: 0.35, w: 0.09, role, start: (i * TAU) / 8, length: TAU / 8 - 0.05, parent: inner, delay: 0.24 + i * 0.03 })
  )
  k.band({ r: 0.275, w: k.px(1), role: 'faint', delay: 0.3 })

  return t => {
    outer.rotation.z = t * 0.1
    arcC.length = 1.9
    arcC.start = -0.75 - t * 0.28
    beadC.rotation.z = arcC.start + arcC.length

    trace.length = 1.9
    trace.start = 3.3 - t * 0.8

    // The bright orbit stretches and contracts as it runs clockwise, a bead pinned to each end.
    arcA.length = breathe(t, 0.7, 1.7, 2.4)
    arcA.start = 0.3 - t * 0.75
    beadA1.rotation.z = arcA.start
    beadA2.rotation.z = arcA.start + arcA.length

    arcB.length = 0.9
    arcB.start = 1.75 + t * 0.6
    beadB.rotation.z = arcB.start + arcB.length

    middle.rotation.z = t * 0.45
    inner.rotation.z = -stepped(t, 1.5, 0.5, TAU / 8) - t * 0.35
  }
}

/**
 * Reticle. A fine double outer ring with orbiting markers, a progress arc that fills clockwise from
 * the 12 o'clock marker and then drains after itself, and an inner bezel whose bright arc clicks a
 * quarter turn at a time over dim, slowly turning blades.
 */
const reticle: Builder = k => {
  k.layer(0)
  k.band({ r: 0.975, w: k.px(1), role: 'mid' })
  const dashes = k.band({ r: 0.943, w: k.px(2.5), role: 'faint', count: 160, duty: 0.35, delay: 0.04 })
  k.band({ r: 0.9, w: k.px(1.5), role: 'mid', delay: 0.06 })

  k.layer(0.02)
  const progress = k.band({ r: 0.9, w: k.px(3.5), role: 'accent', delay: 0.1 })
  const tip = k.node()
  k.dot(0.9, 0, k.px(3), 'accent', { parent: tip, delay: 0.4 })

  // Fixed markers at 12, 3 and 6 o'clock.
  k.circle(0, 0.9, k.px(4), k.px(1), 'bright', { delay: 0.2 })
  k.circle(0, 0.9, k.px(9), k.px(1), 'faint', { count: 16, duty: 0.5, delay: 0.24 })
  k.line(0, 0.83, 0, 0.975, k.px(1), 'bright', { delay: 0.2 })
  k.circle(0.9, 0, k.px(3), k.px(1), 'mid', { delay: 0.26 })
  k.line(0.85, 0, 1.0, 0, k.px(1), 'mid', { delay: 0.26 })
  k.circle(0, -0.9, k.px(3), k.px(1), 'mid', { delay: 0.28 })
  k.circle(0, -0.9, k.px(9), k.px(1), 'faint', { count: 16, duty: 0.5, delay: 0.3 })

  k.layer(0.05)
  const satellites = k.node()
  k.circle(...polar(0.8, 3.55), 0.075, k.px(1), 'mid', { parent: satellites, delay: 0.3 })
  k.circle(...polar(0.8, 0.45), 0.06, k.px(1), 'faint', { parent: satellites, delay: 0.32 })
  k.dot(...polar(0.83, 2.62), k.px(2.5), 'bright', { parent: satellites, delay: 0.34 })
  ;[
    [3.86, 2],
    [3.93, 1.6],
    [4.0, 1.2],
  ].forEach(([angle, size], i) => k.dot(...polar(0.8, angle), k.px(size), 'mid', { parent: satellites, delay: 0.36 + i * 0.03 }))
  k.circle(...polar(0.8, -0.95), k.px(2.5), k.px(1), 'mid', { parent: satellites, delay: 0.42 })

  k.layer(0.08)
  k.band({ r: 0.63, w: k.px(1.5), role: 'mid', delay: 0.14 })
  k.band({ r: 0.6, w: k.px(1), role: 'faint', delay: 0.16 })
  const bezel = k.band({ r: 0.574, w: k.px(4), role: 'bright', start: TOP - 0.55, length: 1.1, delay: 0.22 })
  const brackets = k.node()
  k.band({ r: 0.556, w: k.px(1.5), role: 'mid', start: Math.PI - 0.35, length: 0.7, parent: brackets, delay: 0.24 })
  k.band({ r: 0.556, w: k.px(1.5), role: 'mid', start: -0.35, length: 0.7, parent: brackets, delay: 0.24 })
  k.band({ r: 0.574, w: k.px(1), role: 'dim', start: -TOP - 0.4, length: 0.8, delay: 0.26 })

  k.layer(0.11)
  const blades = k.node()
  for (let i = 0; i < 5; i++) {
    k.band({ r: 0.31, w: 0.38, role: 'bright', start: (i * TAU) / 5, length: TAU / 5 - 0.1, fade: 1, opacity: 0.1, parent: blades, delay: 0.3 + i * 0.04 })
  }

  const CYCLE = 2.6
  const FILL = 0.6
  return t => {
    dashes.start = -t * 0.05
    // Fill clockwise from 12 o'clock, then drain after itself: the tail chases the head round.
    const p = (t % CYCLE) / CYCLE
    if (p < FILL) {
      progress.length = Math.max(1e-3, stepEase(p / FILL) * TAU)
      progress.start = TOP - progress.length
      tip.rotation.z = progress.start
    } else {
      progress.length = Math.max(1e-3, (1 - stepEase((p - FILL) / (1 - FILL))) * TAU)
      progress.start = TOP - TAU
      tip.rotation.z = progress.start + progress.length
    }
    satellites.rotation.z = t * 0.12
    bezel.start = TOP - 0.55 + stepped(t, 1.4, 0.45, TAU / 4)
    brackets.rotation.z = -t * 0.3
    blades.rotation.z = -t * 0.2
  }
}

/** Smoothstep: the progress fill eases in and out of each phase, so the turn at full is a pause. */
function stepEase(x: number): number {
  const c = Math.min(1, Math.max(0, x))
  return c * c * (3 - 2 * c)
}

export const LOADER_VARIANTS: Record<LoaderVariant, Builder> = { aperture, gyro, reticle }
