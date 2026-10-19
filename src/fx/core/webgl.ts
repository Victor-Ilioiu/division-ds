/**
 * Can this page get a WebGL2 context at all?
 *
 * Asked once per page, on a throwaway canvas, and remembered: a context a three.js scene cannot
 * get is a context it will not try to use, and its static fallback renders instead. The probe's
 * own context is released straight away, because browsers cap how many a page may hold.
 *
 * Read by the `LoadingAnimation` atom and by the demo homepage's hero scene.
 */

let support: boolean | null = null

export function hasWebGL2(): boolean {
  if (support !== null) return support
  try {
    const probe = document.createElement('canvas')
    const gl = probe.getContext('webgl2')
    support = !!gl
    ;(gl as WebGL2RenderingContext | null)?.getExtension('WEBGL_lose_context')?.loseContext()
  } catch {
    support = false
  }
  return support
}
