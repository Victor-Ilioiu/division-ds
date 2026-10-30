import { useState } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { axeClean } from '../../../test/axe'
import { Toaster } from '../../../components/molecules'
import { ApiError, createAccount, requestPasswordReset, signIn, verifyCode } from '../../store/api'
import { SessionProvider } from '../../store/session'
import { CreateAccount } from './CreateAccount'
import { ResetPassword } from './ResetPassword'
import { SignIn } from './SignIn'
import { Verify } from './Verify'

vi.mock('../../store/api', async importOriginal => {
  const actual = await importOriginal<typeof import('../../store/api')>()
  return {
    ...actual,
    signIn: vi.fn(),
    verifyCode: vi.fn(),
    requestPasswordReset: vi.fn(),
    createAccount: vi.fn(),
  }
})

/** A required FormField's label ends in an aria-hidden "*", so its text content is "Email*". */
const byLabel = (label: string) => screen.getByLabelText(new RegExp(`^${label}\\*?$`))

/** Reads whatever a redirect left in router state, the same shape RouteNotice does, so a test can
 *  confirm the notice actually travelled rather than assuming it did. */
function Stub({ name }: { name: string }) {
  const location = useLocation()
  const notice = (location.state as { notice?: string } | null)?.notice
  return (
    <div>
      <h1>{name}</h1>
      {notice ? <p>{notice}</p> : null}
    </div>
  )
}

/** The current path, always mounted alongside the routed page (inside the Router, outside
 *  `<Routes>`) so a stale-result test can assert the URL never moved, on top of the storage
 *  assertion -- neither alone proves the guard: storage can look right for the wrong reason (a
 *  mock that never resolves the way the mutation expects), and a route-content assertion can look
 *  right even with the guard removed if `navigate` never actually reaches a registered route in
 *  the harness. Checking the literal path closes both gaps at once. */
function Probe() {
  const location = useLocation()
  return <output data-testid="path">{location.pathname}</output>
}

function renderApp(path: string, { pendingEmail }: { pendingEmail?: string } = {}) {
  if (pendingEmail) {
    sessionStorage.setItem('hexline-session', JSON.stringify({ user: null, pendingEmail }))
  }
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Toaster>
        <SessionProvider>
          <Routes>
            <Route path="/store/sign-in" element={<SignIn />} />
            <Route path="/store/sign-in/verify" element={<Verify />} />
            <Route path="/store/reset-password" element={<ResetPassword />} />
            <Route path="/store/create-account" element={<CreateAccount />} />
            <Route path="/store/shop" element={<Stub name="Shop" />} />
            <Route path="/store/onboarding" element={<Stub name="Onboarding" />} />
          </Routes>
        </SessionProvider>
      </Toaster>
    </MemoryRouter>
  )
}

afterEach(() => {
  sessionStorage.clear()
  vi.clearAllMocks()
})

