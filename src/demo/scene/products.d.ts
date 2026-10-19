/** The typed surface of products.js, written by hand like hero.d.ts. `products.test.ts` checks
 *  the table itself (every catalogue product has a row, every row's module exists); nothing
 *  checks this file against the JavaScript beside it. */

export type ProductModel = {
  /** A module name under ./models, without `.js`. */
  model: string
  /** What the module's `create()` is called with. */
  options?: { variant?: string; lying?: boolean; weight?: string }
  /** Camera azimuth in degrees, measured from +X toward +Z. */
  az: number
  /** Camera elevation in degrees. */
  el: number
  /** Scales the distance at which the model just fits the frame. Below 1 is closer. */
  zoom: number
}

export const PRODUCT_STAGE: {
  /** Six hex digits, no `#`. */
  background: string
  spotlight: string
  fov: number
  aspect: number
}

/** The live viewer's limits. Elevation in degrees, zoom as a multiple of the fit distance. */
export const VIEW_LIMITS: { elMin: number; elMax: number; zoomMin: number; zoomMax: number }

export const PRODUCT_MODELS: Record<string, ProductModel>

export function productModel(id: string): ProductModel | undefined
