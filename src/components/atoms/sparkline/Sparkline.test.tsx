import { describe, it, expect } from 'vitest'
import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import { axeClean } from '../../../test/axe'
import { Sparkline } from './Sparkline'

const points = (container: HTMLElement) =>
  container
    .querySelector('[data-part="line"]')!
    .getAttribute('points')!
    .split(' ')
    .map(pair => pair.split(',').map(Number))

describe('Sparkline', () => {
  it('is one image named by label, merging className and forwarding ref', () => {
    const ref = createRef<HTMLSpanElement>()
    const { container } = render(<Sparkline ref={ref} values={[1, 3, 2]} label="Load, last hour: 1 to 3" className="extra" />)
    expect(screen.getByRole('img', { name: 'Load, last hour: 1 to 3' }).tagName).toBe('svg')
    expect(container.firstElementChild).toHaveClass('extra')
    expect(ref.current).toBe(container.firstElementChild)
  })

  it('maps the lowest value to the bottom and the highest to the top, oldest on the left', () => {
    const { container } = render(<Sparkline values={[0, 10, 5]} label="x" width={100} height={24} />)
    const [first, second, third] = points(container)
    expect(first).toEqual([0, 22])
    expect(second).toEqual([50, 2])
    expect(third).toEqual([100, 12])
  })

  it('keeps the stroke from scaling when it stretches', () => {
    const { container } = render(<Sparkline values={[1, 2]} label="x" className="w-full" />)
    expect(container.querySelector('svg')).toHaveAttribute('preserveAspectRatio', 'none')
    expect(container.querySelector('[data-part="line"]')).toHaveAttribute('vector-effect', 'non-scaling-stroke')
    expect(container.firstElementChild).toHaveClass('w-full')
    expect(container.firstElementChild).not.toHaveClass('w-[var(--sparkline-w)]')
  })

  it('draws a dashed midline and no line for no values', () => {
    const { container } = render(<Sparkline values={[]} label="No readings yet" showLast />)
    expect(container.querySelector('[data-part="empty"]')).toBeInTheDocument()
    expect(container.querySelector('[data-part="line"]')).toBeNull()
    expect(container.querySelector('[data-part="last"]')).toBeNull()
  })

  it('draws one value as a flat line across, at mid height', () => {
    const { container } = render(<Sparkline values={[4]} label="x" width={100} height={24} showLast />)
    expect(points(container)).toEqual([
      [0, 12],
      [100, 12],
    ])
    expect(container.querySelector('[data-part="last"]')).toHaveStyle({ left: '100%', top: '50%' })
  })

  it('draws a flat run at mid height without dividing by zero', () => {
    const { container } = render(<Sparkline values={[3, 3, 3]} label="x" />)
    points(container).forEach(([px, py]) => {
      expect(Number.isFinite(px)).toBe(true)
      expect(py).toBe(12)
    })
  })

  it('takes a fixed scale, clamping values outside it, and drops non-finite values', () => {
    const { container } = render(<Sparkline values={[-5, Number.NaN, 20]} label="x" min={0} max={10} height={24} />)
    const drawn = points(container)
    expect(drawn).toHaveLength(2)
    expect(drawn[0][1]).toBe(22)
    expect(drawn[1][1]).toBe(2)
  })

  it('draws the band behind the line and widens the default scale to hold it', () => {
    const { container } = render(<Sparkline values={[4, 5]} label="x" band={{ from: 2, to: 8 }} height={24} />)
    const band = container.querySelector('[data-part="band"]')!
    expect(band).toHaveAttribute('y', '2')
    expect(band).toHaveAttribute('height', '20')
    expect(band.nextElementSibling).toHaveAttribute('data-part', 'line')
  })

  it('colours the line by tone, neutral by default', () => {
    const { container, rerender } = render(<Sparkline values={[1, 2]} label="x" />)
    expect(container.querySelector('[data-part="line"]')).toHaveAttribute('stroke', 'var(--color-text-secondary)')
    rerender(<Sparkline values={[1, 2]} label="x" tone="hostile" />)
    expect(container.querySelector('[data-part="line"]')).toHaveAttribute('stroke', 'var(--color-accent-hostile-text)')
  })

  it('is axe clean', async () => {
    const { container } = render(<Sparkline values={[1, 3, 2]} label="Load" band={{ from: 1, to: 2 }} showLast />)
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
