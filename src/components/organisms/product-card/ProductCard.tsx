import type { ReactNode, Ref } from 'react'
import { Package } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { formatMoney } from '../../../lib/money'
import { renderAnchor, type LinkRenderProps } from '../../../lib/render-link'
import { Badge, Button } from '../../atoms'
import { Card, CardBody, CardFooter, CardTitle, Rating } from '../../molecules'

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

export type ProductCardProps = {
  product: Product
  /** Draws Add to cart. Omit it for a card that only links to the product. */
  onAddToCart?: (product: Product) => void
  /** @default 3 */
  headingLevel?: 2 | 3 | 4
  /** @default 'EUR' */
  currency?: string
  /** @default 'en-IE' */
  locale?: string
  /** @default a plain anchor */
  renderLink?: (props: LinkRenderProps) => ReactNode
  /** Draws the picture instead of `product.image` (or the placeholder): a shop that stages its
   *  products, say. Keep the card's 4:3 box and keep it decorative; the badge still sits over it.
   *  @default the product's image, 4:3, cover */
  renderMedia?: (product: Product) => ReactNode
  className?: string
  ref?: Ref<HTMLElement>
}

/** The name's link stretches over the card through its ::after, which is also where its focus ring
 *  is drawn: around the whole card, outside it. */
const STRETCHED_LINK = cn(
  'outline-none hover:underline underline-offset-2',
  "after:absolute after:inset-0 after:content-['']",
  'focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-[var(--color-focus-ring)]'
)

/**
 * One product as one link: a click anywhere on the card opens it, and Add to cart sits above the
 * link as its own control.
 *
 * Contrast rows, by exact name, on a card on the page (raised over base): name and price "text.primary
 * on surface.raised (over surface.base)"; old price and review count "alert body and ghost dismiss
 * (text.secondary) on surface.raised (over surface.base)"; stars "rating filled star
 * (accent.signal.fill) on surface.raised (over surface.base)" and "rating empty star
 * (border.selection) on surface.raised (over surface.base)"; badge and Add to cart
 * "accent.signal.ink on accent.signal.fill"; the button's ring "focus ring (focus.ring) on
 * surface.raised (over surface.base)". Inside another raised surface each of those becomes its
 * "... on surface.raised nested in surface.raised (over surface.base)" row. The card's own ring is
 * outside it: "focus.ring on surface.base" or "focus ring (focus.ring) on surface.raised (over
 * surface.base)".
 */
