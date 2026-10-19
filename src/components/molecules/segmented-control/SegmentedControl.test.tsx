import { describe, it, expect, vi } from 'vitest'
import { createRef, useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Columns3, Table } from 'lucide-react'
import { axeClean } from '../../../test/axe'
import { SegmentedControl, type SegmentedControlProps } from './SegmentedControl'

const OPTIONS = [
  { value: '1h', label: '1 h' },
  { value: '24h', label: '24 h' },
  { value: '7d', label: '7 d' },
]

function Controlled(props: Partial<SegmentedControlProps>) {
  const [value, setValue] = useState('24h')
  return <SegmentedControl label="Range" options={OPTIONS} value={value} onValueChange={setValue} {...props} />
}

describe('SegmentedControl', () => {
  it('is a radio group named by label, one radio per option, merging className and forwarding ref', () => {
    const ref = createRef<HTMLDivElement>()
    render(<Controlled className="extra" ref={ref} />)
    const group = screen.getByRole('radiogroup', { name: 'Range' })
    expect(group).toBe(ref.current)
    expect(group).toHaveClass('extra')
    expect(screen.getAllByRole('radio').map(radio => radio.textContent)).toEqual(['1 h', '24 h', '7 d'])
  })

  it('checks the value, with fill, ink and weight', () => {
    render(<Controlled />)
    const selected = screen.getByRole('radio', { name: '24 h' })
    expect(selected).toBeChecked()
    expect(selected.className).toContain('data-[state=checked]:bg-[var(--color-accent-signal-fill)]')
    expect(selected.className).toContain('data-[state=checked]:font-semibold')
    expect(selected).toHaveAttribute('data-state', 'checked')
  })

  it('is one tab stop, on the selected option', async () => {
    render(
      <>
        <button type="button">Before</button>
        <Controlled />
      </>
    )
    await userEvent.click(screen.getByRole('button', { name: 'Before' }))
    await userEvent.tab()
    expect(screen.getByRole('radio', { name: '24 h' })).toHaveFocus()
  })

  it('moves and selects with the arrow keys', async () => {
    render(<Controlled />)
    screen.getByRole('radio', { name: '24 h' }).focus()
    // A plain press, keydown and keyup back to back: the component selects on keydown, so it does
    // not depend on the key still being down when Radix's deferred focus move lands.
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('radio', { name: '7 d' })).toBeChecked()
    await waitFor(() => expect(screen.getByRole('radio', { name: '7 d' })).toHaveFocus())
    await userEvent.keyboard('{ArrowRight}')
    await waitFor(() => expect(screen.getByRole('radio', { name: '1 h' })).toHaveFocus())
    expect(screen.getByRole('radio', { name: '1 h' })).toBeChecked()
    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getByRole('radio', { name: '24 h' })).toBeChecked()
    await waitFor(() => expect(screen.getByRole('radio', { name: '24 h' })).toHaveFocus())
  })

  it('calls onValueChange on a click', async () => {
    const onValueChange = vi.fn()
    render(<SegmentedControl label="Range" options={OPTIONS} value="1h" onValueChange={onValueChange} />)
    await userEvent.click(screen.getByRole('radio', { name: '7 d' }))
    expect(onValueChange).toHaveBeenCalledWith('7d')
  })

  it('keeps icons out of the name, and takes Button heights per size', () => {
    render(
      <SegmentedControl
        label="View"
        size="sm"
        options={[
          { value: 'board', label: 'Board', icon: <Columns3 /> },
          { value: 'table', label: 'Table', icon: <Table /> },
        ]}
        value="board"
        onValueChange={() => {}}
      />
    )
    const board = screen.getByRole('radio', { name: 'Board' })
    expect(board.querySelector('[aria-hidden="true"] svg')).not.toBeNull()
    expect(board.className).toContain('h-[var(--component-control-height-sm)]')
  })

  it('is axe clean', async () => {
    const { container } = render(<Controlled />)
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
