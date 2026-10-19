# ProductCard

> One product as one link. Clicking anywhere on the card opens it, Add to cart stays a separate control, and a grid of cards adapts to the space it's given.

- **Best for:** One product in a shop grid, where the whole card opens it and Add to cart sits on it.
- **Not for:** A general content panel: use Card.
- Organism. Source: `src/components/organisms/product-card/ProductCard.tsx`
- Rendered docs page: `/components/product-card`

## Import

```tsx
import { ProductCard, ProductGrid } from 'src/components/organisms/product-card/ProductCard'
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `product (ProductCard)` | `Product` |  | Required. id, name, href and price (in the currency's minor unit, so cents for EUR). rating, image, badge and soldOut are optional. |
| `onAddToCart` | `(product: Product) => void` |  | Draws Add to cart. Leave it out for a card that only links to the product. |
| `headingLevel` | `2 \| 3 \| 4` | `3` | Pick the level that fits the page's heading outline. |
| `currency` | `string` | `'EUR'` | Passed to formatMoney. |
| `locale` | `string` | `'en-IE'` | Passed to formatMoney. |
| `renderLink` | `(props: LinkRenderProps) => ReactNode` | `a plain anchor` | Draws the name's link. It must pass className through, because that class carries the stretched click area and the focus ring. |
| `renderMedia` | `(product: Product) => ReactNode` | `the product's image, 4:3, cover` | Draws the picture instead of the image or the placeholder, for example a staged cutout. Keep the 4:3 box and keep it decorative. The badge still sits over it. |
| `className (ProductCard)` | `string` |  | Merged with the root classes. Later Tailwind utilities win. |
| `ref (ProductCard)` | `Ref<HTMLElement>` |  | Points at the article element. |
| `products (Grid)` | `Product[]` |  | Required. |
| `label (Grid)` | `string` |  | Required. The list's accessible name, the name a screen reader announces for it. |
| `emptyMessage (Grid)` | `string` | `'No products match.'` | Announced by a status message that's always on the page when products is empty. The list itself keeps rendering (so its ref stays stable), but it's hidden while there's nothing in it. |
| `className (Grid)` | `string` |  | Merged with the list's own classes. Later Tailwind utilities win. |
| `ref (Grid)` | `Ref<HTMLUListElement>` |  | Points at the list element. |

## Types and helpers

Exported beside the component, from the same file. Import a type with `import type { ... }`.

```ts
export type Product = {
  id: string
  name: string
  href: string
  /** In the currency's minor unit (cents for EUR). */
  price: number
  /** The price before a sale, in the currency's minor unit (cents for EUR): struck through, and
   *  read as "was". */
  compareAtPrice?: number
  rating?: { value: number; count: number }
  /** Without one, the card draws a decorative placeholder. `alt` defaults to '': the title names
   *  the product. */
  image?: { src: string; alt?: string }
  /** A short solid tag, e.g. "New" or "Sale". */
  badge?: string
  soldOut?: boolean
}
```

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### One product

```tsx
const REPLICA: Product = {
  id: 'kestrel-k',
  name: 'Kestrel K compact replica',
  href: '#kestrel-k',
  price: 12900,
  compareAtPrice: 14900,
  rating: { value: 4.5, count: 128 },
  badge: 'Sale',
}

function OneProductExample() {
  const { toast } = useToast()
  return (
    <div className="max-w-xs">
      <ProductCard
        product={REPLICA}
        headingLevel={4}
        onAddToCart={product => toast({ title: 'Added to cart', description: product.name, tone: 'ok' })}
      />
    </div>
  )
}

<OneProductExample />
```

### A grid

```tsx
const RANGE: Product[] = [
  { id: 'kestrel-c', name: 'Kestrel C carbine replica', href: '#kestrel-c', price: 13900, rating: { value: 4.5, count: 212 } },
  { id: 'prism-holo-sight', name: 'Prism holo sight', href: '#prism-holo-sight', price: 4900, badge: 'New' },
  { id: 'speed-loader', name: 'Speed loader, 150 BBs', href: '#speed-loader', price: 790, rating: { value: 4, count: 87 } },
  { id: 'kestrel-l', name: 'Kestrel L rifle replica', href: '#kestrel-l', price: 15900, soldOut: true },
  { id: 'bbs-028', name: 'Precision BBs 0.28 g, 2,700', href: '#bbs-028', price: 590 },
  { id: 'field-goggles', name: 'Field goggles', href: '#field-goggles', price: 3400, compareAtPrice: 3900, badge: 'Sale' },
]

function AGridExample() {
  const { toast } = useToast()
  return (
    <ProductGrid
      label="Hexline range"
      products={RANGE}
      headingLevel={4}
      onAddToCart={product => toast({ title: 'Added to cart', description: product.name, tone: 'ok' })}
    />
  )
}

<AGridExample />
```

### A custom picture through renderMedia

```tsx
const STAGED: Product = { id: 'harrier-lr', name: 'Harrier LR bolt-action replica', href: '#harrier-lr', price: 17900, rating: { value: 4.5, count: 37 } }

<div className="max-w-xs">
  <ProductCard
    product={STAGED}
    headingLevel={4}
    renderMedia={product => (
      <div aria-hidden="true" className="flex aspect-[4/3] items-center justify-center bg-[var(--color-surface-sunken)] p-4">
        <img src={`/media/products/cutout/${product.id}-640.webp`} alt="" loading="lazy" className="max-h-full w-full object-contain" />
      </div>
    )}
  />
</div>
```

### Nothing matches

```tsx
<ProductGrid label="Hexline range, filtered" products={[]} emptyMessage="No products match these filters." />
```

## Keyboard

| Keys | Result |
|---|---|
| `Tab` | Moves to the product's link, then to Add to cart, then to the next card. |
| `Enter` | On the link, opens the product. On Add to cart, adds it. |

## Do

- Give the grid a label that says what it holds.
- Store prices in the currency's minor unit (cents for EUR). The card formats them.
- Pass headingLevel so the names fit the page's heading outline.

## Don't

- Don't put another link or button in the card body. Only Add to cart sits above the stretched link.
- Don't colour the price. It's text.primary.
- Don't write alt text (the image description for screen readers) that repeats the name.

## Anatomy

- **Image**: Optional. Without one, there's a decorative placeholder. renderMedia can draw something else in the same box.
- **Badge**: Optional. A short solid tag over the corner of the picture, like New or Sale. It sits outside the text flow, so names line up along a row of cards.
- **Name**: The heading, and the link. Its click area and its focus ring (the outline keyboard users see) cover the whole card.
- **Rating**: Optional. Screen readers hear the stars as 'rated 4.5 out of 5', and the review count is plain text.
- **Price**: In text.primary, with tabular (equal-width) figures. A sale adds the old price struck through, which screen readers hear as "was".
- **Add to cart**: Sits above the link as its own target, and it's named after the product.
