import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { DemoLayout } from './DemoLayout'

afterEach(() => {
  sessionStorage.clear()
})

function Product() {
  const { id } = useParams()
  return <h1>{id}</h1>
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<DemoLayout />}>
          <Route path="/demo/shop/:id" element={<Product />} />
          <Route path="/demo/*" element={<h1>Home</h1>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

describe('DemoLayout nav-current, on a route nested under an inNav entry', () => {
  it('marks Shop current on an unlisted product route matched by a registry param path', async () => {
    renderAt('/demo/shop/bump-helmet')
    const nav = await screen.findByRole('navigation', { name: 'Hexline' })
    expect(nav.querySelector('[aria-current="page"]')).toHaveTextContent('Shop')
  })

  // The registry param path matches ANY id, real or not -- DemoLayout marks Shop current from
  // the URL shape alone, never from whether the id actually resolves to a catalogue product.
  // Mutation: drop the `/demo/shop/:id` entry from `DEMO_PAGES` in routes.ts -> nothing matches
  // `/demo/shop/unknown` at all, and the nav-current assertion below fails.
  it('marks Shop current on /demo/shop/unknown, a "Product not found" page', async () => {
    renderAt('/demo/shop/unknown')
    const nav = await screen.findByRole('navigation', { name: 'Hexline' })
    expect(nav.querySelector('[aria-current="page"]')).toHaveTextContent('Shop')
  })

  it('never marks a nav item current on a real 404', async () => {
    renderAt('/demo/does-not-exist')
    const nav = await screen.findByRole('navigation', { name: 'Hexline' })
    expect(nav.querySelector('[aria-current="page"]')).toBeNull()
  })

  // `/demo` is a literal prefix of every route in the shell, sign-in included. Home has no
  // descendants, or an unlisted route with no nav entry of its own reads as though it were nested
  // under Home instead of under nothing.
  // Mutation: replace `isDescendantOf` with the plain `path.startsWith(\`${page.path}/\`)` prefix
  // check for every page, Home included -> the `no nav item current` assertion below fails,
  // Home showing `aria-current="page"` at `/demo/sign-in`.
  it('never marks Home current on a real, unlisted route that merely sits under /demo', async () => {
    renderAt('/demo/sign-in')
    const nav = await screen.findByRole('navigation', { name: 'Hexline' })
    expect(nav.querySelector('[aria-current="page"]')).toBeNull()
  })
})
