import { createRef } from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PackageSearch } from 'lucide-react'
import { axeClean } from '../../../test/axe'
import { Button } from '../../atoms/button/Button'
import { EmptyState } from './EmptyState'

describe('EmptyState', () => {
  it.each([2, 3, 4] as const)('renders the title as a heading at level %i, the level it was given', level => {
    render(<EmptyState level={level} title="No replicas match" />)
    expect(screen.getByRole('heading', { level, name: 'No replicas match' })).toBeInTheDocument()
    expect(screen.getAllByRole('heading')).toHaveLength(1)
  })

  // The level has no default, for the reason SectionHeading's has none: only the page knows its
  // outline. Skipped because only the type-check matters: a missing level fails `tsc -b`.
  it.skip('requires a level at compile time', () => {
    // @ts-expect-error level is required: the component does not guess where it sits in the outline
    render(<EmptyState title="No replicas match" />)
    // @ts-expect-error an empty state is never the page title
    render(<EmptyState level={1} title="No replicas match" />)
  })

  it('shows the description as a paragraph, and no paragraph without one', () => {
    const { rerender, container } = render(
      <EmptyState level={2} title="No orders yet" description="Orders appear here once checkout completes." />
    )
    expect(screen.getByText('Orders appear here once checkout completes.').tagName).toBe('P')
    rerender(<EmptyState level={2} title="No orders yet" />)
    expect(container.querySelector('p')).toBeNull()
  })

  // The icon is decoration: the title already says what is empty. Wrapping it in an aria-hidden
  // span means a caller who forgets aria-hidden on the lucide icon still gets it right.
  // Mutation: drop aria-hidden from the wrapper -> the svg is exposed and the query finds it.
  it('draws the icon inside an aria-hidden tile, and no tile without an icon', () => {
    const { rerender, container } = render(
      <EmptyState level={2} title="No orders yet" icon={<PackageSearch data-testid="icon" />} />
    )
    const icon = screen.getByTestId('icon')
    expect(icon.closest('[aria-hidden="true"]')).not.toBeNull()
    rerender(<EmptyState level={2} title="No orders yet" />)
    expect(container.querySelector('svg')).toBeNull()
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull()
  })

  it('renders the actions it is given, in a wrapping row with a gap', () => {
    render(
      <EmptyState
        level={2}
        title="No replicas match"
        actions={
          <>
            <Button>Clear filters</Button>
            <Button variant="secondary">Browse all</Button>
          </>
        }
      />
    )
    const clear = screen.getByRole('button', { name: 'Clear filters' })
    expect(screen.getByRole('button', { name: 'Browse all' })).toBeInTheDocument()
    const row = clear.closest('[data-slot="actions"]')
    expect(row).toHaveClass('flex', 'flex-wrap', 'gap-3')
  })

  it('defaults to md and framed; sm tightens the padding and the title', () => {
    const { rerender, container } = render(<EmptyState level={2} title="Empty" />)
    let root = container.firstElementChild!
    expect(root).toHaveAttribute('data-size', 'md')
    expect(root).toHaveClass('border-dashed', 'p-10')
    expect(screen.getByRole('heading').className).toContain('text-lg')

    rerender(<EmptyState level={2} size="sm" title="Empty" />)
    root = container.firstElementChild!
    expect(root).toHaveAttribute('data-size', 'sm')
    expect(root).toHaveClass('p-6')
    expect(root).not.toHaveClass('p-10')
    expect(screen.getByRole('heading').className).toContain('text-base')
  })

  // Inside a table cell or a card the container already draws an edge; a dashed frame inside
  // it would be a second one. Mutation: ignore `framed` -> the border class stays.
  it('drops the dashed frame when framed is false', () => {
    const { container } = render(<EmptyState level={2} framed={false} title="Empty" />)
    const root = container.firstElementChild!
    expect(root).not.toHaveClass('border-dashed')
    expect(root).not.toHaveClass('border')
  })

  it('carries no live role of its own, and passes one through when the caller adds it', () => {
    const { rerender } = render(<EmptyState level={2} title="Empty" />)
    expect(screen.queryByRole('status')).toBeNull()
    rerender(<EmptyState level={2} title="Empty" role="status" />)
    expect(screen.getByRole('status')).toHaveTextContent('Empty')
  })

  it('merges a className onto the root', () => {
    const { container } = render(<EmptyState level={2} title="Empty" className="mt-12" />)
    expect(container.firstElementChild).toHaveClass('mt-12', 'flex')
  })

  it('forwards a ref to the root', () => {
    const ref = createRef<HTMLDivElement>()
    render(<EmptyState ref={ref} level={2} title="Empty" />)
    expect(ref.current?.tagName).toBe('DIV')
    expect(ref.current).toContainElement(screen.getByRole('heading'))
  })

  it('adds no tab stop of its own: only the actions are focusable', () => {
    const { container } = render(
      <EmptyState level={2} title="Empty" icon={<PackageSearch />} actions={<Button>Clear filters</Button>} />
    )
    const focusable = container.querySelectorAll('button, a[href], [tabindex]')
    expect(focusable).toHaveLength(1)
  })

  it('is axe clean with every part showing, in both sizes', async () => {
    const { container } = render(
      <main>
        <h1>Orders</h1>
        <EmptyState
          level={2}
          title="No orders yet"
          description="Orders appear here once checkout completes."
          icon={<PackageSearch />}
          actions={<Button>Browse replicas</Button>}
        />
        <EmptyState level={2} size="sm" framed={false} title="No notes" />
      </main>
    )
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
