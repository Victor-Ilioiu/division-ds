import { createRef, useState } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../../../test/axe'
import { FormField } from '../form-field/FormField'
import { MultiSelect } from './MultiSelect'

const KIT = [
  { value: 'mags', label: 'Spare magazines' },
  { value: 'goggles', label: 'Goggles' },
  { value: 'radio', label: 'Radio', disabled: true },
  { value: 'gloves', label: 'Gloves' },
]

describe('MultiSelect', () => {
  it('is a named combobox that opens a multi-selectable listbox', async () => {
    render(<MultiSelect label="Kit" options={KIT} />)
    const field = screen.getByRole('combobox', { name: 'Kit' })
    expect(field).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(field)
    expect(field).toHaveAttribute('aria-expanded', 'true')
    const listbox = screen.getByRole('listbox', { name: 'Kit' })
    expect(listbox).toHaveAttribute('aria-multiselectable', 'true')
    expect(field).toHaveAttribute('aria-controls', listbox.id)
    expect(within(listbox).getAllByRole('option')).toHaveLength(4)
  })

  it('adds a chosen option as a removable tag and keeps the list open', async () => {
    const onValueChange = vi.fn()
    render(<MultiSelect label="Kit" options={KIT} onValueChange={onValueChange} />)
    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(screen.getByRole('option', { name: 'Goggles' }))
    expect(onValueChange).toHaveBeenLastCalledWith(['goggles'])
    expect(screen.getByRole('button', { name: 'Remove Goggles' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Goggles' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })

  it('removes a tag and returns focus to the text field', async () => {
    const onValueChange = vi.fn()
    render(
      <MultiSelect label="Kit" options={KIT} defaultValue={['mags', 'gloves']} onValueChange={onValueChange} />
    )
    await userEvent.click(screen.getByRole('button', { name: 'Remove Spare magazines' }))
    expect(onValueChange).toHaveBeenLastCalledWith(['gloves'])
    expect(screen.queryByRole('button', { name: 'Remove Spare magazines' })).toBeNull()
    expect(screen.getByRole('combobox')).toHaveFocus()
  })

  it('filters as you type and says so when nothing matches', async () => {
    render(<MultiSelect label="Kit" options={KIT} emptyMessage="Nothing like that" />)
    await userEvent.type(screen.getByRole('combobox'), 'glo')
    expect(screen.getAllByRole('option').map(o => o.textContent)).toEqual(['Gloves'])
    await userEvent.type(screen.getByRole('combobox'), 'zz')
    expect(screen.queryAllByRole('option')).toHaveLength(0)
    expect(screen.getByText('Nothing like that')).toBeInTheDocument()
  })

  it('works from the keyboard: arrows skip disabled rows, Enter toggles, Backspace removes the last tag', async () => {
    const onValueChange = vi.fn()
    render(<MultiSelect label="Kit" options={KIT} onValueChange={onValueChange} />)
    const field = screen.getByRole('combobox')
    field.focus()
    await userEvent.keyboard('{ArrowDown}')
    expect(field).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name: 'Spare magazines' }).id)
    await userEvent.keyboard('{ArrowDown}{ArrowDown}')
    // Radio is disabled, so the second step lands on Gloves.
    expect(field).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name: 'Gloves' }).id)
    await userEvent.keyboard('{Enter}')
    expect(onValueChange).toHaveBeenLastCalledWith(['gloves'])
    await userEvent.keyboard('{Backspace}')
    expect(onValueChange).toHaveBeenLastCalledWith([])
    await userEvent.keyboard('{Escape}')
    expect(field).toHaveAttribute('aria-expanded', 'false')
  })

  it('does not choose a disabled option', async () => {
    const onValueChange = vi.fn()
    render(<MultiSelect label="Kit" options={KIT} onValueChange={onValueChange} />)
    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(screen.getByRole('option', { name: 'Radio' }))
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('is controlled by value', async () => {
    function Controlled() {
      const [kit, setKit] = useState<string[]>(['mags'])
      return (
        <>
          <MultiSelect label="Kit" options={KIT} value={kit} onValueChange={setKit} />
          <output>{kit.join(',')}</output>
        </>
      )
    }
    render(<Controlled />)
    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(screen.getByRole('option', { name: 'Gloves' }))
    expect(screen.getByRole('status')).toHaveTextContent('mags,gloves')
  })

  it('takes its label, id and error from a FormField', () => {
    render(
      <FormField label="Field kit" error="Pick at least one">
        <MultiSelect label="ignored" options={KIT} />
      </FormField>
    )
    const field = screen.getByRole('combobox', { name: 'Field kit' })
    expect(field).toHaveAttribute('aria-invalid', 'true')
    expect(field).toHaveAccessibleDescription(/Pick at least one/)
  })

  it('submits each value under name, and shows tags without remove buttons when disabled', () => {
    const { container } = render(
      <MultiSelect label="Kit" options={KIT} defaultValue={['mags', 'gloves']} name="kit" disabled />
    )
    const hidden = container.querySelectorAll('input[type="hidden"][name="kit"]')
    expect(Array.from(hidden).map(i => (i as HTMLInputElement).value)).toEqual(['mags', 'gloves'])
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByRole('combobox')).toBeDisabled()
  })

  it('forwards ref to the text field and merges className onto the field', () => {
    const ref = createRef<HTMLInputElement>()
    render(<MultiSelect label="Kit" options={KIT} ref={ref} className="custom-x" />)
    expect(ref.current).toBe(screen.getByRole('combobox'))
    expect(ref.current?.parentElement).toHaveClass('custom-x')
  })

  it.each([
    ['sm', 'min-h-[var(--component-control-height-sm)]', 'text-xs', 'h-7'],
    ['md', 'min-h-[var(--component-control-height-md)]', 'text-sm', 'h-8'],
    ['lg', 'min-h-[var(--component-control-height-lg)]', 'text-base', 'h-10'],
  ] as const)('inputSize %s sizes the field, its text and its option rows', async (size, minH, text, row) => {
    render(<MultiSelect label="Kit" options={KIT} inputSize={size} />)
    const input = screen.getByRole('combobox')
    expect(input.parentElement).toHaveClass(minH)
    expect(input).toHaveClass(text)
    await userEvent.click(input)
    const option = screen.getAllByRole('option')[0]
    expect(option).toHaveClass(row)
    expect(option).toHaveClass(text)
  })

  it('keeps the crosshair panel unscrolled: the scrolling list sits inside it, so the arms cannot make it scroll sideways', async () => {
    render(<MultiSelect label="Kit" options={KIT} />)
    await userEvent.click(screen.getByRole('combobox'))
    const listbox = screen.getByRole('listbox')
    const scroller = listbox.parentElement as HTMLElement
    expect(scroller).toHaveClass('overflow-y-auto', 'overflow-x-hidden')
    expect(scroller.parentElement).toHaveClass('crosshair')
    expect(scroller.parentElement).not.toHaveClass('overflow-y-auto')
  })

  it('has no axe violations, closed and open', async () => {
    const { container } = render(<MultiSelect label="Kit" options={KIT} defaultValue={['mags']} />)
    expect(await axeClean(container)).toHaveNoViolations()
    await userEvent.click(screen.getByRole('combobox'))
    expect(await axeClean(document.body)).toHaveNoViolations()
  })
})
