import { Link as RouterLink } from 'react-router-dom'
import { Button, linkVariants } from '../../components/atoms'
import { Cart as CartOrganism } from '../../components/organisms/cart/Cart'
import { Disclaimer } from '../Disclaimer'
import { DEFAULT_PAGE } from '../DefaultPage'
import { routerLink } from '../routerLink'
import { useCart } from '../store/cart'
import { RouteNotice } from './auth/RouteNotice'

/**
 * The cart, on its own page rather than only in the Navbar's sheet -- reached from there ("View
 * cart") or from a redirect ({@link RouteNotice}'s own notice: checkout bounces here when there
 * is nothing to check out). `Cart` itself hides its `footer` while empty (there is nothing to
 * check out yet), so the empty state gets its own "Browse the shop" line here rather than a
 * footer link that would otherwise never render.
 */
export function Cart() {
  const { lines, setQuantity, remove, restore } = useCart()

  return (
    <div className={`${DEFAULT_PAGE} py-12 flex flex-col gap-6`}>
      <h1 className="font-display font-semibold text-2xl text-[var(--color-text-primary)]">Your cart</h1>
      <RouteNotice />
      <CartOrganism
        lines={lines}
        onQuantityChange={setQuantity}
        onRemove={remove}
        onRestore={restore}
        renderLink={routerLink}
        headingLevel={2}
        footer={
          <>
            <Button asChild variant="primary">
              <RouterLink to="/store/checkout">Checkout</RouterLink>
            </Button>
            <Button asChild variant="secondary">
              <RouterLink to="/store/shop">Continue shopping</RouterLink>
            </Button>
          </>
        }
      />
      {lines.length === 0 ? (
        <p className="font-body text-sm text-[var(--color-text-secondary)]">
          <RouterLink to="/store/shop" className={linkVariants()}>
            Browse the shop
          </RouterLink>
        </p>
      ) : null}
      <Disclaimer />
    </div>
  )
}
