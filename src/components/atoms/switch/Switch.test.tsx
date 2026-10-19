import { createRef } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../../../test/axe'
import { Switch } from './Switch'

// The brief's helper hard-codes id="beacon" for every instance; the axe test below renders three
// of them at once, which would violate duplicate-id-active (in the AA tag set) even though a
// single Labelled in isolation never fails on it. Take a distinct id per instance instead.
function Labelled({ id, ...props }: React.ComponentProps<typeof Switch> & { id: string }) {
  return (
    <div className="flex items-center gap-3">
      <Switch id={id} {...props} />
      <label htmlFor={id}>Beacon relay</label>
    </div>
  )
}

describe('Switch', () => {
  it('exposes a labelled switch role', () => {
    render(<Labelled id="beacon-role" />)
    expect(screen.getByRole('switch', { name: 'Beacon relay' })).toBeInTheDocument()
  })

  it('reports its checked state', () => {
    render(<Labelled id="beacon-checked" checked />)
    expect(screen.getByRole('switch')).toBeChecked()
  })

  it('toggles on click', async () => {
    const onCheckedChange = vi.fn()
    render(<Labelled id="beacon-click" onCheckedChange={onCheckedChange} />)
    await userEvent.click(screen.getByRole('switch'))
    expect(onCheckedChange).toHaveBeenCalledWith(true)
  })

  // The squash is a Web Animations call on the thumb's body, which jsdom does not implement, so
  // `animate` is supplied here. What it looks like is held in e2e/switch.spec.ts; this holds
  // that a flip starts it, on the body and not the thumb, and still reaches the caller.
  it('starts the squash on the thumb body when flipped, and still tells the caller', async () => {
    const animate = vi.fn()
    const original = HTMLElement.prototype.animate
    HTMLElement.prototype.animate = animate
    try {
      const onCheckedChange = vi.fn()
      render(<Labelled id="beacon-squash" onCheckedChange={onCheckedChange} />)
      const thumb = screen.getByRole('switch').firstElementChild!
      await userEvent.click(screen.getByRole('switch'))
      expect(onCheckedChange).toHaveBeenCalledWith(true)
      expect(animate).toHaveBeenCalledTimes(1)
      expect(animate.mock.contexts[0]).toBe(thumb.firstElementChild)
      expect((thumb.firstElementChild as HTMLElement).style.transformOrigin).toBe('100% 50%')
    } finally {
      HTMLElement.prototype.animate = original
    }
  })

  // The thumb has no fill of its own: if it had, the body compressing inside it would uncover the
  // same colour and nothing would appear to change.
  it('paints the body, not the thumb', () => {
    render(<Labelled id="beacon-body" />)
    const thumb = screen.getByRole('switch').firstElementChild!
    expect(thumb.className).not.toMatch(/(^| )bg-/)
    expect(thumb.firstElementChild?.className).toContain('bg-[var(--color-text-primary)]')
    expect(thumb.firstElementChild?.className).toContain('group-data-[state=checked]:bg-[var(--color-accent-signal-fill)]')
  })

  it('toggles with Space', async () => {
    const onCheckedChange = vi.fn()
    render(<Labelled id="beacon-space" onCheckedChange={onCheckedChange} />)
    await userEvent.tab()
    await userEvent.keyboard(' ')
    expect(onCheckedChange).toHaveBeenCalledWith(true)
  })

  it('moves the thumb, so position and not only colour carries the state', () => {
    // First attempt at tightening this (checked contains the travel class, unchecked does not)
    // was itself falsified by running it: Switch.tsx's Thumb `cn(...)` call has no prop-dependent
    // branching at all — `'translate-x-0 data-[state=checked]:translate-x-[22px]'` is one static
    // string, so BOTH the checked and unchecked renders carry the identical class list. That is
    // correct Tailwind usage, not a bug: a `data-[state=checked]:` variant is resolved by the
    // browser's CSS engine matching the `[data-state=checked]` attribute selector at paint time,
    // never by React adding or removing the class name. jsdom never loads the generated
    // stylesheet in this test environment either (only `main.tsx` imports `tailwind.css`), so
    // there is no `getComputedStyle` signal to fall back on — a className string is genuinely
    // all that is inspectable here.
    //
    // So the non-tautological pair this test can actually pin: (1) the transform-on-checked rule
    // is authored on the thumb at all (`data-[state=checked]:translate-x-[22px]` in its class list —
    // this disappears from BOTH renders if that Tailwind variant is edited away, e.g. back to a
    // bare `translate-x-0`, which is exactly the regression this test exists to catch), and (2)
    // the `data-state` attribute the selector keys off actually flips between "unchecked" and
    // "checked" as the `checked` prop changes — without that, the selector this class declares
    // could never match in a real browser no matter what classes are present.
    const { container: off } = render(<Labelled id="beacon-thumb-off" />)
    const offThumb = off.querySelector('[data-state="unchecked"] > span')
    expect(offThumb).toHaveAttribute('data-state', 'unchecked')
    expect(offThumb?.className).toContain('data-[state=checked]:translate-x-[22px]')

    const { container: on } = render(<Labelled id="beacon-thumb-on" checked />)
    const onThumb = on.querySelector('[data-state="checked"] > span')
    expect(onThumb).toHaveAttribute('data-state', 'checked')
    expect(onThumb?.className).toContain('data-[state=checked]:translate-x-[22px]')
  })

  it('does not toggle when disabled', async () => {
    const onCheckedChange = vi.fn()
    render(<Labelled id="beacon-disabled" disabled onCheckedChange={onCheckedChange} />)
    await userEvent.click(screen.getByRole('switch'))
    expect(onCheckedChange).not.toHaveBeenCalled()
  })

  it('forwards a ref to the root element', () => {
    const ref = createRef<HTMLButtonElement>()
    render(
      <div className="flex items-center gap-3">
        <Switch id="beacon-ref" ref={ref} />
        <label htmlFor="beacon-ref">Beacon relay</label>
      </div>
    )
    expect(ref.current).toBe(screen.getByRole('switch'))
  })

  it('is axe clean', async () => {
    const { container } = render(
      <div>
        <Labelled id="beacon-axe-off" />
        <Labelled id="beacon-axe-on" checked />
        <Labelled id="beacon-axe-disabled" disabled />
      </div>
    )
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
