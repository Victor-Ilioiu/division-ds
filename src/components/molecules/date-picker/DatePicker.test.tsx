import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../../../test/axe'
import { FormField } from '../form-field/FormField'
import { Calendar } from './Calendar'
import { DateField } from './DateField'
import { DatePicker } from './DatePicker'

const segments = (name: string) => within(screen.getByRole('group', { name })).getAllByRole('spinbutton')
const texts = (name: string) => segments(name).map(s => s.textContent)

describe('DateField', () => {
  it('orders the segments the way the locale writes a date', () => {
    render(
      <>
        <DateField label="GB" locale="en-GB" />
        <DateField label="US" locale="en-US" />
      </>
    )
    expect(segments('GB').map(s => s.getAttribute('aria-label'))).toEqual(['Day', 'Month', 'Year'])
    expect(segments('US').map(s => s.getAttribute('aria-label'))).toEqual(['Month', 'Day', 'Year'])
    expect(segments('GB')[0]).toHaveAttribute('aria-valuetext', 'Empty')
  })

  it('moves on by itself as digits are typed, and reports the whole date once', async () => {
    const onValueChange = vi.fn()
    render(<DateField label="Date" locale="en-GB" onValueChange={onValueChange} />)
    await userEvent.click(segments('Date')[0])
    // "4" can only be the 4th, so the day is done after one digit.
    await userEvent.keyboard('4112026')
    expect(texts('Date')).toEqual(['04', '11', '2026'])
    expect(onValueChange).toHaveBeenCalledTimes(1)
    expect(onValueChange).toHaveBeenCalledWith('2026-11-04')
  })

  it('steps a segment with the arrow keys and clears it with Backspace', async () => {
    const onValueChange = vi.fn()
    render(<DateField label="Date" locale="en-GB" defaultValue="2026-11-30" onValueChange={onValueChange} />)
    const [day] = segments('Date')
    day.focus()
    await userEvent.keyboard('{ArrowUp}')
    expect(day).toHaveTextContent('01') // 30 November + 1 wraps to the 1st
    await userEvent.keyboard('{ArrowDown}')
    expect(day).toHaveTextContent('30')
    await userEvent.keyboard('{Backspace}')
    expect(day).toHaveAttribute('aria-valuetext', 'Empty')
    expect(onValueChange).toHaveBeenLastCalledWith('')
  })

  it('marks a date that does not exist, or is out of range, as invalid', async () => {
    render(
      <>
        <DateField label="Missing" locale="en-GB" />
        <DateField label="Late" locale="en-GB" defaultValue="2027-01-05" max="2026-12-31" />
      </>
    )
    await userEvent.click(segments('Missing')[0])
    await userEvent.keyboard('31022026')
    expect(screen.getByRole('group', { name: 'Missing' })).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('group', { name: 'Late' })).toHaveAttribute('aria-invalid', 'true')
  })

  it('submits the ISO value with a form', () => {
    const { container } = render(<DateField label="Date" name="due" defaultValue="2026-11-14" />)
    expect(container.querySelector('input[type="hidden"][name="due"]')).toHaveValue('2026-11-14')
  })
})

describe('Calendar', () => {
  it('names each day with its full date and marks the picked one', () => {
    render(<Calendar value="2026-11-14" locale="en-GB" />)
    const picked = screen.getByRole('button', { name: /14 November 2026/ })
    expect(picked).toHaveAttribute('tabindex', '0')
    expect(picked.closest('td')).toHaveAttribute('aria-selected', 'true')
  })

  it('moves by day, week and month with the keyboard, and picks with Enter', async () => {
    const onSelect = vi.fn()
    render(<Calendar value="2026-11-14" onSelect={onSelect} locale="en-GB" weekStartsOn={1} />)
    screen.getByRole('button', { name: /14 November 2026/ }).focus()
    await userEvent.keyboard('{ArrowRight}{ArrowDown}')
    expect(document.activeElement).toHaveAccessibleName(/22 November 2026/)
    await userEvent.keyboard('{PageDown}')
    expect(document.activeElement).toHaveAccessibleName(/22 December 2026/)
    expect(screen.getByText('December 2026', { selector: 'p' })).toBeInTheDocument()
    await userEvent.keyboard('{Home}')
    expect(document.activeElement).toHaveAccessibleName(/^Monday,? 21 December 2026/)
    await userEvent.keyboard('{Enter}')
    expect(onSelect).toHaveBeenCalledWith('2026-12-21')
  })

  it('announces and refuses days outside the limits', async () => {
    const onSelect = vi.fn()
    render(<Calendar value="2026-11-14" min="2026-11-10" onSelect={onSelect} locale="en-GB" />)
    const early = screen.getByRole('button', { name: /9 November 2026, unavailable/ })
    expect(early).toHaveAttribute('aria-disabled', 'true')
    await userEvent.click(early)
    expect(onSelect).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Previous month' })).toBeDisabled()
  })
})

describe('DatePicker', () => {
  it('opens on the picked day, fills the field and gives focus back to the button', async () => {
    const onValueChange = vi.fn()
    render(<DatePicker label="Delivery" locale="en-GB" defaultValue="2026-11-14" onValueChange={onValueChange} />)
    await userEvent.click(screen.getByRole('button', { name: /Choose date, Saturday,? 14 November 2026/ }))
    expect(document.activeElement).toHaveAccessibleName(/14 November 2026/)
    await userEvent.keyboard('{ArrowRight}{Enter}')
    expect(onValueChange).toHaveBeenCalledWith('2026-11-15')
    expect(texts('Delivery')).toEqual(['15', '11', '2026'])
    expect(screen.queryByRole('grid')).not.toBeInTheDocument()
    expect(document.activeElement).toHaveAccessibleName(/Choose date, Sunday,? 15 November 2026/)
  })

  it('takes its name and description from a FormField', () => {
    render(
      <FormField label="Trip date" help="Any day this year.">
        <DatePicker label="ignored" />
      </FormField>
    )
    const group = screen.getByRole('group', { name: 'Trip date' })
    expect(group).toHaveAccessibleDescription('Any day this year.')
  })

  it('needs no label of its own inside a FormField', () => {
    render(
      <FormField label="Due date">
        <DatePicker />
      </FormField>
    )
    expect(screen.getByRole('group', { name: 'Due date' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Choose date' })).toBeInTheDocument()
  })

  it('forwards ref to the field', () => {
    const ref = createRef<HTMLDivElement>()
    render(<DatePicker label="Date" ref={ref} />)
    expect(ref.current).toBe(screen.getByRole('group', { name: 'Date' }))
  })

  it('is axe clean, closed and open', async () => {
    render(<DatePicker label="Date" defaultValue="2026-11-14" />)
    expect(await axeClean(document.body)).toHaveNoViolations()
    await userEvent.click(screen.getByRole('button', { name: /Choose date/ }))
    expect(await axeClean(document.body)).toHaveNoViolations()
  })
})
