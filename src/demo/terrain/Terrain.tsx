import { useEffect, useRef, useState } from 'react'
import { motionAllowed, onReducedMotionChange } from '../../fx/core/gate'
import { dprCap } from '../../fx/core/quality'
import { cn } from '../../lib/cn'
import { drawStill, readTerrainPalette } from './field'

/** How close to the viewport the stage has to be before three.js is asked for. */
const NEAR = '300px 0px'

/**
 * The terrain at the foot of the Hexline demo: a wide plane of orange dots joined by thin lines,
 * seen from just above it, rolling slowly in hills and valleys and dissolving into the page
 * toward the horizon. It is passed to the Footer's `backdrop` slot, which lays it edge to edge
 * behind the wordmark.
 *
 * **Decoration, and nothing else.** `aria-hidden`, not focusable, and it takes no input at all:
 * the pointer passes through it (`pointer-events: none`), so there is nothing for a keyboard to
 * be missing.
 *
 * **Two layers.** A still, drawn on a 2D canvas when this mounts, with no WebGL and no three.js.
 * And the live scene, which replaces the still once three.js has loaded, starting on the frame
 * the still shows. The still is all there is under reduced motion or save-data
 * (`motionAllowed()`), and it is what stays if the scene's chunk fails to load, the scene fails
 * to start or the browser takes the context away.
 *
 * **Lazy.** Nothing of three.js is requested until the stage is within 300px of the viewport,
 * and then only through `import('./scene')`. `hold` postpones even that: while a routed page is
 * still loading, `<main>` is exactly its one-screen floor, which puts the Footer right at the
 * fold, inside that 300px, for a moment on a page whose Footer is really three screens down.
 * `DemoLayout` holds the terrain for that moment.
 *
 * **Never the reason the page moves.** It fills a stage whose size the Footer fixes in CSS,
 * before any of this runs.
 *
 * Render it only where WebGL2 exists (`hasWebGL2()`); `DemoLayout` does. Without WebGL2 the demo
 * passes no backdrop and the Footer closes on its wordmark alone.
 */
export function Terrain({ hold = false }: { hold?: boolean }) {
  const stage = useRef<HTMLDivElement>(null)
  const still = useRef<HTMLCanvasElement>(null)
  const [allowed, setAllowed] = useState(() => motionAllowed())
  const [failed, setFailed] = useState(false)
  const [live, setLive] = useState(false)

  useEffect(() => onReducedMotionChange(reduced => setAllowed(motionAllowed(reduced))), [])

  // The still. Repainted when the stage changes size and when the theme flips; it stays painted
  // under the live canvas, so a lost context falls back to it with nothing to wait for.
  useEffect(() => {
    const host = stage.current
    const canvas = still.current
    if (!host || !canvas || typeof ResizeObserver === 'undefined') return
    const paint = () => {
      const ctx = canvas.getContext('2d')
      if (!host.clientWidth || !host.clientHeight || !ctx) return
      const dpr = dprCap()
      canvas.width = Math.round(host.clientWidth * dpr)
      canvas.height = Math.round(host.clientHeight * dpr)
      drawStill(ctx, canvas.width, canvas.height, dpr, readTerrainPalette(host))
    }
    paint()
    const sizes = new ResizeObserver(paint)
    sizes.observe(host)
    const themes = new MutationObserver(paint)
    themes.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => {
      sizes.disconnect()
      themes.disconnect()
    }
  }, [])

  // `hold` postpones the start and nothing else: a scene that is already running is not torn
  // down because a later page shows its loading line.
  const waiting = hold && !live

  // The live scene.
  useEffect(() => {
    const host = stage.current
    if (!allowed || failed || waiting || !host || typeof IntersectionObserver === 'undefined') return
    let cancelled = false
    let canvas: HTMLCanvasElement | undefined
    let dispose: (() => void) | undefined
    let sizes: ResizeObserver | undefined

    const start = () => {
      import('./scene')
        .then(({ mountTerrain }) => {
          if (cancelled) return
          // Created here, not in JSX: a disposed renderer loses its context for good, so every
          // mount (Strict Mode's replay included) needs a canvas of its own.
          canvas = document.createElement('canvas')
          canvas.dataset.terrainCanvas = 'live'
          canvas.className = 'absolute inset-0 block size-full'
          host.appendChild(canvas)
          const handle = mountTerrain(canvas, {
            width: host.clientWidth,
            height: host.clientHeight,
            readPalette: () => readTerrainPalette(host),
            onLost: () => setFailed(true),
          })
          dispose = handle.dispose
          sizes = new ResizeObserver(() => handle.resize(host.clientWidth, host.clientHeight))
          sizes.observe(host)
          setLive(true)
        })
        .catch(() => {
          // No chunk, or no context: the still is already there, and it stays.
          canvas?.remove()
          if (!cancelled) setFailed(true)
        })
    }

    const near = new IntersectionObserver(
      entries => {
        if (!entries.some(entry => entry.isIntersecting)) return
        near.disconnect()
        start()
      },
      { rootMargin: NEAR }
    )
    near.observe(host)

    return () => {
      cancelled = true
      near.disconnect()
      sizes?.disconnect()
      dispose?.()
      canvas?.remove()
      setLive(false)
    }
  }, [allowed, failed, waiting])

  return (
    <div
      ref={stage}
      aria-hidden="true"
      data-terrain={live ? 'live' : 'still'}
      className="pointer-events-none absolute inset-0"
    >
      <canvas ref={still} data-terrain-canvas="still" className={cn('absolute inset-0 block size-full', live && 'invisible')} />
    </div>
  )
}
