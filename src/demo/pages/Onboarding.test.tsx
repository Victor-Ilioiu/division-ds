import { useState } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { axeClean } from '../../test/axe'
import { Toaster } from '../../components/molecules'
import { ApiError, saveOnboarding } from '../store/api'
import { SessionProvider } from '../store/session'
import { Onboarding } from './Onboarding'

vi.mock('../store/api', async importOriginal => {
  const actual = await importOriginal<typeof import('../store/api')>()
  return { ...actual, saveOnboarding: vi.fn() }
})

const USER = { name: 'Rae', email: 'rae@hexline.test' }
const SAVE_ERROR = 'Something went wrong saving your preferences. Please try again.'

/** Reads whatever a redirect left in router state, the same shape RouteNotice does. */
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

/** The current path, mounted alongside the routed page so a stale-result test can assert the URL
 *  never moved, the same reasoning as auth.test.tsx's own Probe. */
function Probe() {
  const location = useLocation()
  return <output data-testid="path">{location.pathname}</output>
}

function renderPage({ user }: { user?: { name: string; email: string } } = {}) {
  if (user) {
    sessionStorage.setItem('hexline-session', JSON.stringify({ user, pendingEmail: null }))
  }
  return render(
    <MemoryRouter initialEntries={['/store/onboarding']}>
      <SessionProvider>
        <Toaster>
          <Routes>
            <Route path="/store/onboarding" element={<Onboarding />} />
            <Route path="/store/create-account" element={<Stub name="Create account" />} />
            <Route path="/store/shop" element={<Stub name="Shop" />} />
          </Routes>
        </Toaster>
      </SessionProvider>
    </MemoryRouter>
  )
}

const nextButton = () => screen.getByRole('button', { name: 'Next' })
const backButton = () => screen.getByRole('button', { name: 'Back' })
const finishButton = () => screen.getByRole('button', { name: 'Finish' })

async function chooseSize(label: string) {
  await userEvent.click(screen.getByRole('combobox', { name: /^Usual helmet size\*?$/ }))
  await userEvent.click(await screen.findByRole('option', { name: label }))
}

async function toUpdatesStep() {
  await userEvent.click(screen.getByRole('checkbox', { name: 'Woodland field days' }))
  await userEvent.click(nextButton())
  await chooseSize('M')
  await userEvent.click(nextButton())
}

afterEach(() => {
  sessionStorage.clear()
  vi.clearAllMocks()
})

