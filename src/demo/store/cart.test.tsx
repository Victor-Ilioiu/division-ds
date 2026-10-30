import type { ReactNode } from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { findProduct } from './catalog'
import { CartProvider, useCart, type AddOutcome } from './cart'

// bump-helmet's own stock (8) sits below the store's flat ceiling of 10, so it is the product
// several tests below use to prove the per-product cap. The speed loader's stock (16) sits above it,
// so it is what proves the flat ceiling itself still applies when a product has plenty to sell.
const HELMET = findProduct('bump-helmet')!
const LOADER = findProduct('speed-loader')!

function wrapper({ children }: { children: ReactNode }) {
  return <CartProvider>{children}</CartProvider>
}

function renderCart() {
  return renderHook(() => useCart(), { wrapper })
}

afterEach(() => {
  sessionStorage.clear()
  vi.restoreAllMocks()
})

describe('useCart', () => {
  it('adding the same variant twice gives one line with quantity 2', () => {
    const { result } = renderCart()
    act(() => result.current.add(HELMET, { size: 'S/M', colourId: 'black', quantity: 1 }))
    act(() => result.current.add(HELMET, { size: 'S/M', colourId: 'black', quantity: 1 }))
    expect(result.current.lines).toHaveLength(1)
    expect(result.current.lines[0].quantity).toBe(2)
    expect(result.current.lines[0].detail).toBe('Size S/M · Black')
  })

  it('gives two lines for the same product in different sizes', () => {
    const { result } = renderCart()
    act(() => result.current.add(HELMET, { size: 'S/M', colourId: 'black', quantity: 1 }))
    act(() => result.current.add(HELMET, { size: 'M/L', colourId: 'black', quantity: 1 }))
    expect(result.current.lines).toHaveLength(2)
    expect(result.current.lines.map(line => line.id)).toEqual([
      'bump-helmet:S/M:black',
      'bump-helmet:M/L:black',
    ])
  })

  it('sums quantities into count and unitPrice x quantity into subtotal', () => {
    const { result } = renderCart()
    act(() => result.current.add(HELMET, { size: 'S/M', colourId: 'black', quantity: 2 }))
    act(() => result.current.add(HELMET, { size: 'M/L', colourId: 'tan', quantity: 3 }))
    expect(result.current.count).toBe(5)
    expect(result.current.subtotal).toBe(HELMET.price * 5)
  })

  it('clamps a line quantity to the store’s flat ceiling of 10 when the product has plenty of stock', () => {
    const { result } = renderCart()
    act(() => result.current.add(LOADER, { quantity: 8 }))
    act(() => result.current.add(LOADER, { quantity: 8 }))
    expect(result.current.lines[0].quantity).toBe(10)
  })

  // The per-product half of the same ceiling: bump-helmet's own stock (8) binds before the
  // store's flat 10 ever would.
  // Mutation: change `maxQuantityFor` in cart.tsx to always return `MAX_QUANTITY`, ignoring
  // `product.stock` -> the line below clamps to 10 instead of 8.
  it('clamps a line quantity to the product’s own stock when it sits below the flat ceiling', () => {
    const { result } = renderCart()
    act(() => result.current.add(HELMET, { size: 'S/M', colourId: 'black', quantity: 8 }))
    act(() => result.current.add(HELMET, { size: 'S/M', colourId: 'black', quantity: 8 }))
    expect(result.current.lines[0].quantity).toBe(8)
    expect(result.current.lines[0].maxQuantity).toBe(8)
  })

  // Mutation: change the `maxQuantity < 1 || (existing && existing.quantity >= maxQuantity)`
  // check in `add` to `false` -> this returns `'added'` and grows the line past its own max.
  it("add returns 'at-max' once a line already holds the most its product can sell, without growing it", () => {
    const { result } = renderCart()
    act(() => result.current.add(HELMET, { size: 'S/M', colourId: 'black', quantity: 8 }))
    let outcome!: ReturnType<typeof result.current.add>
    act(() => {
      outcome = result.current.add(HELMET, { size: 'S/M', colourId: 'black', quantity: 1 })
    })
    expect(outcome).toBe('at-max')
    expect(result.current.lines[0].quantity).toBe(8)
  })

  it('restore puts a line back at its index', () => {
    const { result } = renderCart()
    act(() => result.current.add(HELMET, { size: 'S/M', colourId: 'black', quantity: 1 }))
    act(() => result.current.add(HELMET, { size: 'M/L', colourId: 'tan', quantity: 1 }))
    const removed = result.current.lines[0]
    act(() => result.current.remove(removed.id))
    expect(result.current.lines).toHaveLength(1)
    act(() => result.current.restore(removed, 0))
    expect(result.current.lines).toHaveLength(2)
    expect(result.current.lines[0]).toEqual(removed)
  })

  it('still renders and adds in memory when sessionStorage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })
    const { result } = renderCart()
    expect(result.current.lines).toEqual([])
    act(() => result.current.add(HELMET, { size: 'S/M', colourId: 'black', quantity: 1 }))
    expect(result.current.lines).toHaveLength(1)
  })

  it.each([
    ['null', 'null'],
    ['an empty object', '{}'],
    ['an array of empty objects', '[{}]'],
    ['a bare string', '"x"'],
  ])('renders with the fallback (empty cart) when storage holds %s', (_label, raw) => {
    sessionStorage.setItem('hexline-cart', raw)
    const { result } = renderCart()
    expect(result.current.lines).toEqual([])
    act(() => result.current.add(HELMET, { size: 'S/M', colourId: 'black', quantity: 1 }))
    expect(result.current.lines).toHaveLength(1)
  })

  // Tampered storage passes the shape check (`isCartItem`) -- it is a well-typed cart item -- but
  // is rebuilt from the catalogue rather than trusted, so an outrageous quantity never reaches a
  // consumer of `useCart()`.
  // Mutation: change `clampToMax` in cart.tsx to `Math.max(1, quantity)` (drop the upper `Math.min`)
  // -> the line below reads back at 1e6 instead of clamped to bump-helmet's own stock (8).
  it('clamps a tampered quantity of 1e6 to the product’s own stock on hydration', () => {
    sessionStorage.setItem(
      'hexline-cart',
      JSON.stringify([
        {
          id: 'bump-helmet:S/M:black',
          productId: 'bump-helmet',
          name: 'Bump helmet',
          href: '/store/shop/bump-helmet',
          unitPrice: 6900,
          quantity: 1e6,
        },
      ])
    )
    const { result } = renderCart()
    expect(result.current.lines).toHaveLength(1)
    expect(result.current.lines[0].quantity).toBe(8)
    expect(result.current.lines[0].maxQuantity).toBe(8)
  })

  // A hand-edited negative price is a shape a plain `Number.isFinite` check lets through -- it
  // never reaches a consumer, because the price is retaken from the catalogue, never storage.
  // Mutation: change `unitPrice: product.price` to `unitPrice: item.unitPrice` in cart.tsx's
  // `rehydrate` -> the line below reads back at -100000 instead of bump-helmet's real price.
  it('retakes the price from the catalogue on hydration, ignoring a tampered negative price', () => {
    sessionStorage.setItem(
      'hexline-cart',
      JSON.stringify([
        {
          id: 'bump-helmet:S/M:black',
          productId: 'bump-helmet',
          name: 'Bump helmet',
          href: '/store/shop/bump-helmet',
          unitPrice: -100000,
          quantity: 1,
        },
      ])
    )
    const { result } = renderCart()
    expect(result.current.lines[0].unitPrice).toBe(HELMET.price)
  })

  // An unknown productId -- one a tampered value could point anywhere, including a `javascript:`
  // href nothing in this store ever wrote -- is dropped outright rather than rendered, because a
  // line for it can never be rebuilt from a catalogue that has nothing by that id.
  // Mutation: change `if (!product) continue` to `if (false) continue` in cart.tsx's `rehydrate`
  // -> the line below survives hydration with the tampered href intact.
  it('drops a line for an unknown product on hydration, including a javascript: href', () => {
    sessionStorage.setItem(
      'hexline-cart',
      JSON.stringify([
        {
          id: 'not-a-real-product:-:-',
          productId: 'not-a-real-product',
          name: 'Not a real product',
          href: 'javascript:alert(1)',
          unitPrice: 100,
          quantity: 1,
        },
      ])
    )
    const { result } = renderCart()
    expect(result.current.lines).toEqual([])
  })

  // Two stored lines sharing an id -- a duplicate from a hand-edited value, or an older version
  // of this store -- merge into one line on hydration rather than rendering as two rows nothing
  // here could tell apart.
  // Mutation: change the `merged.set(item.id, ...)` call in cart.tsx's `rehydrate` to always
  // overwrite instead of checking `merged.get(item.id)` first -> the line below reads back at
  // quantity 2 (the second entry alone) instead of 5 (both merged).
  it('merges two stored lines that share an id on hydration, instead of keeping both', () => {
    sessionStorage.setItem(
      'hexline-cart',
      JSON.stringify([
        {
          id: 'bump-helmet:S/M:black',
          productId: 'bump-helmet',
          name: 'Bump helmet',
          href: '/store/shop/bump-helmet',
          unitPrice: 6900,
          quantity: 2,
        },
        {
          id: 'bump-helmet:S/M:black',
          productId: 'bump-helmet',
          name: 'Bump helmet',
          href: '/store/shop/bump-helmet',
          unitPrice: 6900,
          quantity: 3,
        },
      ])
    )
    const { result } = renderCart()
    expect(result.current.lines).toHaveLength(1)
    expect(result.current.lines[0].quantity).toBe(5)
  })

  // A stale or hand-edited stored `id` must not decide which lines merge: hydration recomputes it
  // from the item's own productId/size/colourId, the same formula `add` itself uses, so a wrong
  // stored id can neither wrongly merge two real variants nor survive onto the rebuilt line.
  // Mutation: change `rehydrate` in cart.tsx to key and build each line on `item.id` again instead
  // of the computed `lineId(...)` -> both lines below share the stale stored id, "one-line", and
  // merge into a single line at quantity 2 instead of staying apart at quantity 1 each.
  it("rebuilds a stored line's id from its own size and colour, so two different variants sharing a stale stored id do not merge", () => {
    sessionStorage.setItem(
      'hexline-cart',
      JSON.stringify([
        {
          id: 'one-line',
          productId: 'bump-helmet',
          name: 'Bump helmet',
          href: '/store/shop/bump-helmet',
          unitPrice: 6900,
          quantity: 1,
          size: 'S/M',
          colourId: 'black',
        },
        {
          id: 'one-line',
          productId: 'bump-helmet',
          name: 'Bump helmet',
          href: '/store/shop/bump-helmet',
          unitPrice: 6900,
          quantity: 1,
          size: 'M/L',
          colourId: 'tan',
        },
      ])
    )
    const { result } = renderCart()
    expect(result.current.lines).toHaveLength(2)
    expect(result.current.lines.map(line => line.id)).toEqual([
      'bump-helmet:S/M:black',
      'bump-helmet:M/L:tan',
    ])
    expect(result.current.lines.map(line => line.quantity)).toEqual([1, 1])
  })

  // `add`'s outcome has to be decided from the cart's true current lines, not from a `lines`
  // closure captured when this render started: two `add` calls fired in the same event both need
  // to see what the first one just did, before React has re-rendered in response to either.
  // Mutation: in cart.tsx's `add`, read `lines` (the state closure) instead of `linesRef.current`
  // -> both calls below read the same stale (empty) snapshot and this returns ['added', 'added']
  // instead of ['added', 'at-max'].
  it("two add calls to an already-full variant in the same event return 'added' then 'at-max'", () => {
    const { result } = renderCart()
    let outcomes: AddOutcome[] = []
    act(() => {
      outcomes = [
        result.current.add(HELMET, { size: 'S/M', colourId: 'black', quantity: 8 }),
        result.current.add(HELMET, { size: 'S/M', colourId: 'black', quantity: 1 }),
      ]
    })
    expect(outcomes).toEqual(['added', 'at-max'])
    expect(result.current.lines).toHaveLength(1)
    expect(result.current.lines[0].quantity).toBe(8)
  })

  it('restore merges into an existing line with the same id instead of duplicating it', () => {
    const { result } = renderCart()
    act(() => result.current.add(HELMET, { size: 'S/M', colourId: 'black', quantity: 3 }))
    const removed = result.current.lines[0]
    act(() => result.current.remove(removed.id))
    act(() => result.current.add(HELMET, { size: 'S/M', colourId: 'black', quantity: 4 }))
    act(() => result.current.restore(removed, 0))
    expect(result.current.lines).toHaveLength(1)
    expect(result.current.lines[0].quantity).toBe(7)
  })

  it('clamps a restored merge to the flat ceiling of 10 when the product has plenty of stock', () => {
    const { result } = renderCart()
    act(() => result.current.add(LOADER, { quantity: 8 }))
    const removed = result.current.lines[0]
    act(() => result.current.remove(removed.id))
    act(() => result.current.add(LOADER, { quantity: 8 }))
    act(() => result.current.restore(removed, 0))
    expect(result.current.lines).toHaveLength(1)
    expect(result.current.lines[0].quantity).toBe(10)
  })

  // Mutation: change `maxQuantityFor` in cart.tsx to always return `MAX_QUANTITY`, ignoring
  // `product.stock` -> the line below merges to 10 instead of clamping at bump-helmet's own
  // stock of 8.
  it('clamps a restored merge to the product’s own stock when it sits below the flat ceiling', () => {
    const { result } = renderCart()
    act(() => result.current.add(HELMET, { size: 'S/M', colourId: 'black', quantity: 8 }))
    const removed = result.current.lines[0]
    act(() => result.current.remove(removed.id))
    act(() => result.current.add(HELMET, { size: 'S/M', colourId: 'black', quantity: 8 }))
    act(() => result.current.restore(removed, 0))
    expect(result.current.lines).toHaveLength(1)
    expect(result.current.lines[0].quantity).toBe(8)
  })

  it('setQuantity(0) clamps up to 1', () => {
    const { result } = renderCart()
    act(() => result.current.add(HELMET, { size: 'S/M', colourId: 'black', quantity: 3 }))
    const id = result.current.lines[0].id
    act(() => result.current.setQuantity(id, 0))
    expect(result.current.lines[0].quantity).toBe(1)
  })

  it('setQuantity ignores a non-finite value', () => {
    const { result } = renderCart()
    act(() => result.current.add(HELMET, { size: 'S/M', colourId: 'black', quantity: 3 }))
    const id = result.current.lines[0].id
    act(() => result.current.setQuantity(id, Number.NaN))
    expect(result.current.lines[0].quantity).toBe(3)
  })

  it('clear empties the cart', () => {
    const { result } = renderCart()
    act(() => result.current.add(HELMET, { size: 'S/M', colourId: 'black', quantity: 3 }))
    act(() => result.current.clear())
    expect(result.current.lines).toEqual([])
    expect(result.current.count).toBe(0)
  })

  it('keeps stable add/clear identities across a re-render with no line changes', () => {
    const { result, rerender } = renderCart()
    const firstAdd = result.current.add
    const firstClear = result.current.clear
    rerender()
    expect(result.current.add).toBe(firstAdd)
    expect(result.current.clear).toBe(firstClear)
  })
})
