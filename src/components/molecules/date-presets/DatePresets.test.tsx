import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../../../test/axe'
import { DatePresets, defaultPresets } from './DatePresets'

describe('DatePresets', () => {
  it('counts the usual periods back from today, each including it', () => {
    const presets = Object.fromEntries(defaultPresets('2026-03-10').map(p => [p.label, p.range]))
    expect(presets['Last 7 days']).toEqual({ start: '2026-03-04', end: '2026-03-10' })
    expect(presets['Last month']).toEqual({ start: '2026-02-01', end: '2026-02-28' })
    expect(presets['This year']).toEqual({ start: '2026-01-01', end: '2026-12-31' })
  })

  it('presses the preset that matches the range and reports a choice', async () => {
    const onSelect = vi.fn()
    const presets = defaultPresets('2026-03-10')
    render(<DatePresets presets={presets} value={presets[2].range} onSelect={onSelect} />)
    expect(screen.getByRole('button', { name: 'Last 7 days' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Today' })).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(screen.getByRole('button', { name: 'Yesterday' }))
    expect(onSelect).toHaveBeenCalledWith({ start: '2026-03-09', end: '2026-03-09' })
  })

  it('is axe clean', async () => {
    render(<DatePresets />)
    expect(await axeClean(document.body)).toHaveNoViolations()
  })
})
