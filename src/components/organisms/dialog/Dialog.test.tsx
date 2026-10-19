import { createRef, useEffect, useState, type Ref } from 'react'
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../../../test/axe'
import { Button, Input } from '../../atoms'
import { Toaster, useToast } from '../../molecules'
import { PAGE_TOAST_VIEWPORT_ID } from '../../molecules/toast/Toast'
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogTrigger } from './Dialog'

function EditDepot({ contentRef }: { contentRef?: Ref<HTMLDivElement> }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Edit depot</Button>
      </DialogTrigger>
      <DialogContent ref={contentRef} title="Edit depot" description="Changes apply to every open manifest.">
        <Input aria-label="Depot name" defaultValue="Brasov north" />
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Opened by ordinary state, with no DialogTrigger anywhere. */
function ArchiveFromButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        Archive manifest
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Archive manifest?" size="sm">
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Keep it</Button>
            </DialogClose>
            <Button variant="danger" onClick={() => setOpen(false)}>
              Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/** A real DialogTrigger exists, but this dialog is opened by a separate control instead -- one
 *  that goes disabled the instant the dialog closes, so it can no longer take focus back itself. */
function DisablingOpener() {
  const [open, setOpen] = useState(false)
  const [openerDisabled, setOpenerDisabled] = useState(false)
  return (
    <>
      <Button disabled={openerDisabled} onClick={() => setOpen(true)}>
        Archive from elsewhere
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>Edit depot</Button>
        </DialogTrigger>
        <DialogContent title="Archive manifest?" size="sm">
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Keep it</Button>
            </DialogClose>
            <Button
              variant="danger"
              onClick={() => {
                setOpenerDisabled(true)
                setOpen(false)
              }}
            >
              Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

async function openEditDepot() {
  await userEvent.click(screen.getByRole('button', { name: 'Edit depot' }))
  return screen.findByRole('dialog', { name: 'Edit depot' })
}

/** No DialogTrigger anywhere, and the opener disappears from the page entirely (not merely
 *  disabled) by the time the dialog closes -- the AppShell #main landmark this test renders by
 *  hand is the last thing left to fall back to. */
function DisappearingOpenerNoTrigger() {
  const [open, setOpen] = useState(false)
  const [openerGone, setOpenerGone] = useState(false)
  return (
    <>
      <main id="main" tabIndex={-1}>
        {!openerGone ? <Button onClick={() => setOpen(true)}>Archive from elsewhere</Button> : null}
      </main>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Archive manifest?" size="sm">
          <DialogFooter>
            <Button
              variant="danger"
              onClick={() => {
                setOpenerGone(true)
                setOpen(false)
              }}
            >
              Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/** Like DisappearingOpenerNoTrigger, but this dialog also has a real DialogTrigger -- the
 *  disconnected opener must not stand in the way of Radix's own trigger-focus fallback. */
function DisappearingOpenerWithTrigger() {
  const [open, setOpen] = useState(false)
  const [openerGone, setOpenerGone] = useState(false)
  return (
    <>
      {!openerGone ? <Button onClick={() => setOpen(true)}>Archive from elsewhere</Button> : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>Edit depot</Button>
        </DialogTrigger>
        <DialogContent title="Archive manifest?" size="sm">
          <DialogFooter>
            <Button
              variant="danger"
              onClick={() => {
                setOpenerGone(true)
                setOpen(false)
              }}
            >
              Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/** Opened by a keyboard shortcut rather than a click, so whatever had focus when the shortcut fires
 *  -- a page toast, here -- is what the dialog records as its opener. A toast still showing when an
 *  overlay opens moves into it and back out again, remounting under a new node each time: by the
 *  time this dialog closes, the node it recorded is gone. */
function ToastThenDialogByShortcut() {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'k') setOpen(true)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
  return (
    <>
      <Button onClick={() => toast({ title: 'Manifest filed' })}>Raise</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Rename depot" size="sm" />
      </Dialog>
    </>
  )
}

describe('Dialog', () => {
  it('opens from its trigger, named by its title and described by its description', async () => {
    render(<EditDepot />)
    const dialog = await openEditDepot()
    expect(dialog).toHaveAccessibleDescription('Changes apply to every open manifest.')
  })

  it('focuses the first control inside, and keeps the close button last', async () => {
    render(<EditDepot />)
    const dialog = await openEditDepot()
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Depot name' })).toHaveFocus())
    expect(within(dialog).getAllByRole('button').at(-1)).toHaveAccessibleName('Close')
  })

  it('closes on Escape and returns focus to the trigger', async () => {
    render(<EditDepot />)
    const trigger = screen.getByRole('button', { name: 'Edit depot' })
    await openEditDepot()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(trigger).toHaveFocus()
  })

  it('returns focus to whatever opened it when there is no trigger', async () => {
    render(<ArchiveFromButton />)
    const opener = screen.getByRole('button', { name: 'Archive manifest' })
    await userEvent.click(opener)
    await screen.findByRole('dialog', { name: 'Archive manifest?' })
    await userEvent.click(screen.getByRole('button', { name: 'Keep it' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(opener).toHaveFocus()
  })

  it('does not leave focus on the body when its opener is disabled by the time it closes', async () => {
    render(<DisablingOpener />)
    await userEvent.click(screen.getByRole('button', { name: 'Archive from elsewhere' }))
    await screen.findByRole('dialog', { name: 'Archive manifest?' })
    await userEvent.click(screen.getByRole('button', { name: 'Archive' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    // The opener itself is now disabled and cannot take focus back, so this accepts either
    // outcome the fix leaves available -- Radix's own fallback to the dialog's real trigger, or
    // nothing worse than that -- as long as it is not the body.
    expect(document.body).not.toHaveFocus()
  })

  it('falls back to the page toast viewport, not the body, when its opener is a page toast that moved into the overlay and back', async () => {
    render(
      <Toaster>
        <ToastThenDialogByShortcut />
      </Toaster>
    )
    await userEvent.click(screen.getByRole('button', { name: 'Raise' }))
    await screen.findByText('Manifest filed')
    fireEvent.keyDown(document, { key: 'F8', code: 'F8' })
    await userEvent.tab()
    fireEvent.keyDown(window, { key: 'k' })
    const dialog = await screen.findByRole('dialog', { name: 'Rename depot' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.body).not.toHaveFocus()
    expect(document.getElementById(PAGE_TOAST_VIEWPORT_ID)).toHaveFocus()
  })

  it('opens via a click that never moved focus onto the trigger, and still returns focus to it on close', async () => {
    render(
      <Toaster>
        <EditDepot />
      </Toaster>
    )
    const trigger = screen.getByRole('button', { name: 'Edit depot' })
    expect(document.body).toHaveFocus()
    // A raw DOM click, not userEvent.click: it fires the click event without moving focus onto
    // the trigger first, the same as a click can leave focus in real browsers (a WebKit mouse
    // click, for one) -- so no opener is ever recorded for this open, and this dialog's own
    // fallback (the page toast viewport, since a Toaster is mounted here) must stay out of the
    // way and let Radix's own trigger-focus fallback run instead.
    trigger.click()
    const dialog = await screen.findByRole('dialog', { name: 'Edit depot' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(trigger).toHaveFocus()
  })

  it('falls back to #main when the opener is gone and neither a trigger nor a page toast viewport exist', async () => {
    render(<DisappearingOpenerNoTrigger />)
    await userEvent.click(screen.getByRole('button', { name: 'Archive from elsewhere' }))
    await screen.findByRole('dialog', { name: 'Archive manifest?' })
    await userEvent.click(screen.getByRole('button', { name: 'Archive' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.getByRole('main')).toHaveFocus()
  })

  it('lets Radix focus a still-mounted DialogTrigger when a different, now-disconnected opener raised it', async () => {
    render(
      <Toaster>
        <DisappearingOpenerWithTrigger />
      </Toaster>
    )
    await userEvent.click(screen.getByRole('button', { name: 'Archive from elsewhere' }))
    await screen.findByRole('dialog', { name: 'Archive manifest?' })
    await userEvent.click(screen.getByRole('button', { name: 'Archive' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    // The recorded opener ("Archive from elsewhere") is gone, but this dialog's own DialogTrigger
    // ("Edit depot") is still mounted, so this dialog's own fallback stays out of the way even
    // though a page toast viewport exists to fall back to (the Toaster above), and Radix's own
    // trigger-focus fallback, unprevented, lands here instead.
    expect(screen.getByRole('button', { name: 'Edit depot' })).toHaveFocus()
  })

  it('closes from its close button', async () => {
    render(<EditDepot />)
    const dialog = await openEditDepot()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('hides the rest of the page from assistive tech while open', async () => {
    render(<EditDepot />)
    const trigger = screen.getByRole('button', { name: 'Edit depot' })
    await openEditDepot()
    expect(trigger.closest('[aria-hidden="true"]')).not.toBeNull()
  })

  it('forwards a ref to the element with role dialog', async () => {
    const ref = createRef<HTMLDivElement>()
    render(<EditDepot contentRef={ref} />)
    const dialog = await openEditDepot()
    expect(ref.current).toBe(dialog)
  })

  // Type-only: each line fails `tsc -b` if its guard is removed.
  it.skip('types the computed name, description and role away', () => {
    // @ts-expect-error the title names the dialog
    ;<DialogContent title="Edit depot" aria-labelledby="elsewhere" />
    // @ts-expect-error the description describes the dialog
    ;<DialogContent title="Edit depot" aria-describedby="elsewhere" />
    // @ts-expect-error a dialog is always role="dialog"
    ;<DialogContent title="Edit depot" role="alertdialog" />
  })

  it('is axe clean while open', async () => {
    render(<EditDepot />)
    await openEditDepot()
    // Portalled to document.body, so the whole document, not the render container.
    expect(await axeClean(document.body)).toHaveNoViolations()
  })
})
