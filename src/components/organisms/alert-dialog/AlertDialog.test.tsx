import { createRef, useState, type Ref } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../../../test/axe'
import { Button } from '../../atoms'
import { Toaster, useToast } from '../../molecules'
import { PAGE_TOAST_VIEWPORT_ID } from '../../molecules/toast/Toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogTrigger,
} from './AlertDialog'

function DeleteDepot({
  onConfirm,
  contentRef,
  className,
}: {
  onConfirm?: () => void | Promise<unknown>
  contentRef?: Ref<HTMLDivElement>
  className?: string
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="danger">Delete depot</Button>
      </AlertDialogTrigger>
      <AlertDialogContent
        ref={contentRef}
        className={className}
        title="Delete Brasov north?"
        description="Its 12 open manifests move to the unassigned queue."
      >
        <AlertDialogFooter>
          <AlertDialogCancel />
          <AlertDialogAction onClick={onConfirm} loadingLabel="Deleting depot">
            Delete depot
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

async function open() {
  await userEvent.click(screen.getByRole('button', { name: 'Delete depot' }))
  return screen.findByRole('alertdialog', { name: 'Delete Brasov north?' })
}

/** A promise the test settles by hand. */
function deferred() {
  let resolve!: () => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('AlertDialog', () => {
  it('opens as an alertdialog, named by its title and described by its description', async () => {
    render(<DeleteDepot />)
    const dialog = await open()
    expect(dialog).toHaveAccessibleDescription('Its 12 open manifests move to the unassigned queue.')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('merges className onto the surface and forwards ref to it', async () => {
    const ref = createRef<HTMLDivElement>()
    render(<DeleteDepot contentRef={ref} className="custom-class" />)
    const dialog = await open()
    expect(dialog).toHaveClass('custom-class', 'anim-overlay', 'crosshair')
    expect(ref.current).toBe(dialog)
  })

  it('focuses Cancel, the least destructive action, on open', async () => {
    render(<DeleteDepot />)
    await open()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus())
  })

  it('has no close button: the choice is Cancel or the action', async () => {
    render(<DeleteDepot />)
    const dialog = await open()
    expect(within(dialog).getAllByRole('button').map(b => b.textContent)).toEqual(['Cancel', 'Delete depot'])
  })

  it('is not dismissed by a click on the scrim', async () => {
    render(<DeleteDepot />)
    const dialog = await open()
    const scrim = dialog.parentElement!
    fireEvent.pointerDown(scrim)
    fireEvent.click(scrim)
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  it('closes on Escape and returns focus to the trigger', async () => {
    render(<DeleteDepot />)
    const trigger = screen.getByRole('button', { name: 'Delete depot' })
    await open()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    expect(trigger).toHaveFocus()
  })

  it('Cancel closes without running the action', async () => {
    const onConfirm = vi.fn()
    render(<DeleteDepot onConfirm={onConfirm} />)
    await open()
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('a synchronous action runs and closes', async () => {
    const onConfirm = vi.fn()
    render(<DeleteDepot onConfirm={onConfirm} />)
    const dialog = await open()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete depot' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
  })

  it('an async action keeps the dialog open and busy until its promise resolves', async () => {
    const work = deferred()
    render(<DeleteDepot onConfirm={() => work.promise} />)
    const dialog = await open()
    const action = within(dialog).getByRole('button', { name: /Delete depot/ })
    await userEvent.click(action)
    expect(action).toHaveAttribute('aria-busy', 'true')
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeDisabled()
    // Escape waits for the request too.
    await userEvent.keyboard('{Escape}')
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    work.resolve()
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
  })

  it('a rejected action stays open and usable, so the caller can show the error', async () => {
    const work = deferred()
    render(<DeleteDepot onConfirm={() => work.promise} />)
    const dialog = await open()
    const action = within(dialog).getByRole('button', { name: /Delete depot/ })
    await userEvent.click(action)
    work.reject(new Error('offline'))
    await waitFor(() => expect(action).not.toHaveAttribute('aria-busy'))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeEnabled()
  })

  it('preventDefault in onClick keeps it open', async () => {
    render(
      <AlertDialog defaultOpen>
        <AlertDialogContent title="Discard draft?" description="The text you wrote is lost.">
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={event => event.preventDefault()}>Discard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
    await userEvent.click(await screen.findByRole('button', { name: 'Discard' }))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  it('a controlled loading prop holds the dialog open and the action busy', async () => {
    function Controlled() {
      const [open, setOpen] = useState(true)
      return (
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogContent title="Revoke key?" description="Scripts using it stop working.">
            <AlertDialogFooter>
              <AlertDialogCancel />
              <AlertDialogAction loading>Revoke key</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )
    }
    render(<Controlled />)
    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByRole('button', { name: /Revoke key/ })).toHaveAttribute('aria-busy', 'true')
    await userEvent.keyboard('{Escape}')
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  it('tone default renders a primary action', async () => {
    render(
      <AlertDialog defaultOpen>
        <AlertDialogContent title="Publish catalogue?" description="Customers see the new prices at once.">
          <AlertDialogFooter>
            <AlertDialogCancel />
            <AlertDialogAction tone="default">Publish</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
    const action = await screen.findByRole('button', { name: 'Publish' })
    expect(action.className).toContain('--component-button-primary-fill')
  })

  it('has no axe violations when open', async () => {
    render(<DeleteDepot />)
    await open()
    expect(await axeClean(document.body)).toHaveNoViolations()
  })
})

describe.skip('AlertDialog required props (type-level)', () => {
  it('requires a title and a description', () => {
    // @ts-expect-error description is required: it is the message an alertdialog announces.
    void (<AlertDialogContent title="Delete?">x</AlertDialogContent>)
    // @ts-expect-error title is required: it is the accessible name.
    void (<AlertDialogContent description="Gone for good.">x</AlertDialogContent>)
  })
})

// Regression (owner review, 2026-10-14): the action toasts as the dialog closes. A toast raised
// into the dialog's own surface showed inside it for a moment, then jumped to the page corner.
// Mutation: drop `pageToasts` from AlertDialogContent and the toast mounts inside the dialog (the
// request is async, as in the docs, so the toast is raised while the dialog is still open).
function ToastingDelete() {
  const { toast } = useToast()
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="danger">Delete depot</Button>
      </AlertDialogTrigger>
      <AlertDialogContent title="Delete Brasov north?" description="Its 12 open manifests move to the unassigned queue.">
        <AlertDialogFooter>
          <AlertDialogCancel />
          <AlertDialogAction onClick={() => Promise.resolve().then(() => void toast({ tone: 'ok', title: 'Depot deleted' }))}>Delete depot</AlertDialogAction>
          <Button onClick={() => toast({ tone: 'info', title: 'Draft kept' })}>Keep draft</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

describe('AlertDialog toasts', () => {
  it('raises a toast only in the page viewport, never inside the dialog, and keeps it after the dialog closes', async () => {
    render(
      <Toaster>
        <ToastingDelete />
      </Toaster>
    )
    const dialog = await open()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete depot' }))
    const toast = await screen.findByText('Depot deleted')
    const viewport = document.getElementById(PAGE_TOAST_VIEWPORT_ID) as HTMLElement
    // Not a descendant of the dialog even while it is still open, and in the page's viewport.
    expect(dialog.contains(toast)).toBe(false)
    expect(viewport.contains(toast)).toBe(true)
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    expect(screen.getByText('Depot deleted')).toBeInTheDocument()
  })

  // jsdom has no exit animation, so the dialog unmounts in the same tick as the toast is raised
  // and the transient state is invisible. Raising from a button that leaves the dialog open
  // makes the outlet choice observable.
  it('keeps a toast raised while the dialog stays open out of the dialog', async () => {
    render(
      <Toaster>
        <ToastingDelete />
      </Toaster>
    )
    const dialog = await open()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Keep draft' }))
    const toast = await screen.findByText('Draft kept')
    expect(dialog.contains(toast)).toBe(false)
    expect(document.getElementById(PAGE_TOAST_VIEWPORT_ID)?.contains(toast)).toBe(true)
  })
})
