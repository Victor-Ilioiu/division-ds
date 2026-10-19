import { createRef } from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { axeClean } from '../../../test/axe'
import { Button } from '../../atoms/button/Button'
import { Breadcrumbs } from '../breadcrumbs/Breadcrumbs'
import { PageHeader } from './PageHeader'

describe('PageHeader', () => {
  it('renders the title as the page h1, in the display family', () => {
    render(<PageHeader title="Inventory" />)
    const heading = screen.getByRole('heading', { level: 1, name: 'Inventory' })
    expect(heading).toHaveClass('font-display', 'font-semibold', 'text-2xl')
    expect(screen.getAllByRole('heading')).toHaveLength(1)
  })

  it('renders an h2 with the same look at level 2', () => {
    render(<PageHeader level={2} title="Inventory" />)
    const heading = screen.getByRole('heading', { level: 2, name: 'Inventory' })
    expect(heading).toHaveClass('font-display', 'font-semibold', 'text-2xl')
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull()
  })

  // The eyebrow is a label above the title, not part of its name: "Inventory", never
  // "Operations Inventory". Mutation: render the eyebrow inside the h1 -> the exact name fails.
  it('draws the eyebrow as a mono label outside the heading', () => {
    render(<PageHeader eyebrow="Operations" title="Inventory" />)
    const eyebrow = screen.getByText('Operations')
    expect(eyebrow.tagName).toBe('P')
    expect(eyebrow).toHaveClass('font-mono', 'uppercase')
    expect(screen.getByRole('heading', { level: 1, name: 'Inventory' })).not.toContainElement(eyebrow)
  })

  // DOM order is reading order: eyebrow, then title. Mutation: move the eyebrow after the h1.
  it('puts the eyebrow before the title in reading order', () => {
    render(<PageHeader eyebrow="Operations" title="Inventory" />)
    const eyebrow = screen.getByText('Operations')
    const heading = screen.getByRole('heading', { level: 1 })
    expect(eyebrow.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('shows the description under the title, and no paragraph without one', () => {
    const { rerender, container } = render(
      <PageHeader title="Inventory" description="Stock across both warehouses." />
    )
    expect(screen.getByText('Stock across both warehouses.').tagName).toBe('P')
    rerender(<PageHeader title="Inventory" />)
    expect(container.querySelector('p')).toBeNull()
  })

  it('renders the actions in a wrapping row with a gap', () => {
    render(
      <PageHeader
        title="Inventory"
        actions={
          <>
            <Button variant="secondary">Export</Button>
            <Button>Add replica</Button>
          </>
        }
      />
    )
    const row = screen.getByRole('button', { name: 'Add replica' }).closest('[data-slot="actions"]')
    expect(row).toHaveClass('flex', 'flex-wrap', 'gap-3')
    expect(row).toContainElement(screen.getByRole('button', { name: 'Export' }))
  })

  // The trail sits above the title, so a screen reader meets "where am I" before "what is this".
  it('puts the breadcrumbs slot first, before the heading', () => {
    render(
      <PageHeader
        title="Inventory"
        breadcrumbs={<Breadcrumbs items={[{ label: 'Operations', href: '#ops' }, { label: 'Inventory' }]} />}
      />
    )
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' })
    const heading = screen.getByRole('heading', { level: 1 })
    expect(nav.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('renders none of the optional slots when none are given', () => {
    const { container } = render(<PageHeader title="Inventory" />)
    expect(container.querySelector('[data-slot="actions"]')).toBeNull()
    expect(container.querySelector('[data-slot="breadcrumbs"]')).toBeNull()
    expect(container.querySelectorAll('p')).toHaveLength(0)
  })

  it('puts the id on the h1, so the main region can be named by it', () => {
    render(
      <main aria-labelledby="page-title">
        <PageHeader id="page-title" title="Inventory" />
      </main>
    )
    expect(screen.getByRole('heading', { level: 1 })).toHaveAttribute('id', 'page-title')
    expect(screen.getByRole('main', { name: 'Inventory' })).toBeInTheDocument()
  })

  it('merges a className onto the root', () => {
    const { container } = render(<PageHeader title="Inventory" className="mb-12" />)
    expect(container.firstElementChild).toHaveClass('mb-12', 'flex')
  })

  it('forwards a ref to the root', () => {
    const ref = createRef<HTMLDivElement>()
    render(<PageHeader ref={ref} title="Inventory" />)
    expect(ref.current?.tagName).toBe('DIV')
    expect(ref.current).toContainElement(screen.getByRole('heading'))
  })

  it('is axe clean with every part showing', async () => {
    const { container } = render(
      <main>
        <PageHeader
          eyebrow="Operations"
          title="Inventory"
          description="Stock across both warehouses."
          breadcrumbs={<Breadcrumbs items={[{ label: 'Operations', href: '#ops' }, { label: 'Inventory' }]} />}
          actions={<Button>Add replica</Button>}
        />
      </main>
    )
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
