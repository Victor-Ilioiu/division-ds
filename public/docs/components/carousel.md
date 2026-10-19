# Carousel

> A row of items that scrolls sideways. The browser does the scrolling, and Previous and Next move it a page at a time. Nothing ever moves on its own.

- **Best for:** A sideways preview of more items than fit, with a link to the full list nearby.
- **Not for:** A few items that fit: use a grid. And it's not for the only copy of anything.
- Organism. Source: `src/components/organisms/carousel/Carousel.tsx`
- Rendered docs page: `/components/carousel`

## Import

```tsx
import { Carousel } from 'src/components/organisms/carousel/Carousel'
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` |  | Required. The region's accessible name (the name a screen reader announces), for example "Offers". Leaving it out is a compile error. |
| `children` | `ReactNode` |  | Each child becomes one list item and keeps its own key. |
| `itemWidth` | `string` | `'min(18rem, 80%)'` | Any CSS length. A percentage is a share of the track's width. Keep it under the full width, so the edge of the next item shows. |
| `gutter` | `string` | `'0.5rem'` | The space between the track's edge and the first and last item, in any CSS length (rem is a unit tied to the base text size). It's never less than 0.5rem, whatever you pass, because an edge item draws its focus ring there. Set it to the page gutter to run the track edge to edge. |
| `className` | `string` |  | Merged onto the region. |
| `ref` | `Ref<HTMLElement>` |  | Forwarded to the region. |

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Product cards

```tsx
const photo = (id: string) => ({ src: `/media/products/${id}.webp` })

const OFFERS: Product[] = [
  { id: 'kestrel-k', name: 'Kestrel K compact replica', href: '#kestrel-k', price: 12900, compareAtPrice: 14900, badge: 'Sale' },
  { id: 'field-goggles', name: 'Field goggles', href: '#field-goggles', price: 3400, compareAtPrice: 3900, badge: 'Sale' },
  { id: 'beam-600', name: 'Beam 600 rail light', href: '#beam-600', price: 2400, compareAtPrice: 2900 },
  { id: 'speed-loader', name: 'Speed loader, 150 BBs', href: '#speed-loader', price: 790, compareAtPrice: 990 },
  { id: 'magazine-amber', name: 'Amber magazine, 48 BBs', href: '#magazine-amber', price: 890, compareAtPrice: 1090 },
  { id: 'knee-pads', name: 'Knee pads, pair', href: '#knee-pads', price: 2400, compareAtPrice: 2900 },
].map(product => ({ ...product, image: photo(product.id) }))

function ProductCardsExample() {
  const { toast } = useToast()
  return (
    <Carousel label="Offers" itemWidth="min(16rem, 80%)">
      {OFFERS.map(product => (
        <ProductCard
          key={product.id}
          product={product}
          headingLevel={4}
          onAddToCart={added => toast({ title: 'Added to cart', description: added.name, tone: 'ok' })}
        />
      ))}
    </Carousel>
  )
}

<ProductCardsExample />
```

### Nothing inside takes keyboard focus, so the Tab key stops on the track itself

```tsx
const STEPS = ['Unload', 'Disconnect', 'Wipe down', 'Clean the barrel', 'Check the hop-up', 'Store']

<Carousel label="Cleaning steps" itemWidth="12rem">
  {STEPS.map((step, index) => (
    <div
      key={step}
      className="flex h-28 flex-col justify-between border border-[var(--color-border-hairline-strong)] p-4"
    >
      <span className="font-mono text-xs tabular-nums text-[var(--color-text-secondary)]">
        {String(index + 1).padStart(2, '0')}
      </span>
      <span className="font-display font-semibold text-[var(--color-text-primary)]">{step}</span>
    </div>
  ))}
</Carousel>
```

### Three short items: both buttons do nothing while everything fits

```tsx
<Carousel label="Kestrel lengths" itemWidth="8rem">
  {['Kestrel K', 'Kestrel C', 'Kestrel L'].map(name => (
    <div
      key={name}
      className="flex h-20 items-center justify-center border border-[var(--color-border-hairline-strong)] font-display font-semibold text-[var(--color-text-primary)]"
    >
      {name}
    </div>
  ))}
</Carousel>
```

## Keyboard

| Keys | Result |
|---|---|
| `Tab` | Moves to Previous, then Next, then through anything focusable in each item. An item scrolls into view as it takes focus. |
| `Enter` `Space` | On Previous or Next, scrolls one page of items. Does nothing (it's inert) at the matching end. |
| `←` `→` | Scroll the track when the track itself has focus. The track is only a tab stop when no item holds anything focusable. |

## Do

- Name it for what it holds: "Offers", "Top-rated accessories".
- Give it enough items to scroll. Three that fit are a grid.
- Link to the full list nearby. A carousel is a preview, so it shouldn't be the only way to reach the rest.
- Set the gutter to the page gutter when the track should run to the edge of the page.

## Don't

- Don't add autoplay. Content that moves on its own needs a pause control, and it pulls attention away from whoever's reading the page.
- Don't put the only copy of anything in it. What's off to the side is easy to miss.
- Don't hide the buttons on touch screens. A pointer, a switch device or a screen magnifier may be all someone has.
- Don't wrap it in an element with overflow hidden to tidy the edges. That clips the focus ring the gutter is there to show.

## Anatomy

- **Region**: A section with aria-roledescription="carousel", named by the label. (ARIA, Accessible Rich Internet Applications, is a set of attributes that tell screen readers what an element is.)
- **Position**: Monospaced text such as "1 to 3 of 8", saying which items are showing. It updates on every scroll, but it isn't a live region, so screen readers don't read it out each time.
- **Previous / Next**: Secondary IconButtons, placed before the items in the Tab order. At the ends they're marked aria-disabled instead of disabled, so each stays a tab stop (a place the Tab key lands).
- **Track**: A list that's the browser's own scroll container, with scroll snap and no visible scrollbar. It's padded on all four sides, so an item at the edge draws its focus ring inside the track.
- **Item**: A list item, one per child, at the item width. The edge of the next one always shows.
- **Status**: Hidden from view, read by screen readers. Says where the track stopped after a press on Previous or Next.
