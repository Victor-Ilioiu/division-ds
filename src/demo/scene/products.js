// Which 3D model each catalogue product is, and how it is shown: the one table both pictures of
// a product come from.
//
//   - `spike/tools/renders.mjs` reads it to shoot the product's photo
//     (public/media/products/<id>.webp, what the cards and the product page show).
//   - `./viewer.js` reads it to build the live, rotatable model on the product page.
//
// Same model module, same options, same stage and the same starting camera, so the photo and the
// live model cannot disagree, and the swap from one to the other on the product page lands on
// the same framing.
//
// Plain data on purpose. This file imports nothing: it is read by Node (the renders script), by
// the product page (statically, to know a product has a model at all) and by the viewer. An
// import of three.js here would put the renderer in the product page's chunk; `products.test.ts`
// fails if an import statement appears.
//
// Ids are the catalogue's (../store/catalog.ts). `products.test.ts` fails for a catalogue product
// with no row, for a row with no product, and for a `model` with no module under ./models.

/** The studio every product is shown in. The photo and the live viewer both use these values. */
export const PRODUCT_STAGE = {
  /** The backdrop's colour at its edges, as six hex digits. Also the colour behind the photo
   *  while it loads, so it is the one a flat fallback would use. */
  background: '14171c',
  /** The backdrop's colour where the light falls, behind and a little above the product. The
   *  studio paints a soft pool of this fading out to `background` (see `studioBackdrop` in
   *  ./lib/studio.js), so a dark product has a lighter field to stand against. */
  spotlight: '465062',
  /** Vertical field of view of the camera, in degrees. */
  fov: 28,
  /** Width over height of the picture: the card's and the product page's box. */
  aspect: 4 / 3,
}

/**
 * How far the live viewer lets the view go. Elevation in degrees: the floor is just above the
 * ground plane, because the ground only shows a shadow from above and the model would seem to
 * lose it; the ceiling stops short of straight down, where a turn becomes a roll. Zoom is a
 * multiple of the distance at which the model just fits the box, like a row's own `zoom`: the
 * near limit keeps the camera outside the model. `products.test.ts` fails for a row whose
 * starting camera lies outside these, since the viewer would open somewhere other than the photo.
 */
export const VIEW_LIMITS = { elMin: 3, elMax: 80, zoomMin: 0.45, zoomMax: 1.6 }

/**
 * id -> the model, its options, and the starting camera.
 *
 * `model` is a module name under ./models (without `.js`); `options` is what its `create()` is
 * called with (`variant` for the Kestrel family and the magazines, `lying` for the bottle on its
 * side, `weight` for the BB weight its label prints). `az` and `el` are the camera's azimuth and elevation in degrees (azimuth is measured
 * from +X toward +Z; a replica's muzzle points +X). `zoom` scales the distance at which the
 * model's bounding sphere just fits the frame: below 1 is closer.
 */
export const PRODUCT_MODELS = {
  'kestrel-c': { model: 'rifle', options: { variant: 'c' }, az: -70, el: 14, zoom: 0.84 },
  'kestrel-l': { model: 'rifle', options: { variant: 'l' }, az: -70, el: 14, zoom: 0.82 },
  'kestrel-k': { model: 'rifle', options: { variant: 'k' }, az: -65, el: 14, zoom: 0.91 },
  'harrier-lr': { model: 'harrier', az: -68, el: 12, zoom: 0.8 },
  'kestrel-c-kit': { model: 'kestrel-c-kit', az: -68, el: 14, zoom: 1.03 },
  'halo-tube-sight': { model: 'red-dot', az: -55, el: 16, zoom: 0.96 },
  'prism-holo-sight': { model: 'holo-sight', az: -125, el: 16, zoom: 0.96 },
  'bbs-028': { model: 'bb-bottle', az: 62, el: 12, zoom: 1.32 },
  'bbs-025': { model: 'bb-bottle', options: { lying: true, weight: '0.25' }, az: 20, el: 24, zoom: 1.02 },
  'green-gas': { model: 'gas-canister', az: 25, el: 10, zoom: 1.34 },
  'mute-235': { model: 'suppressor', az: -55, el: 16, zoom: 1.02 },
  'camo-foregrip': { model: 'foregrip', az: -55, el: 12, zoom: 1.32 },
  'beam-600': { model: 'tac-light', az: -55, el: 16, zoom: 0.96 },
  'magazine-smoke': { model: 'magazine', options: { variant: 'smoke' }, az: -60, el: 12, zoom: 1.34 },
  'magazine-amber': { model: 'magazine', options: { variant: 'accent' }, az: -60, el: 12, zoom: 1.34 },
  'stick-battery': { model: 'battery', az: 65, el: 32, zoom: 0.9 },
  'balance-charger': { model: 'charger', az: -50, el: 30, zoom: 0.96 },
  'speed-loader': { model: 'speed-loader', az: 60, el: 26, zoom: 1.08 },
  'field-goggles': { model: 'goggles', az: 35, el: 14, zoom: 0.94 },
  'bump-helmet': { model: 'helmet', az: 40, el: 14, zoom: 0.98 },
  'knee-pads': { model: 'knee-pads', az: 30, el: 12, zoom: 1.02 },
  'dummy-radio': { model: 'radio', az: 35, el: 10, zoom: 1.32 },
}

/** The row for a product id, or undefined when the product has no model. */
export function productModel(id) {
  return Object.hasOwn(PRODUCT_MODELS, id) ? PRODUCT_MODELS[id] : undefined
}
