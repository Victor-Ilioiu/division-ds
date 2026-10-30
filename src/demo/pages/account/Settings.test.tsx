import { useState } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { axeClean } from '../../../test/axe'
import { Toaster } from '../../../components/molecules/toast/Toast'
import { SessionProvider, useSession } from '../../store/session'
import { saveProfile } from '../../store/api'
import { Settings } from './Settings'

vi.mock('../../store/api', async importOriginal => {
  const actual = await importOriginal<typeof import('../../store/api')>()
  return { ...actual, saveProfile: vi.fn() }
})

/** A required FormField's label ends in an aria-hidden "*", so its text content is "Name*" --
 *  the same reason auth.test.tsx carries this exact helper for AuthForm's own required fields. */
const byLabel = (label: string) => screen.getByLabelText(new RegExp(`^${label}\\*?$`))

function NameReadout() {
  const { user } = useSession()
  return <p data-testid="session-name">{user?.name}</p>
}

function renderApp() {
  return render(
    <MemoryRouter initialEntries={['/store/account/settings']}>
      <Toaster>
        <SessionProvider>
          <NameReadout />
          <Routes>
            <Route path="/store/account/settings" element={<Settings />} />
            <Route path="/store/sign-in" element={<h1>Hexline account</h1>} />
          </Routes>
        </SessionProvider>
      </Toaster>
    </MemoryRouter>
  )
}

function signIn() {
  sessionStorage.setItem(
    'hexline-session',
    JSON.stringify({ user: { name: 'Rae', email: 'rae@hexline.test' }, pendingEmail: null })
  )
}

afterEach(() => {
  sessionStorage.clear()
  vi.clearAllMocks()
  vi.useRealTimers()
})

