import { detailFor, type AddOutcome } from './cart'
import { findProduct, type CatalogProduct } from './catalog'

type AddFn = (product: CatalogProduct, opts: { size?: string; colourId?: string; quantity: number }) => AddOutcome
type ToastFn = (options: { title: string }) => unknown

/**
 * The one-click "Add to cart" a product card offers, everywhere one appears (the Shop grid,
 * a product page's own related grid): the first size and first colour where the product offers
 * either, quantity 1, with a toast naming whichever it chose -- or, once that line already holds the most the store will let it, a toast saying
 * so instead of repeating "Added" for something that didn't happen. Shared so the two grids can
 * never drift onto two different ideas of what a quick add means.
 */
/** "Added {name} ({detail})", or just "Added {name}" for a product with nothing to choose. Shared
 *  with Product.tsx's own Add to cart, so the two toasts can never word it differently. */
export function addedTitle(name: string, detail: string | undefined): string {
  return detail ? `Added ${name} (${detail})` : `Added ${name}`
}

export function quickAddToCart(add: AddFn, toast: ToastFn, productId: string): void {
  const product = findProduct(productId)!
  // Most Hexline products come one way: `sizes` and `colours` are both empty, and both of these
  // are `undefined`.
  const size: string | undefined = product.sizes[0]
  const colour: { id: string; label: string } | undefined = product.colours[0]
  const outcome = add(product, { quantity: 1, size, colourId: colour?.id })
  if (outcome === 'at-max') {
    toast({ title: `You already have the most we can sell of ${product.name}.` })
    return
  }
  toast({ title: addedTitle(product.name, detailFor(size, colour?.label)) })
}
