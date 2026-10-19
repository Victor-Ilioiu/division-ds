import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '../../../components/atoms'
import { Breadcrumbs, Pagination, useToast } from '../../../components/molecules'
import { ProductGrid, type Product } from '../../../components/organisms/product-card/ProductCard'
import { Sheet, SheetClose, SheetContent, SheetTrigger } from '../../../components/organisms/sheet/Sheet'
import { cn } from '../../../lib/cn'
import { DEMO_HOME } from '../../routes'
import { routerLink } from '../../routerLink'
import { CATALOG, type Category } from '../../store/catalog'
import { useCart } from '../../store/cart'
import { quickAddToCart } from '../../store/quickAdd'
import { SLIDER_MAX, applyFilters, parseFilters, toParams, type Filters, type SortKey } from '../../filters'
import { Disclaimer } from '../../Disclaimer'
import { RouteNotice } from '../auth/RouteNotice'
import { FilterPanel } from './FilterPanel'
import { stagedMedia } from './ProductStage'

const FOCUS_RING =
  'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]'

function productsLabel(total: number): string {
  return `${total} ${total === 1 ? 'product' : 'products'}`
}

/**
 * The shop listing: search, category/price/stock filters and a sort order, all held in the URL
 * so a reload or a shared link reproduces exactly what was on screen. `filters.ts` owns the pure
 * parse/apply/serialize logic; this page owns the controls and the two places they can live --
 * a sidebar from `lg` up, or the same `FilterPanel` inside a Filters sheet below it. Only one of
 * those is ever actually mounted at a time: the sidebar's wrapper is plain CSS `hidden` (removed
 * from the accessibility tree, not just visually), and the sheet's own content is unmounted by
 * Radix while closed, so there is never a moment with two controls sharing one name.
 *
 * The page-level `role="status"` below reports the live count ("12 products") and goes silent at
 * zero, rather than repeating `ProductGrid`'s own emptyMessage -- `ProductGrid` already carries a
 * persistent status of its own that announces "No products match these filters." the instant the
 * list empties (see its own comment), so a second region saying the same thing at the same moment
 * would be two live regions racing to announce one event. Splitting it this way means each region
 * only ever has one thing to say: this one narrates a count that goes up and down, that one
 * narrates the empty state.
 */
