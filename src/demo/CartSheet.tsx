import { useEffect, useState } from 'react'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import { ShoppingBag } from 'lucide-react'
import { Badge } from '../components/atoms/badge/Badge'
import { Button } from '../components/atoms/button/Button'
import { IconButton } from '../components/atoms/icon-button/IconButton'
import { Cart } from '../components/organisms/cart/Cart'
import { Sheet, SheetContent, SheetTrigger } from '../components/organisms/sheet/Sheet'
import { routerLink } from './routerLink'
import { useCart } from './store/cart'

function cartLabel(count: number): string {
  return count === 1 ? 'Cart, 1 item' : `Cart, ${count} items`
}

/**
 * The Navbar's cart control: an icon button whose accessible name always carries the item count,
 * opening a Sheet with the Cart organism. The visible count Badge is `aria-hidden` -- the name
 * already says it -- and sits outside the IconButton's own bevelled wrapper, in a `relative`
 * span, because the bevel clips an absolutely-positioned child drawn inside it.
 *
 * Choosing either footer link closes the sheet itself (a controlled `open`) before the router
 * navigates, the same as the Navbar's own mobile menu sheet closes on a chosen link. That covers
 * the two footer links, but not a line's own product link (Cart's own `renderLink`, reached
 * through `useCart()`'s lines, never this component) -- so the sheet also closes on any change to
 * `pathname`, which catches every way a navigation can leave it open, footer and line link alike.
 */
export function CartSheet() {
  const { lines, count, setQuantity, remove, restore } = useCart()
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  const { pathname } = useLocation()

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <span className="relative inline-flex">
        <SheetTrigger asChild>
          <IconButton label={cartLabel(count)} variant="ghost" size="sm">
            <ShoppingBag aria-hidden="true" className="w-4 h-4" />
          </IconButton>
        </SheetTrigger>
        {count > 0 ? (
          <Badge
            aria-hidden="true"
            tone="signal"
            emphasis="solid"
            className="absolute -top-1.5 -right-1.5 h-4 min-w-4 justify-center px-1 text-[10px] leading-none pointer-events-none"
          >
            {count}
          </Badge>
        ) : null}
      </span>
      <SheetContent title="Cart">
        <Cart
          lines={lines}
          onQuantityChange={setQuantity}
          onRemove={remove}
          onRestore={restore}
          renderLink={routerLink}
          title="Items"
          headingLevel={3}
          footer={
            <>
              <Button asChild variant="secondary" size="sm" onClick={close}>
                <RouterLink to="/store/cart">View cart</RouterLink>
              </Button>
              <Button asChild variant="primary" size="sm" onClick={close}>
                <RouterLink to="/store/checkout">Checkout</RouterLink>
              </Button>
            </>
          }
        />
      </SheetContent>
    </Sheet>
  )
}
