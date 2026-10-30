import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { SessionProvider, useSession } from './store/session'
import { RequireSession } from './RequireSession'

/** Reads whatever the redirect left in router state, the same shape RouteNotice and SignIn's own
 *  `from` forwarding both read. */
function SignInStub() {
  const location = useLocation()
  const state = location.state as { notice?: string; from?: string } | null
  return (
    <div>
      <h1>Hexline account</h1>
      {state?.notice ? <p>{state.notice}</p> : null}
      <p data-testid="from">{state?.from ?? ''}</p>
    </div>
  )
}

function Protected() {
  return <h1>Your account</h1>
}

function SignOutButton() {
  const { signOut } = useSession()
  return <button onClick={signOut}>Sign out</button>
}

function renderApp(initialPath = '/store/account') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <SessionProvider>
        <Routes>
          <Route
            path="/store/account"
            element={
              <RequireSession>
                <Protected />
                <SignOutButton />
              </RequireSession>
            }
          />
          <Route
            path="/store/account/orders"
            element={
              <RequireSession>
                <h1>Orders</h1>
              </RequireSession>
            }
          />
          <Route path="/store/sign-in" element={<SignInStub />} />
        </Routes>
      </SessionProvider>
    </MemoryRouter>
  )
}

afterEach(() => {
  sessionStorage.clear()
})

describe('RequireSession', () => {
  // Mutation: drop the `if (!user)` check -> children render straight through with no session,
  // and the redirect's own heading below is never reached.
  it('redirects a direct load with no session to sign-in, with the generic notice', () => {
    renderApp()
    expect(screen.getByRole('heading', { level: 1, name: 'Hexline account' })).toBeInTheDocument()
    expect(screen.getByText('Sign in to see your account.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Your account' })).not.toBeInTheDocument()
  })

  it('renders its children when a user is signed in', () => {
    sessionStorage.setItem(
      'hexline-session',
      JSON.stringify({ user: { name: 'Rae', email: 'rae@hexline.test' }, pendingEmail: null })
    )
    renderApp()
    expect(screen.getByRole('heading', { level: 1, name: 'Your account' })).toBeInTheDocument()
  })

  // Mutation: drop `from: pathname + search` from the redirect's `state` object (state carries
  // only `notice`) -> the `from` paragraph below is empty instead of naming the page that was
  // actually requested, and SignIn/Verify have nothing to forward or return to.
  it('carries the requested path and query string as `from`, for SignIn to relay onward', () => {
    renderApp('/store/account/orders?status=Delivered')
    expect(screen.getByTestId('from')).toHaveTextContent('/store/account/orders?status=Delivered')
  })

  // Mutation: hardcode the notice to the generic string, ignoring `hadUser.current` -> the text
  // below never appears, even after a real sign-out.
  it('says "You\'ve signed out." after signing out from a page this guard rendered', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    sessionStorage.setItem(
      'hexline-session',
      JSON.stringify({ user: { name: 'Rae', email: 'rae@hexline.test' }, pendingEmail: null })
    )
    renderApp()
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(await screen.findByText("You've signed out.")).toBeInTheDocument()
  })
})
