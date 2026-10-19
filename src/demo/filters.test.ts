import { describe, expect, it } from 'vitest'
import { CATALOG } from './store/catalog'
import { PAGE_SIZE, SLIDER_MAX, applyFilters, parseFilters, toParams, type Filters } from './filters'

const DEFAULTS: Filters = { q: '', categories: [], max: null, inStock: false, sort: 'featured', page: 1 }

describe('parseFilters / toParams', () => {
  // Mutation: change the category `for` loop in `toParams` to `params.set('category', ...)`
  // (last one wins instead of every one appending) -> a URL with two categories loses one on
  // its way back through parse -> toParams, and the `.toString()` comparison below fails.
  it('round-trips a canonical URL through parse and toParams unchanged', () => {
    // In the exact key order `toParams` itself writes (q, category*, max, inStock, sort, page),
    // so this is a true round-trip check and not also an assertion about key ordering.
    const url = 'q=replica&category=replicas&category=optics&max=100&inStock=1&sort=price-asc&page=2'
    const params = new URLSearchParams(url)
    const roundTripped = toParams(parseFilters(params))
    expect(roundTripped.toString()).toBe(new URLSearchParams(url).toString())
  })

  // Mutation: change the `page` write in `toParams` from `f.page !== DEFAULTS.page` to always
  // write it -> a filter set nobody touched serializes to `page=1` instead of an empty string,
  // and the assertion below fails.
  it('a filter set at its defaults serializes to an empty query string', () => {
    expect(toParams(DEFAULTS).toString()).toBe('')
    expect(toParams(parseFilters(new URLSearchParams())).toString()).toBe('')
  })

  // Mutation: drop the `CATEGORY_IDS.has(...)` filter in `parseFilters` -> the unknown category
  // survives parsing, and the assertion below fails.
  it('drops an unknown category rather than keeping it', () => {
    const filters = parseFilters(new URLSearchParams('category=nope&category=optics'))
    expect(filters.categories).toEqual(['optics'])
  })

  // Mutation: change the `clampedMax < SLIDER_MAX` check in `parseFilters` to `<=` -> a `max`
  // exactly at the slider's own ceiling (SLIDER_MAX) comes back as that number instead of `null`,
  // and the assertion below fails.
  it('maps a max at or above the slider ceiling to null (no cap), and clamps a negative value to 0', () => {
    // Any value at or past SLIDER_MAX is the same "no cap" state the slider itself writes when
    // dragged all the way to the top -- not a real, if generous, price limit. ?max=99999 is the
    // extreme case; SLIDER_MAX itself is the boundary.
    expect(parseFilters(new URLSearchParams('max=99999')).max).toBeNull()
    expect(parseFilters(new URLSearchParams(`max=${SLIDER_MAX}`)).max).toBeNull()
    expect(parseFilters(new URLSearchParams(`max=${SLIDER_MAX - 10}`)).max).toBe(SLIDER_MAX - 10)

    const negative = parseFilters(new URLSearchParams('max=-5'))
    expect(negative.max).toBe(0)

    const absent = parseFilters(new URLSearchParams())
    expect(absent.max).toBeNull()
  })

  // Mutation: drop the `rawPage >= 1` check in `parseFilters` (keep only `Number.isFinite`) ->
  // `page=0` comes back as 0 instead of falling back to 1, and the assertion below fails.
  it('falls back to page 1 for a missing, zero or non-numeric page', () => {
    expect(parseFilters(new URLSearchParams()).page).toBe(1)
    expect(parseFilters(new URLSearchParams('page=0')).page).toBe(1)
    expect(parseFilters(new URLSearchParams('page=abc')).page).toBe(1)
    expect(parseFilters(new URLSearchParams('page=3')).page).toBe(3)
  })

  // Mutation: drop the `isSortKey(rawSort)` guard in `parseFilters` (cast `rawSort` straight to
  // `SortKey`) -> an unrecognised sort value survives parsing instead of falling back, and the
  // assertion below fails.
  it("falls back to sort 'featured' for an unrecognised value", () => {
    expect(parseFilters(new URLSearchParams('sort=bogus')).sort).toBe('featured')
    expect(parseFilters(new URLSearchParams('sort=rating')).sort).toBe('rating')
  })
})

