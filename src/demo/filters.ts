import { CATALOG, CATEGORIES, type Category, type CatalogProduct } from './store/catalog'

export type SortKey = 'featured' | 'price-asc' | 'price-desc' | 'rating'

export type Filters = {
  q: string
  categories: Category['id'][]
  max: number | null
  inStock: boolean
  sort: SortKey
  page: number
}

export const PAGE_SIZE = 6

const SORT_KEYS: readonly SortKey[] = ['featured', 'price-asc', 'price-desc', 'rating']
const CATEGORY_IDS = new Set<Category['id']>(CATEGORIES.map(category => category.id))

/** The highest catalogue price, in cents. */
export const MAX_PRICE_CENTS = Math.max(...CATALOG.map(product => product.price))

/** The Slider's own track ceiling, in whole euros, rounded up to the nearest ten so its step-of-10
 *  thumb always lands exactly on top. `SLIDER_MAX` euros is also where `parseFilters` below stops
 *  treating a `max` as a real cap: at or above it, the thumb sits at the very top of the track, so
 *  a `max` there means the same thing the slider itself shows for "no cap" -- clamping it to a
 *  lower, precise ceiling instead (say, the exact highest price) would leave the thumb short of
 *  the top while every product still passed the filter, an inconsistency between what the control
 *  shows and what it means. At least 10, so a catalogue with nothing over a few euros never
 *  produces a slider whose min and max are the same point. */
export const SLIDER_MAX = Math.max(10, Math.ceil(MAX_PRICE_CENTS / 100 / 10) * 10)

const DEFAULTS: Filters = { q: '', categories: [], max: null, inStock: false, sort: 'featured', page: 1 }

function isSortKey(value: string | null): value is SortKey {
  return value !== null && (SORT_KEYS as readonly string[]).includes(value)
}

/**
 * Reads filters out of the URL. Never throws on a malformed value: an unknown category is
 * dropped, and a missing or non-numeric `max`/`page`/`sort` falls back to its default exactly as
 * if the param had never been set -- a shared link with a stale or hand-edited query string still
 * renders a shop, not a crash.
 */
export function parseFilters(params: URLSearchParams): Filters {
  const q = params.get('q') ?? ''

  const categories = Array.from(new Set(params.getAll('category'))).filter(
    (id): id is Category['id'] => CATEGORY_IDS.has(id as Category['id'])
  )

  const rawMax = params.get('max')
  const parsedMax = rawMax === null ? NaN : Number(rawMax)
  const clampedMax = Number.isFinite(parsedMax) ? Math.max(0, Math.round(parsedMax)) : null
  // At or above the slider's own ceiling, this is the same "no cap" state a dragged-to-the-top
  // thumb writes (see SLIDER_MAX's own comment) -- not a real, if generous, price limit.
  const max = clampedMax !== null && clampedMax < SLIDER_MAX ? clampedMax : null

  const inStock = params.get('inStock') === '1'

  const rawSort = params.get('sort')
  const sort: SortKey = isSortKey(rawSort) ? rawSort : DEFAULTS.sort

  const rawPage = Number(params.get('page'))
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : DEFAULTS.page

  return { q, categories, max, inStock, sort, page }
}

/** Omits every value that already equals its default, so a filter set nobody touched round-trips
 *  to an empty query string rather than a URL full of `?q=&inStock=0&sort=featured` noise. */
export function toParams(f: Filters): URLSearchParams {
  const params = new URLSearchParams()
  if (f.q) params.set('q', f.q)
  for (const category of f.categories) params.append('category', category)
  if (f.max !== null) params.set('max', String(f.max))
  if (f.inStock) params.set('inStock', '1')
  if (f.sort !== DEFAULTS.sort) params.set('sort', f.sort)
  if (f.page !== DEFAULTS.page) params.set('page', String(f.page))
  return params
}

function matchesQuery(product: CatalogProduct, q: string): boolean {
  if (!q) return true
  const needle = q.toLowerCase()
  return product.name.toLowerCase().includes(needle) || product.description.toLowerCase().includes(needle)
}

/** `Array#sort`'s comparator: 0 for 'featured' keeps whatever order `products` was already in
 *  (the catalogue's own order, a stable sort by spec since ES2019), and is also every sort key's
 *  own tiebreak for two equally-priced or equally-rated products. */
function compareBySort(a: CatalogProduct, b: CatalogProduct, sort: SortKey): number {
  switch (sort) {
    case 'price-asc':
      return a.price - b.price
    case 'price-desc':
      return b.price - a.price
    case 'rating':
      return (b.rating?.value ?? 0) - (a.rating?.value ?? 0)
    case 'featured':
      return 0
  }
}

export function applyFilters(
  products: CatalogProduct[],
  f: Filters
): { items: CatalogProduct[]; total: number; pageCount: number; page: number } {
  const filtered = products
    .filter(product => f.categories.length === 0 || f.categories.includes(product.category))
    .filter(product => !f.inStock || product.stock > 0)
    .filter(product => f.max === null || product.price / 100 <= f.max)
    .filter(product => matchesQuery(product, f.q))

  const sorted = [...filtered].sort((a, b) => compareBySort(a, b, f.sort))

  const total = sorted.length
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const page = Math.min(Math.max(1, f.page), pageCount)
  const start = (page - 1) * PAGE_SIZE

  return { items: sorted.slice(start, start + PAGE_SIZE), total, pageCount, page }
}
