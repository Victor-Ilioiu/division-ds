import { createRef, type Ref } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../../../test/axe'
import { Button, Checkbox } from '../../atoms'
import { Sheet, SheetClose, SheetContent, SheetTrigger } from './Sheet'

function Filters({ side, contentRef }: { side?: 'left' | 'right'; contentRef?: Ref<HTMLDivElement> }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="secondary">Filter depots</Button>
      </SheetTrigger>
      <SheetContent ref={contentRef} side={side} title="Filters" description="Narrow the depot list.">
        <label className="flex items-center gap-2">
          <Checkbox /> North
        </label>
        <SheetClose asChild>
          <Button>Apply</Button>
        </SheetClose>
      </SheetContent>
    </Sheet>
  )
}

async function openFilters() {
  await userEvent.click(screen.getByRole('button', { name: 'Filter depots' }))
  return screen.findByRole('dialog', { name: 'Filters' })
}

describe('Sheet', () => {
  it('opens from its trigger as a named, described dialog on the right by default', async () => {
    render(<Filters />)
    const sheet = await openFilters()
    expect(sheet).toHaveAccessibleDescription('Narrow the depot list.')
    expect(sheet).toHaveAttribute('data-side', 'right')
  })

  it('can enter from the left', async () => {
    render(<Filters side="left" />)
    expect(await openFilters()).toHaveAttribute('data-side', 'left')
  })

  it('closes on Escape and returns focus to the trigger', async () => {
    render(<Filters />)
    const trigger = screen.getByRole('button', { name: 'Filter depots' })
    await openFilters()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(trigger).toHaveFocus()
  })

  it('closes from its close button and from a SheetClose', async () => {
    render(<Filters />)
    const sheet = await openFilters()
    await userEvent.click(within(sheet).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await userEvent.click(within(await openFilters()).getByRole('button', { name: 'Apply' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('forwards a ref to the element with role dialog', async () => {
    const ref = createRef<HTMLDivElement>()
    render(<Filters contentRef={ref} />)
    const sheet = await openFilters()
    expect(ref.current).toBe(sheet)
  })

  it.skip('types the computed name, description, role and side away', () => {
    // @ts-expect-error the title names the sheet
    ;<SheetContent title="Filters" aria-labelledby="elsewhere" />
    // @ts-expect-error a sheet is always role="dialog"
    ;<SheetContent title="Filters" role="alertdialog" />
    // @ts-expect-error data-side follows the side prop
    ;<SheetContent title="Filters" data-side="left" />
  })

  it('is axe clean while open', async () => {
    render(<Filters />)
    await openFilters()
    expect(await axeClean(document.body)).toHaveNoViolations()
  })
})
