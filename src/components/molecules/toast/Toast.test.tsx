import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../../../test/axe'
import { OverlayToasts, Toaster, useToast, type ToastOptions } from './Toast'

function Raise({ options }: { options: ToastOptions }) {
  const { toast } = useToast()
  return (
    <button type="button" onClick={() => toast(options)}>
      Raise
    </button>
  )
}

function renderWith(options: ToastOptions) {
  return render(
    <Toaster>
      <Raise options={options} />
    </Toaster>
  )
}

afterEach(() => {
  vi.useRealTimers()
})

describe('Toast', () => {
  it('throws a clear error outside a Toaster', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Raise options={{ title: 'x' }} />)).toThrow(/Toaster/)
    spy.mockRestore()
  })

  it('shows a raised toast with its title, description and tone word', async () => {
    renderWith({ title: 'Manifest saved', description: 'Twelve items.', tone: 'ok' })
    await userEvent.click(screen.getByRole('button', { name: 'Raise' }))
    expect(await screen.findByText('Manifest saved')).toBeInTheDocument()
    expect(screen.getByText('Twelve items.')).toBeInTheDocument()
    expect(screen.getByText('Success:')).toHaveClass('sr-only')
  })

  // Radix turns `type` into the live region's politeness internally; what this component owns is
  // the mapping from tone to type, so that is what is asserted, through an attribute it sets.
  it('makes hostile toasts foreground and others background', async () => {
    const { unmount } = renderWith({ title: 'Sync failed', tone: 'hostile' })
    await userEvent.click(screen.getByRole('button', { name: 'Raise' }))
    expect((await screen.findByText('Sync failed')).closest('[data-priority]')).toHaveAttribute('data-priority', 'foreground')
    unmount()
    renderWith({ title: 'Saved', tone: 'ok' })
    await userEvent.click(screen.getByRole('button', { name: 'Raise' }))
    expect((await screen.findByText('Saved')).closest('[data-priority]')).toHaveAttribute('data-priority', 'background')
  })

  it('dismisses through its close button', async () => {
    renderWith({ title: 'Manifest saved' })
    await userEvent.click(screen.getByRole('button', { name: 'Raise' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Dismiss notification' }))
    expect(screen.queryByText('Manifest saved')).toBeNull()
  })

  it('runs its action', async () => {
    const onAction = vi.fn()
    renderWith({ title: 'Item removed', action: { label: 'Undo', altText: 'Undo from the manifest history', onAction } })
    await userEvent.click(screen.getByRole('button', { name: 'Raise' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Undo' }))
    expect(onAction).toHaveBeenCalledOnce()
  })

  // The action link is a single line of small type with no padding of its own, well under the
  // 24x24 CSS px minimum target size (SC 2.5.8) without help.
  it('gives its action a real 24px target, the Breadcrumbs precedent', async () => {
    renderWith({ title: 'Item removed', action: { label: 'Undo', altText: 'Undo', onAction: () => {} } })
    await userEvent.click(screen.getByRole('button', { name: 'Raise' }))
    const action = await screen.findByRole('button', { name: 'Undo' })
    expect(action).toHaveClass('inline-flex', 'items-center', 'min-h-6')
  })

  it('leaves on its own after its duration', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    renderWith({ title: 'Manifest saved', duration: 1000 })
    await userEvent.click(screen.getByRole('button', { name: 'Raise' }))
    expect(await screen.findByText('Manifest saved')).toBeInTheDocument()
    await act(async () => {
      vi.advanceTimersByTime(1500)
    })
    expect(screen.queryByText('Manifest saved')).toBeNull()
  })

  // The 2026-10-20 outside test: Undo closed its toast with focus inside it, Radix parked focus on
  // the viewport (pausing every timer), the list emptied and Radix dropped its resume listeners, so
  // the pause outlived the focus and every later toast stayed up until a reload.
  it('still closes later toasts on their own after an action closes its toast', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderWith({ title: 'Alert acknowledged', duration: 1000, action: { label: 'Undo', altText: 'Undo', onAction: () => {} } })
    const raise = screen.getByRole('button', { name: 'Raise' })
    await user.click(raise)
    await user.click(await screen.findByRole('button', { name: 'Undo' }))
    // Focus goes back to where it was before it entered the toast, never the viewport.
    expect(raise).toHaveFocus()
    await act(async () => {
      vi.advanceTimersByTime(500)
    })
    expect(screen.queryByText('Alert acknowledged')).toBeNull()
    await user.click(raise)
    expect(await screen.findByText('Alert acknowledged')).toBeInTheDocument()
    await act(async () => {
      vi.advanceTimersByTime(1500)
    })
    expect(screen.queryByText('Alert acknowledged')).toBeNull()
  })

  // Mutation: ignore `replace`; three clicks then show three toasts.
  it('closes an open toast with the same replace key, so repeats show once', async () => {
    renderWith({ title: 'Alert acknowledged', replace: 'ack' })
    const raise = screen.getByRole('button', { name: 'Raise' })
    await userEvent.click(raise)
    await userEvent.click(raise)
    await userEvent.click(raise)
    await waitFor(() => expect(screen.getAllByText('Alert acknowledged')).toHaveLength(1))
  })

  it('is axe clean with a toast showing', async () => {
    renderWith({ title: 'Sync failed', description: 'Retrying in a minute.', tone: 'hostile' })
    await userEvent.click(screen.getByRole('button', { name: 'Raise' }))
    await screen.findByText('Sync failed')
    expect(await axeClean(document.body)).toHaveNoViolations()
  })

  // Mutation: drop `onEscape={event => event.repeat}` from the page ToastList (Toaster). A held
  // Escape's repeat keydowns then dismiss the page toast the same as a real one.
  it('does not dismiss a page toast on a held Escape, but a deliberate one still dismisses it', async () => {
    renderWith({ title: 'Manifest saved' })
    await userEvent.click(screen.getByRole('button', { name: 'Raise' }))
    await screen.findByText('Manifest saved')
    fireEvent.keyDown(document, { key: 'Escape', repeat: true })
    expect(screen.getByText('Manifest saved')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByText('Manifest saved')).toBeNull())
  })
})

function Outlets({ inner }: { inner: boolean }) {
  const { toast } = useToast()
  return (
    <>
      <button type="button" onClick={() => toast({ title: 'Manifest filed' })}>
        Raise
      </button>
      <div data-testid="outer">
        <OverlayToasts container={null} onEscape={() => false} />
        {inner ? (
          <div data-testid="inner">
            <OverlayToasts container={null} onEscape={() => false} />
          </div>
        ) : null}
      </div>
    </>
  )
}

describe('Toaster outlets', () => {
  it('sends a toast to the innermost outlet open when it is raised', async () => {
    render(
      <Toaster>
        <Outlets inner />
      </Toaster>
    )
    await userEvent.click(screen.getByRole('button', { name: 'Raise' }))
    expect(within(screen.getByTestId('inner')).getByText('Manifest filed')).toBeInTheDocument()
  })

  it('moves a toast one level out when its outlet unmounts', async () => {
    const { rerender } = render(
      <Toaster>
        <Outlets inner />
      </Toaster>
    )
    await userEvent.click(screen.getByRole('button', { name: 'Raise' }))
    rerender(
      <Toaster>
        <Outlets inner={false} />
      </Toaster>
    )
    expect(within(screen.getByTestId('outer')).getByText('Manifest filed')).toBeInTheDocument()
  })

  it('moves a toast already showing into an outlet that opens after it', async () => {
    const { rerender } = render(
      <Toaster>
        <Outlets inner={false} />
      </Toaster>
    )
    await userEvent.click(screen.getByRole('button', { name: 'Raise' }))
    expect(within(screen.getByTestId('outer')).getByText('Manifest filed')).toBeInTheDocument()
    rerender(
      <Toaster>
        <Outlets inner />
      </Toaster>
    )
    expect(within(screen.getByTestId('inner')).getByText('Manifest filed')).toBeInTheDocument()
  })
})
