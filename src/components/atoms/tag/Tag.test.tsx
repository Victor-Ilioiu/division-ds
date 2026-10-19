import { createRef } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../../../test/axe'
import { Tag } from './Tag'

describe('Tag', () => {
  it('renders its text', () => {
    render(<Tag>Holo sight</Tag>)
    expect(screen.getByText('Holo sight')).toBeInTheDocument()
  })

  it('has no dismiss button unless onDismiss is given', () => {
    render(<Tag>Holo sight</Tag>)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('names the dismiss button after the tag it removes', () => {
    render(<Tag onDismiss={() => {}}>Holo sight</Tag>)
    expect(screen.getByRole('button', { name: 'Remove Holo sight' })).toBeInTheDocument()
  })

  it('calls onDismiss when the button is activated', async () => {
    const onDismiss = vi.fn()
    render(<Tag onDismiss={onDismiss}>Holo sight</Tag>)
    await userEvent.click(screen.getByRole('button', { name: 'Remove Holo sight' }))
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('is reachable and removable by keyboard alone', async () => {
    const onDismiss = vi.fn()
    render(<Tag onDismiss={onDismiss}>Holo sight</Tag>)
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Remove Holo sight' })).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('lets the dismiss label be overridden for other languages or verbs', () => {
    render(
      <Tag onDismiss={() => {}} dismissLabel={t => `Clear filter: ${t}`}>
        Holo sight
      </Tag>
    )
    expect(screen.getByRole('button', { name: 'Clear filter: Holo sight' })).toBeInTheDocument()
  })

  it('gives every dismiss button in a row a distinct name', async () => {
    const { container } = render(
      <div>
        <Tag onDismiss={() => {}}>Holo sight</Tag>
        <Tag onDismiss={() => {}}>Spare magazine</Tag>
        <Tag onDismiss={() => {}}>Speed loader</Tag>
      </div>
    )
    const names = screen.getAllByRole('button').map(b => b.getAttribute('aria-label'))
    expect(new Set(names).size).toBe(3)
    expect(await axeClean(container)).toHaveNoViolations()
  })

  it('forwards a ref to the root element', () => {
    const ref = createRef<HTMLSpanElement>()
    const { container } = render(<Tag ref={ref}>Holo sight</Tag>)
    // `toBe(container.firstElementChild)` passes when BOTH sides are null — a ref that was never
    // attached and an element that never rendered look identical to it. Assert non-null first.
    expect(ref.current).not.toBeNull()
    expect(ref.current).toBe(container.firstElementChild)
  })
})
