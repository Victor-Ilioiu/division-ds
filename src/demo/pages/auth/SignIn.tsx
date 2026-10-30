import { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthForm, type AuthErrors, type AuthMode, type AuthValues } from '../../../components/organisms/auth-form/AuthForm'
import { useToast } from '../../../components/molecules'
import { signIn } from '../../store/api'
import { useSession } from '../../store/session'
import { AUTH_PATHS, returnToFrom } from './authRoutes'
import { PageHeading } from './PageHeading'
import { RouteNotice } from './RouteNotice'

/**
 * The account entry point: the Navbar's own Sign in link, and where a bounced verify page lands
 * with its own notice. A correct password never signs anyone in on its own -- it only remembers
 * the address as `pendingEmail` and moves on to the two-step code, which is where `signInAs`
 * actually happens. Already signed in on arrival, there is nothing to do here at all -- visiting
 * redirects straight to the shop with a notice, the same as Verify and CreateAccount. Snapshotted
 * once, on mount, never read live -- SignIn's own flow never sets `user` itself, but Verify's and
 * CreateAccount's both do, from a page that also navigates in the same tick React Router wraps in
 * a transition; reading `user` live here would flip this check true mid-navigation on THOSE pages'
 * own success and briefly redirect to a page it never actually stays on, purely because this page
 * happens to still be mounted while `SessionProvider`'s own update lands first.
 *
 * `mounted` guards what this page does after an await that AuthForm's own generation check can't:
 * a result landing after the person has already left this page (a slow network, a quick
 * back-button) must not carry the app to the verify step for a form that is no longer on screen.
 * A failure that lands the same way still says so -- as a toast, since there is no form left to
 * show an alert on -- but a success does not: nothing durable happened yet (signing in only
 * remembers the address and moves on to the code; `signInAs` is one page further on), so there is
 * nothing worth announcing to someone who has already moved on themselves.
 *
 * `from` -- where RequireSession bounced the person here from, on its own `Location.state`, if
 * that's how they arrived -- rides along to Verify in its own `navigate` call's state
 * (`returnToFrom`/`safeReturnTo` in `authRoutes.ts` validate it at both ends): a right password
 * alone never signs anyone in, so this page itself is never the one that lands back there.
 */
export function SignIn() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, setPendingEmail } = useSession()
  const [signedInOnArrival] = useState(() => user !== null)
  const { toast } = useToast()
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  if (signedInOnArrival) {
    return <Navigate to="/store/shop" replace state={{ notice: "You're already signed in." }} />
  }

  const handleSubmit = async (values: AuthValues): Promise<void | AuthErrors> => {
    try {
      const result = await signIn(values.email, values.password)
      if (!mounted.current) {
        if ('errors' in result) toast({ tone: 'hostile', title: "Sign-in didn't complete. Try again." })
        return undefined
      }
      if ('errors' in result) return result.errors
      setPendingEmail(values.email)
      navigate(AUTH_PATHS['verify-code'], { state: { from: returnToFrom(location.state) } })
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
      <RouteNotice />
      <AuthForm mode="sign-in" headingLevel={2} onSubmit={handleSubmit} onModeChange={handleModeChange} />
    </div>
  )
}