describe('Settings', () => {
  it('redirects a signed-out visitor to sign-in', () => {
    renderApp()
    expect(screen.getByRole('heading', { level: 1, name: 'Hexline account' })).toBeInTheDocument()
  })

  it('pre-fills Name from the session and shows Email read-only', () => {
    signIn()
    renderApp()
    expect(byLabel('Name')).toHaveValue('Rae')
    const email = byLabel('Email')
    expect(email).toHaveValue('rae@hexline.test')
    expect(email).toHaveAttribute('readonly')
  })

  // Mutation: drop the `updateName(profile.name)` call in Settings.tsx's `save` -> the session
  // readout below still says "Rae" after a successful save that changed the name.
  it('on success: toasts, persists the profile, and renames the session', async () => {
    vi.mocked(saveProfile).mockResolvedValueOnce(undefined)
    signIn()
    renderApp()
    await userEvent.clear(byLabel('Name'))
    await userEvent.type(byLabel('Name'), 'Rae Fielding')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Your account was updated.')).toBeInTheDocument()
    expect(screen.getByTestId('session-name')).toHaveTextContent('Rae Fielding')
    expect(sessionStorage.getItem('hexline-profile')).toContain('Rae Fielding')
  })

  // A success that lands after the person has already left this page must not be dropped: both
  // are real, durable changes (storage, the session's own name), not React state this page owns,
  // so both still happen, and the toast is what says so since there is no page left to update.
  // Same harness shape as Onboarding's own stale-result test.
  // Mutation: move `writeJson`/`updateName`/`toast` inside an `if (mounted.current)` block (the
  // shape this replaced) -> `hexline-profile` is never written and the toast below never
  // appears, both silently dropped for a save that the mocked request already resolved.
  it('a success that lands after the page is gone still saves and toasts', async () => {
    let resolveSave: () => void = () => {}
    vi.mocked(saveProfile).mockImplementationOnce(() => new Promise(resolve => (resolveSave = resolve)))
    signIn()

    function Harness() {
      const [present, setPresent] = useState(true)
      return (
        <MemoryRouter initialEntries={['/store/account/settings']}>
          <Toaster>
            <SessionProvider>
              <button onClick={() => setPresent(false)}>Leave the page</button>
              <Routes>
                <Route path="/store/account/settings" element={present ? <Settings /> : <p>Left the page</p>} />
              </Routes>
            </SessionProvider>
          </Toaster>
        </MemoryRouter>
      )
    }

    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await userEvent.click(screen.getByRole('button', { name: 'Leave the page' }))
    expect(screen.getByText('Left the page')).toBeInTheDocument()

    await act(async () => {
      resolveSave()
    })
    expect(await screen.findByText('Your account was updated.')).toBeInTheDocument()
    expect(sessionStorage.getItem('hexline-profile')).toContain('Rae')
  })

  // Mutation: change the `catch` block's `setSaveFailed(true)` to `setSaveFailed(false)` -> the
  // alert below never appears, even though saveProfile rejected.
  it('on failure: shows a persistent alert and keeps the typed values', async () => {
    vi.mocked(saveProfile).mockRejectedValueOnce(new Error('Could not save your profile.'))
    signIn()
    renderApp()
    await userEvent.clear(byLabel('Name'))
    await userEvent.type(byLabel('Name'), 'Rae Unsaved')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    // sr-only and visible duplicates of the same alert, both carrying the text -- same pattern as
    // Onboarding's own failure alert.
    expect(await screen.findAllByText('Your account was not updated. Please try again.')).toHaveLength(2)
    expect(byLabel('Name')).toHaveValue('Rae Unsaved')
  })

  // Same shape as Onboarding's own double-click test: both clicks fire inside one `act`, so
  // React defers rendering until it returns and `pending`'s own DOM effect (Button turning
  // aria-disabled) can never be what stops the second click -- only `inFlight`, a plain ref set
  // synchronously the instant `save` starts running, can. Mutation: drop the `inFlight.current ||`
  // short-circuit from Settings.tsx's `save`, keeping only the `!user` check -> saveProfile is
  // called twice instead of once.
  it('calls saveProfile once when Save is clicked twice in the same event batch', async () => {
    let resolveSave: () => void = () => {}
    vi.mocked(saveProfile).mockImplementation(() => new Promise(resolve => (resolveSave = resolve)))
    signIn()
    renderApp()
    const save = screen.getByRole('button', { name: 'Save' })
    act(() => {
      fireEvent.click(save)
      fireEvent.click(save)
    })
    await act(async () => resolveSave())
    expect(saveProfile).toHaveBeenCalledTimes(1)
  })

  // Mutation: change the `750` delay in Settings.tsx to `100` -> at 300ms (still inside this
  // test's own "not yet" window) the sr-only status has already moved to "5 of 280 characters",
  // and the first assertion after the partial advance below fails.
  it('the bio counter is visible immediately but the sr-only status is throttled 750ms', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    signIn()
    renderApp()
    const bio = byLabel('Bio')
    fireEvent.change(bio, { target: { value: 'Field' } })
    expect(screen.getByText('5/280')).toBeInTheDocument()
    expect(screen.getByText('0 of 280 characters')).toBeInTheDocument()
    await act(async () => {
      vi.advanceTimersByTime(300)
    })
    expect(screen.getByText('0 of 280 characters')).toBeInTheDocument()
    await act(async () => {
      vi.advanceTimersByTime(450)
    })
    expect(screen.getByText('5 of 280 characters')).toBeInTheDocument()
  })

  // Mutation: drop the `nameError` check from Settings.tsx's `save`, keeping only the
  // `inFlight.current || !user` guard -> `saveProfile` below is called once (with an empty
  // name) instead of never, and the error text is never shown.
  it('an empty Name is rejected before the request, showing the error', async () => {
    signIn()
    renderApp()
    await userEvent.clear(byLabel('Name'))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    // The message shows twice, once in the ErrorSummary's link and once at the field itself.
    expect(await screen.findAllByText('Enter your name.')).toHaveLength(2)
    expect(saveProfile).not.toHaveBeenCalled()
  })

  // Mutation: drop the `attempt > 0 &&` gate from the ErrorSummary `errors` prop (render the
  // summary on blur again). Name's own onBlur already calls `errors.blur`, so clearing it and
  // tabbing away would mount the whole summary above the form and push Save down by its own
  // height -- exactly the layout shift that can swallow a click on it before Save was ever
  // pressed once.
  it('does not show the error summary from blurring an empty Name, only after Save is pressed', async () => {
    signIn()
    renderApp()
    await userEvent.clear(byLabel('Name'))
    await userEvent.tab()
    expect(byLabel('Name')).toHaveAccessibleDescription('Enter your name.')
    expect(screen.queryByRole('group', { name: 'There is a problem' })).not.toBeInTheDocument()
  })

  // `hexline-profile` is one sessionStorage key shared by every account this tab ever signs
  // into. A profile stored for a different email must never leak into this one's form.
  // Mutation: drop the `stored.email === email` check in Settings.tsx's `loadProfile` (always
  // return the stored profile) -> Name below reads "Alex", not "Rae".
  it('falls back to a fresh profile when the stored one belongs to a different email', () => {
    sessionStorage.setItem(
      'hexline-profile',
      JSON.stringify({
        email: 'alex@hexline.test',
        name: 'Alex',
        defaultSize: 'L',
        newsletter: true,
        serviceReminders: true,
        bio: 'Someone else entirely.',
      })
    )
    signIn()
    renderApp()
    expect(byLabel('Name')).toHaveValue('Rae')
  })

  it('is axe clean, signed in', async () => {
    signIn()
    const { container } = renderApp()
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