export function ProductCard({
  product,
  onAddToCart,
  headingLevel = 3,
  currency,
  locale,
  renderLink = renderAnchor,
  renderMedia,
  className,
  ref,
}: ProductCardProps) {
  const money = (minorUnits: number) => formatMoney(minorUnits, { currency, locale })
  return (
    // `interactive`: the whole card is one click target (the stretched link), so it takes the
    // system's interactive-card treatment. Always, never a prop: a ProductCard is always a link.
    <Card ref={ref} interactive className={cn('h-full', className)}>
      {/* The badge sits over the picture's corner, out of the text flow: in a row of cards where
          only some carry one, a badge above the name would push that card's name, rating and
          price a line lower than its neighbours'. It stays ahead of the name in the DOM, so it is
          still read first. */}
      <div data-product-media className="relative">
        {/* A slot, not a stage prop: how a shop presents its products (a studio plinth for the
            demo's replicas) is the shop's look, not the system's. The card keeps the box, the
            badge and the link. */}
        {renderMedia ? (
          renderMedia(product)
        ) : product.image ? (
          <img
            src={product.image.src}
            alt={product.image.alt ?? ''}
            loading="lazy"
            className="aspect-[4/3] w-full object-cover"
          />
        ) : (
          <div aria-hidden="true" className="flex aspect-[4/3] items-center justify-center bg-[var(--color-surface-sunken)]">
            <Package className="w-10 h-10 text-[var(--color-text-muted)]" />
          </div>
        )}
        {product.badge ? (
          <Badge tone="signal" emphasis="solid" className="absolute left-3 top-3">
            {product.badge}
          </Badge>
        ) : null}
      </div>
      <CardBody className="flex flex-col gap-2">
        <CardTitle level={headingLevel} className="text-base">
          {renderLink({ href: product.href, className: STRETCHED_LINK, children: product.name })}
        </CardTitle>
        {product.rating ? (
          <p className="flex items-center gap-2">
            <Rating value={product.rating.value} label={product.name} size="sm" />
            <span className="font-mono text-xs tabular-nums text-[var(--color-text-secondary)]">
              {product.rating.count} reviews
            </span>
          </p>
        ) : null}
        <p className="font-mono text-base tabular-nums text-[var(--color-text-primary)]">
          <span className="sr-only">Price: </span>
          {money(product.price)}
          {product.compareAtPrice !== undefined ? (
            <>
              {' '}
              <s className="ml-1 text-sm text-[var(--color-text-secondary)]">
                <span className="sr-only">was </span>
                {money(product.compareAtPrice)}
              </s>
            </>
          ) : null}
        </p>
      </CardBody>
      {product.soldOut || onAddToCart ? (
        <CardFooter className="justify-start">
          {product.soldOut ? (
            <Button variant="secondary" disabled>
              Sold out
            </Button>
          ) : (
            // Above the stretched link, so it stays its own target. A div, because
            // .bevel-focus-wrap sets `position` outside Tailwind's layers.
            <div className="relative z-10">
              {/* aria-label, not a visible-text-plus-sr-only-span suffix: `.sr-only` sets
                  `position: absolute`, which forces the span's used `display` to `block` -- and
                  Chromium's real accessible-name computation inserts a separating space at a
                  block-box boundary, turning "Add to cart: Kestrel K compact replica" into "Add to cart :
                  Kestrel K compact replica" (an extra space before the colon) in the browser, even though
                  jsdom's name computation did not reproduce it (confirmed directly: an inline,
                  non-positioned span with the same text gives the right name; a positioned one,
                  `.sr-only` or not, does not). An aria-label is one flat string with no box
                  boundary to insert a space at, so it renders the same name in both. The visible
                  text still starts the accessible name (SC 2.5.3): aria-label is exactly "Add to
                  cart" followed by the product name. */}
              <Button aria-label={`Add to cart: ${product.name}`} onClick={() => onAddToCart?.(product)}>
                Add to cart
              </Button>
            </div>
          )}
        </CardFooter>
      ) : null}
    </Card>
  )
}

export type ProductGridProps = Omit<ProductCardProps, 'product' | 'className' | 'ref'> & {
  products: Product[]
  /** Required: the list's accessible name, e.g. "Replicas". */
  label: string
  /** @default 'No products match.' */
  emptyMessage?: string
  className?: string
  ref?: Ref<HTMLUListElement>
}

/** A list of product cards whose columns follow the space it is given (container queries), not
 *  the viewport. `ref` and `className` land on the list itself, not the `@container` wrapper. */
export function ProductGrid({
  products,
  label,
  emptyMessage = 'No products match.',
  className,
  ref,
  ...card
}: ProductGridProps) {
  const empty = products.length === 0
  return (
    <div className="@container">
      {/* Persistent across every render, whether or not there are products: a role="status" that
          only ever appears already carrying its message -- mounted fresh the moment a filter
          empties the list, as this used to do by returning a completely different element in that
          branch -- is not reliably announced by NVDA or JAWS. A live region has to already exist
          for a later change to its text to be picked up as an update. sr-only while there is
          nothing to say, so it stays out of the way without ever leaving the accessibility tree. */}
      <p
        role="status"
        className={cn('font-body text-sm text-[var(--color-text-secondary)]', empty ? undefined : 'sr-only')}
      >
        {empty ? emptyMessage : ''}
      </p>
      <ul
        ref={ref}
        role="list"
        aria-label={label}
        // Hidden while empty (rather than swapped for a different element), so the ref and the
        // list's node identity stay stable across the products/empty transition, and an empty
        // list is never announced as "list, 0 items".
        hidden={empty}
        className={cn('grid grid-cols-1 gap-4 @xl:grid-cols-2 @3xl:grid-cols-3', className)}
      >
        {products.map((product, index) => (
          <li key={index}>
            <ProductCard product={product} {...card} />
          </li>
        ))}
      </ul>
    </div>
  )
}
