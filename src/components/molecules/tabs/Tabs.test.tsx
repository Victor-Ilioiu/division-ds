import { createRef } from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../../../test/axe'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './Tabs'

function Kit() {
  return (
    <Tabs defaultValue="replica">
      <TabsList aria-label="Kit sections">
        <TabsTrigger value="replica">Replica</TabsTrigger>
        <TabsTrigger value="optics">Optics</TabsTrigger>
        <TabsTrigger value="parts" disabled>
          Parts
        </TabsTrigger>
      </TabsList>
      <TabsContent value="replica">Electric carbine replica.</TabsContent>
      <TabsContent value="optics">Tube sight and holo sight.</TabsContent>
      <TabsContent value="parts">Magazines and a battery.</TabsContent>
    </Tabs>
  )
}

describe('Tabs', () => {
  it('renders a named tablist with the default tab selected', () => {
    render(<Kit />)
    expect(screen.getByRole('tablist', { name: 'Kit sections' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Replica' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Electric carbine replica.')
  })

  it('switches panel on click', async () => {
    render(<Kit />)
    await userEvent.click(screen.getByRole('tab', { name: 'Optics' }))
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Tube sight and holo sight.')
  })

  it('moves and activates with the arrow keys, skipping a disabled tab', async () => {
    render(<Kit />)
    await userEvent.tab()
    expect(screen.getByRole('tab', { name: 'Replica' })).toHaveFocus()
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Optics' })).toHaveFocus()
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Tube sight and holo sight.')
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Replica' })).toHaveFocus()
  })

  it('labels each panel by its tab', () => {
    render(<Kit />)
    expect(screen.getByRole('tabpanel', { name: 'Replica' })).toBeInTheDocument()
  })

  it('forwards a ref to the root element', () => {
    const ref = createRef<HTMLDivElement>()
    render(
      <Tabs ref={ref} defaultValue="replica">
        <TabsList aria-label="Kit sections">
          <TabsTrigger value="replica">Replica</TabsTrigger>
        </TabsList>
        <TabsContent value="replica">Electric carbine replica.</TabsContent>
      </Tabs>
    )
    expect(ref.current).not.toBeNull()
    expect(ref.current?.tagName).toBe('DIV')
    expect(ref.current).toContainElement(screen.getByRole('tablist'))
  })

  it('is axe clean', async () => {
    const { container } = render(<Kit />)
    expect(await axeClean(container)).toHaveNoViolations()
  })

  it('keeps the fill variant as the default', () => {
    render(<Kit />)
    const active = screen.getByRole('tab', { name: 'Replica' })
    // The fill is the list's sliding indicator now, so the trigger carries no fill of its own.
    expect(active.className).not.toContain('data-[state=active]:bg-[var(--color-accent-signal-fill)]')
    expect(active.className).toContain('data-[state=active]:text-[var(--color-accent-signal-ink)]')
    expect(active).not.toHaveAttribute('data-variant')
    expect(screen.getByRole('tablist').querySelector('[data-tabs-indicator="fill"]')).not.toBeNull()
  })

  it('draws the line variant as an underline, never a fill', () => {
    render(
      <Tabs defaultValue="open" variant="line">
        <TabsList aria-label="Manifests">
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>
      </Tabs>
    )
    const active = screen.getByRole('tab', { name: 'Open' })
    expect(active).toHaveAttribute('data-variant', 'line')
    expect(active.className).not.toContain('bg-[var(--color-accent-signal-fill)]')
    expect(active.className).not.toContain('shadow-[inset')
    expect(screen.getByRole('tablist').querySelector('[data-tabs-indicator="line"]')).not.toBeNull()
  })

  it('renders one hidden, non-interactive sliding indicator that respects reduced motion', () => {
    render(<Kit />)
    const list = screen.getByRole('tablist')
    const indicators = list.querySelectorAll('[data-tabs-indicator]')
    expect(indicators).toHaveLength(1)
    const el = indicators[0]
    expect(el).toHaveAttribute('aria-hidden', 'true')
    expect(el.className).toContain('motion-reduce:transition-none')
    expect(el.className).toContain('pointer-events-none')
    // No transition on first paint: data-ready is only set after two frames and a real measure.
    expect(el).not.toHaveAttribute('data-ready')
  })

  it('keeps the indicator out of the tab list names and roving focus', async () => {
    render(<Kit />)
    expect(screen.getAllByRole('tab')).toHaveLength(3)
    await userEvent.tab()
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Optics' })).toHaveFocus()
  })

  it('folds a count into the tab name and hides the icon', () => {
    render(
      <Tabs defaultValue="open" variant="line">
        <TabsList aria-label="Manifests">
          <TabsTrigger value="open" icon={<svg data-testid="glyph" />} count={12}>
            Open
          </TabsTrigger>
          <TabsTrigger value="archived" count={0}>
            Archived
          </TabsTrigger>
        </TabsList>
      </Tabs>
    )
    expect(screen.getByRole('tab', { name: 'Open (12)' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Archived (0)' })).toBeInTheDocument()
    expect(screen.getByTestId('glyph').parentElement).toHaveAttribute('aria-hidden', 'true')
  })

  it('moves with Up and Down when vertical', async () => {
    render(
      <Tabs defaultValue="profile" orientation="vertical" variant="line">
        <TabsList aria-label="Settings">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">Callsign and squad.</TabsContent>
        <TabsContent value="security">Sessions.</TabsContent>
      </Tabs>
    )
    expect(screen.getByRole('tablist')).toHaveAttribute('aria-orientation', 'vertical')
    await userEvent.tab()
    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getByRole('tab', { name: 'Security' })).toHaveFocus()
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Sessions.')
    await userEvent.keyboard('{ArrowUp}')
    expect(screen.getByRole('tab', { name: 'Profile' })).toHaveFocus()
  })

  it('is axe clean with the line variant, icons and counts, vertical', async () => {
    const { container } = render(
      <Tabs defaultValue="profile" orientation="vertical" variant="line">
        <TabsList aria-label="Settings">
          <TabsTrigger value="profile" icon={<svg />}>
            Profile
          </TabsTrigger>
          <TabsTrigger value="sessions" count={3}>
            Sessions
          </TabsTrigger>
        </TabsList>
        <TabsContent value="profile">Callsign and squad.</TabsContent>
        <TabsContent value="sessions">Three devices.</TabsContent>
      </Tabs>
    )
    expect(await axeClean(container)).toHaveNoViolations()
  })

  it('drops the hover wash from an inactive tab while it holds keyboard focus', () => {
    render(
      <Tabs defaultValue="open" activationMode="manual">
        <TabsList aria-label="Manifests">
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>
      </Tabs>
    )
    const inactive = screen.getByRole('tab', { name: 'Archived' })
    // A prohibition carried as a class, which is the one thing a class string can prove.
    expect(inactive.classList.contains('data-[state=inactive]:focus-visible:bg-transparent')).toBe(true)
  })
})
