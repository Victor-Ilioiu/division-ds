import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, Link, Outlet } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { getActiveLenisMock } = vi.hoisted(() => ({ getActiveLenisMock: vi.fn() }))
vi.mock('../fx/smooth-scroll', () => ({ getActiveLenis: getActiveLenisMock }))

import { useScrollResetOnNavigate } from './useScrollResetOnNavigate'

// The hook is called once in a pathless parent route, the same shape App.tsx's own RouteFocus
// uses so both the docs shell and the Hexline demo shell share one reset behaviour, rather than
// each layout owning its own copy -- and the same reason a query-string-only change (Route B with
// `?x=`) must not reset either, matching every filter/pagination param this app carries in the URL.
function RouteFocus() {
  useScrollResetOnNavigate()
  return <Outlet />
}
function Layout() {
  return (
    <>
      <Link to="/b">Go to B</Link>
      <Link to="/a?x=1">Go to A, same path, new query</Link>
      <Outlet />
    </>
  )
}
function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<RouteFocus />}>
          <Route element={<Layout />}>
            <Route path="/a" element={<h1>A</h1>} />
            <Route path="/b" element={<h1>B</h1>} />
          </Route>
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('useScrollResetOnNavigate', () => {
  // Mutation: drop the `if (prev.current === pathname) return` guard -- this fires on the very
  // first render too, and the call-count assertion below fails.
  it('leaves scroll alone on first load', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    getActiveLenisMock.mockReturnValue(undefined)
    renderAt('/a')
    expect(scrollTo).not.toHaveBeenCalled()
  })

  // Mutation: call `window.scrollTo(0, 0)` unconditionally, ignoring `getActiveLenis()` -- the
  // `lenis.scrollTo` assertion below finds it was never called, and `window.scrollTo` was called
  // instead.
  it('scrolls the active Lenis instance, not the window, when the demo shell has one running', async () => {
    const lenisScrollTo = vi.fn()
    getActiveLenisMock.mockReturnValue({ scrollTo: lenisScrollTo })
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    renderAt('/a')
    await userEvent.click(screen.getByRole('link', { name: 'Go to B' }))
    expect(await screen.findByRole('heading', { name: 'B' })).toBeInTheDocument()
    expect(lenisScrollTo).toHaveBeenCalledWith(0, { immediate: true })
    expect(scrollTo).not.toHaveBeenCalled()
  })

  // Mutation: same as above, the other branch -- hardcode the Lenis call instead of falling back
  // to `window.scrollTo` when there is no active instance.
  it('falls back to window.scrollTo when no Lenis instance is running (every docs route)', async () => {
    getActiveLenisMock.mockReturnValue(undefined)
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    renderAt('/a')
    await userEvent.click(screen.getByRole('link', { name: 'Go to B' }))
    expect(await screen.findByRole('heading', { name: 'B' })).toBeInTheDocument()
    expect(scrollTo).toHaveBeenCalledWith(0, 0)
  })

  // Mutation: key the effect on the full `location` instead of `pathname` alone -- the assertion
  // below then finds a call it must not have.
  it('does not reset scroll for a query-string-only change to the same path', async () => {
    getActiveLenisMock.mockReturnValue(undefined)
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    renderAt('/a')
    await userEvent.click(screen.getByRole('link', { name: 'Go to A, same path, new query' }))
    expect(scrollTo).not.toHaveBeenCalled()
  })
})
