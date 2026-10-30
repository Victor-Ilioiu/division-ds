import { useEffect } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Route, Routes, useParams } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import { DemoLayout } from './DemoLayout'
vi.mock('./routes', async orig => {
  const real = await orig<typeof import('./routes')>()
  return { ...real, DEMO_PAGES: [...real.DEMO_PAGES, { path: '/store/shop/:id', label: 'Product', title: 'Hexline — product',
    Component: real.DEMO_PAGES[0].Component, inNav: false, titleFromPage: true as const }] }
})
function Product() {
  const { id } = useParams()
  useEffect(() => { document.title = `Hexline — ${id}` }, [id])
  return <><h1>{id}</h1><Link to="/store/shop/b">Next</Link></>
}
it('leaves a page that owns its title alone, across a move from one product to another', async () => {
  render(<MemoryRouter initialEntries={['/store/shop/a']}><Routes><Route element={<DemoLayout />}>
    <Route path="/store/shop/:id" element={<Product />} /></Route></Routes></MemoryRouter>)
  await screen.findByRole('heading', { level: 1, name: 'a' })
  expect(document.title).toBe('Hexline — a')
  await userEvent.click(screen.getByRole('link', { name: 'Next' }))
  await screen.findByRole('heading', { level: 1, name: 'b' })
  expect(document.title).toBe('Hexline — b')
})
