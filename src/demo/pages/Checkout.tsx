import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import type { SelectOption } from '../../components/atoms'
import { useToast } from '../../components/molecules'
import { CheckoutForm, type CheckoutOrder } from '../../components/organisms/checkout-form/CheckoutForm'
import { ApiError, placeOrder, REJECTED_POSTAL_CODE } from '../store/api'
import { Disclaimer } from '../Disclaimer'
import { useCart, type CartItem } from '../store/cart'

const COUNTRIES: SelectOption[] = [
  { value: 'IE', label: 'Ireland' },
  { value: 'RO', label: 'Romania' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
]

/**
 * The checkout: `CheckoutForm` wired to the demo `api`, with the cart's own lines and this shop's
 * six countries. Sign-in is never required -- checkout works entirely as a guest, the same as the
 * cart it reads from.
 *
 * `placedLines` is a snapshot of the lines an order was just placed for, taken the moment
 * `placeOrder` resolves and passed to `CheckoutForm` in place of the (by then emptied) live cart --
 * `clear()` runs in the same handler right after, and this component itself keeps rendering for
 * the short window between that and the navigation actually landing (React Router wraps it in a
 * transition). Without the snapshot, that window would show an order summary with nothing in it.
 * It also stands in for the empty-cart guard below: once an order is placed the cart is correctly
 * empty, but that is no longer a reason to bounce to the cart page.
 *
 * `inFlight` collapses a second `onPlaceOrder` call, made while the first is still pending, into
 * the exact same promise rather than a second request -- `CheckoutForm`'s own `pending` state
 * already blocks a second submit once React has re-rendered with it set, but two submits that
 * both fire before that render lands (a fast double click) would otherwise still reach here twice.
 *
 * A result that lands after the person has already left this page is never dropped silently
 * either way it goes: a placed order still clears the cart and says so in a toast (above), and a
 * rejection that arrives the same way toasts its own failure instead -- there is nobody here to
 * read a form alert. The one rejection with a fix a person can act on -- the postal code `api.ts`
 * rejects on purpose -- resolves `onPlaceOrder` with `{ error }` instead of throwing, so
 * `CheckoutForm` can show that specific message in place of its generic one; every other
 * rejection is rethrown and keeps that generic text, because there is no equally specific, honest
 * thing to say about an offline trigger or a real bug.
 */
export function Checkout() {
  const { lines, clear } = useCart()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [placedLines, setPlacedLines] = useState<CartItem[] | null>(null)
  const mounted = useRef(true)
  const inFlight = useRef<Promise<{ error: string } | void> | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  if (placedLines === null && lines.length === 0) {
    return (
      <Navigate
        to="/demo/cart"
        replace
        state={{ notice: 'Your cart is empty, so there is nothing to check out yet.' }}
      />
    )
  }

  const runPlaceOrder = async (order: CheckoutOrder): Promise<{ error: string } | void> => {
    try {
      const { orderNumber } = await placeOrder(order)
      if (!mounted.current) {
        // Never dropped silently: the page isn't there anymore to show a confirmation, so the
        // result travels as a toast instead. Navigating a component that isn't mounted would
        // otherwise carry the app somewhere nobody asked it to go.
        clear()
        toast({ title: `Order ${orderNumber} placed.` })
        return
      }
      setPlacedLines(lines)
      clear()
      navigate('/demo/checkout/confirmation', {
        state: { order: { orderNumber, email: order.email, total: order.total, lines } },
      })
    } catch (e) {
      if (!mounted.current) {
        toast({ tone: 'hostile', title: 'Your order was not placed.' })
        return
      }
      if (e instanceof ApiError && order.shipping.postalCode === REJECTED_POSTAL_CODE) {
        return {
          error: 'We could not deliver to that postal code. Go back to Shipping to change it, then place the order again.',
        }
      }
      throw e
    } finally {
      inFlight.current = null
    }
  }

  const handlePlaceOrder = (order: CheckoutOrder): Promise<{ error: string } | void> => {
    if (inFlight.current) return inFlight.current
    const attempt = runPlaceOrder(order)
    inFlight.current = attempt
    return attempt
  }

  return (
    <div className="px-gutter py-12 flex flex-col gap-6">
      <h1 className="font-display font-semibold text-2xl text-[var(--color-text-primary)]">Hexline checkout</h1>
      <CheckoutForm
        lines={placedLines ?? lines}
        countries={COUNTRIES}
        onPlaceOrder={handlePlaceOrder}
        headingLevel={2}
      />
      <Disclaimer />
    </div>
  )
}
