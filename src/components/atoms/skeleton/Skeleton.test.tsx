import { createRef } from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { axeClean } from '../../../test/axe'
import { Skeleton, SkeletonGroup } from './Skeleton'

describe('Skeleton', () => {
  it('is hidden from assistive tech', () => {
    const { container } = render(<Skeleton />)
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
  })

  it('carries the shimmer class on every painted shape', () => {
    const { container } = render(<Skeleton shape="text" lines={3} />)
    expect(container.querySelectorAll('.skeleton-shimmer')).toHaveLength(3)
  })

  it('renders one line of text by default', () => {
    const { container } = render(<Skeleton />)
    expect(container.querySelectorAll('[data-skeleton-line]')).toHaveLength(1)
  })

  it('renders the requested number of lines, the last one shorter', () => {
    const { container } = render(<Skeleton shape="text" lines={3} />)
    const lines = container.querySelectorAll('[data-skeleton-line]')
    expect(lines).toHaveLength(3)
    expect(lines[0]).toHaveClass('w-full')
    expect(lines[2]).toHaveClass('w-3/5')
  })

  it('does not shorten a single line', () => {
    const { container } = render(<Skeleton shape="text" lines={1} />)
    expect(container.querySelector('[data-skeleton-line]')).toHaveClass('w-full')
  })

  it('clamps a nonsense line count to one', () => {
    const { container } = render(<Skeleton shape="text" lines={0} />)
    expect(container.querySelectorAll('[data-skeleton-line]')).toHaveLength(1)
  })

  it('cuts the corner of a block', () => {
    const { container } = render(<Skeleton shape="block" className="h-24 w-full" />)
    expect(container.firstElementChild).toHaveClass('bevel-sm', 'skeleton-shimmer', 'h-24', 'w-full')
  })

  it('matches the Avatar footprint, with no cut at sm, as Avatar has none', () => {
    const { container, rerender } = render(<Skeleton shape="avatar" size="lg" />)
    expect(container.firstElementChild).toHaveClass('w-12', 'h-12', 'bevel-sm')
    rerender(<Skeleton shape="avatar" size="sm" />)
    expect(container.firstElementChild).toHaveClass('w-6', 'h-6')
    expect(container.firstElementChild).not.toHaveClass('bevel-sm')
  })

  it('merges a caller className without losing its own', () => {
    const { container } = render(<Skeleton shape="block" className="mt-4" />)
    expect(container.firstElementChild).toHaveClass('mt-4', 'skeleton-shimmer')
  })

  it('forwards a ref to the root element', () => {
    const ref = createRef<HTMLDivElement>()
    const { container } = render(<Skeleton ref={ref} />)
    expect(ref.current).not.toBeNull()
    expect(ref.current).toBe(container.firstElementChild)
  })

  it('is axe clean', async () => {
    const { container } = render(
      <div>
        <Skeleton shape="text" lines={2} />
        <Skeleton shape="block" className="h-10 w-10" />
        <Skeleton shape="avatar" />
      </div>
    )
    expect(await axeClean(container)).toHaveNoViolations()
  })
})

describe('SkeletonGroup', () => {
  it('marks the region busy and says it is loading in words', () => {
    const { container } = render(
      <SkeletonGroup>
        <Skeleton />
      </SkeletonGroup>
    )
    expect(container.firstElementChild).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByText('Loading…')).toHaveClass('sr-only')
  })

  it('takes a specific label', () => {
    render(
      <SkeletonGroup label="Loading orders">
        <Skeleton />
      </SkeletonGroup>
    )
    expect(screen.getByText('Loading orders')).toHaveClass('sr-only')
  })

  it('merges className and forwards a ref', () => {
    const ref = createRef<HTMLDivElement>()
    const { container } = render(
      <SkeletonGroup ref={ref} className="grid">
        <Skeleton />
      </SkeletonGroup>
    )
    expect(ref.current).toBe(container.firstElementChild)
    expect(ref.current).toHaveClass('grid')
  })

  it('is axe clean', async () => {
    const { container } = render(
      <SkeletonGroup label="Loading the roster">
        <Skeleton shape="avatar" />
        <Skeleton shape="text" lines={2} />
      </SkeletonGroup>
    )
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
