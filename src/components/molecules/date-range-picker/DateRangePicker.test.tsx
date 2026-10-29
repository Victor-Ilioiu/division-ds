import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../../../test/axe'
import { DatePresets } from '../date-presets/DatePresets'
import { DateRangePicker } from './DateRangePicker'

const day = (pattern: RegExp) => screen.getByRole('button', { name: pattern })
const cell = (pattern: RegExp) => day(pattern).closest('td')!

describe('DateRangePicker', () => {
  it('picks a start, previews the band, and closes on the end', async () => {
    const onValueChange = vi.fn()
    render(<DateRangePicker label="Stay" locale="en-GB" defaultValue={{ start: '2026-11-04', end: '' }} onValueChange={onValueChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Choose dates' }))
    expect(screen.getAllByRole('grid')).toHaveLength(2)
    expect(screen.getByText('Pick the first day.')).toBeInTheDocument()
    await userEvent.click(day(/ 9 November 2026/))
    expect(onValueChange).toHaveBeenLastCalledWith({ start: '2026-11-09', end: '' })
    expect(screen.getByText('Pick the last day.')).toBeInTheDocument()
    await userEvent.hover(day(/ 12 November 2026/))
    expect(cell(/ 10 November 2026/)).toHaveAttribute('aria-selected', 'true')
    await userEvent.click(day(/ 12 November 2026/))
    expect(onValueChange).toHaveBeenLastCalledWith({ start: '2026-11-09', end: '2026-11-12' })
    expect(screen.queryByRole('grid')).not.toBeInTheDocument()
    const group = screen.getByRole('group', { name: 'Stay' })
    expect(within(group).getByRole('group', { name: 'End date' })).toHaveTextContent('12/11/2026')
  })

  it('puts two days picked backwards in order', async () => {
    const onValueChange = vi.fn()
    render(<DateRangePicker label="Stay" locale="en-GB" defaultValue={{ start: '2026-11-20', end: '' }} onValueChange={onValueChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Choose dates' }))
    await userEvent.click(day(/ 18 November 2026/))
    await userEvent.click(day(/ 11 November 2026/))
    expect(onValueChange).toHaveBeenLastCalledWith({ start: '2026-11-11', end: '2026-11-18' })
  })

  it('marks a typed end before the start invalid instead of moving it', () => {
    render(<DateRangePicker label="Stay" defaultValue={{ start: '2026-11-20', end: '2026-11-02' }} />)
    expect(screen.getByRole('group', { name: 'Stay' })).toHaveAttribute('aria-invalid', 'true')
  })

  it('takes a preset from DatePresets in aside, with no wiring, and closes', async () => {
    const onValueChange = vi.fn()
    render(<DateRangePicker label="Period" aside={<DatePresets />} onValueChange={onValueChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Choose dates' }))
    await userEvent.click(screen.getByRole('button', { name: 'Today' }))
    const [{ start, end }] = onValueChange.mock.calls.at(-1)!
    expect(start).toBe(end)
    expect(screen.queryByRole('grid')).not.toBeInTheDocument()
  })

  it('is axe clean, closed and open with presets', async () => {
    render(<DateRangePicker label="Period" aside={<DatePresets />} defaultValue={{ start: '2026-11-09', end: '2026-11-13' }} />)
    expect(await axeClean(document.body)).toHaveNoViolations()
    await userEvent.click(screen.getByRole('button', { name: /Choose dates/ }))
    expect(await axeClean(document.body)).toHaveNoViolations()
  })
})
