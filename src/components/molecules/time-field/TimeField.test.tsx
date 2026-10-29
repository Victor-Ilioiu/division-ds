import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../../../test/axe'
import { TimeField } from './TimeField'

const segments = (name: string) => within(screen.getByRole('group', { name })).getAllByRole('spinbutton')

describe('TimeField', () => {
  it('types a 24-hour time and moves on by itself', async () => {
    const onValueChange = vi.fn()
    render(<TimeField label="Start" hourCycle={24} onValueChange={onValueChange} />)
    await userEvent.click(segments('Start')[0])
    await userEvent.keyboard('1430')
    expect(segments('Start').map(s => s.textContent)).toEqual(['14', '30'])
    expect(onValueChange).toHaveBeenLastCalledWith('14:30')
  })

  it('shows a 12-hour clock but keeps a 24-hour value', async () => {
    const onValueChange = vi.fn()
    render(<TimeField label="Call" hourCycle={12} defaultValue="14:30" onValueChange={onValueChange} />)
    expect(segments('Call').map(s => s.textContent)).toEqual(['02', '30', 'PM'])
    segments('Call')[2].focus()
    await userEvent.keyboard('a')
    expect(onValueChange).toHaveBeenLastCalledWith('02:30')
  })

  it('lists the times between min and max, and picks one', async () => {
    const onValueChange = vi.fn()
    render(<TimeField label="Pickup" hourCycle={24} step={60} min="08:00" max="11:00" defaultValue="09:00" onValueChange={onValueChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Choose time, 09:00' }))
    const list = screen.getByRole('listbox', { name: 'Pickup, times' })
    expect(within(list).getAllByRole('option').map(o => o.textContent)).toEqual(['08:00', '09:00', '10:00', '11:00'])
    expect(document.activeElement).toHaveTextContent('09:00')
    await userEvent.keyboard('{ArrowDown}{Enter}')
    expect(onValueChange).toHaveBeenLastCalledWith('10:00')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('marks a time outside min and max invalid', () => {
    render(<TimeField label="Pickup" hourCycle={24} min="08:00" defaultValue="07:00" />)
    expect(screen.getByRole('group', { name: 'Pickup' })).toHaveAttribute('aria-invalid', 'true')
  })

  it('is axe clean, closed and open', async () => {
    render(<TimeField label="Start" hourCycle={24} defaultValue="10:00" />)
    expect(await axeClean(document.body)).toHaveNoViolations()
    await userEvent.click(screen.getByRole('button', { name: /Choose time/ }))
    expect(await axeClean(document.body)).toHaveNoViolations()
  })
})
