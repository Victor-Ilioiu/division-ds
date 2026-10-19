import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { axeClean } from '../../test/axe'
import { EmptyState } from './EmptyState'

describe('EmptyState', () => {
  it('renders the title as an h2, the description and the action', () => {
    render(
      <EmptyState title="Nothing here" action={<button type="button">Clear</button>}>
        Try a different filter.
      </EmptyState>
    )
    expect(screen.getByRole('heading', { level: 2, name: 'Nothing here' })).toBeInTheDocument()
    expect(screen.getByText('Try a different filter.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument()
  })

  it('is axe clean', async () => {
    const { container } = render(<EmptyState title="Nothing here">Try a different filter.</EmptyState>)
    expect(await axeClean(container)).toHaveNoViolations()
  })

  // Mutation: drop the `{children ? ... : null}` guard and always render the description
  // `<p>` -> `queryByText` alone would not catch this (an empty paragraph still matches no real
  // text), which is exactly why this reads the container's own child count instead: the guard's
  // whole point is that a titleless-body EmptyState renders one child (the heading), not two.
  it('renders no description paragraph when none is given', () => {
    const { container } = render(<EmptyState title="Nothing here" />)
    expect(screen.getByRole('heading', { level: 2, name: 'Nothing here' })).toBeInTheDocument()
    expect(container.querySelector('p')).not.toBeInTheDocument()
  })
})
