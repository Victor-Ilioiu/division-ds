import { useRef, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useSession } from './store/session'

/**
 * Guards every route under the Account menu (`/demo/account*`). With no one signed in it bounces
 * to sign-in with a notice, exactly the way Onboarding bounces to account creation -- a direct
 * load or a refresh with no session has nothing of the caller's to show.
 *
 * The notice differs on WHY there is no user: `hadUser` snapshots, once, whether a user existed
 * on the render that first mounted this guard. A page reached by clicking "Sign out" (the account
 * menu removes itself and this component renders again with `user` now null) gets "You've signed
 * out."; a direct load with no session at all, or an in-app link clicked after the session was
 * already gone, gets the generic "Sign in to see your account." Reading `user` live on every
 * render instead of snapshotting it would make BOTH paths say "You've signed out." forever after
 * the first sign-out this tab ever saw, since `hadUser` itself would need to be true at the very
 * moment it renders signed-out to tell them apart -- exactly what a snapshot, taken once, is for.
 *
 * Moving focus after the redirect is not this component's job: `App.tsx`'s own
 * `useFocusMainOnNavigate` already runs on every pathname change and sends focus to `#main`,
 * which is present on both the demo shell that renders this guard and the sign-in page it
 * redirects to -- adding a second focus move here would only race that one.
 *
 * `from` (`pathname + search`, never the full `Location`) is where this guard bounced the person
 * FROM -- the page they actually wanted, before a sign-in and a two-step code get in the way.
 * SignIn and Verify relay it onward through their own router state (see `authRoutes.ts`'s
 * `returnToFrom`/`safeReturnTo`) so a successful sign-in can land back there instead of always on
 * the shop. Never a query string alone or the hash: same-app paths only, exactly what `Navigate`
 * itself already resolved against.
 */
export function RequireSession({ children }: { children: ReactNode }) {
  const { user } = useSession()
  const hadUser = useRef(user !== null)
  const { pathname, search } = useLocation()

  if (!user) {
    return (
      <Navigate
        to="/demo/sign-in"
        replace
        state={{
          notice: hadUser.current ? "You've signed out." : 'Sign in to see your account.',
          from: pathname + search,
        }}
      />
    )
  }

  return <>{children}</>
}
