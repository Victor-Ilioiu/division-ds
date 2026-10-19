import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { sourceFiles } from '../../../../scripts/lib/read-source-files.mjs'
import { axeClean } from '../../../test/axe'
import { CATALOG } from '../../store/catalog'
import { ProductStage, cutoutFrame, cutoutPlacement, cutoutSrcSet } from './ProductStage'

describe('ProductStage', () => {
  it('floats the product cutout over a decorative stage, with an empty alt', () => {
    const { container } = render(<ProductStage id="kestrel-c" />)
    const img = container.querySelector('img')!
    expect(img).toHaveAttribute('alt', '')
    expect(img).toHaveAttribute('src', '/media/products/cutout/kestrel-c.webp')
    expect(img).toHaveAttribute('loading', 'lazy')
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  // Mutation: drop the 640 entry -> a 1x card always downloads the 1280 file.
  it('offers the 640 and the 1280 cutout, so a 2x screen gets the sharp one', () => {
    expect(cutoutSrcSet('bbs-028')).toBe('/media/products/cutout/bbs-028-640.webp 640w, /media/products/cutout/bbs-028.webp 1280w')
    const { container } = render(<ProductStage id="bbs-028" />)
    expect(container.querySelector('img')).toHaveAttribute('srcset', cutoutSrcSet('bbs-028'))
    expect(container.querySelector('img')!.getAttribute('sizes')).toBeTruthy()
  })

  // Two stages on one page must not share gradient ids, or the second card paints with the
  // first card's gradients (and loses them when the first unmounts).
  it('gives every stage its own gradient ids', () => {
    const { container } = render(
      <>
        <ProductStage id="kestrel-c" />
        <ProductStage id="kestrel-k" />
      </>
    )
    const ids = [...container.querySelectorAll('[id]')].map(node => node.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  // `spike/tools/renders.mjs --cutout` writes these; a product without them shows a broken card.
  it('has both cutout files on disk for every catalogue product', () => {
    const onDisk = sourceFiles(['public/media/products/cutout'], /\.webp$/).map(file => file.path)
    for (const product of CATALOG) {
      for (const file of [`${product.id}.webp`, `${product.id}-640.webp`]) {
        expect(onDisk, `${product.id}: ${file}`).toContain(`public/media/products/cutout/${file}`)
      }
    }
  })

  // The framing comes from the renders (cutout-frames.json); a product rendered without it falls
  // back to a guess and floats at the wrong height.
  it('has a measured frame for every catalogue product, inside the picture', () => {
    for (const product of CATALOG) {
      const [left, top, right, bottom] = cutoutFrame(product.id)
      expect(cutoutFrame(product.id), product.id).not.toEqual([0.1, 0.2, 0.9, 0.8])
      expect(left < right && top < bottom && left >= 0 && bottom <= 1, product.id).toBe(true)
    }
  })

  // Mutation: place the image at inset 0 again -> a sight that fills its own picture sits on
  // (and over) the plinth instead of above it.
  it('puts every product the same height above the plinth, whatever its camera framing', () => {
    for (const id of ['kestrel-l', 'prism-holo-sight', 'dummy-radio']) {
      const { container, unmount } = render(<ProductStage id={id} />)
      const style = container.querySelector('img')!.style
      const scale = parseFloat(style.width) / 100
      const lowest = parseFloat(style.top) / 100 + scale * cutoutFrame(id)[3]
      expect(lowest, id).toBeCloseTo(0.655, 3)
      unmount()
    }
  })

  // The product page's live model is framed by these numbers (viewer.js, `place`): they must be
  // the ones the image is actually drawn with, or the model lands beside the cutout.
  // Mutation: change FLOAT inside the component's own placement only -> the numbers disagree.
  it('places the image exactly where cutoutPlacement says', () => {
    for (const id of ['harrier-lr', 'halo-tube-sight']) {
      const { container, unmount } = render(<ProductStage id={id} />)
      const style = container.querySelector('img')!.style
      const { scale, left, top } = cutoutPlacement(id)
      expect(parseFloat(style.width) / 100, id).toBeCloseTo(scale, 3)
      expect(parseFloat(style.height) / 100, id).toBeCloseTo(scale, 3)
      expect(parseFloat(style.left) / 100, id).toBeCloseTo(left, 3)
      expect(parseFloat(style.top) / 100, id).toBeCloseTo(top, 3)
      unmount()
    }
  })

  it('loads eagerly, with the caller’s sizes and image classes, for the product page', () => {
    const { container } = render(<ProductStage id="kestrel-c" eager sizes="50vw" imgClassName="opacity-0" />)
    const img = container.querySelector('img')!
    expect(img).toHaveAttribute('loading', 'eager')
    expect(img).toHaveAttribute('fetchpriority', 'high')
    expect(img).toHaveAttribute('sizes', '50vw')
    expect(img).toHaveClass('opacity-0')
  })

  it('is axe clean', async () => {
    const { container } = render(<ProductStage id="kestrel-c" />)
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
