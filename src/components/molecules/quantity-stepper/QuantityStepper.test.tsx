import { createRef } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../../../test/axe'
import { QuantityStepper, clampQuantity } from './QuantityStepper'

describe('clampQuantity', () => {
  it('clamps into range', () => {
    expect(clampQuantity(250, 0, 99)).toBe(99)
    expect(clampQuantity(-3, 1, 99)).toBe(1)
  })

  it('parses strings and falls back to min', () => {
    expect(clampQuantity('12', 0, 99)).toBe(12)
    expect(clampQuantity('', 1, 99)).toBe(1)
    expect(clampQuantity('abc', 1, 99)).toBe(1)
  })

  it('snaps to the step grid measured from min', () => {
    expect(clampQuantity(7, 0, 99, 5)).toBe(5)
    expect(clampQuantity(8, 0, 99, 5)).toBe(10)
    expect(clampQuantity(4, 1, 99, 2)).toBe(5)
  })

  it('clamps to the last on-grid value at or below max when max is off the step grid', () => {
    // min 0, max 99, step 5 -- the grid is 0, 5, ..., 95, and 99 is never on it.
    expect(clampQuantity(999, 0, 99, 5)).toBe(95)
  })
})

describe('QuantityStepper', () => {
  it('is a named spinbutton carrying its value and bounds', () => {
    render(<QuantityStepper label="Speed loader quantity" defaultValue={2} min={1} max={9} />)
    const field = screen.getByRole('spinbutton', { name: 'Speed loader quantity' })
    expect(field).toHaveAttribute('aria-valuenow', '2')
    expect(field).toHaveAttribute('aria-valuemin', '1')
    expect(field).toHaveAttribute('aria-valuemax', '9')
  })

  it('names both buttons after the field and keeps them out of the tab order', () => {
    render(<QuantityStepper label="Speed loader quantity" />)
    expect(screen.getByRole('button', { name: 'Decrease Speed loader quantity' })).toHaveAttribute('tabindex', '-1')
    expect(screen.getByRole('button', { name: 'Increase Speed loader quantity' })).toHaveAttribute('tabindex', '-1')
  })

  it('steps with the buttons, disabled at the bounds', async () => {
    const onValueChange = vi.fn()
    render(<QuantityStepper label="Qty" defaultValue={1} min={1} max={2} onValueChange={onValueChange} />)
    expect(screen.getByRole('button', { name: 'Decrease Qty' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Increase Qty' }))
    expect(onValueChange).toHaveBeenLastCalledWith(2)
    expect(screen.getByRole('button', { name: 'Increase Qty' })).toBeDisabled()
  })

  it('steps with the arrow keys and jumps with Home and End', async () => {
    render(<QuantityStepper label="Qty" defaultValue={5} min={0} max={20} />)
    const field = screen.getByRole('spinbutton')
    await userEvent.click(field)
    await userEvent.keyboard('{ArrowUp}')
    expect(field).toHaveAttribute('aria-valuenow', '6')
    await userEvent.keyboard('{PageUp}')
    expect(field).toHaveAttribute('aria-valuenow', '16')
    await userEvent.keyboard('{End}')
    expect(field).toHaveAttribute('aria-valuenow', '20')
    await userEvent.keyboard('{Home}')
    expect(field).toHaveAttribute('aria-valuenow', '0')
  })

  it('steps from what was typed, not the last committed value', async () => {
    // A step key right after typing a new, uncommitted number should move from that number, not
    // from wherever the field was before it.
    render(<QuantityStepper label="Qty" defaultValue={5} min={0} max={99} />)
    const field = screen.getByRole('spinbutton')
    await userEvent.clear(field)
    await userEvent.type(field, '20')
    await userEvent.keyboard('{ArrowUp}')
    expect(field).toHaveAttribute('aria-valuenow', '21')
  })

  it('keeps only a leading integer, so a typed "1.5" becomes "1"', () => {
    render(<QuantityStepper label="Qty" defaultValue={1} min={0} max={99} />)
    const field = screen.getByRole('spinbutton')
    fireEvent.change(field, { target: { value: '1.5' } })
    expect(field).toHaveValue('1')
  })

  it('trims surrounding whitespace before keeping the leading integer', () => {
    render(<QuantityStepper label="Qty" defaultValue={1} min={0} max={99} />)
    const field = screen.getByRole('spinbutton')
    fireEvent.change(field, { target: { value: ' 12 ' } })
    expect(field).toHaveValue('12')
  })

  it('carries the on-grid bound into aria-valuemax and the Increase button, not the raw max', async () => {
    render(<QuantityStepper label="Qty" defaultValue={90} min={0} max={99} step={5} />)
    const field = screen.getByRole('spinbutton')
    expect(field).toHaveAttribute('aria-valuemax', '95')
    await userEvent.click(screen.getByRole('button', { name: 'Increase Qty' }))
    expect(field).toHaveAttribute('aria-valuenow', '95')
    expect(field).toHaveAttribute('aria-valuemax', '95')
    expect(screen.getByRole('button', { name: 'Increase Qty' })).toBeDisabled()
  })

  it('moves focus to the field when a button click reaches its bound', async () => {
    render(<QuantityStepper label="Qty" defaultValue={1} min={1} max={2} />)
    const field = screen.getByRole('spinbutton')
    await userEvent.click(screen.getByRole('button', { name: 'Increase Qty' }))
    expect(field).toHaveFocus()
  })

  it('lets someone type freely and commits a clamped value on blur', async () => {
    render(<QuantityStepper label="Qty" defaultValue={1} min={1} max={99} />)
    const field = screen.getByRole('spinbutton')
    await userEvent.clear(field)
    expect(field).toHaveValue('')
    await userEvent.type(field, '250')
    await userEvent.tab()
    expect(field).toHaveValue('99')
    expect(field).toHaveAttribute('aria-valuenow', '99')
  })

  it('commits on Enter too', async () => {
    render(<QuantityStepper label="Qty" defaultValue={1} min={1} max={99} />)
    const field = screen.getByRole('spinbutton')
    await userEvent.clear(field)
    await userEvent.type(field, '12{Enter}')
    expect(field).toHaveAttribute('aria-valuenow', '12')
  })

  it('puts id, aria-describedby, aria-invalid and aria-required on the field', () => {
    render(
      <>
        <QuantityStepper id="magazines" aria-describedby="magazines-error" invalid required label="Spare magazines" />
        <p id="magazines-error">Order at least 4.</p>
      </>
    )
    const field = screen.getByRole('spinbutton', { name: 'Spare magazines' })
    expect(field).toHaveAttribute('id', 'magazines')
    expect(field).toHaveAccessibleDescription('Order at least 4.')
    expect(field).toHaveAttribute('aria-invalid', 'true')
    expect(field).toHaveAttribute('aria-required', 'true')
  })

  it('forwards a ref to the field', () => {
    const ref = createRef<HTMLInputElement>()
    render(<QuantityStepper ref={ref} label="Qty" />)
    expect(ref.current).toBe(screen.getByRole('spinbutton'))
  })

  it('is axe clean', async () => {
    const { container } = render(<QuantityStepper label="Speed loader quantity" defaultValue={2} />)
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
