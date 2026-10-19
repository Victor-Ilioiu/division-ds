import { createRef } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../../../test/axe'
import { Rating, RatingInput } from './Rating'

describe('Rating', () => {
  it('is one image with a spoken score', () => {
    render(<Rating value={4.5} />)
    expect(screen.getByRole('img', { name: '4.5 out of 5' })).toBeInTheDocument()
  })

  it('names what is rated when given a label', () => {
    render(<Rating value={4} label="Prism holo sight" />)
    expect(screen.getByRole('img', { name: 'Prism holo sight rated 4 out of 5' })).toBeInTheDocument()
  })

  it('rounds to the nearest half for both drawing and speech', () => {
    render(<Rating value={3.74} />)
    expect(screen.getByRole('img', { name: '3.5 out of 5' })).toBeInTheDocument()
  })

  it('draws full, half and empty stars', () => {
    const { container } = render(<Rating value={2.5} />)
    expect(container.querySelectorAll('[data-star="full"]')).toHaveLength(2)
    expect(container.querySelectorAll('[data-star="half"]')).toHaveLength(1)
    expect(container.querySelectorAll('[data-star="empty"]')).toHaveLength(2)
  })

  it('prints the value when asked, hidden from speech because the name already says it', () => {
    render(<Rating value={4.5} showValue />)
    expect(screen.getByText('4.5')).toHaveAttribute('aria-hidden', 'true')
  })

  it('forwards a ref', () => {
    const ref = createRef<HTMLSpanElement>()
    render(<Rating ref={ref} value={3} />)
    expect(ref.current).toBe(screen.getByRole('img'))
  })

  it('is axe clean', async () => {
    const { container } = render(<Rating value={4.5} label="Prism holo sight" showValue />)
    expect(await axeClean(container)).toHaveNoViolations()
  })
})

describe('RatingInput', () => {
  it('is a named radio group of stars', () => {
    render(<RatingInput label="Rate the Prism holo sight" />)
    expect(screen.getByRole('radiogroup', { name: 'Rate the Prism holo sight' })).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(5)
    expect(screen.getByRole('radio', { name: '1 star' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '3 stars' })).toBeInTheDocument()
  })

  it('selects on click', async () => {
    const onValueChange = vi.fn()
    render(<RatingInput label="Rate" onValueChange={onValueChange} />)
    await userEvent.click(screen.getByRole('radio', { name: '4 stars' }))
    expect(onValueChange).toHaveBeenCalledWith(4)
    expect(screen.getByRole('radio', { name: '4 stars' })).toBeChecked()
  })

  it('moves and selects with the arrow keys', async () => {
    const onValueChange = vi.fn()
    render(<RatingInput label="Rate" defaultValue={2} onValueChange={onValueChange} />)
    await userEvent.tab()
    expect(screen.getByRole('radio', { name: '2 stars' })).toHaveFocus()
    // Same timing fix Radio.test.tsx documents: Radix's roving-focus group only auto-selects the
    // newly-focused item while an internal "arrow key is still down" flag is true, set on keydown
    // and cleared on keyup via native document listeners, and the deferred focus move itself runs
    // on a macrotask. userEvent's default keyboard() fires keydown+keyup back to back with no
    // macrotask boundary, clearing the flag before the deferred move runs — splitting the press so
    // a real setTimeout elapses in between reproduces genuine key-press timing instead.
    await userEvent.keyboard('{ArrowRight>}')
    await new Promise(resolve => setTimeout(resolve, 0))
    await userEvent.keyboard('{/ArrowRight}')
    expect(onValueChange).toHaveBeenLastCalledWith(3)
  })

  it('also moves and selects with the vertical arrow keys, wrapping horizontally', async () => {
    const onValueChange = vi.fn()
    render(<RatingInput label="Rate" defaultValue={2} onValueChange={onValueChange} />)
    await userEvent.tab()
    expect(screen.getByRole('radio', { name: '2 stars' })).toHaveFocus()
    // No orientation is set on the Root (see Rating.tsx), so Up/Down move the same as
    // Left/Right -- the WAI-ARIA radio-group pattern's contract, and what a screen-reader user
    // in focus mode reaches for regardless of the group's visual (horizontal) layout. Same
    // split-press timing fix as the horizontal arrow-key test above.
    await userEvent.keyboard('{ArrowDown>}')
    await new Promise(resolve => setTimeout(resolve, 0))
    await userEvent.keyboard('{/ArrowDown}')
    expect(onValueChange).toHaveBeenLastCalledWith(3)
  })

  it('fills stars up to the value', () => {
    const { container } = render(<RatingInput label="Rate" defaultValue={3} />)
    expect(container.querySelectorAll('[data-star="full"]')).toHaveLength(3)
  })

  it('does not light stars on hover when disabled', async () => {
    const { container } = render(<RatingInput label="Rate" disabled />)
    await userEvent.hover(screen.getByRole('radio', { name: '4 stars' }))
    expect(container.querySelectorAll('[data-star="full"]')).toHaveLength(0)
  })

  it('previews on hover without filling or selecting, and fills on click', async () => {
    const { container } = render(<RatingInput label="Rate" defaultValue={1} />)
    await userEvent.hover(screen.getByRole('radio', { name: '4 stars' }))
    expect(container.querySelectorAll('[data-star="hover"]')).toHaveLength(3)
    expect(container.querySelectorAll('[data-star="full"]')).toHaveLength(1)
    expect(screen.getByRole('radio', { name: '1 star' })).toBeChecked()
    await userEvent.click(screen.getByRole('radio', { name: '4 stars' }))
    expect(container.querySelectorAll('[data-star="full"]')).toHaveLength(4)
    expect(screen.getByRole('radio', { name: '4 stars' })).toBeChecked()
  })

  // RatingInput's ref lands on the Radix RadioGroup.Root, the same contract as Radio's own
  // RadioGroup (React 19: ref is a plain prop, asserted on the root DOM node).
  it('forwards a ref', () => {
    const ref = createRef<HTMLDivElement>()
    render(<RatingInput ref={ref} label="Rate" />)
    expect(ref.current).toBe(screen.getByRole('radiogroup'))
  })

  it('is axe clean', async () => {
    const { container } = render(<RatingInput label="Rate the Prism holo sight" defaultValue={3} />)
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
