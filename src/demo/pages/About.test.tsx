import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { axeClean } from '../../test/axe'
import { Toaster } from '../../components/molecules/toast/Toast'
import { DEMO_PAGES } from '../routes'
import { About, CASE_STUDY_URL, HEXLINE_COMPONENTS } from './About'

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/store/about']}>
      <Toaster>
        <About />
      </Toaster>
    </MemoryRouter>
  )
}

describe('Hexline about page', () => {
  it('is registered in the Navbar with the demo title format', () => {
    const entry = DEMO_PAGES.find(page => page.path === '/store/about')
    expect(entry).toMatchObject({ label: 'About', title: 'Hexline — about', inNav: true })
  })

  it('has its h1, the component list and the case study link, opening in the same tab', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1, name: 'About this demo' })).toBeInTheDocument()
    expect(screen.getByText(`${HEXLINE_COMPONENTS.join(', ')}.`)).toBeInTheDocument()
    const link = screen.getByRole('link', { name: 'Division design system case study' })
    expect(link).toHaveAttribute('href', CASE_STUDY_URL)
    expect(link).not.toHaveAttribute('target')
    expect(screen.getByText('npm run verify')).toBeInTheDocument()
  })

  it('is axe clean', async () => {
    const { container } = renderPage()
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
