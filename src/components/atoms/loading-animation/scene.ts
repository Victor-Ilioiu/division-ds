/**
 * The WebGL side of LoadingAnimation, and the only module that imports the renderer. The component
 * reaches it through a dynamic `import()`, so three.js is its own chunk: a page that never renders
 * a loader never downloads it.
 *
 * Built on the shared effects core (`src/fx/core`): `createLoop` pauses while
 * the tab is hidden or the dial is scrolled out of view, and `dprCap` caps the pixel ratio on a
 * low-tier device.
 */

import { PerspectiveCamera, Scene, WebGLRenderer } from 'three'
import { createLoop } from '../../../fx/core/loop'
import { dprCap } from '../../../fx/core/quality'
import { Kit } from './kit'
import type { Palette } from './palette'
import { LOADER_VARIANTS, type LoaderVariant } from './variants'

/** Half the visible height, in dial units: the dial's radius is 1, plus room for the sway. */
const EXTENT = 1.1
const FOV = 30

/** The pose shown as the still frame under reduced motion: every element drawn on, the progress
 *  arcs part-way round. Chosen by eye, and fixed, so the still frame is the same on every load. */
export const STILL_T = 4.2

export type MountOptions = {
  variant: LoaderVariant
  /** The dial's CSS size, which sets how wide a "1px" hairline is in dial units. */
  sizePx: number
  animate: boolean
  readPalette(): Palette
}

export function mountLoader(canvas: HTMLCanvasElement, opts: MountOptions): () => void {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' })
  renderer.setPixelRatio(dprCap())
  renderer.setSize(opts.sizePx, opts.sizePx, false)
  renderer.setClearColor(0x000000, 0)

  const camera = new PerspectiveCamera(FOV, 1, 0.1, 20)
  camera.position.z = EXTENT / Math.tan(((FOV / 2) * Math.PI) / 180)

  const kit = new Kit({ pxToWorld: (2 * EXTENT) / opts.sizePx, palette: opts.readPalette() })
  const update = LOADER_VARIANTS[opts.variant](kit)
  const scene = new Scene()
  scene.add(kit.group)

  const draw = (t: number, sway: boolean) => {
    update(t)
    kit.sync(t)
    // A slow two-axis sway, a few degrees at most: the layers sit at different depths, so the
    // sway is what reads as depth. Off in the still frame, which must be the dial face-on.
    kit.group.rotation.x = sway ? Math.sin(t * 0.7) * 0.09 : 0
    kit.group.rotation.y = sway ? Math.cos(t * 0.53) * 0.09 : 0
    renderer.render(scene, camera)
  }

  let t = 0
  const loop = createLoop({
    el: canvas,
    frame(dt) {
      t += dt
      draw(t, true)
    },
  })
  if (opts.animate) loop.start()
  else draw(STILL_T, false)

  // Colours only change when the theme does. Same trigger the signal grid listens to.
  const mo = new MutationObserver(() => {
    kit.setPalette(opts.readPalette())
    if (!opts.animate) draw(STILL_T, false)
  })
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

  return () => {
    mo.disconnect()
    loop.dispose()
    kit.dispose()
    renderer.dispose()
    // Browsers cap live WebGL contexts (Chrome at 16) and drop the oldest past it. A docs page that
    // mounts and unmounts loaders must hand each context back, not wait for garbage collection.
    renderer.forceContextLoss()
  }
}
