import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { CartLine } from '../../components/organisms/cart/Cart'
import { findProduct, type CatalogProduct } from './catalog'
import { readJson, writeJson } from './storage'

export type CartItem = CartLine & { productId: string; size?: string; colourId?: string }

/** What `add` actually did. `'at-max'` covers both a line already sitting at its own ceiling and
 *  a product with none left to sell (`maxQuantityFor` 0 either way) -- neither one added
 *  anything, so the caller shows a different toast than the one that names what just went in. */
export type AddOutcome = 'added' | 'at-max'

const STORAGE_KEY = 'hexline-cart'
/** The demo's own flat ceiling: CartLine's default of 99 is the design system's, not this store's.
 *  The real per-line ceiling is `maxQuantityFor`, below -- this is only its upper bound, so a
 *  product with plenty of stock still never fills one line past ten. */
const MAX_QUANTITY = 10

/** The most a line can ever hold: the store's own flat ceiling, or the product's own stock,
 *  whichever is lower. A product with fewer than ten in stock never lets its line claim stock it
 *  doesn't have; stock 0 gives 0, which `add` treats the same as "already full". Exported so
 *  Product.tsx can bound its own Quantity stepper by the same number rather than a flat 10, which
 *  otherwise let someone select more than a low-stock product actually has left for that line. */
export function maxQuantityFor(product: CatalogProduct): number {
  return Math.min(MAX_QUANTITY, product.stock)
}

type CartContextValue = {
  lines: CartItem[]
  count: number
  subtotal: number
  add(product: CatalogProduct, opts: { size?: string; colourId?: string; quantity: number }): AddOutcome
  setQuantity(id: string, quantity: number): void
  remove(id: string): void
  restore(line: CartLine, index: number): void
  clear(): void
}

const CartContext = createContext<CartContextValue | null>(null)

function lineId(productId: string, size?: string, colourId?: string): string {
  return `${productId}:${size ?? '-'}:${colourId ?? '-'}`
}

/** Shared with `Shop.tsx`'s and `Product.tsx`'s own toast text: "Size {size} · {colour}" when a
 *  size applies, whichever of the two is given otherwise, `undefined` if neither is. */
export function detailFor(size: string | undefined, colourLabel: string | undefined): string | undefined {
  const parts = [size ? `Size ${size}` : null, colourLabel ?? null].filter((part): part is string => part !== null)
  return parts.length > 0 ? parts.join(' · ') : undefined
}

/** Guards `sessionStorage`'s own JSON against a hand-edited, stale or otherwise tampered value
 *  before it ever reaches `useState`'s initialiser -- a shape this loose could otherwise crash
 *  every consumer of `useCart()` on mount, not just fail to render a line correctly. A shape
 *  check only: an outrageous-but-well-typed quantity (1e6), a negative price, or a productId
 *  nothing in `CATALOG` recognises all pass it and are instead corrected -- or the whole line
 *  dropped -- by `rehydrate`, below, which trusts the catalogue and never storage. */
function isCartItem(value: unknown): value is CartItem {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    typeof v.productId === 'string' &&
    typeof v.name === 'string' &&
    Number.isFinite(v.unitPrice) &&
    Number.isInteger(v.quantity) &&
    (v.quantity as number) >= 1
  )
}

export function isCartItems(value: unknown): value is CartItem[] {
  return Array.isArray(value) && value.every(isCartItem)
}

function clampToMax(quantity: number, max: number): number {
  const rounded = Number.isFinite(quantity) ? Math.round(quantity) : 1
  return Math.min(max, Math.max(1, rounded))
}

/** Rebuilds every stored line from `CATALOG` rather than trusting anything storage says about a
 *  product: a line whose `productId` the catalogue no longer has, or whose product now has
 *  nothing in stock, is dropped outright, and every other field storage could otherwise poison --
 *  a negative price, a name, an `href` pointing anywhere at all -- is retaken from the catalogue
 *  instead. The `id` itself is rebuilt from `lineId(product.id, item.size, item.colourId)` rather
 *  than trusted from storage too: a stored `id` is exactly the kind of field a hand-edited or
 *  stale value could poison, and `add`/`restore` both key their own merges on the computed id, so
 *  hydration has to agree with them about what a line's id actually is. Quantity is clamped to
 *  the product's own current `maxQuantityFor`, never trusted past it. Two stored lines that
 *  compute to the same id (a duplicate from a hand-edited value, or an older version of this
 *  store) are merged into one rather than rendered as two rows nothing here could tell apart. */
