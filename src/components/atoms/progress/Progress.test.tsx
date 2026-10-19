import { createRef } from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { axeClean } from '../../../test/axe'
import { Progress } from './Progress'

describe('Progress', () => {
  it('exposes value, max and an accessible name', () => {
    render(<Progress label="Uploading manifest" value={40} />)
    const bar = screen.getByRole('progressbar', { name: 'Uploading manifest' })
    expect(bar).toHaveAttribute('aria-valuenow', '40')
    expect(bar).toHaveAttribute('aria-valuemax', '100')
  })

  it('scales against a custom max', () => {
    render(<Progress label="Packing crates" value={3} max={12} />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '3')
    expect(bar).toHaveAttribute('aria-valuemax', '12')
  })

  it('renders the readout as real text from the first render', () => {
    render(<Progress label="Uploading manifest" value={40} showValue />)
    expect(screen.getByText('40%')).toBeInTheDocument()
  })

  it('drops aria-valuenow when indeterminate', () => {
    render(<Progress label="Syncing" value={null} />)
    expect(screen.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow')
  })

  it('is axe clean', async () => {
    const { container } = render(
      <div>
        <Progress label="Uploading manifest" value={40} showValue />
        <Progress label="Syncing" value={null} />
        <Progress label="Packing crates" value={3} max={12} tone="ok" showValue />
      </div>
    )
    expect(await axeClean(container)).toHaveNoViolations()
  })

  it('passes rest props through to the outer wrapper', () => {
    const { container } = render(<Progress label="Uploading manifest" value={40} data-testid="upload-progress" />)
    expect(container.querySelector('[data-testid="upload-progress"]')).toBeInTheDocument()
  })

  it('forwards a ref to the progressbar element', () => {
    const ref = createRef<HTMLDivElement>()
    render(<Progress label="Uploading manifest" value={40} ref={ref} />)
    expect(ref.current).toBe(screen.getByRole('progressbar'))
  })

  it('clamps an out-of-range value so the fill, readout and announced state agree', () => {
    render(<Progress label="Overfull tank" value={150} max={100} showValue />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '100')
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('falls back to a max of 100 when max is zero or negative, instead of painting NaN', () => {
    // max=0 divides by zero: the readout printed "NaN%" and the fill got translateX(-NaN%).
    const { unmount } = render(<Progress label="Broken max" value={40} max={0} showValue />)
    expect(screen.getByText('40%')).toBeInTheDocument()
    expect((screen.getByRole('progressbar').firstElementChild as HTMLElement).style.transform).toBe(
      'translateX(-60%)'
    )
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '100')
    unmount()

    // A negative max is quieter and worse: the arithmetic works out to a full bar.
    render(<Progress label="Negative max" value={40} max={-5} showValue />)
    expect(screen.getByText('40%')).toBeInTheDocument()
  })

  it('does not settle the indeterminate fill on a fixed static fraction', () => {
    render(<Progress label="Syncing" value={null} />)
    const bar = screen.getByRole('progressbar')
    const indicator = bar.firstElementChild as HTMLElement
    // Full track, no partial fraction painted — see Progress.tsx's comment on the transform.
    expect(indicator.style.transform).toBe('translateX(-0%)')
  })

  // Type-only assertion, enforced by `tsc -b` (run as part of `npm run build`), not by vitest at
  // runtime — this test is skipped so nothing actually renders, but its body still type-checks.
  // `children` is an ordinary key, so the `Omit<..., 'children'>` is what does the rejecting and
  // the declared `children?: never` only makes the error legible: the mutation that proves this
  // pin load-bearing is removing the WHOLE exclusion, not just the declared never.
  it.skip('rejects caller-supplied children at the type level', () => {
    // @ts-expect-error Progress renders its own label row and track; a children prop is silently discarded
    ;<Progress label="Sync" value={40} children={<span>ignored</span>} />
  })
})
