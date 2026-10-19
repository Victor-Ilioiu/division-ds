import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, Link, Outlet } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { useFocusMainOnNavigate } from './useFocusMainOnNavigate'

// The hook is called once in a pathless parent route so both the docs shell and the Hexline demo
// shell share one focus-on-navigate behaviour, rather than each layout owning its own copy. This
// harness mirrors that shape: RouteFocus is the parent route, Layout is the shell nested inside it.
function RouteFocus() {
  useFocusMainOnNavigate()
  return <Outlet />
}
function Layout() {
  return (
    <>
      <Link to="/b">Go to B</Link>
      <main id="main" tabIndex={-1}><Outlet /></main>
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

describe('useFocusMainOnNavigate', () => {
  it('leaves focus alone on first load', () => {
    renderAt('/a')
    expect(document.activeElement).toBe(document.body)
  })
  it('moves focus to #main after an in-app navigation', async () => {
    renderAt('/a')
    await userEvent.click(screen.getByRole('link', { name: 'Go to B' }))
    expect(await screen.findByRole('heading', { name: 'B' })).toBeInTheDocument()
    expect(document.activeElement).toBe(document.getElementById('main'))
  })
})
