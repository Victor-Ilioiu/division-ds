import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axeClean } from '../test/axe'
import { DemoRouteError } from './DemoRouteError'

function renderError(onRetry = () => {}, connectionIssue = false) {
  return render(
    <MemoryRouter>
      <DemoRouteError onRetry={onRetry} connectionIssue={connectionIssue} />
    </MemoryRouter>
  )
}

describe('DemoRouteError', () => {
  // Mutation: drop `tabIndex={-1}` from the `<h1>` -> a plain heading is never in the tab/focus
  // order, and `.focus()` in the effect below becomes a silent no-op; this assertion fails.
  it('focuses its own heading on mount', async () => {
    renderError()
    const heading = await screen.findByRole('heading', { level: 1, name: 'Something went wrong' })
    expect(heading).toHaveFocus()
  })

  // Mutation: remove the `onClick={onRetry}` from the "Try again" Button -> this click has
  // nothing to call.
  it('calls onRetry when "Try again" is clicked', async () => {
    const onRetry = vi.fn()
    renderError(onRetry)
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  // Mutation: drop the `connectionIssue` conditional in DemoRouteError.tsx, always rendering the
  // "while rendering" copy -> this assertion fails to find text that was never written.
  it('blames a chunk-load failure on the connection, not on rendering', () => {
    renderError(() => {}, true)
    expect(screen.getByText(/couldn't load\. check your connection/i)).toBeInTheDocument()
    expect(screen.queryByText(/ran into a problem while rendering/i)).not.toBeInTheDocument()
  })

  // Mutation: default `connectionIssue` to `true` instead of `false` -> an ordinary render error
  // (no prop passed, same as every test above) would show the connection copy instead, and this
  // assertion fails.
  it('keeps the ordinary "while rendering" copy when connectionIssue is not set', () => {
    renderError()
    expect(screen.getByText(/ran into a problem while rendering/i)).toBeInTheDocument()
  })

  // Mutation: point the "Go to the store home" link at '/demo/does-not-exist' instead of
  // `DEMO_HOME` -> this assertion reads the wrong href.
  it('links "Go to the store home" to /demo', () => {
    renderError()
    expect(screen.getByRole('link', { name: 'Go to the store home' })).toHaveAttribute('href', '/demo')
  })

  // Mutation: pass `announce` through to the underlying ErrorState -> this query finds a
  // role="alert" that would double up on the focus move above as the announcement to a screen
  // reader for the same single event.
  it('carries no role="alert" -- the focus move onto its heading is the announcement', () => {
    renderError()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  // Mutation: drop the "Try again" text from the retry Button, leaving it with no accessible
  // name -> a real axe `button-name` violation. (`aria-hidden` on the TriangleAlert icon and on
  // the button itself did not bite here -- axe treats an icon-only SVG with no `role="img"` as
  // already invisible to the accessibility tree, and RTL's jsdom environment never registers
  // `aria-hidden-focus` for a `<button>` that never actually receives focus during the run.)
  it('is axe clean', async () => {
    const { container } = renderError()
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
