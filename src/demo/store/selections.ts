import { toParams, type Filters } from '../filters'
import { CATALOG, CATEGORIES, KIT, type CatalogProduct, type Category } from './catalog'

/**
 * What the homepage shows, chosen from the catalogue by rule. No product id is typed in here: a
 * section is a filter and an order, so a product added to the catalogue takes its place on the
 * homepage without anyone listing it, and `selections.test.ts` fails if a catalogue change leaves
 * a section too thin to show.
 */

/** Best first: the higher rating, then the one more people rated, then catalogue order (the sort
 *  is stable). An unrated product goes last. */
function byRating(a: CatalogProduct, b: CatalogProduct): number {
  return (b.rating?.value ?? 0) - (a.rating?.value ?? 0) || (b.rating?.count ?? 0) - (a.rating?.count ?? 0)
}

/** How much less a product costs than its compare price, as a fraction. 0 without one. */
export function saving(product: CatalogProduct): number {
  if (product.compareAtPrice === undefined || product.compareAtPrice <= product.price) return 0
  return 1 - product.price / product.compareAtPrice
}

/** A product is an offer when it is priced under a compare price or carries the Sale badge. */
function isOffer(product: CatalogProduct): boolean {
  return saving(product) > 0 || product.badge === 'Sale'
}

/** The kit is the hero's own offer, so no section under the hero repeats it. */
const notTheKit = (product: CatalogProduct) => product.id !== KIT.id

/** The replicas, best rated first. Four, the row the homepage shows at its widest. */
export function topRatedReplicas(limit = 4): CatalogProduct[] {
  return CATALOG.filter(product => product.category === 'replicas' && notTheKit(product))
    .sort(byRating)
    .slice(0, limit)
}

/** Everything on offer except the kit, the largest saving first. */
export function otherOffers(limit = 8): CatalogProduct[] {
  return CATALOG.filter(product => isOffer(product) && notTheKit(product))
    .sort((a, b) => saving(b) - saving(a))
    .slice(0, limit)
}

/** The two categories that fit onto a replica. */
export const ACCESSORY_CATEGORIES: Category['id'][] = ['optics', 'parts']

/** Optics and parts together, best rated first. */
export function topRatedAccessories(limit = 8): CatalogProduct[] {
  return CATALOG.filter(product => ACCESSORY_CATEGORIES.includes(product.category))
    .sort(byRating)
    .slice(0, limit)
}

export type CategoryTile = {
  category: Category
  /** How many products the shop lists under it, the kit included: the number the filtered
   *  listing reports. */
  count: number
  /** The category's best-rated product, whose photo stands for the category. */
  product: CatalogProduct
  href: string
}

/** One tile per category, in `CATEGORIES` order. A category with no products has no tile: there
 *  would be no photo to show and nothing behind the link. */
export function categoryTiles(): CategoryTile[] {
  return CATEGORIES.flatMap(category => {
    const products = CATALOG.filter(product => product.category === category.id)
    if (products.length === 0) return []
    const [product] = [...products].sort(byRating)
    return [{ category, count: products.length, product, href: shopHref({ categories: [category.id] }) }]
  })
}

/**
 * A link into the shop listing with filters applied. Built by `toParams`, the same function the
 * shop page writes its own URL with, so a homepage link can never name a parameter the listing
 * does not read.
 */
export function shopHref(filters: Partial<Pick<Filters, 'categories' | 'sort'>> = {}): string {
  const query = toParams({ q: '', categories: [], max: null, inStock: false, sort: 'featured', page: 1, ...filters }).toString()
  return query ? `/demo/shop?${query}` : '/demo/shop'
}
