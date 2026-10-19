import { describe, expect, it } from 'vitest'
import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import { axeClean } from '../../../test/axe'
import { LoadingAnimation } from './LoadingAnimation'

// jsdom has no WebGL (src/test/setup.ts stubs getContext to null), so every render here takes the
// no-WebGL path: the Conveyor spinner inside the same labelled box. The WebGL path itself is
// covered in a real browser by e2e/loading-animation.spec.ts.
describe('LoadingAnimation', () => {
  it('announces as a live status when given a label', () => {
    render(<LoadingAnimation label="Loading field kits" />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading field kits')
  })

  it('is silent and role-less when decorative', () => {
    render(<LoadingAnimation aria-hidden="true" data-testid="l" />)
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.getByTestId('l')).toHaveAttribute('aria-hidden', 'true')
  })

  it('names its variant and applies the size class', () => {
    render(<LoadingAnimation label="x" variant="reticle" size="lg" />)
    const root = screen.getByRole('status')
    expect(root).toHaveAttribute('data-variant', 'reticle')
    expect(root).toHaveClass('w-60')
  })

  it("defaults to the aperture dial at md", () => {
    render(<LoadingAnimation label="x" />)
    const root = screen.getByRole('status')
    expect(root).toHaveAttribute('data-variant', 'aperture')
    expect(root).toHaveClass('w-40')
  })

  it("falls back to the Conveyor spinner when WebGL is unavailable, hidden from assistive tech", () => {
    const { container } = render(<LoadingAnimation label="Loading field kits" />)
    const conveyor = container.querySelector('.spinner-conveyor')
    expect(conveyor).not.toBeNull()
    expect(conveyor!.closest('[aria-hidden="true"]')).not.toBeNull()
    // The label is still announced exactly once, by the root.
    expect(screen.getAllByText('Loading field kits')).toHaveLength(1)
  })

  it('merges className', () => {
    render(<LoadingAnimation label="x" className="mt-4" />)
    expect(screen.getByRole('status')).toHaveClass('mt-4')
  })

  it('forwards a ref to the root', () => {
    const ref = createRef<HTMLDivElement>()
    render(<LoadingAnimation ref={ref} label="x" />)
    expect(ref.current?.tagName).toBe('DIV')
  })

  it('is axe clean', async () => {
    const { container } = render(<LoadingAnimation label="Loading field kits" />)
    expect(await axeClean(container)).toHaveNoViolations()
  })

  // Type-only, enforced by `tsc -b`: `role` is typed away for the same reason as Spinner's --
  // `label` is the sole source of role="status", and a caller's role would silence it.
  it.skip('rejects a role prop at the type level', () => {
    // @ts-expect-error role is not a LoadingAnimation prop
    render(<LoadingAnimation role="img" />)
  })
})
