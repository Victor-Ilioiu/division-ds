import { createRef, useRef, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../../../test/axe'
import { CommandPalette, filterCommands, groupCommands, type Command } from './CommandPalette'

/** Each command records its id and what had focus when it ran. */
function commands(log: string[] = []): Command[] {
  const run = (id: string) => () => {
    log.push(`${id}:${document.activeElement?.textContent ?? ''}`)
  }
  return [
    { id: 'orders', label: 'Go to orders', group: 'Navigate', keywords: ['sales'], onSelect: run('orders') },
    { id: 'shipments', label: 'Go to shipments', group: 'Navigate', onSelect: run('shipments') },
    { id: 'new-shipment', label: 'New shipment', group: 'Create', shortcut: 'N', onSelect: run('new-shipment') },
    { id: 'invite', label: 'Invite a teammate', group: 'Account', keywords: ['team', 'people'], onSelect: run('invite') },
  ]
}

const labels = (list: Command[]) => list.map(command => command.label)

function Page({ log, shortcut }: { log?: string[]; shortcut?: boolean }) {
  return (
    <>
      <button type="button">Elsewhere</button>
      <CommandPalette commands={commands(log)} shortcut={shortcut} />
    </>
  )
}

async function openWithShortcut() {
  screen.getByRole('button', { name: 'Elsewhere' }).focus()
  await userEvent.keyboard('{Control>}k{/Control}')
  return screen.findByRole('dialog', { name: 'Command palette' })
}

const field = () => screen.getByRole('combobox', { name: 'Search commands' })

describe('filterCommands', () => {
  it('returns every command, in order, for an empty query', () => {
    expect(labels(filterCommands(commands(), '  '))).toEqual(labels(commands()))
  })

  it('matches every term against label, group and keywords, ignoring case', () => {
    expect(labels(filterCommands(commands(), 'TEAM'))).toEqual(['Invite a teammate'])
    expect(labels(filterCommands(commands(), 'go ship'))).toEqual(['Go to shipments'])
    expect(labels(filterCommands(commands(), 'navigate'))).toEqual(['Go to orders', 'Go to shipments'])
  })

  it('ranks a label that starts with the first term first', () => {
    const list: Command[] = [
      { id: 'a', label: 'Go to shipments', onSelect: () => {} },
      { id: 'b', label: 'Shipment labels', onSelect: () => {} },
    ]
    expect(labels(filterCommands(list, 'ship'))).toEqual(['Shipment labels', 'Go to shipments'])
  })
})

describe('groupCommands', () => {
  it('groups by the order each group first appears', () => {
    const grouped = groupCommands(commands())
    expect(grouped.map(group => group.group)).toEqual(['Navigate', 'Create', 'Account'])
    expect(labels(grouped[0].commands)).toEqual(['Go to orders', 'Go to shipments'])
  })
})

describe('CommandPalette', () => {
  it('opens with Ctrl+K, named, with focus in the search field', async () => {
    render(<Page />)
    await openWithShortcut()
    await waitFor(() => expect(field()).toHaveFocus())
  })

  it('opens with Cmd+K too', async () => {
    render(<Page />)
    await userEvent.keyboard('{Meta>}k{/Meta}')
    expect(await screen.findByRole('dialog', { name: 'Command palette' })).toBeInTheDocument()
  })

  it('lists every command in named groups, the first one active', async () => {
    render(<Page />)
    await openWithShortcut()
    const listbox = screen.getByRole('listbox', { name: 'Commands' })
    expect(within(listbox).getByRole('group', { name: 'Navigate' })).toBeInTheDocument()
    const options = within(listbox).getAllByRole('option')
    const names = ['Go to orders', 'Go to shipments', 'New shipment', 'Invite a teammate']
    expect(options).toHaveLength(names.length)
    names.forEach((name, index) => expect(options[index]).toHaveAccessibleName(name))
    expect(options[0]).toHaveAttribute('aria-selected', 'true')
    expect(field()).toHaveAttribute('aria-activedescendant', options[0].id)
  })

  it('filters as you type and announces the count', async () => {
    render(<Page />)
    await openWithShortcut()
    await userEvent.type(field(), 'ship')
    expect(screen.getAllByRole('option').map(option => option.id)).toHaveLength(2)
    expect(screen.getByRole('option', { name: 'Go to shipments' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('2 commands')
  })

  it('moves the active option with the arrow keys, wrapping at both ends', async () => {
    render(<Page />)
    await openWithShortcut()
    await userEvent.keyboard('{ArrowUp}')
    expect(screen.getByRole('option', { name: 'Invite a teammate' })).toHaveAttribute('aria-selected', 'true')
    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getByRole('option', { name: 'Go to orders' })).toHaveAttribute('aria-selected', 'true')
  })

  it('jumps to the first option on Home', async () => {
    render(<Page />)
    await openWithShortcut()
    await userEvent.keyboard('{ArrowDown}')
    await userEvent.keyboard('{Home}')
    expect(screen.getByRole('option', { name: 'Go to orders' })).toHaveAttribute('aria-selected', 'true')
  })

  it('jumps to the last option on End', async () => {
    render(<Page />)
    await openWithShortcut()
    await userEvent.keyboard('{End}')
    expect(screen.getByRole('option', { name: 'Invite a teammate' })).toHaveAttribute('aria-selected', 'true')
  })

  it('ignores Enter while an IME composition is in progress', async () => {
    const log: string[] = []
    render(<Page log={log} />)
    await openWithShortcut()
    // The key that commits a CJK composition reaches the field as an ordinary Enter keydown.
    // `isComposing` is how modern browsers flag it; `keyCode === 229` is the legacy signal.
    fireEvent.keyDown(field(), { key: 'Enter', isComposing: true })
    fireEvent.keyDown(field(), { key: 'Enter', keyCode: 229 })
    expect(log).toEqual([])
    expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeInTheDocument()
  })

  it('runs the active command on Enter, after closing and handing focus back', async () => {
    const log: string[] = []
    render(<Page log={log} />)
    await openWithShortcut()
    await userEvent.type(field(), 'new')
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(log).toEqual(['new-shipment:Elsewhere'])
    expect(screen.getByRole('button', { name: 'Elsewhere' })).toHaveFocus()
  })

  it('runs a command on click, keeping focus in the field until it does', async () => {
    const log: string[] = []
    render(<Page log={log} />)
    await openWithShortcut()
    const option = screen.getByRole('option', { name: 'Invite a teammate' })
    // The option's own onMouseDown calls preventDefault so a click never blurs the field.
    // dispatchEvent returns false exactly when some handler along the way prevented the default
    // action -- a fail-able proxy for "focus stayed in the field" that doesn't depend on jsdom
    // modelling the browser's own default mousedown-moves-focus behaviour, which it doesn't.
    expect(fireEvent.mouseDown(option)).toBe(false)
    fireEvent.click(option)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(log).toEqual(['invite:Elsewhere'])
  })

  it('says so when nothing matches, and Enter then does nothing', async () => {
    const log: string[] = []
    render(<Page log={log} />)
    await openWithShortcut()
    await userEvent.type(field(), 'zzz')
    expect(screen.getByText('No matching commands')).toBeInTheDocument()
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(field()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('status')).toHaveTextContent('0 commands')
    await userEvent.keyboard('{Enter}')
    expect(log).toEqual([])
    expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeInTheDocument()
  })

  it('starts empty each time it opens', async () => {
    render(<Page />)
    await openWithShortcut()
    await userEvent.type(field(), 'ord')
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await openWithShortcut()
    expect(field()).toHaveValue('')
  })

  it('leaves Ctrl+K alone when shortcut is false', async () => {
    render(<Page shortcut={false} />)
    screen.getByRole('button', { name: 'Elsewhere' }).focus()
    await userEvent.keyboard('{Control>}k{/Control}')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('leaves a field alone that already claimed Ctrl+K for itself', async () => {
    function FieldClaimsCtrlK() {
      return (
        <input
          aria-label="Claims ctrl k"
          onKeyDown={event => {
            if (event.key.toLowerCase() === 'k' && (event.ctrlKey || event.metaKey)) event.preventDefault()
          }}
        />
      )
    }
    render(
      <>
        <FieldClaimsCtrlK />
        <CommandPalette commands={commands()} />
      </>
    )
    screen.getByRole('textbox', { name: 'Claims ctrl k' }).focus()
    await userEvent.keyboard('{Control>}k{/Control}')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('ignores a repeated Ctrl+K from a key held down', async () => {
    render(<Page />)
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true, repeat: true })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('reports nothing on a keydown with no key, the way Chrome autofill dispatches one', async () => {
    render(<Page />)
    // jsdom, like a real browser, never lets a listener's thrown exception reach the
    // dispatchEvent() caller -- it's caught internally and reported through a window 'error'
    // event instead, so `expect(() => ...).not.toThrow()` would pass here whether or not the
    // guard this is testing actually exists. Spying on 'error' is what makes this fail-able.
    const onError = vi.fn()
    window.addEventListener('error', onError)
    // A plain Event, not a KeyboardEvent -- `key` is undefined on it, not an empty string, which
    // is what a real autofill-triggered keydown looks like.
    const event = new Event('keydown', { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'ctrlKey', { value: true })
    window.dispatchEvent(event)
    window.removeEventListener('error', onError)
    expect(onError).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('can be opened and closed by its caller, returning focus to the opener', async () => {
    function Controlled() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Open command palette
          </button>
          <CommandPalette commands={commands()} open={open} onOpenChange={setOpen} shortcut={false} />
        </>
      )
    }
    render(<Controlled />)
    const opener = screen.getByRole('button', { name: 'Open command palette' })
    await userEvent.click(opener)
    await screen.findByRole('dialog', { name: 'Command palette' })
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(opener).toHaveFocus()
  })

  describe('a declined close leaves the selection armed until the user moves on', () => {
    /** Declines the very first close request a selection asks for using nothing but a ref -- no
     *  `setState` at all, so the decline itself never forces a re-render. (A real state change on
     *  decline, as an earlier version of this suite used, quietly re-renders the palette on every
     *  decline and hides exactly the case these tests exist to catch.) Accepts every close after
     *  the first. */
    function useDeclineFirstOnly() {
      const declined = useRef(false)
      return (next: boolean, accept: (next: boolean) => void) => {
        if (!next && !declined.current) {
          declined.current = true
          return
        }
        accept(next)
      }
    }

    it('does not run the command after Ctrl+K, when the decline used no state change at all', async () => {
      const log: string[] = []
      function NoRenderDecline() {
        const [open, setOpen] = useState(true)
        const decline = useDeclineFirstOnly()
        return <CommandPalette commands={commands(log)} open={open} onOpenChange={next => decline(next, setOpen)} />
      }
      render(<NoRenderDecline />)
      await screen.findByRole('dialog', { name: 'Command palette' })
      await userEvent.click(screen.getByRole('option', { name: 'Invite a teammate' }))
      // Nothing re-rendered on the decline: the dialog is simply still here, unchanged.
      expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeInTheDocument()
      expect(log).toEqual([])
      // Fired at document.body, not through userEvent.keyboard (which would target the field,
      // still focused from the selection, and go through its own onKeyDown clearing instead --
      // this is specifically the global window listener's own clearing under test).
      fireEvent.keyDown(document.body, { key: 'k', ctrlKey: true })
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
      expect(log).toEqual([])
    })

    it('does not run the command once typing moves the user on and the parent closes it later', async () => {
      const log: string[] = []
      function NoRenderDecline() {
        const [open, setOpen] = useState(true)
        const decline = useDeclineFirstOnly()
        return (
          <>
            <button type="button" onClick={() => setOpen(false)}>
              Close it myself
            </button>
            <CommandPalette commands={commands(log)} open={open} onOpenChange={next => decline(next, setOpen)} />
          </>
        )
      }
      render(<NoRenderDecline />)
      await screen.findByRole('dialog', { name: 'Command palette' })
      await userEvent.click(screen.getByRole('option', { name: 'Invite a teammate' }))
      expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeInTheDocument()
      expect(log).toEqual([])
      await userEvent.type(field(), 'x')
      // Bypasses onOpenChange's decline entirely -- the parent flips its own `open` state
      // directly. `hidden: true` because the button sits outside the open dialog, which Radix
      // correctly marks aria-hidden AND inert (pointer-events: none) along with the rest of the
      // page while it's open; `fireEvent` rather than `userEvent`, since a real pointer genuinely
      // could not reach it there, but the parent's own code calling its `onClick` still can.
      fireEvent.click(screen.getByRole('button', { name: 'Close it myself', hidden: true }))
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
      expect(log).toEqual([])
    })

    it('does not run the command after Escape, when the decline used no state change at all', async () => {
      const log: string[] = []
      function NoRenderDecline() {
        const [open, setOpen] = useState(true)
        const decline = useDeclineFirstOnly()
        return <CommandPalette commands={commands(log)} open={open} onOpenChange={next => decline(next, setOpen)} />
      }
      render(<NoRenderDecline />)
      await screen.findByRole('dialog', { name: 'Command palette' })
      await userEvent.click(screen.getByRole('option', { name: 'Invite a teammate' }))
      expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeInTheDocument()
      expect(log).toEqual([])
      await userEvent.keyboard('{Escape}')
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
      expect(log).toEqual([])
    })

    it('runs the command exactly once when an asynchronous accept follows an intervening render', async () => {
      const log: string[] = []
      // A plain mutable box, not a React ref (this lives in the test body, never inside a
      // component): the previous version of this test raced a genuine 20ms setTimeout against the
      // assertions below, which flaked under load (the run queue falling behind by more than
      // 20ms). The scene this proves -- an intervening render followed later by the actual close
      // -- needs the close to happen WHENEVER the test says so, not at some fixed delay nothing
      // here controls.
      const closeLater = { current: () => {} }
      function AsyncAccept() {
        const [open, setOpen] = useState(true)
        const [busy, setBusy] = useState(false)
        return (
          <>
            {busy ? <p>Busy…</p> : null}
            <CommandPalette
              commands={commands(log)}
              open={open}
              onOpenChange={next => {
                if (!next) {
                  // An intervening render -- no different from any other app state change, and
                  // not a decline either: this consumer always meant to accept, just not
                  // synchronously.
                  setBusy(true)
                  closeLater.current = () => setOpen(false)
                  return
                }
                setOpen(next)
              }}
            />
          </>
        )
      }
      render(<AsyncAccept />)
      await screen.findByRole('dialog', { name: 'Command palette' })
      await userEvent.click(screen.getByRole('option', { name: 'Invite a teammate' }))
      expect(await screen.findByText('Busy…')).toBeInTheDocument()
      expect(log).toEqual([])
      // The "asynchronous" half of the scene: fired only now, deliberately, inside `act` so React
      // flushes the resulting close before the next line reads anything.
      act(() => closeLater.current())
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
      // This scene opens with no opener button to return focus to, so only the run count and the
      // command's own id matter here, not what happened to have focus afterwards.
      expect(log).toHaveLength(1)
      expect(log[0]).toMatch(/^invite:/)
    })

    it('still runs the selected command exactly once on an ordinary accepted close', async () => {
      // A spy command, so the run count is asserted directly rather than inferred from a log's
      // shape -- a regression guard against the armed-selection mechanism above also swallowing a
      // command that an ordinary, immediately-accepted close was always going to run anyway.
      const onSelect = vi.fn()
      render(<CommandPalette commands={[{ id: 'invite', label: 'Invite a teammate', onSelect }]} defaultOpen />)
      await userEvent.click(await screen.findByRole('option', { name: 'Invite a teammate' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
      expect(onSelect).toHaveBeenCalledTimes(1)
    })
  })

  it('forwards a ref to the search field', async () => {
    const ref = createRef<HTMLInputElement>()
    render(<CommandPalette ref={ref} commands={commands()} defaultOpen shortcut={false} />)
    expect(ref.current).toBe(await screen.findByRole('combobox'))
  })

  it('is axe clean while open', async () => {
    render(<Page />)
    await openWithShortcut()
    expect(await axeClean(document.body)).toHaveNoViolations()
  })
})
