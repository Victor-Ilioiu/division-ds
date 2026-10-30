import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { axeClean } from '../test/axe'
import { DocsNotFound } from './DocsNotFound'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <DocsNotFound />
    </MemoryRouter>
  )
}

describe('DocsNotFound', () => {
  // Mutation: change the h1 text in DocsNotFound.tsx from "Page not found" to "Not found" ->
  // this query finds nothing.
  it('names the page and the missing path', () => {
    renderAt('/components/nope')
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()
    const code = screen.getByText('/components/nope', { selector: 'code' })
    expect(code.tagName).toBe('CODE')
    expect(code).toHaveClass('break-all')
  })

  // Mutation: change one of the three `to` targets in DocsNotFound.tsx's `LINKS` (say
  // "/components/button" to "/components/badge") -> the href assertion below fails.
  it('links to the design system overview, a real component page, and the Hexline demo store', () => {
    renderAt('/components/nope')
    expect(screen.getByRole('link', { name: 'All components' })).toHaveAttribute('href', '/components')
    expect(screen.getByRole('link', { name: 'Components: Button' })).toHaveAttribute('href', '/components/button')
    expect(screen.getByRole('link', { name: 'The Hexline demo store' })).toHaveAttribute('href', '/store')
  })

  it('is axe clean', async () => {
    const { container } = renderAt('/components/nope')
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
