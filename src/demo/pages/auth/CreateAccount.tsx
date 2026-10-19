import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { AuthForm, type AuthErrors, type AuthMode, type AuthValues } from '../../../components/organisms/auth-form/AuthForm'
import { useToast } from '../../../components/molecules'
import { createAccount } from '../../store/api'
import { useSession } from '../../store/session'
import { AUTH_PATHS } from './authRoutes'
import { PageHeading } from './PageHeading'
import { RouteNotice } from './RouteNotice'

/**
 * A new account signs itself straight in and moves on to onboarding -- unlike sign-in, there is
 * no two-step code here. Already signed in ON ARRIVAL, this redirects straight to the shop with a
 * notice, the same as SignIn and Verify -- snapshotted once, on mount, never read live: this
 * page's own submit sets `user` and navigates to onboarding in the same tick React Router wraps
 * in a transition, so a live read would flip true while this component is still the one mounted
 * and send a fresh account straight back to the shop instead of onboarding. `mounted` guards a
 * different case: a slow create-account result must not navigate once the person has already
 * left this page.
 *
 * A result landing after that follows the same rule as everywhere else in the flows: a failure
 * always toasts, since there is no form left to show an alert on. A success here is different
 * from SignIn's own, though -- it DOES change durable state (`signInAs` starts a real session),
 * so it still runs even with the page gone, and still says so, just as a toast instead of a
 * navigation nobody is there to land.
 */
export function CreateAccount() {
  const navigate = useNavigate()
  const { user, signInAs } = useSession()
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
    return <Navigate to="/demo/shop" replace state={{ notice: "You're already signed in." }} />
  }

  const handleSubmit = async (values: AuthValues): Promise<void | AuthErrors> => {
    try {
      const result = await createAccount({ name: values.name, email: values.email, password: values.password })
      if (!mounted.current) {
        if ('errors' in result) {
          toast({ tone: 'hostile', title: "Your account wasn't created." })
          return undefined
        }
        signInAs(result.user)
        toast({ tone: 'ok', title: "Your account was created and you're signed in." })
        return undefined
      }
      if ('errors' in result) return result.errors
      signInAs(result.user)
      navigate('/demo/onboarding')
      return undefined
    } catch (e) {
      if (!mounted.current) {
        toast({ tone: 'hostile', title: "Your account wasn't created." })
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
      <AuthForm mode="create-account" headingLevel={2} onSubmit={handleSubmit} onModeChange={handleModeChange} />
    </div>
  )
}
