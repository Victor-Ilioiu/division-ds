import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DemoErrorBoundary } from './DemoErrorBoundary'

/** Throws during render, guarded by a prop rather than always -- the same shape
 *  StatusError.tsx's own crash button uses, and the only shape that reaches a render-phase
 *  boundary at all (a throw from an event handler never does). */
function Boom({ throwNow, message = 'boom' }: { throwNow: boolean; message?: string }) {
  if (throwNow) throw new Error(message)
  return <p>All good</p>
}

// `onCaughtError` here replaces React's own `defaultOnCaughtError` (which would otherwise log
// the caught error through console.error on every test below, regardless of anything this
// component does) with a no-op, so each test's own console spies see only what
// DemoErrorBoundary's own `componentDidCatch` actually calls -- the same reasoning main.tsx's own
// `onCaughtError` exists for, at the real root.
function renderBoundary(
  children: React.ReactNode,
  { onRetry = () => {}, resetKey = '/store' }: { onRetry?: () => void; resetKey?: string } = {}
) {
  return render(
    <MemoryRouter>
      <DemoErrorBoundary onRetry={onRetry} resetKey={resetKey}>
        {children}
      </DemoErrorBoundary>
    </MemoryRouter>,
    { onCaughtError: () => {} }
  )
}

describe('DemoErrorBoundary', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders its children when nothing has thrown', () => {
    renderBoundary(<Boom throwNow={false} />)
    expect(screen.getByText('All good')).toBeInTheDocument()
  })

  // Mutation: render `this.props.children` unconditionally in `render()`, ignoring
  // `this.state.error` -> the heading below never appears and the query throws.
  it('renders DemoRouteError, focused on its own heading, in place of a child that throws', async () => {
    renderBoundary(<Boom throwNow />)
    const heading = await screen.findByRole('heading', { level: 1, name: 'Something went wrong' })
    expect(heading).toHaveFocus()
  })

  // Mutation: change `componentDidCatch`'s `console.warn(error, info.componentStack)` call to
  // `console.error(...)` -> the `warn` assertion below fails, having never been called.
  it("logs the caught error through componentDidCatch's own console.warn", async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderBoundary(<Boom throwNow />)
    await screen.findByRole('heading', { level: 1, name: 'Something went wrong' })
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0][0]).toBeInstanceOf(Error)
  })

  // Mutation: drop the `onClick={onRetry}` from DemoRouteError's "Try again" Button -> the click
  // below has nothing to call.
  it('calls its own onRetry prop when "Try again" is clicked on an ordinary error', async () => {
    const onRetry = vi.fn()
    renderBoundary(<Boom throwNow />, { onRetry })
    await screen.findByRole('heading', { level: 1, name: 'Something went wrong' })
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  // Mutation: drop the `CHUNK_LOAD_ERROR` branch from `handleRetry`, always calling
  // `this.props.onRetry()` -> `reload` is never called, and this assertion fails. `React.lazy`
  // caches a chunk-load rejection forever, so an ordinary retry (bumping `resetCount`) would just
  // resuspend on that same rejection and crash again immediately -- only a hard reload actually
  // fetches a fresh module graph.
  it('reloads the page instead of calling onRetry when the caught error is a chunk-load failure', async () => {
    const onRetry = vi.fn()
    const reload = vi.fn()
    vi.stubGlobal('location', { ...window.location, reload })
    renderBoundary(<Boom throwNow message="Failed to fetch dynamically imported module" />, { onRetry })
    await screen.findByRole('heading', { level: 1, name: 'Something went wrong' })
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(reload).toHaveBeenCalledTimes(1)
    expect(onRetry).not.toHaveBeenCalled()
  })

  // Mutation: drop the `connectionIssue` prop from DemoErrorBoundary's own `render()` (never pass
  // it to DemoRouteError) -> the connection copy never appears for a chunk-load throw, and the
  // first assertion below fails.
  it('tells DemoRouteError a chunk-load failure is a connection issue, an ordinary crash is not', async () => {
    renderBoundary(<Boom throwNow message="Failed to fetch dynamically imported module" />)
    await screen.findByRole('heading', { level: 1, name: 'Something went wrong' })
    expect(screen.getByText(/couldn't load\. check your connection/i)).toBeInTheDocument()

    renderBoundary(<Boom throwNow message="a real bug" />)
    expect(screen.getAllByText(/ran into a problem while rendering/i).length).toBeGreaterThan(0)
  })

  // Mutation: delete `componentDidUpdate` entirely -> `state.error` never clears on its own, and
  // "All good" (the new child, mounted once the parent's `resetKey` prop changes without ever
  // remounting this boundary itself) never appears; the crashed heading stays in the DOM instead.
  it('clears its own caught error when resetKey changes, without remounting', async () => {
    const { rerender } = renderBoundary(<Boom throwNow />, { resetKey: '/store/shop' })
    await screen.findByRole('heading', { level: 1, name: 'Something went wrong' })
    rerender(
      <MemoryRouter>
        <DemoErrorBoundary onRetry={() => {}} resetKey="/store">
          <Boom throwNow={false} />
        </DemoErrorBoundary>
      </MemoryRouter>
    )
    expect(screen.getByText('All good')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1, name: 'Something went wrong' })).not.toBeInTheDocument()
  })
})
