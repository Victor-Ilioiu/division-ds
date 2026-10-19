import { describe, expect, it } from 'vitest'
import { applyFilters, parseFilters } from '../filters'
import { CATALOG, CATEGORIES, KIT } from './catalog'
import {
  ACCESSORY_CATEGORIES,
  categoryTiles,
  otherOffers,
  saving,
  shopHref,
  topRatedAccessories,
  topRatedReplicas,
} from './selections'

/**
 * The homepage's sections are rules over the catalogue, so these tests hold two things: that each
 * rule selects what it says, and that the catalogue still gives each section enough to show. The
 * second half is the point. A price edit or a removed product must not quietly leave the homepage
 * with a one-card slider; it has to fail here, naming the section.
 */

const ratings = (products: { rating?: { value: number } }[]) => products.map(product => product.rating?.value ?? 0)

function isDescending(values: number[]): boolean {
  return values.every((value, index) => index === 0 || values[index - 1] >= value)
}

/** What the shop listing shows for a homepage link, every page of it. */
function listed(href: string): string[] {
  const filters = parseFilters(new URL(href, 'http://hexline.test').searchParams)
  const first = applyFilters(CATALOG, filters)
  return Array.from({ length: first.pageCount }, (_, index) =>
    applyFilters(CATALOG, { ...filters, page: index + 1 }).items.map(product => product.id)
  ).flat()
}

describe('topRatedReplicas', () => {
  // Four, the row the homepage shows. Mutation: drop the Harrier LR from the catalogue -> three,
  // and the homepage's four-column row has a hole in it.
  it('is four replicas, none of them the kit the hero already offers', () => {
    const replicas = topRatedReplicas()
    expect(replicas).toHaveLength(4)
    for (const product of replicas) {
      expect(product.category, product.id).toBe('replicas')
      expect(product.id).not.toBe(KIT.id)
    }
  })

  it('is ordered by rating, best first, the more-reviewed one first on a tie', () => {
    const replicas = topRatedReplicas(10)
    expect(isDescending(ratings(replicas))).toBe(true)
    replicas.forEach((product, index) => {
      const next = replicas[index + 1]
      if (next && next.rating!.value === product.rating!.value) {
        expect(product.rating!.count, `${product.id} before ${next.id}`).toBeGreaterThanOrEqual(next.rating!.count)
      }
    })
  })

  it('respects the limit it is given', () => {
    expect(topRatedReplicas(2)).toHaveLength(2)
  })
})

describe('otherOffers', () => {
  // Mutation: delete the compare prices added to the catalogue for this section -> two offers
  // are left, the kit and the Kestrel K, and the slider has one card. This is the test that says so.
  it('has enough products to be a slider: at least five', () => {
    expect(otherOffers().length).toBeGreaterThanOrEqual(5)
  })

  it('holds only products priced under a compare price or badged Sale, and never the kit', () => {
    for (const product of otherOffers()) {
      expect(saving(product) > 0 || product.badge === 'Sale', product.id).toBe(true)
      expect(product.id).not.toBe(KIT.id)
    }
  })

  it('leaves out nothing that is on offer, up to its limit', () => {
    const onOffer = CATALOG.filter(
      product => product.id !== KIT.id && (saving(product) > 0 || product.badge === 'Sale')
    ).map(product => product.id)
    expect(otherOffers(CATALOG.length).map(product => product.id).sort()).toEqual([...onOffer].sort())
  })

  it('puts the largest saving first', () => {
    expect(isDescending(otherOffers().map(saving))).toBe(true)
  })

  it('reads a saving as a fraction of the compare price, and 0 where there is none', () => {
    const kestrelK = CATALOG.find(product => product.id === 'kestrel-k')!
    expect(saving(kestrelK)).toBeCloseTo(1 - 12900 / 14900, 10)
    expect(saving(CATALOG.find(product => product.id === 'kestrel-c')!)).toBe(0)
  })
})

describe('topRatedAccessories', () => {
  it('has enough products to be a slider: at least five', () => {
    expect(topRatedAccessories().length).toBeGreaterThanOrEqual(5)
  })

  it('holds optics and parts only, best rated first', () => {
    const accessories = topRatedAccessories()
    expect(ACCESSORY_CATEGORIES).toEqual(['optics', 'parts'])
    for (const product of accessories) {
      expect(ACCESSORY_CATEGORIES, product.id).toContain(product.category)
    }
    expect(isDescending(ratings(accessories))).toBe(true)
  })

  it('stops at its limit, and at the catalogue when the limit is larger', () => {
    const all = CATALOG.filter(product => ACCESSORY_CATEGORIES.includes(product.category))
    expect(topRatedAccessories(4)).toHaveLength(4)
    expect(topRatedAccessories(100)).toHaveLength(all.length)
  })
})

describe('categoryTiles', () => {
  it('is one tile per category, in the catalogue order of the categories', () => {
    expect(categoryTiles().map(tile => tile.category.id)).toEqual(CATEGORIES.map(category => category.id))
  })

  // The count on a tile is a promise about the page behind its link, so it is checked against
  // what the shop's own filter returns for that link, not against a second count of the catalogue.
  it('counts what the shop lists behind its link, and links with the parameter the shop reads', () => {
    for (const tile of categoryTiles()) {
      expect(tile.href).toBe(`/demo/shop?category=${tile.category.id}`)
      const ids = listed(tile.href)
      expect(tile.count, tile.category.id).toBe(ids.length)
      expect(tile.count).toBeGreaterThan(0)
    }
  })

  it('stands for each category with that category\'s best-rated product, which has a photo', () => {
    for (const tile of categoryTiles()) {
      expect(tile.product.category).toBe(tile.category.id)
      const best = Math.max(...CATALOG.filter(product => product.category === tile.category.id).map(product => product.rating?.value ?? 0))
      expect(tile.product.rating?.value, tile.category.id).toBe(best)
      expect(tile.product.image?.src).toBe(`/media/products/${tile.product.id}.webp`)
    }
  })
})

describe('shopHref', () => {
  it('is the bare shop with no filters', () => {
    expect(shopHref()).toBe('/demo/shop')
  })

  it('writes the parameters the shop listing parses back to the same filters', () => {
    const href = shopHref({ categories: ['optics', 'parts'], sort: 'rating' })
    expect(href).toBe('/demo/shop?category=optics&category=parts&sort=rating')
    const filters = parseFilters(new URL(href, 'http://hexline.test').searchParams)
    expect(filters.categories).toEqual(['optics', 'parts'])
    expect(filters.sort).toBe('rating')
  })

  // The "All replicas" and "All accessories" links have to lead to a listing that holds what the
  // section above them showed.
  it('leads to a listing that contains every product its section shows', () => {
    const replicas = listed(shopHref({ categories: ['replicas'], sort: 'rating' }))
    for (const product of topRatedReplicas()) expect(replicas).toContain(product.id)
    const accessories = listed(shopHref({ categories: ACCESSORY_CATEGORIES, sort: 'rating' }))
    for (const product of topRatedAccessories()) expect(accessories).toContain(product.id)
  })
})
