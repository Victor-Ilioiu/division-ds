import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { axeClean } from '../../../test/axe'
import { ScoreRing, scoreBand } from './ScoreRing'

describe('ScoreRing', () => {
  // Mutation: drop role="meter" or aria-label; getByRole finds nothing.
  it('is a meter named by its label, 0 to 100', () => {
    render(<ScoreRing label="Performance" value={92} />)
    const meter = screen.getByRole('meter', { name: 'Performance' })
    expect(meter).toHaveAttribute('aria-valuenow', '92')
    expect(meter).toHaveAttribute('aria-valuemin', '0')
    expect(meter).toHaveAttribute('aria-valuemax', '100')
  })

  // The number is the non-colour signal: colour alone never carries the score (SC 1.4.1).
  // Mutation: render the number only in aria-valuetext; the visible text check fails.
  it('shows the number itself, and speaks the band in words', () => {
    render(<ScoreRing label="Accessibility" value={67} />)
    const meter = screen.getByRole('meter', { name: 'Accessibility' })
    expect(meter).toHaveTextContent('67')
    expect(meter).toHaveAttribute('aria-valuetext', '67 out of 100, needs improvement')
  })

  // Mutation: compare with > instead of >= at either boundary.
  it('bands a score the way Lighthouse does: below 50, 50 to 89, 90 and up', () => {
    expect(scoreBand(0)).toBe('hostile')
    expect(scoreBand(49)).toBe('hostile')
    expect(scoreBand(50)).toBe('warning')
    expect(scoreBand(89)).toBe('warning')
    expect(scoreBand(90)).toBe('ok')
    expect(scoreBand(100)).toBe('ok')
  })

  // Mutation: drop the data-band attribute or paint every arc one tone.
  it('colours the arc by band', () => {
    const { container, rerender } = render(<ScoreRing label="SEO" value={30} />)
    const arc = () => container.querySelector('[data-part="arc"]') as SVGElement
    expect(arc().getAttribute('stroke')).toBe('var(--component-control-progress-fill-hostile)')
    rerender(<ScoreRing label="SEO" value={95} />)
    expect(arc().getAttribute('stroke')).toBe('var(--component-control-progress-fill-ok)')
  })

  // Mutation: drop the clamp; aria-valuenow reads 140 and the arc overdraws.
  it('clamps and rounds the value', () => {
    const { rerender } = render(<ScoreRing label="Best practices" value={140} />)
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '100')
    rerender(<ScoreRing label="Best practices" value={-5} />)
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '0')
    rerender(<ScoreRing label="Best practices" value={72.6} />)
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '73')
  })

  // Mutation: map every size to one class.
  it('sizes the ring', () => {
    render(<ScoreRing label="Performance" value={92} size="sm" data-testid="ring" />)
    expect(screen.getByTestId('ring').querySelector('svg')).toHaveClass('w-14')
  })

  it('merges a caller className', () => {
    render(<ScoreRing label="Performance" value={92} className="mt-4" />)
    const meter = screen.getByRole('meter')
    expect(meter).toHaveClass('mt-4')
    expect(meter).toHaveClass('inline-flex')
  })

  it('forwards a ref to the meter', () => {
    const ref = createRef<HTMLDivElement>()
    render(<ScoreRing label="Performance" value={92} ref={ref} />)
    expect(ref.current).toBe(screen.getByRole('meter'))
  })

  it('is axe clean', async () => {
    const { container } = render(
      <div>
        <ScoreRing label="Performance" value={38} />
        <ScoreRing label="Accessibility" value={74} />
        <ScoreRing label="SEO" value={100} />
      </div>
    )
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
