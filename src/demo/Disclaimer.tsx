import { cn } from '../lib/cn'
import { DISCLAIMER } from './content'

/**
 * The store's disclaimer, rendered from the one `DISCLAIMER` constant. Every page that shows a
 * product carries it in the page body (home, shop, product, cart, checkout), and the demo Footer
 * carries it on every page as its tagline. Small secondary text on purpose: it is a statement of
 * what the products are, not a warning banner.
 *
 * `text.secondary` at 14px on `surface.base`, the gated pair every plain page body already uses.
 */
export function Disclaimer({ className }: { className?: string }) {
  return (
    <p data-disclaimer className={cn('font-body text-sm text-[var(--color-text-secondary)]', className)}>
      {DISCLAIMER}
    </p>
  )
}
