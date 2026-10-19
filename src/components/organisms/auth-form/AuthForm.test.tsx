import { createRef, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../../../test/axe'
import { AuthForm, type AuthErrors, type AuthFormProps, type AuthMode } from './AuthForm'

/** A required FormField's label ends in an aria-hidden "*", so its text content is "Password*". */
const byLabel = (label: string) => screen.getByLabelText(new RegExp(`^${label}\\*?$`))

function Harness({
  onSubmit = async () => undefined,
  initialMode = 'sign-in',
}: {
  onSubmit?: AuthFormProps['onSubmit']
  initialMode?: AuthMode
}) {
  const [mode, setMode] = useState<AuthMode>(initialMode)
  return <AuthForm mode={mode} onModeChange={setMode} onSubmit={onSubmit} />
}

describe('AuthForm', () => {
  // Mutation: give reset-password the fields ['email', 'password']; its input count is 2, not 1.
  it('shows the fields each mode needs, under its heading, with its own submit button', () => {
    const cases: Array<[AuthMode, string, string[], string]> = [
      ['sign-in', 'Sign in', ['Email', 'Password'], 'Sign in'],
      ['create-account', 'Create an account', ['Name', 'Email', 'Password'], 'Create account'],
      ['reset-password', 'Reset your password', ['Email'], 'Send reset link'],
      ['verify-code', 'Enter your code', ['Code'], 'Verify'],
    ]
    for (const [mode, title, labels, submit] of cases) {
      const { container, unmount } = render(<AuthForm mode={mode} onSubmit={() => {}} />)
      expect(screen.getByRole('form', { name: title })).toBeInTheDocument()
      expect(container.querySelectorAll('input')).toHaveLength(labels.length)
      for (const label of labels) expect(byLabel(label)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: submit })).toHaveAttribute('type', 'submit')
      unmount()
    }
  })

  // Mutation: sign-in's email autocomplete 'email' instead of 'username'.
  it('carries the autocomplete token a password manager expects, in every mode', () => {
    const cases: Array<[AuthMode, Record<string, string>]> = [
      ['sign-in', { Email: 'username', Password: 'current-password' }],
      ['create-account', { Name: 'name', Email: 'email', Password: 'new-password' }],
      ['reset-password', { Email: 'email' }],
      ['verify-code', { Code: 'one-time-code' }],
    ]
    for (const [mode, tokens] of cases) {
      const { unmount } = render(<AuthForm mode={mode} onSubmit={() => {}} />)
      for (const [label, token] of Object.entries(tokens)) {
        expect(byLabel(label), `${mode} ${label}`).toHaveAttribute('autocomplete', token)
      }
      unmount()
    }
  })

  // Mutation: drop the `name` prop from a field. `name`, not just `autocomplete`, is what a
  // password manager keys a saved credential on when it writes one back.
  it('carries a name attribute a password manager can key on, in every mode', () => {
    const cases: Array<[AuthMode, Record<string, string>]> = [
      ['sign-in', { Email: 'username', Password: 'password' }],
      ['create-account', { Name: 'name', Email: 'email', Password: 'password' }],
      ['reset-password', { Email: 'email' }],
      ['verify-code', { Code: 'code' }],
    ]
    for (const [mode, names] of cases) {
      const { unmount } = render(<AuthForm mode={mode} onSubmit={() => {}} />)
      for (const [label, name] of Object.entries(names)) {
        expect(byLabel(label), `${mode} ${label}`).toHaveAttribute('name', name)
      }
      unmount()
    }
  })

  // Mutation: drop the attempt effect's focus call; the summary shows but focus stays on the button.
  it('lists what is wrong on a failed submit, moves focus there, and links each entry to its field', async () => {
    const onSubmit = vi.fn()
    render(<AuthForm mode="sign-in" onSubmit={onSubmit} />)
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    const summary = screen.getByRole('group', { name: 'There is a problem' })
    await waitFor(() => expect(summary).toHaveFocus())
    expect(onSubmit).not.toHaveBeenCalled()
    const links = within(summary).getAllByRole('link')
    expect(links.map(link => link.textContent)).toEqual(['Enter your email address.', 'Enter your password.'])
    await userEvent.click(links[1])
    expect(byLabel('Password')).toHaveFocus()
  })

  // Mutation: drop the `attempt > 0 &&` gate from the ErrorSummary `errors` prop (render the
  // summary on blur again); the group below then exists after this test's own blur, before any
  // submit attempt.
  it('does not show the error summary from a blur alone, only after a submit attempt', async () => {
    render(<AuthForm mode="sign-in" onSubmit={() => {}} />)
    const email = screen.getByRole('textbox', { name: 'Email' })
    await userEvent.click(email)
    await userEvent.tab()
    expect(email).toHaveAttribute('aria-invalid', 'true')
    expect(screen.queryByRole('group', { name: 'There is a problem' })).not.toBeInTheDocument()
  })

  // Mutation: call errors.blur instead of errors.change in `set`; the error appears mid-typing.
  it('shows a field error on blur, never on a keystroke', async () => {
    render(<AuthForm mode="sign-in" onSubmit={() => {}} />)
    const email = screen.getByRole('textbox', { name: 'Email' })
    await userEvent.type(email, 'ana')
    expect(email).not.toHaveAttribute('aria-invalid')
    await userEvent.tab()
    expect(email).toHaveAttribute('aria-invalid', 'true')
    expect(email).toHaveAccessibleDescription('Enter an email address like name@example.com.')
  })

  // Mutation: add onPaste={event => event.preventDefault()} to the password Input.
  it('never blocks paste', () => {
    render(<AuthForm mode="sign-in" onSubmit={() => {}} />)
    expect(fireEvent.paste(screen.getByRole('textbox', { name: 'Email' }))).toBe(true)
    expect(fireEvent.paste(byLabel('Password'))).toBe(true)
  })

  // Mutation: drop aria-pressed from the toggle.
  it('shows the password on request, with the toggle reporting its state', async () => {
    render(<AuthForm mode="sign-in" onSubmit={() => {}} />)
    const password = byLabel('Password')
    const toggle = screen.getByRole('button', { name: 'Show password' })
    expect(password).toHaveAttribute('type', 'password')
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(toggle)
    expect(password).toHaveAttribute('type', 'text')
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
  })

  // Mutation: drop `revealable: true` and put a Button back below the field; the toggle is then
  // not inside the input's wrapper.
  it('puts the reveal toggle inside the password field, and keeps focus on it when pressed', async () => {
    render(<AuthForm mode="sign-in" onSubmit={() => {}} />)
    const password = byLabel('Password')
    const toggle = screen.getByRole('button', { name: 'Show password' })
    expect(password.parentElement).toContainElement(toggle)
    expect(screen.getAllByRole('button', { name: 'Show password' })).toHaveLength(1)
    await userEvent.click(toggle)
    expect(toggle).toHaveFocus()
    expect(toggle).toHaveAccessibleName('Show password')
  })

  // Mutation: drop the `mode` key argument on the password field; a revealed password stays
  // revealed after switching modes.
  it('hides a revealed password again when the mode switches', async () => {
    render(<Harness />)
    await userEvent.type(byLabel('Password'), 'secret123')
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }))
    expect(byLabel('Password')).toHaveAttribute('type', 'text')
    await userEvent.click(screen.getByRole('button', { name: 'No account yet? Create one' }))
    expect(byLabel('Password')).toHaveAttribute('type', 'password')
    expect(byLabel('Password')).toHaveValue('secret123')
    expect(screen.getByRole('button', { name: 'Show password' })).toHaveAttribute('aria-pressed', 'false')
  })

  // Mutation: swap SWITCH back to a plain underlined button: no Link hover state, no pointer.
  it('styles every mode switch as a Link: pointer cursor, signal tone, hover and focus ring', () => {
    render(<AuthForm mode="sign-in" onModeChange={() => {}} onSubmit={() => {}} />)
    for (const name of ['Forgot your password?', 'No account yet? Create one']) {
      const link = screen.getByRole('button', { name })
      expect(link).toHaveClass('cursor-pointer', 'underline', 'hover:decoration-2')
      expect(link.className).toContain('text-[var(--color-accent-signal-text)]')
      expect(link.className).toContain('focus-visible:outline-[var(--color-focus-ring)]')
    }
  })

  // Mutation: drop Input's submit listener (Input.tsx). A password manager's save
  // prompt keys off `type="password"`; it must see that, not a still-revealed `type="text"`.
  it('hides the password again once a submit is underway', async () => {
    const onSubmit = vi.fn(async () => undefined)
    render(<AuthForm mode="sign-in" onSubmit={onSubmit} />)
    await userEvent.type(screen.getByRole('textbox', { name: 'Email' }), 'ana@example.com')
    await userEvent.type(byLabel('Password'), 'secret123')
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }))
    expect(byLabel('Password')).toHaveAttribute('type', 'text')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(byLabel('Password')).toHaveAttribute('type', 'password')
  })

  // Mutation: ignore onSubmit's resolved value; no summary appears.
  it('shows errors the caller returns, in the summary and at the field', async () => {
    const onSubmit = vi.fn(async () => ({ password: 'That email and password do not match.' }))
    render(<AuthForm mode="sign-in" onSubmit={onSubmit} />)
    await userEvent.type(screen.getByRole('textbox', { name: 'Email' }), 'ana@example.com')
    await userEvent.type(byLabel('Password'), 'wrong horse')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    const summary = await screen.findByRole('group', { name: 'There is a problem' })
    await waitFor(() => expect(summary).toHaveFocus())
    expect(byLabel('Password')).toHaveAccessibleDescription('That email and password do not match.')
    expect(onSubmit).toHaveBeenCalledWith(
      { name: '', email: 'ana@example.com', password: 'wrong horse', code: '' },
      'sign-in'
    )
  })

  // RULING: silently dropping an off-mode server error gave no feedback at all (SC 3.3.1, 4.1.3).
  // It is now moved onto email instead, joined with anything already shown there, so the summary
  // mounts and takes focus and the field has a real message.
  // Mutation: replace `remapOffMode(result, current.fields, mode)` with plain `result` in submit's
  // `errors.replace` call.
  it('shows a server error keyed to a field the current mode does not render, remapped onto email', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const onSubmit = vi.fn(async () => ({ name: 'Name already taken.' }) as AuthErrors)
      render(<AuthForm mode="sign-in" onSubmit={onSubmit} />)
      await userEvent.type(screen.getByRole('textbox', { name: 'Email' }), 'ana@example.com')
      await userEvent.type(byLabel('Password'), 'secret123')
      await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
      const summary = await screen.findByRole('group', { name: 'There is a problem' })
      await waitFor(() => expect(summary).toHaveFocus())
      expect(screen.getByRole('textbox', { name: 'Email' })).toHaveAccessibleDescription('Name already taken.')
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('"name"'))
    } finally {
      warn.mockRestore()
    }
  })

  // create-account's own fields[0] is "name", not "email" -- an off-mode error must still land on
  // email, the field a server is actually likely to key an error to, not on whichever field
  // happens to render first.
  // Mutation: replace `fields.includes('email') ? 'email' : fields[0]` with plain `fields[0]` in
  // remapOffMode.
  it('remaps an off-mode error onto email even when the mode\'s first field is not email', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const onSubmit = vi.fn(async () => ({ code: 'That code was already used.' }) as AuthErrors)
      render(<AuthForm mode="create-account" onSubmit={onSubmit} />)
      await userEvent.type(byLabel('Name'), 'Ana')
      await userEvent.type(screen.getByRole('textbox', { name: 'Email' }), 'ana@example.com')
      await userEvent.type(byLabel('Password'), 'secret1234')
      await userEvent.click(screen.getByRole('button', { name: 'Create account' }))
      await screen.findByRole('group', { name: 'There is a problem' })
      expect(screen.getByRole('textbox', { name: 'Email' })).toHaveAccessibleDescription('That code was already used.')
      expect(byLabel('Name')).not.toHaveAccessibleDescription('That code was already used.')
    } finally {
      warn.mockRestore()
    }
  })

  // Three separate mutations, each caught by a different assertion below:
  // - Button: restore `disabled: disabled || loading` -> caught by `not.toBeDisabled()`.
  // - Button: drop the WHILE_LOADING override -> caught by the `aria-disabled` assertion (it is
  //   the only thing that sets that attribute).
  // - Button: drop WHILE_LOADING's onClick (its preventDefault) together with AuthForm's own
  //   `if (pending) return` guard -> caught by `toHaveBeenCalledTimes(1)`.
  it('stays focusable and busy while the caller works, and does not submit twice', async () => {
    let finish: () => void = () => {}
    const onSubmit = vi.fn(() => new Promise<void>(resolve => (finish = resolve)))
    render(<AuthForm mode="reset-password" onSubmit={onSubmit} />)
    await userEvent.type(screen.getByRole('textbox', { name: 'Email' }), 'ana@example.com')
    const submit = screen.getByRole('button', { name: 'Send reset link' })
    await userEvent.click(submit)
    expect(submit).toHaveAttribute('aria-busy', 'true')
    expect(submit).not.toBeDisabled()
    expect(submit).toHaveAttribute('aria-disabled', 'true')
    await userEvent.click(submit)
    expect(onSubmit).toHaveBeenCalledTimes(1)
    await act(async () => finish())
    expect(submit).not.toHaveAttribute('aria-busy')
    expect(submit).toHaveFocus()
  })

  // Mutation: drop the `if (generation.current !== startGeneration) return` line; the reset
  // confirmation (or a server error) from the abandoned submit lands under sign-in instead of
  // being dropped. Second mutation: drop `setPending(false)` from the mode-switch block; the
  // sign-in button shows busy immediately after switching, before the reset promise even settles.
  it('drops a stale submit result once the mode has moved on, and clears its busy state immediately', async () => {
    let finish: (value?: AuthErrors) => void = () => {}
    const onSubmit = vi.fn(() => new Promise<AuthErrors | void>(resolve => (finish = resolve)))
    render(<Harness onSubmit={onSubmit} initialMode="reset-password" />)
    await userEvent.type(screen.getByRole('textbox', { name: 'Email' }), 'ana@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }))
    await userEvent.click(screen.getByRole('button', { name: 'Back to sign in' }))
    const signIn = screen.getByRole('button', { name: 'Sign in' })
    expect(signIn).not.toHaveAttribute('aria-busy')
    await act(async () => finish({ email: 'Too late.' }))
    expect(screen.getByRole('button', { name: 'Sign in' })).not.toHaveAttribute('aria-busy')
    expect(screen.queryByRole('group', { name: 'There is a problem' })).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  // The confirmation half of the test above: reset in flight, switch mode, resolve with success
  // (no errors) this time -- no confirmation should appear under the new mode either. Exercises
  // the `else if (mode === 'reset-password') setStatus(...)` branch specifically, which the
  // errors-half test above never reaches.
  it('drops a stale success too: no confirmation appears once the mode has moved on', async () => {
    let finish: (value?: AuthErrors) => void = () => {}
    const onSubmit = vi.fn(() => new Promise<AuthErrors | void>(resolve => (finish = resolve)))
    render(<Harness onSubmit={onSubmit} initialMode="reset-password" />)
    await userEvent.type(screen.getByRole('textbox', { name: 'Email' }), 'ana@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }))
    await userEvent.click(screen.getByRole('button', { name: 'Back to sign in' }))
    await act(async () => finish())
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
    expect(screen.queryByRole('group', { name: 'There is a problem' })).not.toBeInTheDocument()
  })

  // Mutation: drop the `catch` block in submit; the rejection is unhandled and no alert appears.
  it('shows a generic alert when onSubmit rejects, without dropping it silently', async () => {
    const onSubmit = vi.fn().mockRejectedValueOnce(new Error('network down'))
    render(<Harness onSubmit={onSubmit} />)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('')
    await userEvent.type(screen.getByRole('textbox', { name: 'Email' }), 'ana@example.com')
    await userEvent.type(byLabel('Password'), 'secret123')
    const signIn = screen.getByRole('button', { name: 'Sign in' })
    await userEvent.click(signIn)
    await waitFor(() => expect(signIn).not.toHaveAttribute('aria-busy'))
    expect(alert).toHaveTextContent('Something went wrong. Please try again.')
  })

  // A stale rejection -- one that arrives after the mode has since moved on -- must show nothing,
  // the same as a stale resolution above: it describes a form that is no longer showing.
  // Mutation: drop the `if (generation.current !== startGeneration) return` guard in the catch
  // block; the alert wrongly shows text for a mode the person already left.
  it('shows nothing for a rejection that arrives after the mode has already switched', async () => {
    let reject: (reason?: unknown) => void = () => {}
    const onSubmit = vi.fn(() => new Promise<void>((_, r) => (reject = r)))
    render(<Harness onSubmit={onSubmit} initialMode="reset-password" />)
    await userEvent.type(screen.getByRole('textbox', { name: 'Email' }), 'ana@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }))
    await userEvent.click(screen.getByRole('button', { name: 'Back to sign in' }))
    await act(async () => reject(new Error('too late')))
    expect(screen.getByRole('alert')).toHaveTextContent('')
  })

  // The `return` for a stale result sits inside the `try`, so `finally { setPending(false) }`
  // still runs for it, rather than clearing a NEWER submit's own `pending` too.
  // Mutation: revert `finally` to unconditional `setPending(false)`.
  it('keeps a newer submit busy when an older, abandoned one resolves afterward', async () => {
    let finishReset: (value?: AuthErrors) => void = () => {}
    let finishSignIn: (value?: AuthErrors) => void = () => {}
    let calls = 0
    const onSubmit = vi.fn(
      () =>
        new Promise<AuthErrors | void>(resolve => {
          calls += 1
          if (calls === 1) finishReset = resolve
          else finishSignIn = resolve
        })
    )
    render(<Harness onSubmit={onSubmit} initialMode="reset-password" />)
    await userEvent.type(screen.getByRole('textbox', { name: 'Email' }), 'ana@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }))
    await userEvent.click(screen.getByRole('button', { name: 'Back to sign in' }))
    // The email survives the switch (SC 3.3.7); only the password is new to this mode.
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveValue('ana@example.com')
    await userEvent.type(byLabel('Password'), 'secret123')
    const signIn = screen.getByRole('button', { name: 'Sign in' })
    await userEvent.click(signIn)
    expect(onSubmit).toHaveBeenCalledTimes(2)
    expect(signIn).toHaveAttribute('aria-busy', 'true')
    // The abandoned reset resolves. It must not touch the sign-in submit that is still working.
    await act(async () => finishReset())
    expect(signIn).toHaveAttribute('aria-busy', 'true')
    await userEvent.click(signIn)
    expect(onSubmit).toHaveBeenCalledTimes(2)
    await act(async () => finishSignIn())
  })

  // Mutation: drop the `if (pending) return` guard. Button's own WHILE_LOADING blocks a second
  // *click*, but requestSubmit() fires the form's submit event directly, bypassing the button
  // entirely -- this is the path the guard alone has to cover.
  it('ignores a second requestSubmit while the first is still pending', async () => {
    let finish: () => void = () => {}
    const onSubmit = vi.fn(() => new Promise<void>(resolve => (finish = resolve)))
    const ref = createRef<HTMLFormElement>()
    render(<AuthForm ref={ref} mode="reset-password" onSubmit={onSubmit} />)
    await userEvent.type(screen.getByRole('textbox', { name: 'Email' }), 'ana@example.com')
    act(() => {
      ref.current?.requestSubmit()
    })
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    act(() => {
      ref.current?.requestSubmit()
    })
    expect(onSubmit).toHaveBeenCalledTimes(1)
    await act(async () => finish())
  })

  // Mutation: revert the switch links' key from `link.to` back to index. Sign-in's first link (to
  // reset-password) and reset-password's only link (to sign-in) both sit at index 0, so an index
  // key makes React reuse the same DOM node across the switch with new text -- a stateful-identity
  // bug, not merely a style preference.
  it("does not reuse a switch link's node for an unrelated link in the new mode", async () => {
    render(<Harness />)
    const before = screen.getByRole('button', { name: 'Forgot your password?' })
    await userEvent.click(before)
    const after = screen.getByRole('button', { name: 'Back to sign in' })
    expect(after).not.toBe(before)
    expect(document.body.contains(before)).toBe(false)
  })

  // Mutation: revert to a plain boolean `focusHeading` flag. A switch the caller declines (its
  // onModeChange does nothing) leaves the flag armed; the next mode change -- even one caused by
  // something other than this form's own links -- then wrongly steals focus to whatever heading
  // is now showing.
  it('does not carry a declined switch request into a later, unrelated mode change', async () => {
    function DecliningHarness() {
      const [mode, setMode] = useState<AuthMode>('sign-in')
      return (
        <div>
          <button type="button" onClick={() => setMode('verify-code')}>
            External navigate
          </button>
          {/* Declines every switch the form itself asks for. */}
          <AuthForm mode={mode} onModeChange={() => {}} onSubmit={() => {}} />
        </div>
      )
    }
    render(<DecliningHarness />)
    await userEvent.click(screen.getByRole('button', { name: 'Forgot your password?' }))
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'External navigate' }))
    expect(screen.getByRole('heading', { name: 'Enter your code' })).not.toHaveFocus()
  })

  // Mutations: drop the heading focus in the mode layout effect (focus falls to <body>); reset the
  // values when the mode changes (the email is gone).
  it('keeps the email and moves focus to the new heading when switching modes', async () => {
    render(<Harness />)
    await userEvent.type(screen.getByRole('textbox', { name: 'Email' }), 'ana@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Forgot your password?' }))
    expect(screen.getByRole('heading', { name: 'Reset your password' })).toHaveFocus()
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveValue('ana@example.com')
  })

  // Mutation: render the status paragraph only when there is text; the first getByRole throws.
  it('confirms a reset in a status that was already on the page', async () => {
    render(<AuthForm mode="reset-password" onSubmit={async () => undefined} />)
    const status = screen.getByRole('status')
    expect(status).toBeEmptyDOMElement()
    await userEvent.type(screen.getByRole('textbox', { name: 'Email' }), 'ana@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }))
    await waitFor(() =>
      expect(status).toHaveTextContent('If an account exists for ana@example.com, a reset link is on its way.')
    )
    expect(screen.getByRole('status')).toBe(status)
  })

  // Mutation: drop the `if (field === 'email' && status) setStatus('')` line from `set`; the old
  // confirmation, naming the address before the edit, stays on screen.
  it('clears the reset confirmation once the email it named changes', async () => {
    render(<AuthForm mode="reset-password" onSubmit={async () => undefined} />)
    const email = screen.getByRole('textbox', { name: 'Email' })
    await userEvent.type(email, 'ana@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }))
    await screen.findByText('If an account exists for ana@example.com, a reset link is on its way.')
    await userEvent.type(email, 'x')
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  // Mutation: validate the code without stripping whitespace; the summary shows "The code is 6
  // digits." and onSubmit is never called.
  it('accepts a pasted code with a space in it', async () => {
    const onSubmit = vi.fn()
    render(<AuthForm mode="verify-code" onSubmit={onSubmit} />)
    await userEvent.click(screen.getByRole('textbox', { name: 'Code' }))
    await userEvent.paste('123 456')
    await userEvent.click(screen.getByRole('button', { name: 'Verify' }))
    expect(onSubmit).toHaveBeenCalledWith({ name: '', email: '', password: '', code: '123456' }, 'verify-code')
  })

  // Mutation: drop ref={ref} from the form.
  it('forwards a ref to the form', () => {
    const ref = createRef<HTMLFormElement>()
    render(<AuthForm ref={ref} mode="sign-in" onSubmit={() => {}} />)
    expect(ref.current).toBe(screen.getByRole('form', { name: 'Sign in' }))
  })

  it('is axe clean with errors showing', async () => {
    const { container } = render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    await screen.findByRole('group', { name: 'There is a problem' })
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
