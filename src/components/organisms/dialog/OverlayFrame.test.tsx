import { createRef, useState, type Ref } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Dialog as RadixDialog } from 'radix-ui'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '../../atoms'
import { Toaster, useToast } from '../../molecules'
import { Sheet, SheetContent, SheetTrigger } from '../sheet/Sheet'
import { Dialog, DialogContent, DialogHeading, DialogTrigger } from './Dialog'
import { OverlayFrame } from './OverlayFrame'

function Probe({
  closeLabel,
  onCloseAutoFocus,
  frameRef,
}: {
  closeLabel?: string
  onCloseAutoFocus?: (event: Event) => void
  frameRef?: Ref<HTMLDivElement>
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open probe</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <OverlayFrame ref={frameRef} closeLabel={closeLabel} onCloseAutoFocus={onCloseAutoFocus}>
          <DialogHeading title="Probe" />
          <Button onClick={() => setOpen(false)}>Done</Button>
        </OverlayFrame>
      </Dialog>
    </>
  )
}

async function openProbe() {
  await userEvent.click(screen.getByRole('button', { name: 'Open probe' }))
  return screen.findByRole('dialog', { name: 'Probe' })
}

describe('OverlayFrame', () => {
  it('portals the surface out of the tree it was rendered in, inside the scrim layer', async () => {
    const { container } = render(<Probe />)
    const dialog = await openProbe()
    expect(container.contains(dialog)).toBe(false)
    // The scrim is Radix's Overlay, which carries the open state; the surface is its child.
    expect(dialog.parentElement).toHaveAttribute('data-state', 'open')
  })

  it("hands focus back to the opener before the caller's onCloseAutoFocus runs", async () => {
    const seen: Array<Element | null> = []
    render(<Probe onCloseAutoFocus={() => seen.push(document.activeElement)} />)
    const opener = screen.getByRole('button', { name: 'Open probe' })
    const dialog = await openProbe()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Done' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(seen).toEqual([opener])
  })

  it('draws the close button last when given a label, and none without one', async () => {
    const { unmount } = render(<Probe closeLabel="Close" />)
    const dialog = await openProbe()
    expect(within(dialog).getAllByRole('button').at(-1)).toHaveAccessibleName('Close')
    unmount()
    render(<Probe />)
    const bare = await openProbe()
    expect(within(bare).queryByRole('button', { name: 'Close' })).toBeNull()
  })

  it('forwards a ref to the element with role dialog', async () => {
    const ref = createRef<HTMLDivElement>()
    render(<Probe frameRef={ref} />)
    const dialog = await openProbe()
    expect(ref.current).toBe(dialog)
  })
})

function FiltersWithToast({ onEscapeKeyDown }: { onEscapeKeyDown?: (event: KeyboardEvent) => void }) {
  // Called above the sheet on purpose: the outlet is chosen when the toast is raised.
  const { toast } = useToast()
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button>Filter depots</Button>
      </SheetTrigger>
      <SheetContent title="Filters" onEscapeKeyDown={onEscapeKeyDown}>
        <Button onClick={() => toast({ title: 'Filters saved', tone: 'ok' })}>Save as default</Button>
      </SheetContent>
    </Sheet>
  )
}

async function openAndSave() {
  await userEvent.click(screen.getByRole('button', { name: 'Filter depots' }))
  const sheet = await screen.findByRole('dialog', { name: 'Filters' })
  await userEvent.click(within(sheet).getByRole('button', { name: 'Save as default' }))
  await within(sheet).findByText('Filters saved')
  return sheet
}

function SaveAndClose() {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>Rename depot</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Rename depot">
          <Button
            onClick={() => {
              setOpen(false)
              toast({ title: 'Depot renamed' })
            }}
          >
            Save
          </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}

// No `<Dialog>` wrapper, so `OverlayRootContext` is never provided: `useOverlayRoot()` sees
// `undefined`, the same as any future OverlayFrame consumer that renders outside Dialog/Sheet.
function BareOverlay() {
  const { toast } = useToast()
  return (
    <RadixDialog.Root open>
      <OverlayFrame>
        <DialogHeading title="Bare" />
        <Button onClick={() => toast({ title: 'Filters saved', tone: 'ok' })}>Save as default</Button>
      </OverlayFrame>
    </RadixDialog.Root>
  )
}

