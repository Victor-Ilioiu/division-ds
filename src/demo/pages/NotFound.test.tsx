import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { axeClean } from '../../test/axe'
import { NotFound } from './NotFound'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <NotFound />
    </MemoryRouter>
  )
}

describe('NotFound', () => {
  it('names the page and the missing path', () => {
    renderAt('/demo/nope')
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()
    const code = screen.getByText('/demo/nope', { selector: 'code' })
    expect(code.tagName).toBe('CODE')
  })
  it('links back to the Hexline home and the docs', () => {
    renderAt('/demo/nope')
    expect(screen.getByRole('link', { name: 'Back to the Hexline home' })).toHaveAttribute('href', '/demo')
    expect(screen.getByRole('link', { name: 'Open the design system docs' })).toHaveAttribute('href', '/')
  })
  it('is axe clean', async () => {
    const { container } = renderAt('/demo/nope')
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
