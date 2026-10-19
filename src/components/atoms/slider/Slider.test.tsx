import { createRef } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../../../test/axe'
import { Slider } from './Slider'

describe('Slider', () => {
  it('names its single thumb from label', () => {
    render(<Slider label="Kit weight" defaultValue={[8]} max={20} />)
    expect(screen.getByRole('slider', { name: 'Kit weight' })).toBeInTheDocument()
  })

  it('gives each thumb of a range a distinct name', () => {
    render(<Slider label="Weight range" defaultValue={[4, 12]} max={20} />)
    expect(screen.getByRole('slider', { name: 'Weight range, minimum' })).toBeInTheDocument()
    expect(screen.getByRole('slider', { name: 'Weight range, maximum' })).toBeInTheDocument()
  })

  it('exposes min, max and the current value', () => {
    render(<Slider label="Kit weight" defaultValue={[8]} max={20} min={2} />)
    const thumb = screen.getByRole('slider')
    expect(thumb).toHaveAttribute('aria-valuemin', '2')
    expect(thumb).toHaveAttribute('aria-valuemax', '20')
    expect(thumb).toHaveAttribute('aria-valuenow', '8')
  })

  it('moves by step with the arrow keys', async () => {
    const onValueChange = vi.fn()
    render(<Slider label="Kit weight" defaultValue={[8]} max={20} step={2} onValueChange={onValueChange} />)
    await userEvent.tab()
    expect(screen.getByRole('slider')).toHaveFocus()
    await userEvent.keyboard('{ArrowRight}')
    expect(onValueChange).toHaveBeenCalledWith([10])
  })

  it('announces the formatted value, so the spoken value matches the visible one', () => {
    render(
      <Slider label="Kit weight" defaultValue={[8]} max={20} formatValue={v => `${v} kg`} showValue />
    )
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', '8 kg')
    expect(screen.getByText('8 kg')).toBeInTheDocument()
  })

  it('keeps aria-valuetext live on an UNCONTROLLED slider after a keyboard move', async () => {
    // The bug this pins: aria-valuetext used to be computed once, from defaultValue, and never
    // again — a drag or a keystroke moves Radix's own internal value (and aria-valuenow with
    // it) while the announced text stayed frozen at the initial number. Fixed by tracking the
    // live value internally, fed from the same onValueChange Radix already fires on every step.
    render(
      <Slider label="Kit weight" defaultValue={[8]} max={20} step={2} formatValue={v => `${v} kg`} />
    )
    await userEvent.tab()
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', '8 kg')
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', '10 kg')
  })

  it('keeps aria-valuetext correct on a CONTROLLED slider across an external value update', () => {
    // The controlled path already worked before this fix (aria-valuetext is derived from the
    // live `value` prop on every render); this pins that the new internal-state fallback did not
    // regress it — a supplied `value` must still always win over the internal tracking.
    const { rerender } = render(
      <Slider label="Kit weight" value={[8]} max={20} formatValue={v => `${v} kg`} />
    )
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', '8 kg')
    rerender(<Slider label="Kit weight" value={[12]} max={20} formatValue={v => `${v} kg`} />)
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', '12 kg')
  })

  it('forwards a ref to the root element', () => {
    const ref = createRef<HTMLSpanElement>()
    const { container } = render(<Slider label="Kit weight" defaultValue={[8]} max={20} ref={ref} />)
    // The Radix root is the wrapper's second child span (after the label/readout row) and the
    // only ancestor of the thumb that also has `dir` set, distinguishing it from Track, which
    // shares `data-orientation` but not `dir`.
    // Both `toBe` comparisons below pass when BOTH sides are null — a ref that was never
    // attached and a querySelector that matched nothing look identical to them. Assert non-null
    // first.
    expect(ref.current).not.toBeNull()
    expect(ref.current).toBe(screen.getByRole('slider').closest('[dir]'))
    expect(ref.current).toBe(container.querySelector('.w-full > span'))
  })

  it('marks a disabled thumb data-disabled, with a class authored to match', () => {
    // Radix's Thumb is a <span>, which never carries a native `disabled` attribute, so a bare
    // `disabled:` Tailwind variant would be dead CSS here — the real, flippable signal is the
    // `data-disabled` attribute Radix sets. Per commands.md's class-string lesson: a static
    // variant-prefixed class can't itself prove the state changed in jsdom (no stylesheet is
    // loaded), so this pins (1) the attribute actually flips and (2) the matching variant class
    // is still authored on the element — not that the rule visually applies.
    const { unmount } = render(<Slider label="Kit weight" defaultValue={[8]} max={20} />)
    const offThumb = screen.getByRole('slider')
    expect(offThumb).not.toHaveAttribute('data-disabled')
    expect(offThumb.className).toContain('data-[disabled]:cursor-not-allowed')
    unmount()

    render(<Slider label="Locked" defaultValue={[8]} max={20} disabled />)
    const onThumb = screen.getByRole('slider', { name: 'Locked' })
    expect(onThumb).toHaveAttribute('data-disabled', '')
    expect(onThumb.className).toContain('data-[disabled]:cursor-not-allowed')
  })

  it('is axe clean', async () => {
    const { container } = render(
      <div>
        <Slider label="Kit weight" defaultValue={[8]} max={20} showValue />
        <Slider label="Weight range" defaultValue={[4, 12]} max={20} />
        <Slider label="Locked" defaultValue={[8]} max={20} disabled />
      </div>
    )
    expect(await axeClean(container)).toHaveNoViolations()
  })

  // Type-only assertion, enforced by `tsc -b` (run as part of `npm run build`), not by vitest at
  // runtime — this test is skipped so nothing actually renders, but its body still type-checks.
  // `children` is an ordinary key, so the `Omit<..., 'children'>` is what does the rejecting and
  // the declared `children?: never` only makes the error legible: the mutation that proves this
  // pin load-bearing is removing the WHOLE exclusion, not just the declared never.
  it.skip('rejects caller-supplied children at the type level', () => {
    // @ts-expect-error Slider renders its own Track/Range/Thumbs; a children prop is silently discarded
    ;<Slider label="Kit weight" children={<span>ignored</span>} />
  })
})