export function Shop() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = parseFilters(searchParams)
  const result = applyFilters(CATALOG, filters)
  const { add } = useCart()
  const { toast } = useToast()

  const h1Ref = useRef<HTMLHeadingElement>(null)
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const [searchValue, setSearchValue] = useState(filters.q)
  const [sliderValue, setSliderValue] = useState<number[]>([filters.max ?? SLIDER_MAX])
  const [sheetOpen, setSheetOpen] = useState(false)

  // The last value THIS page itself wrote to `q` (from the debounce or Enter, below) -- not just
  // whatever `filters.q` happened to be last render. Without this, the resync effect below fired
  // on every render (a debounced write is itself a URL change), overwriting whatever had been
  // typed in the ~250ms since that write went out and losing characters typed in that window. A
  // change that did NOT come from this field (Back/Forward, Clear filters, a shared link) always
  // differs from what this ref holds, so it still resyncs exactly as before.
  const lastWrittenQ = useRef(filters.q)

  // The filters this page last knew the URL to hold. Resynced below for a change that came from
  // outside this page (Back/Forward, a shared link, the initial load) -- but every function that
  // writes a new URL also updates it synchronously, at the moment it writes, rather than waiting
  // for that resync. `filters` (this render's own snapshot) and `searchParams` itself both lag
  // behind a write by however long React Router's `startTransition` around `useSearchParams()`'s
  // state update takes to flush, so a second write scheduled earlier (the debounced search commit
  // below) but landing a few milliseconds after another control's write would otherwise still be
  // merging onto the state from BEFORE that other write, and silently discard it.
  //
  // The resync effect below is keyed on `searchParams` itself, never on `filters` -- `filters` is
  // `parseFilters(searchParams)`, a brand-new object on every single render regardless of whether
  // `searchParams` actually changed, so an effect keyed on it fires on EVERY render, not only on a
  // real URL change. That includes an "urgent" render this page's own local state (`searchValue`,
  // never wrapped in a transition) can trigger between a click's synchronous write and the moment
  // its own `startTransition` actually commits -- and that render still reads the OLD
  // `searchParams`, so the effect would resync `liveFilters.current` right back to stale content,
  // undoing the write the click had just made a moment earlier. `searchParams` only takes on a new
  // reference once a transition actually commits, so keying on it instead skips every one of those
  // in-between renders.
  const liveFilters = useRef(filters)
  useEffect(() => {
    liveFilters.current = parseFilters(searchParams)
  }, [searchParams])

  useEffect(() => {
    if (filters.q !== lastWrittenQ.current) {
      lastWrittenQ.current = filters.q
      setSearchValue(filters.q)
    }
  }, [filters.q])

  // The slider has no equivalent typing-loss risk (it only writes on release, not per keystroke),
  // so a plain resync is enough here.
  useEffect(() => {
    setSliderValue([filters.max ?? SLIDER_MAX])
  }, [filters.max])

  useEffect(() => () => clearTimeout(debounceRef.current), [])

  /** Every filter control but Pagination goes through this: it always drops `page` back to its
   *  default, because a narrowed or widened result set makes whatever page a person was on
   *  meaningless. Pagination itself sets `page` directly instead, since moving through the same
   *  result set is the one change that must NOT reset it. See `liveFilters`'s own comment above for
   *  why this merges onto that ref rather than onto `filters` or a `setSearchParams` closure. */
  function commit(patch: Partial<Omit<Filters, 'page'>>, options?: { replace?: boolean }) {
    const next = toParams({ ...liveFilters.current, ...patch, page: 1 })
    liveFilters.current = parseFilters(next)
    setSearchParams(next, options)
  }

  function handleSearchChange(value: string) {
    setSearchValue(value)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      lastWrittenQ.current = value
      commit({ q: value }, { replace: true })
    }, 250)
  }

  function handleSearchEnter(value: string) {
    clearTimeout(debounceRef.current)
    lastWrittenQ.current = value
    commit({ q: value }, { replace: true })
  }

  // Reads `liveFilters.current.categories`, never this render's `filters.categories`: two category
  // checkboxes ticked faster than a deferred re-render flushes would otherwise both close over the
  // same pre-click array and each write back a list missing the other's change.
  function handleCategoryChange(id: Category['id'], checked: boolean) {
    const liveCategories = liveFilters.current.categories
    const next = checked ? [...liveCategories, id] : liveCategories.filter(category => category !== id)
    commit({ categories: next })
  }

  // `onValueCommit` fires the same way for a pointer release and for every arrow-key step once
  // the key is released -- Radix's own event carries nothing that tells the two apart. A keyboard
  // step MUST use `replace`, or holding an arrow key floods history with one entry per step; a
  // pointer drag committing only once on release could safely push instead, but there is no
  // reliable way to give it that without also giving it to the keyboard case. Always replacing is
  // the safe default: a mouse drag still lands in the URL exactly where it was released, just
  // without its own place in Back/Forward history (see commands.md's "shop listing" gotcha).
  function handleSliderCommit(values: number[]) {
    const clamped = Math.min(Math.max(10, Math.round(values[0])), SLIDER_MAX)
    commit({ max: clamped >= SLIDER_MAX ? null : clamped }, { replace: true })
  }

  function handleInStockChange(checked: boolean) {
    commit({ inStock: checked })
  }

  function handleSortChange(sort: SortKey) {
    commit({ sort })
  }

  function goToPage(page: number) {
    const next = toParams({ ...liveFilters.current, page })
    liveFilters.current = parseFilters(next)
    setSearchParams(next)
    // Not the top of the page: the controls that got someone to this point (the sidebar, or the
    // sheet they already closed) haven't moved, only the results below them have.
    resultsHeadingRef.current?.focus()
  }

  function clearFilters() {
    // A pending debounced search write (see handleSearchChange) must not survive a Clear: left
    // running, it writes the old typed text back into the URL a moment after this empties it.
    clearTimeout(debounceRef.current)
    liveFilters.current = parseFilters(new URLSearchParams())
    setSearchParams(new URLSearchParams())
    h1Ref.current?.focus()
  }

  function handleAddToCart(product: Product) {
    quickAddToCart(add, toast, product.id)
  }

  const panelProps = {
    searchValue,
    onSearchChange: handleSearchChange,
    onSearchEnter: handleSearchEnter,
    selectedCategories: filters.categories,
    onCategoryChange: handleCategoryChange,
    sliderValue,
    sliderMax: SLIDER_MAX,
    onSliderChange: setSliderValue,
    onSliderCommit: handleSliderCommit,
    inStock: filters.inStock,
    onInStockChange: handleInStockChange,
    sort: filters.sort,
    onSortChange: handleSortChange,
  }

  return (
    <div className="px-gutter py-12 flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <Breadcrumbs items={[{ label: 'Home', href: DEMO_HOME }, { label: 'Shop' }]} renderLink={routerLink} />
        <h1
          ref={h1Ref}
          tabIndex={-1}
          className={cn('font-display font-semibold text-3xl text-[var(--color-text-primary)]', FOCUS_RING)}
        >
          Shop
        </h1>
        <Disclaimer />
        <RouteNotice />
      </div>

      <div className="lg:hidden">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="secondary">Filters</Button>
          </SheetTrigger>
          <SheetContent title="Filters">
            <div className="flex flex-col gap-6">
              <FilterPanel {...panelProps} />
              <SheetClose asChild>
                <Button fullWidth>Apply</Button>
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
        <aside className="hidden lg:block">
          <FilterPanel {...panelProps} />
        </aside>

        <div className="flex flex-col gap-6 min-w-0">
          {/* `aria-label`, not left nameless: ProductGrid mounts its OWN persistent role="status"
              a few lines below (see its file), and a nameless live region is indistinguishable
              from this one to both a query in a test and, more importantly, to a screen reader
              deciding which one just changed. */}
          <p
            role="status"
            aria-label="Result count"
            className="font-body text-sm text-[var(--color-text-secondary)]"
          >
            {result.total > 0 ? productsLabel(result.total) : ''}
          </p>

          <h2
            ref={resultsHeadingRef}
            tabIndex={-1}
            className={cn('font-display font-semibold text-lg text-[var(--color-text-primary)]', FOCUS_RING)}
          >
            Results
          </h2>

          <ProductGrid
            products={result.items}
            label="Products"
            renderLink={routerLink}
            renderMedia={stagedMedia}
            onAddToCart={handleAddToCart}
            emptyMessage="No products match these filters."
          />

          {result.total === 0 ? (
            <div className="flex flex-col items-start gap-3">
              <Button variant="secondary" onClick={clearFilters}>
                Clear filters
              </Button>
            </div>
          ) : (
            <Pagination page={result.page} pageCount={result.pageCount} onPageChange={goToPage} />
          )}
        </div>
      </div>
    </div>
  )
}
