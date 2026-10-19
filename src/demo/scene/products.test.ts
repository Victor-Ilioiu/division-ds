import { describe, expect, it } from 'vitest'
import { sourceFiles } from '../../../scripts/lib/read-source-files.mjs'
import { CATALOG } from '../store/catalog'
import { PRODUCT_MODELS, PRODUCT_STAGE, VIEW_LIMITS, productModel } from './products.js'

/**
 * `products.js` is the one table that says which 3D model a catalogue product is and where the
 * camera starts. The renders script shoots every product photo from it and the product page's
 * live viewer builds the model from it, so a row that is missing, stale or wrong shows up as a
 * product with no photo, no 3D view, or a 3D view of something else. These tests are what makes
 * "one source of truth" a gate and not a sentence.
 */

/** The model modules on disk, as names: a real directory read, not a list somebody keeps. */
const MODULES = sourceFiles(['src/demo/scene/models'], /\.js$/).map(file => file.path.replace(/^.*\/|\.js$/g, ''))

describe('the product-to-model table', () => {
  // Mutation: delete the `dummy-radio` row from products.js -> fails, naming that id.
  it('has a row for every catalogue product', () => {
    expect(CATALOG.length).toBeGreaterThan(0)
    for (const product of CATALOG) {
      expect(productModel(product.id), `${product.id} has no row in scene/products.js`).toBeDefined()
    }
  })

  // The other direction: a row left behind by a product that was renamed or removed would be
  // rendered to a photo no card ever shows.
  // Mutation: add a row `'ghost': { model: 'radio', az: 0, el: 10, zoom: 1 }` -> fails, naming it.
  it('has no row that is not a catalogue product', () => {
    const ids = CATALOG.map(product => product.id)
    for (const id of Object.keys(PRODUCT_MODELS)) expect(ids, `"${id}" is in scene/products.js and not in the catalogue`).toContain(id)
    expect(Object.keys(PRODUCT_MODELS)).toHaveLength(CATALOG.length)
  })

  // Mutation: change `model: 'radio'` to `model: 'radios'` -> fails, naming the product and the
  // module it asked for.
  it('names, in every row, a model module that exists under scene/models', () => {
    expect(MODULES.length).toBeGreaterThan(0)
    for (const [id, row] of Object.entries(PRODUCT_MODELS)) {
      expect(MODULES, `${id}: src/demo/scene/models/${row.model}.js does not exist`).toContain(row.model)
      // The underscore files are parts other models import, never a product; the viewer's own
      // glob leaves them out.
      expect(row.model.startsWith('_'), `${id}: "${row.model}" is a shared part, not a product model`).toBe(false)
    }
  })

  // The rifle family and the kit, stated: three products share one module and differ by option,
  // and the kit is its own composed model.
  it('shows each Kestrel as its own variant of the one rifle module, and the kit as the composed kit model', () => {
    expect(productModel('kestrel-c')).toMatchObject({ model: 'rifle', options: { variant: 'c' } })
    expect(productModel('kestrel-l')).toMatchObject({ model: 'rifle', options: { variant: 'l' } })
    expect(productModel('kestrel-k')).toMatchObject({ model: 'rifle', options: { variant: 'k' } })
    expect(productModel('kestrel-c-kit')).toMatchObject({ model: 'kestrel-c-kit' })
    expect(productModel('harrier-lr')).toMatchObject({ model: 'harrier' })
    expect(productModel('magazine-smoke')).toMatchObject({ model: 'magazine', options: { variant: 'smoke' } })
    expect(productModel('magazine-amber')).toMatchObject({ model: 'magazine', options: { variant: 'accent' } })
  })

  // Two products are one bottle model, and the label prints a weight. Each has to print its own:
  // the 0.25 g product showed "0.28" on its photo and in its 3D view until 2026-10-02.
  // Mutation: drop `weight: '0.25'` from the `bbs-025` row -> fails.
  it('gives each bottle of BBs the weight its own name states', () => {
    for (const product of CATALOG.filter(item => productModel(item.id)?.model === 'bb-bottle')) {
      const named = product.name.match(/(\d\.\d\d) g/)?.[1]
      expect(named, `${product.id} names no weight`).toBeDefined()
      // The model's default is 0.28, so a row with no `weight` option prints that.
      expect(productModel(product.id)!.options?.weight ?? '0.28', product.id).toBe(named)
    }
  })

  // The viewer opens on the camera the photo was shot from and then clamps every move to the
  // limits. A starting camera outside them would be clamped on the first move, so the model
  // would jump away from its own photo.
  // Mutation: change `stick-battery`'s `el: 32` to `el: 85` -> fails, naming it.
  it('starts every camera inside the limits the viewer holds the view to', () => {
    for (const [id, row] of Object.entries(PRODUCT_MODELS)) {
      expect(row.el, `${id} elevation`).toBeGreaterThanOrEqual(VIEW_LIMITS.elMin)
      expect(row.el, `${id} elevation`).toBeLessThanOrEqual(VIEW_LIMITS.elMax)
      expect(row.zoom, `${id} zoom`).toBeGreaterThanOrEqual(VIEW_LIMITS.zoomMin)
      expect(row.zoom, `${id} zoom`).toBeLessThanOrEqual(VIEW_LIMITS.zoomMax)
      expect(Number.isFinite(row.az), `${id} azimuth`).toBe(true)
    }
  })

  it('answers undefined for an id it does not list, including names every object inherits', () => {
    expect(productModel('does-not-exist')).toBeUndefined()
    expect(productModel('toString')).toBeUndefined()
    expect(productModel('constructor')).toBeUndefined()
  })

  it('states the stage the photo and the live model share: a 4:3 picture on one background', () => {
    expect(PRODUCT_STAGE.aspect).toBeCloseTo(4 / 3)
    expect(PRODUCT_STAGE.background).toMatch(/^[0-9a-f]{6}$/)
    expect(PRODUCT_STAGE.spotlight).toMatch(/^[0-9a-f]{6}$/)
    expect(PRODUCT_STAGE.fov).toBeGreaterThan(0)
  })

  // The product page imports this file statically, to know whether a product has a model before
  // offering the 3D view. An import here (three.js above all) would ride into the product page's
  // chunk, or into Node when the renders script reads the table.
  // Mutation: add `import * as THREE from 'three'` to products.js -> fails.
  it('is plain data: products.js imports nothing', () => {
    const [file] = sourceFiles(['src/demo/scene'], /^products\.js$/)
    expect(file.path).toBe('src/demo/scene/products.js')
    expect(file.text).not.toMatch(/^\s*import\b/m)
    expect(file.text).not.toMatch(/\bimport\s*\(/)
    expect(file.text).not.toMatch(/\brequire\s*\(/)
  })
})