describe('toasts inside an open overlay', () => {
  it('shows a toast raised while a sheet is open inside the sheet, where assistive tech reaches it', async () => {
    render(
      <Toaster>
        <FiltersWithToast />
      </Toaster>
    )
    const sheet = await openAndSave()
    expect(within(sheet).getByText('Filters saved').closest('[aria-hidden="true"]')).toBeNull()
    // Radix's announcement node lands inside the sheet too, not in the hidden page.
    await waitFor(() =>
      expect(
        within(sheet)
          .getAllByRole('status')
          .some(node => node.textContent?.includes('Filters saved'))
      ).toBe(true)
    )
  })

  it('closes the sheet, not the toast, on the next Escape, and hands focus back to the trigger', async () => {
    render(
      <Toaster>
        <FiltersWithToast />
      </Toaster>
    )
    await openAndSave()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.getByRole('button', { name: 'Filter depots' })).toHaveFocus()
    // Not dismissed: it moved to the page's viewport.
    expect(screen.getByText('Filters saved')).toBeInTheDocument()
  })

  it('lets Escape dismiss the toast itself while focus is inside it', async () => {
    render(
      <Toaster>
        <FiltersWithToast />
      </Toaster>
    )
    const sheet = await openAndSave()
    within(sheet).getByRole('button', { name: 'Dismiss notification' }).focus()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(within(sheet).queryByText('Filters saved')).toBeNull())
    expect(screen.getByRole('dialog', { name: 'Filters' })).toBeInTheDocument()
  })

  it("runs the content's own onEscapeKeyDown when a toast is on top", async () => {
    const onEscapeKeyDown = vi.fn()
    render(
      <Toaster>
        <FiltersWithToast onEscapeKeyDown={onEscapeKeyDown} />
      </Toaster>
    )
    await openAndSave()
    await userEvent.keyboard('{Escape}')
    expect(onEscapeKeyDown).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('keeps a toast raised by the same click that closes the overlay', async () => {
    render(
      <Toaster>
        <SaveAndClose />
      </Toaster>
    )
    await userEvent.click(screen.getByRole('button', { name: 'Rename depot' }))
    const dialog = await screen.findByRole('dialog', { name: 'Rename depot' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(await screen.findByText('Depot renamed')).toBeInTheDocument()
  })

  it("sends F8 to the sheet's own notifications, not the hidden page's", async () => {
    render(
      <Toaster>
        <FiltersWithToast />
      </Toaster>
    )
    const sheet = await openAndSave()
    fireEvent.keyDown(document, { key: 'F8', code: 'F8' })
    const region = within(sheet).getByRole('region', { name: /^Notifications/ })
    expect(region.querySelector('ol')).toHaveFocus()
  })

  // Mutation: put the isComposing/keyCode-229 branch back to `return false`. That branch returns
  // immediately either way, so the surface-contains check, the sheet's onEscapeKeyDown and
  // root.close() are never reached -- the sheet stays open. What changes is the value handed back
  // to the toast: `false` reads as "not the overlay's Escape", so the toast runs its own default
  // handling and dismisses itself -- wrong for a keystroke that never was a real Escape.
  it('leaves the toast and the sheet alone on an Escape from an IME composition', async () => {
    render(
      <Toaster>
        <FiltersWithToast />
      </Toaster>
    )
    const sheet = await openAndSave()
    fireEvent.keyDown(document, { key: 'Escape', isComposing: true })
    expect(screen.getByRole('dialog', { name: 'Filters' })).toBeInTheDocument()
    expect(within(sheet).getByText('Filters saved')).toBeInTheDocument()
  })

  // Mutation: put the `if (!root) return false` guard back to `root?.close()` + unconditional
  // `return true`. Escape then claims to have been handled by "the overlay" even though there is
  // no root to close, and the toast's own default dismiss never runs -- so it never leaves.
  it('lets the toast dismiss itself on Escape when the frame has no overlay root to close', async () => {
    render(
      <Toaster>
        <BareOverlay />
      </Toaster>
    )
    await userEvent.click(await screen.findByRole('button', { name: 'Save as default' }))
    await screen.findByText('Filters saved')
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByText('Filters saved')).toBeNull())
  })

  it('moves a toast raised on the page into a sheet opened after it, where its action works', async () => {
    const onUndo = vi.fn()
    function PageToastThenSheet() {
      const { toast } = useToast()
      return (
        <>
          <Button
            onClick={() =>
              toast({
                title: 'Removed Kestrel C carbine replica',
                action: { label: 'Undo', altText: 'Add Kestrel C carbine replica again to undo this.', onAction: onUndo },
              })
            }
          >
            Remove replica
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button>Open cart</Button>
            </SheetTrigger>
            <SheetContent title="Your cart">
              <p>Two items.</p>
            </SheetContent>
          </Sheet>
        </>
      )
    }
    render(
      <Toaster>
        <PageToastThenSheet />
      </Toaster>
    )
    await userEvent.click(screen.getByRole('button', { name: 'Remove replica' }))
    await screen.findByText('Removed Kestrel C carbine replica')
    await userEvent.click(screen.getByRole('button', { name: 'Open cart' }))
    const sheet = await screen.findByRole('dialog', { name: 'Your cart' })
    const undo = await within(sheet).findByRole('button', { name: 'Undo' })
    expect(undo.closest('[aria-hidden="true"]')).toBeNull()
    await userEvent.click(undo)
    expect(onUndo).toHaveBeenCalledTimes(1)
  })

  it('moves a toast raised in a sheet into a dialog opened from it, and back when the dialog closes', async () => {
    function SheetWithNestedDialog() {
      const { toast } = useToast()
      return (
        <Sheet>
          <SheetTrigger asChild>
            <Button>Open cart</Button>
          </SheetTrigger>
          <SheetContent title="Your cart">
            <Button onClick={() => toast({ title: 'Filters saved', tone: 'ok' })}>Save as default</Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button>Confirm</Button>
              </DialogTrigger>
              <DialogContent title="Confirm">
                <p>Are you sure?</p>
              </DialogContent>
            </Dialog>
          </SheetContent>
        </Sheet>
      )
    }
    render(
      <Toaster>
        <SheetWithNestedDialog />
      </Toaster>
    )
    await userEvent.click(screen.getByRole('button', { name: 'Open cart' }))
    const sheet = await screen.findByRole('dialog', { name: 'Your cart' })
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save as default' }))
    await within(sheet).findByText('Filters saved')
    await userEvent.click(within(sheet).getByRole('button', { name: 'Confirm' }))
    const dialog = await screen.findByRole('dialog', { name: 'Confirm' })
    // Moved in: reachable inside the dialog, not left behind wherever the sheet's own hidden
    // subtree would put it.
    expect(within(dialog).getByText('Filters saved')).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Confirm' })).toBeNull())
    // Moved one level out, back into the sheet it came from -- not all the way to the page.
    expect(within(sheet).getByText('Filters saved')).toBeInTheDocument()
  })
})
