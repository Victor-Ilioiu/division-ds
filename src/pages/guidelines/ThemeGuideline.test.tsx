import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { Toaster } from '../../components/molecules/toast/Toast'
import { ThemeGuideline } from './ThemeGuideline'

const renderAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Toaster>
        <ThemeGuideline />
      </Toaster>
    </MemoryRouter>
  )

describe('ThemeGuideline', () => {
  it('gives the CSS for a preset that passes every pair', () => {
    renderAt('/guidelines/theme?preset=1-f2550f-283445')
    expect(screen.getByText(/measurements pass in both themes/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy the theme CSS' })).toBeInTheDocument()
  })

  it('names the failing pairs and withholds the CSS when AA fails', () => {
    // A neutral that wrecks the light page: the solver only moves accent shades, so this stays failed.
    renderAt('/guidelines/theme?preset=1-f2550f-ff00ff')
    expect(screen.getByText(/measurements fail, so there is no code to copy/)).toBeInTheDocument()
    expect(screen.getAllByText(/^light: /).length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: 'Copy the theme CSS' })).not.toBeInTheDocument()
  })

  it('says which accent shades it moved to pass', () => {
    renderAt('/guidelines/theme?preset=1-16a34a-283445')
    expect(screen.getByText(/Light theme: accent state colour darkened from 500 to 600/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy the theme CSS' })).toBeInTheDocument()
  })

  it('keeps the preset when a font is picked, and loads that font once', async () => {
    renderAt('/guidelines/theme?preset=1-f2550f-283445&shape=x')
    for (const name of ['Heading font', 'Body font']) {
      await userEvent.click(screen.getByRole('combobox', { name }))
      await userEvent.click(await screen.findByRole('option', { name: 'Inter' }))
    }
    expect(screen.getByText(/measurements pass in both themes/)).toBeInTheDocument()
    expect(screen.getByText('dark theme').parentElement!.style.getPropertyValue('--font-display')).toContain('Inter')
    const links = document.head.querySelectorAll('link[data-theme-font]')
    expect(links[links.length - 1].getAttribute('href')).toBe('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap')
  })

  it('keeps the cut corner by default and offers no radius', () => {
    renderAt('/guidelines/theme')
    expect(screen.getByRole('checkbox', { name: 'Keep the cut corner' })).toBeChecked()
    expect(screen.queryByRole('radiogroup', { name: 'Corner radius' })).not.toBeInTheDocument()
  })

  it('applies a radius from the shape param to the previews', () => {
    const { container } = renderAt('/guidelines/theme?preset=1-f2550f-283445&shape=r8')
    expect(screen.getByRole('checkbox', { name: 'Keep the cut corner' })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: '8 px' })).toBeChecked()
    const preview = container.querySelector<HTMLElement>('[data-theme="dark"]')!
    expect(preview.style.getPropertyValue('--shape-bevel')).toBe('0')
    expect(preview.style.getPropertyValue('--shape-radius')).toBe('8px')
  })

  it('falls back to the default, and says why, for an unreadable code', () => {
    renderAt('/guidelines/theme?preset=9-nope')
    expect(screen.getByText('That preset code could not be read')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy the theme CSS' })).toBeInTheDocument()
  })
})
