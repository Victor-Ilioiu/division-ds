import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { Toaster } from '../components/molecules/toast/Toast'
import { Themes } from './Themes'
import { axeClean } from '../test/axe'

function Where() {
  const { search } = useLocation()
  return <output data-testid="search">{search}</output>
}

const renderAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Toaster>
        <Themes />
        <Where />
      </Toaster>
    </MemoryRouter>
  )

describe('Themes', () => {
  it('gives the CSS for a preset that passes every pair', () => {
    renderAt('/themes?preset=1-f2550f-283445')
    expect(screen.getByText(/contrast checks pass/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy the theme CSS' })).toBeInTheDocument()
  })

  it('names the failing pairs and withholds the CSS when AA fails', () => {
    // A neutral that wrecks the light page: the solver only moves accent shades, so this stays failed.
    renderAt('/themes?preset=1-f2550f-ff00ff')
    expect(screen.getByText(/checks fail AA, so there is no CSS yet/)).toBeInTheDocument()
    expect(screen.getAllByText(/^light: /).length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: 'Copy the theme CSS' })).not.toBeInTheDocument()
  })

  it('says which accent shades it moved to pass', () => {
    renderAt('/themes?preset=1-16a34a-283445')
    expect(screen.getByText(/Light theme: accent state colour darkened from 500 to 600/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy the theme CSS' })).toBeInTheDocument()
  })

  it('keeps the preset when a font is picked, and loads that font once', async () => {
    renderAt('/themes?preset=1-f2550f-283445&shape=x')
    for (const name of ['Heading font', 'Body font']) {
      await userEvent.click(screen.getByRole('combobox', { name }))
      await userEvent.click(await screen.findByRole('option', { name: 'Inter' }))
    }
    expect(screen.getByText(/contrast checks pass/)).toBeInTheDocument()
    expect(screen.getByTestId('theme-preview').style.getPropertyValue('--font-display')).toContain('Inter')
    const links = document.head.querySelectorAll('link[data-theme-font]')
    expect(links[links.length - 1].getAttribute('href')).toBe('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap')
  })

  it('keeps the cut corner by default and offers no radius', () => {
    renderAt('/themes')
    expect(screen.getByRole('checkbox', { name: 'Keep the cut corner' })).toBeChecked()
    expect(screen.queryByRole('combobox', { name: 'Corner radius' })).not.toBeInTheDocument()
  })

  it('applies a radius from the shape param to the previews', () => {
    const { container } = renderAt('/themes?preset=1-f2550f-283445&shape=r16')
    expect(screen.getByRole('checkbox', { name: 'Keep the cut corner' })).not.toBeChecked()
    expect(screen.getByRole('combobox', { name: 'Corner radius' })).toHaveTextContent('Large')
    const preview = container.querySelector<HTMLElement>('[data-theme="dark"]')!
    expect(preview.style.getPropertyValue('--shape-bevel')).toBe('0')
    expect(preview.style.getPropertyValue('--shape-radius')).toBe('16px')
  })

  it('puts a picked accent preset in the URL, and shows the picker only for a custom colour', async () => {
    renderAt('/themes')
    expect(screen.getByRole('heading', { level: 1, name: 'Theme Builder' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Custom accent')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('combobox', { name: 'Accent colour' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Blue' }))
    expect(screen.getByTestId('search')).toHaveTextContent('preset=1-2563eb-283445')
    expect(screen.getByTestId('theme-preview').style.getPropertyValue('--color-accent-signal-fill')).toBe('#2563eb')
    await userEvent.click(screen.getByRole('combobox', { name: 'Accent colour' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Custom color' }))
    expect(screen.getByLabelText('Custom accent')).toHaveValue('#2563eb')
  })

  it('opens a shared custom accent with the picker showing', () => {
    renderAt('/themes?preset=1-123456-283445')
    expect(screen.getByRole('combobox', { name: 'Accent colour' })).toHaveTextContent('Custom color')
    expect(screen.getByLabelText('Custom accent')).toHaveValue('#123456')
  })

  it('switches the preview theme on its own, through the mode param', async () => {
    renderAt('/themes?mode=light')
    expect(screen.getByTestId('theme-preview')).toHaveAttribute('data-theme', 'light')
    await userEvent.click(screen.getByRole('radio', { name: 'Dark' }))
    expect(screen.getByTestId('theme-preview')).toHaveAttribute('data-theme', 'dark')
    expect(screen.getByTestId('search')).toHaveTextContent('mode=dark')
  })

  it('previews real components: a chart, a table, a form', () => {
    renderAt('/themes')
    const preview = screen.getByTestId('theme-preview')
    expect(preview.querySelector('table')).not.toBeNull()
    expect(screen.getByRole('heading', { name: 'Weekly orders' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /Contact name/ })).toBeInTheDocument()
  })

  it('falls back to the default, and says why, for an unreadable code', () => {
    renderAt('/themes?preset=9-nope')
    expect(screen.getByText('That preset code could not be read')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy the theme CSS' })).toBeInTheDocument()
  })

  it('is axe clean', async () => {
    const { container } = renderAt('/themes')
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