function rehydrate(raw: CartItem[]): CartItem[] {
  const merged = new Map<string, CartItem>()
  for (const item of raw) {
    const product = findProduct(item.productId)
    if (!product) continue
    const maxQuantity = maxQuantityFor(product)
    if (maxQuantity < 1) continue
    const colourLabel = product.colours.find(colour => colour.id === item.colourId)?.label
    const quantity = clampToMax(item.quantity, maxQuantity)
    const id = lineId(product.id, item.size, item.colourId)
    const existing = merged.get(id)
    if (existing) {
      existing.quantity = Math.min(maxQuantity, existing.quantity + quantity)
      continue
    }
    merged.set(id, {
      id,
      productId: product.id,
      name: product.name,
      href: product.href,
      detail: detailFor(item.size, colourLabel),
      unitPrice: product.price,
      quantity,
      maxQuantity,
      size: item.size,
      colourId: item.colourId,
    })
  }
  return [...merged.values()]
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartItem[]>(() =>
    rehydrate(readJson<CartItem[]>(STORAGE_KEY, [], isCartItems))
  )
  // Every mutator below computes its own `next` from this ref, assigns the ref, and only then
  // calls `setLines(next)` -- rather than from the `lines` state closure, or from `setLines`'s own
  // functional-updater argument. `add`'s return value has to reflect what the cart holds
  // SYNCHRONOUSLY, before React has re-rendered: two `add` calls fired back to back in the same
  // event (a doubled click, or a test's own `act`) both need to see the line the first call just
  // placed, and neither the `lines` closure nor a functional updater's own callback is available
  // to read from before this function returns.
  const linesRef = useRef(lines)

  useEffect(() => {
    writeJson(STORAGE_KEY, lines)
  }, [lines])

  const add: CartContextValue['add'] = useCallback((product, opts) => {
    const maxQuantity = maxQuantityFor(product)
    const id = lineId(product.id, opts.size, opts.colourId)
    const current = linesRef.current
    const existingLine = current.find(line => line.id === id)
    if (maxQuantity < 1 || (existingLine && existingLine.quantity >= maxQuantity)) {
      return 'at-max'
    }
    const next = existingLine
      ? current.map(line =>
          line.id === id ? { ...line, quantity: Math.min(maxQuantity, line.quantity + opts.quantity) } : line
        )
      : [
          ...current,
          {
            id,
            productId: product.id,
            name: product.name,
            href: product.href,
            detail: detailFor(opts.size, product.colours.find(colour => colour.id === opts.colourId)?.label),
            unitPrice: product.price,
            quantity: Math.min(maxQuantity, opts.quantity),
            maxQuantity,
            size: opts.size,
            colourId: opts.colourId,
          },
        ]
    linesRef.current = next
    setLines(next)
    return 'added'
  }, [])

  const setQuantity: CartContextValue['setQuantity'] = useCallback((id, quantity) => {
    if (!Number.isFinite(quantity)) return
    const next = linesRef.current.map(line =>
      line.id === id ? { ...line, quantity: Math.min(line.maxQuantity ?? MAX_QUANTITY, Math.max(1, quantity)) } : line
    )
    linesRef.current = next
    setLines(next)
  }, [])

  const remove: CartContextValue['remove'] = useCallback(id => {
    const next = linesRef.current.filter(line => line.id !== id)
    linesRef.current = next
    setLines(next)
  }, [])

  // Cart hands back the exact object it was given for a removed line, so this is always the
  // line this provider itself produced; casting it back is just naming what it already is. If a
  // line with the same id already exists -- Undo after adding the same variant again -- the
  // quantities merge (clamped to the line's own maxQuantity) instead of splicing a duplicate id
  // into the list, which would leave two rows a caller keyed by id could not tell apart.
  const restore: CartContextValue['restore'] = useCallback((line, index) => {
    const item = line as CartItem
    const current = linesRef.current
    const existingIndex = current.findIndex(l => l.id === item.id)
    let next: CartItem[]
    if (existingIndex !== -1) {
      next = current.map((l, i) =>
        i === existingIndex
          ? { ...l, quantity: Math.min(l.maxQuantity ?? MAX_QUANTITY, l.quantity + item.quantity) }
          : l
      )
    } else {
      next = [...current]
      const at = Math.min(Math.max(index, 0), next.length)
      next.splice(at, 0, item)
    }
    linesRef.current = next
    setLines(next)
  }, [])

  const clear: CartContextValue['clear'] = useCallback(() => {
    linesRef.current = []
    setLines([])
  }, [])

  const count = lines.reduce((sum, line) => sum + line.quantity, 0)
  const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)

  const value = useMemo<CartContextValue>(
    () => ({ lines, count, subtotal, add, setQuantity, remove, restore, clear }),
    [lines, count, subtotal, add, setQuantity, remove, restore, clear]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const value = useContext(CartContext)
  if (!value) throw new Error('useCart must be used within a CartProvider')
  return value
}