describe('applyFilters', () => {
  const total = CATALOG.length

  // Mutation: change the category filter's condition from `f.categories.length === 0 || ...` to
  // just `f.categories.includes(product.category)` -> an empty `categories` array (no filter
  // chosen) now matches nothing instead of everything, and the assertion below fails.
  it('narrows to the chosen categories, and an empty selection means no filter at all', () => {
    const opticsOnly = applyFilters(CATALOG, { ...DEFAULTS, categories: ['optics'] })
    expect(opticsOnly.total).toBe(2)
    expect(opticsOnly.items.every(item => item.category === 'optics')).toBe(true)

    const everything = applyFilters(CATALOG, DEFAULTS)
    expect(everything.total).toBe(total)
  })

  // Mutation: drop the `!f.inStock || ...` filter line entirely -> a sold-out product (stock 0)
  // stays in the results with `inStock: true`, and the assertion below fails.
  it('excludes sold-out products when inStock is set', () => {
    const inStockOnly = applyFilters(CATALOG, { ...DEFAULTS, inStock: true })
    expect(inStockOnly.items.every(item => item.stock > 0)).toBe(true)
    expect(inStockOnly.total).toBeLessThan(total)
  })

  // Mutation: change the max comparison from `product.price / 100 <= f.max` to
  // `product.price <= f.max` (compares cents to euros) -> almost every product fails a
  // reasonable euro ceiling, and the assertion below fails.
  it('excludes products priced above max, comparing euros to the price in cents', () => {
    const cheapOnly = applyFilters(CATALOG, { ...DEFAULTS, max: 50 })
    expect(cheapOnly.items.every(item => item.price / 100 <= 50)).toBe(true)
    expect(cheapOnly.total).toBeGreaterThan(0)
    expect(cheapOnly.total).toBeLessThan(total)
  })

  // Mutation: drop `.toLowerCase()` from the description side of `matchesQuery` -> a query that
  // only matches a description by case (not the name) stops matching, and the assertion below
  // fails.
  it('matches q against the name or the description, case-insensitively', () => {
    const byName = applyFilters(CATALOG, { ...DEFAULTS, q: 'BUMP HELMET' })
    expect(byName.items.map(item => item.id)).toEqual(['bump-helmet'])

    // 'Foam' is capitalised in the catalogue's own text (it opens a sentence mid-description), so
    // a lowercase query only matches it if the description side is lowercased too -- unlike a
    // phrase that happens to already be lowercase in the source text either way.
    const byDescription = applyFilters(CATALOG, { ...DEFAULTS, q: 'foam inserts are included' })
    expect(byDescription.items.map(item => item.id)).toEqual(['mute-235'])
  })

  // Mutation: change the page clamp from `Math.min(Math.max(1, f.page), pageCount)` to just
  // `f.page` -> requesting page 99 returns an empty `items` array instead of the last real page,
  // and the assertion below fails.
  it('clamps an out-of-range page into [1, pageCount]', () => {
    const result = applyFilters(CATALOG, { ...DEFAULTS, page: 99 })
    expect(result.pageCount).toBe(Math.ceil(total / PAGE_SIZE))
    expect(result.page).toBe(result.pageCount)
    expect(result.items.length).toBeGreaterThan(0)
  })

  // Mutation: in `compareBySort`, change the 'price-asc' case to `b.price - a.price` (the
  // 'price-desc' formula) -> the list comes back descending instead of ascending, and the
  // assertion below fails.
  it('sorts price-asc ascending by price', () => {
    const { items } = applyFilters(CATALOG, { ...DEFAULTS, sort: 'price-asc' })
    const prices = CATALOG.map(p => p.price).sort((a, b) => a - b).slice(0, PAGE_SIZE)
    expect(items.map(item => item.price)).toEqual(prices)
  })

  // Mutation: change the 'price-desc' case to `a.price - b.price` -> ascending instead of
  // descending, and the assertion below fails.
  it('sorts price-desc descending by price', () => {
    const { items } = applyFilters(CATALOG, { ...DEFAULTS, sort: 'price-desc' })
    const prices = CATALOG.map(p => p.price).sort((a, b) => b - a).slice(0, PAGE_SIZE)
    expect(items.map(item => item.price)).toEqual(prices)
  })

  // Mutation: change the 'rating' case's `(b.rating?.value ?? 0) - (a.rating?.value ?? 0)` to
  // `(a.rating?.value ?? 0) - (b.rating?.value ?? 0)` -> ascending instead of descending, and the
  // assertion below fails.
  it('sorts rating highest first', () => {
    const { items } = applyFilters(CATALOG, { ...DEFAULTS, sort: 'rating' })
    const ratings = items.map(item => item.rating?.value ?? 0)
    const sorted = [...ratings].sort((a, b) => b - a)
    expect(ratings).toEqual(sorted)
  })

  // Mutation: change the 'featured' case in `compareBySort` from `return 0` to
  // `return a.id.localeCompare(b.id)` -> the catalogue's own order (id "kestrel-c" first) is
  // replaced by alphabetical order, and the assertion below fails.
  it("keeps the catalogue's own order for 'featured'", () => {
    const { items } = applyFilters(CATALOG, DEFAULTS)
    expect(items.map(item => item.id)).toEqual(CATALOG.slice(0, PAGE_SIZE).map(item => item.id))
  })
})
