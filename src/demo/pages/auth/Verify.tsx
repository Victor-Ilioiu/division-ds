import { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthForm, type AuthErrors, type AuthMode, type AuthValues } from '../../../components/organisms/auth-form/AuthForm'
import { useToast } from '../../../components/molecules'
import { verifyCode } from '../../store/api'
import { useSession } from '../../store/session'
import { AUTH_PATHS, returnToFrom } from './authRoutes'
import { PageHeading } from './PageHeading'

/**
 * The two-step code after a correct password. `pendingEmail` is snapshotted once, on mount,
 * rather than read live: `signInAs` clears it in the same update that sets `user`, so a live read
 * would go null out from under a submit that is still in flight and about to succeed. Already
 * signed in ON ARRIVAL, this redirects straight to the shop with a notice, the same as SignIn and
 * CreateAccount -- checked before the pending-email guard below, though the two can never both
 * fire on arrival (`signInAs` clears `pendingEmail` in the same update that sets `user`). Both
 * snapshots are taken once, on mount, never read live, and for the same reason: this page's own
 * submit also sets `user` and navigates, in the same tick React Router wraps in a transition, so
 * a live read of `user` would flip true while this component is still the one mounted and send a
 * fresh, successful verification to the shop with the WRONG notice attached, rather than the
 * plain navigation its own `handleSubmit` already made. A direct load or a refresh with nothing
 * pending -- no sign-in happened first -- bounces back to sign-in with a notice instead of
 * showing a code form with no address behind it.
 *
 * A failure landing after the person has left this page still toasts -- there is no form left to
 * show an alert on -- but a success does not: `signInAs` never runs, so nothing durable happened
 * for anyone to be told about.
 *
 * `from` -- captured once, on mount, the same reasoning as `email` and `signedInOnArrival` just
 * below: SignIn's own `navigate` call already fixed it in this page's `Location.state` before
 * this component ever rendered, and it describes where the interrupted visit was headed, not
 * anything that changes while this form is on screen. Validated again here (`returnToFrom`,
 * `authRoutes.ts`) rather than trusted because SignIn already validated it: this page has no way
 * to tell a same-app `/demo/…` path SignIn forwarded untouched from one a future caller handed
 * `navigate` some other way, so it re-checks rather than assuming. A successful code lands there;
 * anything else (no `from`, or one that fails the check) lands on the shop, same as ever.
 */
export function Verify() {
  const { user, pendingEmail, signInAs } = useSession()
  const location = useLocation()
  const [signedInOnArrival] = useState(() => user !== null)
  const [email] = useState(() => pendingEmail)
  const [from] = useState(() => returnToFrom(location.state))
  const navigate = useNavigate()
  const { toast } = useToast()
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  if (signedInOnArrival) {
    return <Navigate to="/demo/shop" replace state={{ notice: "You're already signed in." }} />
  }

  if (!email) {
    return <Navigate to={AUTH_PATHS['sign-in']} replace state={{ notice: 'Start by signing in.' }} />
  }

  const handleSubmit = async (values: AuthValues): Promise<void | AuthErrors> => {
    try {
      const result = await verifyCode(email, values.code)
      if (!mounted.current) {
        if ('errors' in result) toast({ tone: 'hostile', title: "Sign-in didn't complete. Try again." })
        return undefined
      }
      if ('errors' in result) return result.errors
      signInAs(result.user)
      navigate(from ?? '/demo/shop')
      return undefined
    } catch (e) {
      if (!mounted.current) {
        toast({ tone: 'hostile', title: "Sign-in didn't complete. Try again." })
        return undefined
      }
      throw e
    }
  }

  const handleModeChange = (mode: AuthMode) => navigate(AUTH_PATHS[mode])

  return (
    <div className="box-content max-w-md mx-auto px-gutter py-12 flex flex-col gap-6">
      <PageHeading>Hexline account</PageHeading>
      <AuthForm mode="verify-code" headingLevel={2} onSubmit={handleSubmit} onModeChange={handleModeChange} />
    </div>
  )
}
