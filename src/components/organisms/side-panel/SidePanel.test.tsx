import { createRef, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../../../test/axe'
import { Button, Input, Select } from '../../atoms'
import { FormField } from '../../molecules'
import { SIDE_PANEL_WIDTH, SidePanel } from './SidePanel'

function Board({ onWidthChange }: { onWidthChange?: (width: number) => void }) {
  const [open, setOpen] = useState<string | null>(null)
  return (
    <div className="flex">
      <div className="flex min-w-0 flex-1 flex-wrap gap-3">
        <Button onClick={() => setOpen('Fix the login form')}>Fix the login form</Button>
        <Button onClick={() => setOpen('Ship the release')}>Ship the release</Button>
      </div>
      <SidePanel
        key={open ?? ''}
        open={open !== null}
        onOpenChange={next => { if (!next) setOpen(null) }}
        title={open ?? ''}
        eyebrow="#12"
        description="In Review"
        actions={<Button size="sm">Run</Button>}
        footer={<Button size="sm">Save</Button>}
        onWidthChange={onWidthChange}
      >
        <FormField label="Title"><Input defaultValue={open ?? ''} /></FormField>
        <Select label="Priority" options={[{ value: 'high', label: 'High' }, { value: 'low', label: 'Low' }]} defaultValue="high" />
      </SidePanel>
    </div>
  )
}

describe('SidePanel', () => {
  it('renders nothing while closed', () => {
    render(<SidePanel open={false} onOpenChange={() => {}} title="Details">Body</SidePanel>)
    expect(screen.queryByRole('complementary')).toBeNull()
  })

  it('opens as a named, described landmark beside the page and focuses its heading', async () => {
    render(<Board />)
    await userEvent.click(screen.getByRole('button', { name: 'Fix the login form' }))
    const panel = screen.getByRole('complementary', { name: 'Fix the login form' })
    expect(panel).toHaveAccessibleDescription('In Review')
    expect(screen.getByRole('heading', { level: 2, name: 'Fix the login form' })).toHaveFocus()
    expect(screen.getByText('#12')).toBeInTheDocument()
    // Non-modal: the page behind it is still reachable.
    expect(screen.getByRole('button', { name: 'Ship the release' })).not.toHaveAttribute('aria-hidden')
  })

  it('swaps its content when another item is opened, with focus left on that item', async () => {
    render(<Board />)
    await userEvent.click(screen.getByRole('button', { name: 'Fix the login form' }))
    const other = screen.getByRole('button', { name: 'Ship the release' })
    await userEvent.click(other)
    expect(screen.getByRole('complementary', { name: 'Ship the release' })).toBeInTheDocument()
  })

  it('closes on Escape inside it and returns focus to the opener', async () => {
    render(<Board />)
    const opener = screen.getByRole('button', { name: 'Fix the login form' })
    await userEvent.click(opener)
    await userEvent.click(screen.getByRole('textbox', { name: 'Title' }))
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('complementary')).toBeNull()
    expect(opener).toHaveFocus()
  })

  it('closes from its close button', async () => {
    render(<Board />)
    await userEvent.click(screen.getByRole('button', { name: 'Fix the login form' }))
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('complementary')).toBeNull()
  })

  it('keeps Escape for closeOnEscape={false}', async () => {
    const onOpenChange = vi.fn()
    render(<SidePanel open onOpenChange={onOpenChange} title="Details" closeOnEscape={false}><Input aria-label="Name" /></SidePanel>)
    await userEvent.click(screen.getByRole('textbox', { name: 'Name' }))
    await userEvent.keyboard('{Escape}')
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('resizes from the keyboard, within its limits', async () => {
    const onWidthChange = vi.fn()
    render(<Board onWidthChange={onWidthChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Fix the login form' }))
    const handle = screen.getByRole('separator', { name: 'Resize panel' })
    expect(handle).toHaveAttribute('aria-valuenow', String(SIDE_PANEL_WIDTH.default))
    handle.focus()
    await userEvent.keyboard('{ArrowLeft}')
    expect(handle).toHaveAttribute('aria-valuenow', String(SIDE_PANEL_WIDTH.default + SIDE_PANEL_WIDTH.step))
    await userEvent.keyboard('{End}')
    expect(handle).toHaveAttribute('aria-valuenow', String(SIDE_PANEL_WIDTH.max))
    await userEvent.keyboard('{ArrowLeft}')
    expect(handle).toHaveAttribute('aria-valuenow', String(SIDE_PANEL_WIDTH.max))
    await userEvent.keyboard('{Home}')
    expect(onWidthChange).toHaveBeenLastCalledWith(SIDE_PANEL_WIDTH.min)
  })

  it('resizes with a pointer drag on its leading edge', async () => {
    render(<SidePanel open onOpenChange={() => {}} title="Details" defaultWidth={500}>Body</SidePanel>)
    const handle = screen.getByRole('separator')
    fireEvent.pointerDown(handle, { button: 0, clientX: 600, pointerId: 1 })
    fireEvent.pointerMove(handle, { clientX: 500, pointerId: 1 })
    fireEvent.pointerUp(handle, { clientX: 500, pointerId: 1 })
    expect(handle).toHaveAttribute('aria-valuenow', '600')
  })

  it('takes a controlled width and clamps it', () => {
    render(<SidePanel open onOpenChange={() => {}} title="Details" width={2000}>Body</SidePanel>)
    expect(screen.getByRole('separator')).toHaveAttribute('aria-valuenow', String(SIDE_PANEL_WIDTH.max))
  })

  it('forwards its ref to the aside and merges className', () => {
    const ref = createRef<HTMLElement>()
    render(<SidePanel ref={ref} open onOpenChange={() => {}} title="Details" className="extra">Body</SidePanel>)
    expect(ref.current?.tagName).toBe('ASIDE')
    expect(ref.current).toHaveClass('extra')
  })

  it('has no axe violations', async () => {
    const { container } = render(<Board />)
    await userEvent.click(screen.getByRole('button', { name: 'Fix the login form' }))
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
