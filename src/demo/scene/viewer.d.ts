/** The typed surface of viewer.js, written by hand like hero.d.ts: it is what lets
 *  `ProductMedia.tsx` import the one entry point. Keep it in step with `startViewer` in
 *  viewer.js; nothing checks the two against each other. */

export type ViewerState = {
  /** True once the shaders are warm and the first frames are drawn: the canvas may be shown. */
  ready: boolean
  /** 0 to 1, coarse: module fetched, geometry built, shaders compiled. */
  progress: number
  /** Set when the viewer failed to start or lost its WebGL context. The canvas is already gone
   *  (a failed start) or about to be (a lost context: call `dispose`). */
  error: string | null
}

export type ViewerControls = {
  /** Turn the view by this many degrees. Positive `az` turns the model's near side to the right;
   *  positive `el` raises the camera. Elevation is clamped to `VIEW_LIMITS.elMin` (products.js) and
   *  a ceiling of 40 degrees (`STAGE_EL_MAX` in viewer.js), lower than `VIEW_LIMITS.elMax`, because
   *  the model floats over a flat drawing of a plinth that does not tilt with it. */
  orbit(az: number, el: number): void
  /** Multiply the camera's distance: below 1 moves closer. Clamped to `VIEW_LIMITS` (products.js). */
  zoom(factor: number): void
  /** Back to the angle and distance the product's cutout was shot from. */
  reset(): void
  /** Stops the loop, removes the listeners and the canvas, and gives the WebGL context back. */
  dispose(): void
}

export type ViewerOptions = {
  /** The slow turn before the visitor first touches the model. Pass false under reduced motion.
   *  @default true */
  idle?: boolean
  /** Where the camera's full picture sits in the box, as fractions of the box: drawn at `scale`
   *  of its size with its top-left corner at (`left`, `top`). The product page passes the shop
   *  stage's cutout placement (`cutoutPlacement` in ProductStage.tsx), so the model lands where
   *  the cutout is. Omitted, the picture fills the box. */
  place?: { scale: number; left: number; top: number }
}

/**
 * Builds the product's model in `mount` (which must already have its size) and resolves once it
 * is ready or has failed. It never rejects for a scene failure: that arrives as `state.error`,
 * with a warning in the console and no error. Pointer and wheel input are handled inside; the
 * keyboard and the toolbar are the caller's, through the returned controls.
 */
export function startViewer(
  mount: HTMLElement,
  productId: string,
  onChange: (state: ViewerState) => void,
  signal?: AbortSignal,
  options?: ViewerOptions
): Promise<ViewerControls>