describe('SignIn', () => {
  // Mutation: drop `<PageHeading>Hexline account</PageHeading>` from SignIn.tsx -> the level-1
  // heading query finds nothing.
  it('reads as a page h1 above AuthForm’s own mode heading', () => {
    renderApp('/store/sign-in')
    expect(screen.getByRole('heading', { level: 1, name: 'Hexline account' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Sign in' })).toBeInTheDocument()
  })

  // Mutation: empty the Email field's label in AuthForm.tsx (`field('email', '', ...)`) -> a
  // real axe violation (`label`, WCAG 1.3.1/4.1.2).
  it('is axe clean', async () => {
    const { container } = renderApp('/store/sign-in')
    expect(await axeClean(container)).toHaveNoViolations()
  })

  // Mutation: drop the `if ('errors' in result) return result.errors` check in SignIn.tsx -> a
  // wrong password proceeds to sign in anyway, and the page moves on to the verify step instead
  // of showing the error.
  it('shows a wrong password as a field error, and never navigates', async () => {
    vi.mocked(signIn).mockResolvedValueOnce({ errors: { password: 'That password is not right.' } })
    renderApp('/store/sign-in')
    await userEvent.type(byLabel('Email'), 'rae@hexline.test')
    await userEvent.type(byLabel('Password'), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    // The message shows twice, once in the ErrorSummary's link and once at the field itself.
    expect(await screen.findAllByText('That password is not right.')).toHaveLength(2)
    expect(screen.getByRole('heading', { level: 2, name: 'Sign in' })).toBeInTheDocument()
  })

  // Mutation: drop the `setPendingEmail(values.email)` call -> Verify's own `useState(() =>
  // pendingEmail)` snapshot reads null and this test's `findByRole('heading', ... 'Enter your
  // code')` never appears; it redirects back to sign-in instead.
  it('moves a correct password on to the two-step code, with the address remembered', async () => {
    vi.mocked(signIn).mockResolvedValueOnce({ needsCode: true })
    renderApp('/store/sign-in')
    await userEvent.type(byLabel('Email'), 'rae@hexline.test')
    await userEvent.type(byLabel('Password'), 'hexline')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Enter your code' })).toBeInTheDocument()
  })

  // Mutation: wrap the `await signIn(...)` call in a try/catch that swallows the rejection ->
  // the generic alert text below never appears.
  it('lets an offline rejection propagate, so AuthForm shows the generic alert', async () => {
    vi.mocked(signIn).mockRejectedValueOnce(new ApiError('Network unavailable'))
    renderApp('/store/sign-in')
    await userEvent.type(byLabel('Email'), 'offline@hexline.test')
    await userEvent.type(byLabel('Password'), 'hexline')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    // sr-only and visible duplicates of the same alert, both carrying the text.
    expect(await screen.findAllByText('Something went wrong. Please try again.')).toHaveLength(2)
  })

  // Mutation: make SignIn's `handleModeChange` a no-op (`() => {}`) -> neither `findByRole`
  // below ever resolves.
  it('moves to reset password and to create account through the mode links', async () => {
    renderApp('/store/sign-in')
    await userEvent.click(screen.getByRole('button', { name: 'Forgot your password?' }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Reset your password' })).toBeInTheDocument()

    renderApp('/store/sign-in')
    await userEvent.click(screen.getByRole('button', { name: 'No account yet? Create one' }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Create an account' })).toBeInTheDocument()
  })

  // Mutation: render SignIn without wrapping it in a RouteNotice-aware route (drop
  // `<RouteNotice />` from SignIn.tsx) -> this notice never appears.
  it('shows a notice a redirect left in router state', () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/store/sign-in', state: { notice: 'Start by signing in.' } }]}>
        <Toaster>
          <SessionProvider>
            <Routes>
              <Route path="/store/sign-in" element={<SignIn />} />
            </Routes>
          </SessionProvider>
        </Toaster>
      </MemoryRouter>
    )
    expect(screen.getByText('Start by signing in.')).toBeInTheDocument()
  })

  // Redirect rule: a signed-in user visiting sign-in has nothing to do here.
  // Mutation: drop the `if (signedInOnArrival) return <Navigate .../>` check from SignIn.tsx ->
  // the Shop stub below never renders; the sign-in form shows instead.
  it('redirects an already signed-in visitor to the shop, with a notice', async () => {
    sessionStorage.setItem(
      'hexline-session',
      JSON.stringify({ user: { name: 'Rae', email: 'rae@hexline.test' }, pendingEmail: null })
    )
    renderApp('/store/sign-in')
    expect(await screen.findByRole('heading', { level: 1, name: 'Shop' })).toBeInTheDocument()
    expect(screen.getByText("You're already signed in.")).toBeInTheDocument()
  })

  // The failure side of the same after-leaving rule as Verify and CreateAccount: there is no form
  // left here to show a field error on, so a bad password that lands after the person has moved
  // on still says so, as a toast.
  // Mutation: drop the `if ('errors' in result) toast(...)` call from SignIn.tsx's post-unmount
  // branch -> this toast never appears.
  it('toasts a failure that resolves after the page is gone, instead of dropping it silently', async () => {
    let resolveSignIn: (value: { errors: { password: string } }) => void = () => {}
    vi.mocked(signIn).mockImplementationOnce(() => new Promise(resolve => (resolveSignIn = resolve)))

    function Harness() {
      const [present, setPresent] = useState(true)
      return (
        <MemoryRouter initialEntries={['/store/sign-in']}>
          <Toaster>
            <SessionProvider>
              <button onClick={() => setPresent(false)}>Leave the page</button>
              <Routes>
                <Route path="/store/sign-in" element={present ? <SignIn /> : <p>Left the page</p>} />
              </Routes>
            </SessionProvider>
          </Toaster>
        </MemoryRouter>
      )
    }

    render(<Harness />)
    await userEvent.type(byLabel('Email'), 'rae@hexline.test')
    await userEvent.type(byLabel('Password'), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    await userEvent.click(screen.getByRole('button', { name: 'Leave the page' }))
    expect(screen.getByText('Left the page')).toBeInTheDocument()

    await act(async () => {
      resolveSignIn({ errors: { password: 'That password is not right.' } })
    })
    expect(await screen.findByText("Sign-in didn't complete. Try again.")).toBeInTheDocument()
  })

  // The catch branch's own version of the same rule: a promise that REJECTS (a dropped
  // connection, not merely a resolved errors object) after the person has left still has no form
  // left to show AuthForm's own generic alert on, so it toasts instead of throwing into the void.
  // Mutation: delete the `toast({ tone: 'hostile', title: "Sign-in didn't complete. Try again." })`
  // call inside SignIn.tsx's `catch` block -> this toast never appears.
  it('toasts the same message when signIn rejects after the page is gone', async () => {
    let rejectSignIn: (reason?: unknown) => void = () => {}
    vi.mocked(signIn).mockImplementationOnce(() => new Promise((_resolve, reject) => (rejectSignIn = reject)))

    function Harness() {
      const [present, setPresent] = useState(true)
      return (
        <MemoryRouter initialEntries={['/store/sign-in']}>
          <Toaster>
            <SessionProvider>
              <button onClick={() => setPresent(false)}>Leave the page</button>
              <Routes>
                <Route path="/store/sign-in" element={present ? <SignIn /> : <p>Left the page</p>} />
              </Routes>
            </SessionProvider>
          </Toaster>
        </MemoryRouter>
      )
    }

    render(<Harness />)
    await userEvent.type(byLabel('Email'), 'offline@hexline.test')
    await userEvent.type(byLabel('Password'), 'hexline')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    await userEvent.click(screen.getByRole('button', { name: 'Leave the page' }))
    expect(screen.getByText('Left the page')).toBeInTheDocument()

    await act(async () => {
      rejectSignIn(new ApiError('Network unavailable'))
    })
    expect(await screen.findByText("Sign-in didn't complete. Try again.")).toBeInTheDocument()
  })

  // The real guard this proves: a slow sign-in that resolves after the person has already left
  // the page must not carry the app on to the verify step for a form that isn't showing anymore.
  // Two independent assertions, since neither alone proves it: storage can look right for the
  // wrong reason (a mock that never resolves the way a mutation expects), and a route-content
  // assertion can look right even with this page's own guard removed if `navigate` never reaches
  // a route the harness registered. `<Probe/>` reads the literal path.
  // Mutation: drop the `if (!mounted.current) return undefined` line in SignIn.tsx -> `pendingEmail`
  // reads back as the typed address instead of null, and the path moves to `/store/sign-in/verify`.
  it('drops a sign-in result that resolves after the page is gone, without setting pendingEmail', async () => {
    let resolveSignIn: (value: { needsCode: true }) => void = () => {}
    vi.mocked(signIn).mockImplementationOnce(() => new Promise(resolve => (resolveSignIn = resolve)))

    function Harness() {
      const [present, setPresent] = useState(true)
      return (
        <MemoryRouter initialEntries={['/store/sign-in']}>
          <Toaster>
            <SessionProvider>
              <button onClick={() => setPresent(false)}>Leave the page</button>
              <Probe />
              <Routes>
                <Route path="/store/sign-in" element={present ? <SignIn /> : <p>Left the page</p>} />
                <Route path="/store/sign-in/verify" element={<p>Verify</p>} />
              </Routes>
            </SessionProvider>
          </Toaster>
        </MemoryRouter>
      )
    }

    render(<Harness />)
    await userEvent.type(byLabel('Email'), 'rae@hexline.test')
    await userEvent.type(byLabel('Password'), 'hexline')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    await userEvent.click(screen.getByRole('button', { name: 'Leave the page' }))
    expect(screen.getByText('Left the page')).toBeInTheDocument()

    // `act`'s async form drains the microtask queue the resolved promise's continuation runs on,
    // so the assertions below read storage and the path only once that continuation (or its
    // guard) has actually finished -- a `waitFor` keyed on "Left the page" resolves immediately,
    // since that text was already there before `resolveSignIn` is even called, and would let
    // these assertions run before the continuation had a chance to.
    await act(async () => {
      resolveSignIn({ needsCode: true })
    })
    const stored = JSON.parse(sessionStorage.getItem('hexline-session') ?? 'null')
    expect(stored?.pendingEmail ?? null).toBeNull()
    expect(screen.getByTestId('path')).toHaveTextContent('/store/sign-in')
  })
})

describe('Verify', () => {
  // Mutation: drop the `if (!email)` guard in Verify.tsx (render the form regardless) -> a
  // direct load renders "Enter your code" with nothing behind it instead of redirecting.
  it('bounces a direct load with no pending email back to sign-in, with a notice', async () => {
    renderApp('/store/sign-in/verify')
    expect(await screen.findByRole('heading', { level: 2, name: 'Sign in' })).toBeInTheDocument()
    expect(screen.getByText('Start by signing in.')).toBeInTheDocument()
  })

  // Mutation: empty the Code field's label in AuthForm.tsx (`field('code', '', ...)`) -> a real
  // axe violation (`label`, WCAG 1.3.1/4.1.2).
  it('is axe clean with a pending email', async () => {
    const { container } = renderApp('/store/sign-in/verify', { pendingEmail: 'rae@hexline.test' })
    expect(await axeClean(container)).toHaveNoViolations()
  })

  // Mutation: change `verifyCode(email, values.code)`'s second (positional) argument to
  // `values.email` (there is no email field in verify-code) -> the wrong value reaches the
  // mocked `verifyCode`, and this assertion, which reads that second argument, fails.
  it('sends the snapshotted email and the typed code to verifyCode', async () => {
    vi.mocked(verifyCode).mockResolvedValueOnce({ errors: { code: 'That code is not right. Check your app and try again.' } })
    renderApp('/store/sign-in/verify', { pendingEmail: 'rae@hexline.test' })
    await userEvent.type(byLabel('Code'), '000000')
    await userEvent.click(screen.getByRole('button', { name: 'Verify' }))
    await screen.findAllByText('That code is not right. Check your app and try again.')
    expect(verifyCode).toHaveBeenCalledWith('rae@hexline.test', '000000')
  })

  // Mutation: change the destination in Verify's onSubmit from `from ?? '/store/shop'` to plain
  // `/store/shop` -> the Cart stub never renders; Shop does instead.
  it('signs in and returns to `from` when SignIn forwarded a same-app path', async () => {
    vi.mocked(verifyCode).mockResolvedValueOnce({ user: { name: 'Rae', email: 'rae@hexline.test' } })
    sessionStorage.setItem('hexline-session', JSON.stringify({ user: null, pendingEmail: 'rae@hexline.test' }))
    render(
      <MemoryRouter initialEntries={[{ pathname: '/store/sign-in/verify', state: { from: '/store/cart' } }]}>
        <Toaster>
          <SessionProvider>
            <Routes>
              <Route path="/store/sign-in/verify" element={<Verify />} />
              <Route path="/store/shop" element={<Stub name="Shop" />} />
              <Route path="/store/cart" element={<Stub name="Cart" />} />
            </Routes>
          </SessionProvider>
        </Toaster>
      </MemoryRouter>
    )
    await userEvent.type(byLabel('Code'), '123456')
    await userEvent.click(screen.getByRole('button', { name: 'Verify' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Cart' })).toBeInTheDocument()
  })

  // The "regardless" half of the old title above: an absolute URL in `from` is never trusted
  // (`returnToFrom`/`safeReturnTo`, authRoutes.ts), and no `from` at all is the common case (a
  // direct visit to sign-in, never bounced here by RequireSession) -- both fall back to the shop.
  // Mutation: drop the `safeReturnTo` validation from `returnToFrom`, trusting `from` as given ->
  // the Evil stub renders instead of Shop for the first case below.
  it('lands on /store/shop when there is no `from`, or an untrusted one', async () => {
    vi.mocked(verifyCode)
      .mockResolvedValueOnce({ user: { name: 'Rae', email: 'rae@hexline.test' } })
      .mockResolvedValueOnce({ user: { name: 'Rae', email: 'rae@hexline.test' } })
    sessionStorage.setItem('hexline-session', JSON.stringify({ user: null, pendingEmail: 'rae@hexline.test' }))
    const { unmount } = render(
      <MemoryRouter initialEntries={[{ pathname: '/store/sign-in/verify', state: { from: 'https://evil.example' } }]}>
        <Toaster>
          <SessionProvider>
            <Routes>
              <Route path="/store/sign-in/verify" element={<Verify />} />
              <Route path="/store/shop" element={<Stub name="Shop" />} />
            </Routes>
          </SessionProvider>
        </Toaster>
      </MemoryRouter>
    )
    await userEvent.type(byLabel('Code'), '123456')
    await userEvent.click(screen.getByRole('button', { name: 'Verify' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Shop' })).toBeInTheDocument()
    unmount()

    sessionStorage.setItem('hexline-session', JSON.stringify({ user: null, pendingEmail: 'rae@hexline.test' }))
    renderApp('/store/sign-in/verify')
    await userEvent.type(byLabel('Code'), '123456')
    await userEvent.click(screen.getByRole('button', { name: 'Verify' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Shop' })).toBeInTheDocument()
  })

  // Redirect rule (controller ruling): a signed-in user visiting Verify has nothing to do here,
  // the same as SignIn -- checked before the pending-email guard below. `pendingEmail` is set
  // here too (never true in this app's own flow -- `signInAs` clears it in the same update that
  // sets `user` -- but storage enforces nothing): with only `user` set, disabling this guard
  // would still bounce to sign-in on the pending-email check below, which itself bounces back
  // here from THAT page's own real guard, landing on the shop anyway and masking the mutation.
  // With both set, disabling this guard instead falls through to the code form, which is what
  // actually distinguishes the two.
  // Mutation: drop the `if (signedInOnArrival) return <Navigate .../>` check from Verify.tsx ->
  // the pending-email guard's `!email` is false (pendingEmail is set), so the code form renders
  // instead of the Shop heading below.
  it('redirects an already signed-in visitor to the shop, with a notice', async () => {
    sessionStorage.setItem(
      'hexline-session',
      JSON.stringify({ user: { name: 'Rae', email: 'rae@hexline.test' }, pendingEmail: 'rae@hexline.test' })
    )
    renderApp('/store/sign-in/verify')
    expect(await screen.findByRole('heading', { level: 1, name: 'Shop' })).toBeInTheDocument()
    expect(screen.getByText("You're already signed in.")).toBeInTheDocument()
  })

  // The failure side of the same after-leaving rule as SignIn and CreateAccount.
  // Mutation: drop the `if ('errors' in result) toast(...)` call from Verify.tsx's post-unmount
  // branch -> this toast never appears.
  it('toasts a failure that resolves after the page is gone, instead of dropping it silently', async () => {
    let resolveVerify: (value: { errors: { code: string } }) => void = () => {}
    vi.mocked(verifyCode).mockImplementationOnce(() => new Promise(resolve => (resolveVerify = resolve)))
    sessionStorage.setItem('hexline-session', JSON.stringify({ user: null, pendingEmail: 'rae@hexline.test' }))

    function Harness() {
      const [present, setPresent] = useState(true)
      return (
        <MemoryRouter initialEntries={['/store/sign-in/verify']}>
          <Toaster>
            <SessionProvider>
              <button onClick={() => setPresent(false)}>Leave the page</button>
              <Routes>
                <Route path="/store/sign-in/verify" element={present ? <Verify /> : <p>Left the page</p>} />
              </Routes>
            </SessionProvider>
          </Toaster>
        </MemoryRouter>
      )
    }

    render(<Harness />)
    await userEvent.type(byLabel('Code'), '000000')
    await userEvent.click(screen.getByRole('button', { name: 'Verify' }))
    await userEvent.click(screen.getByRole('button', { name: 'Leave the page' }))
    expect(screen.getByText('Left the page')).toBeInTheDocument()

    await act(async () => {
      resolveVerify({ errors: { code: 'That code is not right. Check your app and try again.' } })
    })
    expect(await screen.findByText("Sign-in didn't complete. Try again.")).toBeInTheDocument()
  })

  // The catch branch's own version of the same rule: a promise that REJECTS after the person has
  // left still has no form left to show AuthForm's own generic alert on, so it toasts instead.
  // Mutation: delete the `toast({ tone: 'hostile', title: "Sign-in didn't complete. Try again." })`
  // call inside Verify.tsx's `catch` block -> this toast never appears.
  it('toasts the same message when verifyCode rejects after the page is gone', async () => {
    let rejectVerify: (reason?: unknown) => void = () => {}
    vi.mocked(verifyCode).mockImplementationOnce(() => new Promise((_resolve, reject) => (rejectVerify = reject)))
    sessionStorage.setItem('hexline-session', JSON.stringify({ user: null, pendingEmail: 'rae@hexline.test' }))

    function Harness() {
      const [present, setPresent] = useState(true)
      return (
        <MemoryRouter initialEntries={['/store/sign-in/verify']}>
          <Toaster>
            <SessionProvider>
              <button onClick={() => setPresent(false)}>Leave the page</button>
              <Routes>
                <Route path="/store/sign-in/verify" element={present ? <Verify /> : <p>Left the page</p>} />
              </Routes>
            </SessionProvider>
          </Toaster>
        </MemoryRouter>
      )
    }

    render(<Harness />)
    await userEvent.type(byLabel('Code'), '000000')
    await userEvent.click(screen.getByRole('button', { name: 'Verify' }))
    await userEvent.click(screen.getByRole('button', { name: 'Leave the page' }))
    expect(screen.getByText('Left the page')).toBeInTheDocument()

    await act(async () => {
      rejectVerify(new ApiError('Network unavailable'))
    })
    expect(await screen.findByText("Sign-in didn't complete. Try again.")).toBeInTheDocument()
  })

  // Same reasoning as SignIn's own stale-result test: two independent assertions, storage AND
  // the literal path, since neither alone proves the guard.
  // Mutation: drop the `if (!mounted.current) return undefined` line in Verify.tsx -> `user`
  // reads back signed in instead of null, and the path moves to `/store/shop`.
  it('drops a verify result that resolves after the page is gone, without signing in', async () => {
    let resolveVerify: (value: { user: { name: string; email: string } }) => void = () => {}
    vi.mocked(verifyCode).mockImplementationOnce(() => new Promise(resolve => (resolveVerify = resolve)))
    sessionStorage.setItem('hexline-session', JSON.stringify({ user: null, pendingEmail: 'rae@hexline.test' }))

    function Harness() {
      const [present, setPresent] = useState(true)
      return (
        <MemoryRouter initialEntries={['/store/sign-in/verify']}>
          <Toaster>
            <SessionProvider>
              <button onClick={() => setPresent(false)}>Leave the page</button>
              <Probe />
              <Routes>
                <Route path="/store/sign-in/verify" element={present ? <Verify /> : <p>Left the page</p>} />
                <Route path="/store/shop" element={<p>Shop</p>} />
              </Routes>
            </SessionProvider>
          </Toaster>
        </MemoryRouter>
      )
    }

    render(<Harness />)
    await userEvent.type(byLabel('Code'), '123456')
    await userEvent.click(screen.getByRole('button', { name: 'Verify' }))
    await userEvent.click(screen.getByRole('button', { name: 'Leave the page' }))
    expect(screen.getByText('Left the page')).toBeInTheDocument()

    await act(async () => {
      resolveVerify({ user: { name: 'Rae', email: 'rae@hexline.test' } })
    })
    const stored = JSON.parse(sessionStorage.getItem('hexline-session') ?? 'null')
    expect(stored?.user ?? null).toBeNull()
    expect(screen.getByTestId('path')).toHaveTextContent('/store/sign-in/verify')
  })
})

describe('ResetPassword', () => {
  // Mutation: empty the Email field's label in AuthForm.tsx (`field('email', '', ...)`) -> a
  // real axe violation (`label`, WCAG 1.3.1/4.1.2).
  it('is axe clean', async () => {
    const { container } = renderApp('/store/reset-password')
    expect(await axeClean(container)).toHaveNoViolations()
  })

  // Mutation: stop calling `requestPasswordReset` from ResetPassword's onSubmit -> the mock's
  // call assertion fails, and AuthForm's own confirmation copy (which only appears once its
  // `onSubmit` resolves without errors) never appears either.
  it('requests a reset and shows AuthForm’s own neutral confirmation', async () => {
    vi.mocked(requestPasswordReset).mockResolvedValueOnce(undefined)
    renderApp('/store/reset-password')
    await userEvent.type(byLabel('Email'), 'rae@hexline.test')
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }))
    expect(
      await screen.findByText('If an account exists for rae@hexline.test, a reset link is on its way.')
    ).toBeInTheDocument()
    expect(requestPasswordReset).toHaveBeenCalledWith('rae@hexline.test')
  })

  // Mutation: wrap the `await requestPasswordReset(...)` call in ResetPassword.tsx in a
  // try/catch that swallows the rejection -> the generic alert text below never appears.
  it('lets an offline rejection propagate to AuthForm’s generic alert', async () => {
    vi.mocked(requestPasswordReset).mockRejectedValueOnce(new ApiError('Network unavailable'))
    renderApp('/store/reset-password')
    await userEvent.type(byLabel('Email'), 'offline@hexline.test')
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }))
    // sr-only and visible duplicates of the same alert, both carrying the text.
    expect(await screen.findAllByText('Something went wrong. Please try again.')).toHaveLength(2)
  })

  // Mutation: make ResetPassword's `handleModeChange` a no-op (`() => {}`) -> the `findByRole`
  // below never resolves.
  it('moves back to sign in through the mode link', async () => {
    renderApp('/store/reset-password')
    await userEvent.click(screen.getByRole('button', { name: 'Back to sign in' }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Sign in' })).toBeInTheDocument()
  })
})

describe('CreateAccount', () => {
  // Mutation: empty the Email field's label in AuthForm.tsx (`field('email', '', ...)`) -> a
  // real axe violation (`label`, WCAG 1.3.1/4.1.2).
  it('is axe clean', async () => {
    const { container } = renderApp('/store/create-account')
    expect(await axeClean(container)).toHaveNoViolations()
  })

  // Mutation: drop the `if ('errors' in result) return result.errors` check in
  // CreateAccount.tsx -> a taken address proceeds to sign in anyway, and the page moves on to
  // onboarding instead of showing the error.
  it('shows a taken address as an email error', async () => {
    vi.mocked(createAccount).mockResolvedValueOnce({ errors: { email: 'That email is already registered.' } })
    renderApp('/store/create-account')
    await userEvent.type(byLabel('Name'), 'Rae')
    await userEvent.type(byLabel('Email'), 'taken@hexline.test')
    await userEvent.type(byLabel('Password'), 'longenough')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))
    // Once in the ErrorSummary's link, once at the email field itself.
    expect(await screen.findAllByText('That email is already registered.')).toHaveLength(2)
  })

  // Mutation: change the destination in CreateAccount's onSubmit from `/store/onboarding` to
  // `/store/shop` -> the Onboarding stub never renders.
  it('signs a fresh address straight in and moves on to onboarding', async () => {
    vi.mocked(createAccount).mockResolvedValueOnce({ user: { name: 'Rae', email: 'rae@hexline.test' } })
    renderApp('/store/create-account')
    await userEvent.type(byLabel('Name'), 'Rae')
    await userEvent.type(byLabel('Email'), 'rae@hexline.test')
    await userEvent.type(byLabel('Password'), 'longenough')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Onboarding' })).toBeInTheDocument()
  })

  // Mutation: wrap the `await createAccount(...)` call in CreateAccount.tsx in a try/catch that
  // swallows the rejection -> the generic alert text below never appears.
  it('lets an offline rejection propagate to AuthForm’s generic alert', async () => {
    vi.mocked(createAccount).mockRejectedValueOnce(new ApiError('Network unavailable'))
    renderApp('/store/create-account')
    await userEvent.type(byLabel('Name'), 'Rae')
    await userEvent.type(byLabel('Email'), 'offline@hexline.test')
    await userEvent.type(byLabel('Password'), 'longenough')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))
    // sr-only and visible duplicates of the same alert, both carrying the text.
    expect(await screen.findAllByText('Something went wrong. Please try again.')).toHaveLength(2)
  })

  // Redirect rule: a signed-in user visiting create-account has nothing to do here, the same as
  // SignIn and Verify.
  // Mutation: drop the `if (signedInOnArrival) return <Navigate .../>` check from
  // CreateAccount.tsx -> the create-account form renders instead of the Shop stub below.
  it('redirects an already signed-in visitor to the shop, with a notice', async () => {
    sessionStorage.setItem(
      'hexline-session',
      JSON.stringify({ user: { name: 'Rae', email: 'rae@hexline.test' }, pendingEmail: null })
    )
    renderApp('/store/create-account')
    expect(await screen.findByRole('heading', { level: 1, name: 'Shop' })).toBeInTheDocument()
    expect(screen.getByText("You're already signed in.")).toBeInTheDocument()
  })

  // The failure side of the same after-leaving rule as SignIn and Verify.
  // Mutation: drop the `if ('errors' in result) { toast(...); return undefined }` branch from
  // CreateAccount.tsx's post-unmount handling -> this toast never appears.
  it('toasts a failure that resolves after the page is gone, instead of dropping it silently', async () => {
    let resolveCreate: (value: { errors: { email: string } }) => void = () => {}
    vi.mocked(createAccount).mockImplementationOnce(() => new Promise(resolve => (resolveCreate = resolve)))

    function Harness() {
      const [present, setPresent] = useState(true)
      return (
        <MemoryRouter initialEntries={['/store/create-account']}>
          <Toaster>
            <SessionProvider>
              <button onClick={() => setPresent(false)}>Leave the page</button>
              <Routes>
                <Route path="/store/create-account" element={present ? <CreateAccount /> : <p>Left the page</p>} />
              </Routes>
            </SessionProvider>
          </Toaster>
        </MemoryRouter>
      )
    }

    render(<Harness />)
    await userEvent.type(byLabel('Name'), 'Rae')
    await userEvent.type(byLabel('Email'), 'taken@hexline.test')
    await userEvent.type(byLabel('Password'), 'longenough')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))
    await userEvent.click(screen.getByRole('button', { name: 'Leave the page' }))
    expect(screen.getByText('Left the page')).toBeInTheDocument()

    await act(async () => {
      resolveCreate({ errors: { email: 'That email is already registered.' } })
    })
    expect(await screen.findByText("Your account wasn't created.")).toBeInTheDocument()
  })

  // The catch branch's own version of the same rule: a promise that REJECTS after the person has
  // left still has no form left to show AuthForm's own generic alert on, so it toasts instead.
  // Mutation: delete the `toast({ tone: 'hostile', title: "Your account wasn't created." })` call
  // inside CreateAccount.tsx's `catch` block -> this toast never appears.
  it('toasts the same message when createAccount rejects after the page is gone', async () => {
    let rejectCreate: (reason?: unknown) => void = () => {}
    vi.mocked(createAccount).mockImplementationOnce(() => new Promise((_resolve, reject) => (rejectCreate = reject)))

    function Harness() {
      const [present, setPresent] = useState(true)
      return (
        <MemoryRouter initialEntries={['/store/create-account']}>
          <Toaster>
            <SessionProvider>
              <button onClick={() => setPresent(false)}>Leave the page</button>
              <Routes>
                <Route path="/store/create-account" element={present ? <CreateAccount /> : <p>Left the page</p>} />
              </Routes>
            </SessionProvider>
          </Toaster>
        </MemoryRouter>
      )
    }

    render(<Harness />)
    await userEvent.type(byLabel('Name'), 'Rae')
    await userEvent.type(byLabel('Email'), 'offline@hexline.test')
    await userEvent.type(byLabel('Password'), 'longenough')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))
    await userEvent.click(screen.getByRole('button', { name: 'Leave the page' }))
    expect(screen.getByText('Left the page')).toBeInTheDocument()

    await act(async () => {
      rejectCreate(new ApiError('Network unavailable'))
    })
    expect(await screen.findByText("Your account wasn't created.")).toBeInTheDocument()
  })

  // The success side is different from SignIn's own stale result: creating an account DOES
  // change durable state (`signInAs` starts a real session), so it still runs even with the page
  // gone, and still says so -- as a toast instead of a navigation nobody is there to land.
  // Mutation: drop the `signInAs(result.user)` call from CreateAccount.tsx's post-unmount
  // success branch -> `user` reads back null instead of signed in, and the toast below never
  // appears.
  it('a create-account result that resolves after the page is gone still signs in and toasts, without navigating', async () => {
    let resolveCreate: (value: { user: { name: string; email: string } }) => void = () => {}
    vi.mocked(createAccount).mockImplementationOnce(() => new Promise(resolve => (resolveCreate = resolve)))

    function Harness() {
      const [present, setPresent] = useState(true)
      return (
        <MemoryRouter initialEntries={['/store/create-account']}>
          <Toaster>
            <SessionProvider>
              <button onClick={() => setPresent(false)}>Leave the page</button>
              <Probe />
              <Routes>
                <Route path="/store/create-account" element={present ? <CreateAccount /> : <p>Left the page</p>} />
                <Route path="/store/onboarding" element={<p>Onboarding</p>} />
              </Routes>
            </SessionProvider>
          </Toaster>
        </MemoryRouter>
      )
    }

    render(<Harness />)
    await userEvent.type(byLabel('Name'), 'Rae')
    await userEvent.type(byLabel('Email'), 'rae@hexline.test')
    await userEvent.type(byLabel('Password'), 'longenough')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))
    await userEvent.click(screen.getByRole('button', { name: 'Leave the page' }))
    expect(screen.getByText('Left the page')).toBeInTheDocument()

    await act(async () => {
      resolveCreate({ user: { name: 'Rae', email: 'rae@hexline.test' } })
    })
    const stored = JSON.parse(sessionStorage.getItem('hexline-session') ?? 'null')
    expect(stored?.user).toEqual({ name: 'Rae', email: 'rae@hexline.test' })
    // Never navigated: the path stays exactly where the person left it.
    expect(screen.getByTestId('path')).toHaveTextContent('/store/create-account')
    expect(await screen.findByText("Your account was created and you're signed in.")).toBeInTheDocument()
  })
})