describe('Onboarding', () => {
  // Mutation: drop the `if (!user)` guard -> the page renders its own form instead of redirecting,
  // and the heading query below finds "Set up your account" instead of "Create account".
  it('bounces a direct load with no one signed in back to account creation, with a notice', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1, name: 'Create account' })).toBeInTheDocument()
    expect(screen.getByText('Create an account first.')).toBeInTheDocument()
  })

  // Mutation: hardcode Stepper's `current={1}` instead of `current={step}` -> the first
  // listitem's `aria-current` check below fails (it lands on the second item instead).
  it('reads as a real page h1, with the stepper on step 1', () => {
    renderPage({ user: USER })
    expect(screen.getByRole('heading', { level: 1, name: 'Set up your account' })).toBeInTheDocument()
    const progress = screen.getByRole('list', { name: 'Setup progress' })
    expect(within(progress).getAllByRole('listitem')[0]).toHaveAttribute('aria-current', 'step')
    expect(screen.getByRole('heading', { name: 'Step 1 of 3: Activities' })).toBeInTheDocument()
  })

  // Mutation: drop the `if (hasErrors(found))` branch in `submit` -> Next moves straight to Fit
  // with nothing checked, and the group query below finds nothing.
  it('asks for at least one activity when Next is pressed with none checked, and focuses the summary', async () => {
    renderPage({ user: USER })
    await userEvent.click(nextButton())
    const summary = screen.getByRole('group', { name: 'There is a problem' })
    await waitFor(() => expect(summary).toHaveFocus())
    expect(within(summary).getByRole('link')).toHaveTextContent('Choose at least one activity.')
    await userEvent.click(within(summary).getByRole('link'))
    expect(screen.getByRole('checkbox', { name: 'Woodland field days' })).toHaveFocus()
  })

  // Mutation: give the size Select `id={idOf('size')}-x` instead of `idOf('size')` -> the
  // ErrorSummary link's `getElementById` finds nothing, and focus stays on the link.
  it('asks for a helmet size when Next is pressed with none chosen, and the summary entry focuses it', async () => {
    renderPage({ user: USER })
    await userEvent.click(screen.getByRole('checkbox', { name: 'Woodland field days' }))
    await userEvent.click(nextButton())
    await userEvent.click(nextButton())
    const summary = screen.getByRole('group', { name: 'There is a problem' })
    await waitFor(() => expect(summary).toHaveFocus())
    await userEvent.click(within(summary).getByRole('link', { name: 'Choose your usual helmet size.' }))
    expect(screen.getByRole('combobox', { name: /^Usual helmet size\*?$/ })).toHaveFocus()
  })

  // Mutation: drop `moved.current = true` from `goTo` -> the step-heading focus effect never
  // fires, and the first `toHaveFocus()` assertion below fails.
  it('moves through every step on valid input, focusing each new heading, and Back keeps everything chosen', async () => {
    renderPage({ user: USER })
    await userEvent.click(screen.getByRole('checkbox', { name: 'Woodland field days' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Speed skirmishes' }))
    await userEvent.click(nextButton())
    expect(screen.getByRole('heading', { name: 'Step 2 of 3: Fit' })).toHaveFocus()
    const progress = screen.getByRole('list', { name: 'Setup progress' })
    expect(within(progress).getAllByRole('listitem')[1]).toHaveAttribute('aria-current', 'step')

    await chooseSize('L')
    await userEvent.click(nextButton())
    expect(screen.getByRole('heading', { name: 'Step 3 of 3: Updates' })).toHaveFocus()
    expect(within(progress).getAllByRole('listitem')[2]).toHaveAttribute('aria-current', 'step')

    await userEvent.click(backButton())
    expect(screen.getByRole('heading', { name: 'Step 2 of 3: Fit' })).toHaveFocus()
    expect(screen.getByRole('combobox', { name: /^Usual helmet size\*?$/ })).toHaveTextContent('L')

    await userEvent.click(backButton())
    expect(screen.getByRole('heading', { name: 'Step 1 of 3: Activities' })).toHaveFocus()
    expect(screen.getByRole('checkbox', { name: 'Woodland field days' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Speed skirmishes' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Indoor sites' })).not.toBeChecked()
  })

  // Mutation: pass `{ activities: [], size: '', newsletter: false, serviceReminders: false }`
  // (a fixed empty object) to `saveOnboarding` instead of the real `prefs` -> the `toHaveBeenCalledWith`
  // assertion fails.
  it('saves the chosen preferences, raises the confirmation toast and lands on the shop', async () => {
    vi.mocked(saveOnboarding).mockResolvedValueOnce(undefined)
    renderPage({ user: USER })
    await userEvent.click(screen.getByRole('checkbox', { name: 'Weekend events' }))
    await userEvent.click(nextButton())
    await chooseSize('S')
    await userEvent.click(nextButton())
    await userEvent.click(screen.getByRole('switch', { name: 'Service reminders' }))
    await userEvent.click(finishButton())
    expect(saveOnboarding).toHaveBeenCalledWith('rae@hexline.test', {
      activities: ['weekend-events'],
      size: 'S',
      newsletter: false,
      serviceReminders: true,
    })
    expect(await screen.findByRole('heading', { level: 1, name: 'Shop' })).toBeInTheDocument()
    expect(await screen.findByText('Your account is set up.')).toBeInTheDocument()
  })

  // A rejection is never dropped silently, and a retry reuses exactly what was already typed.
  // Mutation: drop the `catch` block's `setSaveFailed(true)` -> the alert query below finds
  // nothing.
  it('shows a persistent hostile alert with a retry when saving fails, and a retry reuses the same values', async () => {
    vi.mocked(saveOnboarding)
      .mockRejectedValueOnce(new ApiError('Could not save your preferences.'))
      .mockResolvedValueOnce(undefined)
    renderPage({ user: USER })
    await toUpdatesStep()
    const liveAlert = screen.getByRole('alert')
    expect(liveAlert).toHaveTextContent('')
    await userEvent.click(finishButton())
    await waitFor(() => expect(liveAlert).toHaveTextContent(SAVE_ERROR))
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Shop' })).toBeInTheDocument()
    expect(saveOnboarding).toHaveBeenNthCalledWith(2, 'rae@hexline.test', {
      activities: ['woodland'],
      size: 'M',
      newsletter: false,
      serviceReminders: false,
    })
  })

  // `inFlight` is a plain ref, mutated synchronously the instant `finish` starts running -- unlike
  // `pending` (React state), which two clicks fired in the same batch both still read as `false`
  // from their own stale render closure, since neither click's state update has committed yet.
  // Both `fireEvent.click`s below run inside one `act`, so React defers rendering until it
  // returns: this is the only way `pending`-based guards (the earlier shape of this code) could
  // ever actually miss a double click, and it's exactly the case `inFlight` is for. Mutation: drop
  // the `if (inFlight.current) return` line in `finish` (Button's own `loading` state stays
  // exactly as it is) -> the second click reaches `saveOnboarding` too, landing on 2 calls instead
  // of 1.
  it('calls saveOnboarding once when Finish is clicked twice in the same event batch', async () => {
    let finishSave: () => void = () => {}
    vi.mocked(saveOnboarding).mockImplementation(() => new Promise(resolve => (finishSave = resolve)))
    renderPage({ user: USER })
    await toUpdatesStep()
    const finish = finishButton()
    act(() => {
      fireEvent.click(finish)
      fireEvent.click(finish)
    })
    await act(async () => finishSave())
    expect(saveOnboarding).toHaveBeenCalledTimes(1)
  })

  // Same reasoning as CreateAccount's own stale-result test: two independent assertions, since
  // neither alone proves the guard. Mutation: drop the `if (!mounted.current) return` line before
  // `toast`/`navigate` in `finish` -> the toast appears and the path moves to `/store/shop` even
  // though the page was left first.
  it('drops a save result that resolves after the page is gone, without toasting or navigating', async () => {
    let resolveSave: () => void = () => {}
    vi.mocked(saveOnboarding).mockImplementationOnce(() => new Promise(resolve => (resolveSave = resolve)))
    sessionStorage.setItem('hexline-session', JSON.stringify({ user: USER, pendingEmail: null }))

    function Harness() {
      const [present, setPresent] = useState(true)
      return (
        <MemoryRouter initialEntries={['/store/onboarding']}>
          <SessionProvider>
            <Toaster>
              <button onClick={() => setPresent(false)}>Leave the page</button>
              <Probe />
              <Routes>
                <Route path="/store/onboarding" element={present ? <Onboarding /> : <p>Left the page</p>} />
                <Route path="/store/shop" element={<p>Shop</p>} />
              </Routes>
            </Toaster>
          </SessionProvider>
        </MemoryRouter>
      )
    }

    render(<Harness />)
    await userEvent.click(screen.getByRole('checkbox', { name: 'Woodland field days' }))
    await userEvent.click(nextButton())
    await chooseSize('M')
    await userEvent.click(nextButton())
    await userEvent.click(finishButton())
    await userEvent.click(screen.getByRole('button', { name: 'Leave the page' }))
    expect(screen.getByText('Left the page')).toBeInTheDocument()

    await act(async () => {
      resolveSave()
    })
    expect(screen.getByTestId('path')).toHaveTextContent('/store/onboarding')
    expect(screen.queryByText('Your account is set up.')).toBeNull()
  })

  // A save that fails after the page is gone has no retryable alert left to show it on, so it
  // travels as a toast instead of vanishing with nothing said about it -- `Toaster` sits above the
  // routed page, so its viewport is still there for it. Mutation: drop the `toast({ tone:
  // 'hostile', ... })` call from the `if (!mounted.current)` branch in `finish`'s `catch` -> the
  // text query below finds nothing.
  it('raises a hostile toast for a save failure that resolves after the page is gone', async () => {
    let rejectSave: (error: unknown) => void = () => {}
    vi.mocked(saveOnboarding).mockImplementationOnce(() => new Promise((_, reject) => (rejectSave = reject)))
    sessionStorage.setItem('hexline-session', JSON.stringify({ user: USER, pendingEmail: null }))

    function Harness() {
      const [present, setPresent] = useState(true)
      return (
        <MemoryRouter initialEntries={['/store/onboarding']}>
          <SessionProvider>
            <Toaster>
              <button onClick={() => setPresent(false)}>Leave the page</button>
              <Routes>
                <Route path="/store/onboarding" element={present ? <Onboarding /> : <p>Left the page</p>} />
              </Routes>
            </Toaster>
          </SessionProvider>
        </MemoryRouter>
      )
    }

    render(<Harness />)
    await userEvent.click(screen.getByRole('checkbox', { name: 'Woodland field days' }))
    await userEvent.click(nextButton())
    await chooseSize('M')
    await userEvent.click(nextButton())
    await userEvent.click(finishButton())
    await userEvent.click(screen.getByRole('button', { name: 'Leave the page' }))
    expect(screen.getByText('Left the page')).toBeInTheDocument()

    await act(async () => {
      rejectSave(new ApiError('Could not save your preferences.'))
    })
    expect(await screen.findByText('Your preferences were not saved.')).toBeInTheDocument()
  })

  // Mutation: empty the "Woodland field days" checkbox's label text (drop the `label.text` prop's children in
  // the map) -> a real axe violation (`button-name`, WCAG 1.3.1/4.1.2 -- Radix's Checkbox renders
  // as `role="checkbox"` on a `<button>`, so a missing accessible name is flagged as that rule,
  // not `label`).
  it('is axe clean on the activities step', async () => {
    const { container } = renderPage({ user: USER })
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
