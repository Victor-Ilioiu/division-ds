import { createRef, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../../../test/axe'
import { NewsletterForm, type NewsletterFormProps } from './NewsletterForm'

const CONSENT = 'One email a month. Unsubscribe from any of them.'

function renderForm(props: Partial<NewsletterFormProps> = {}) {
  return render(<NewsletterForm label="Newsletter sign-up" consent={CONSENT} onSubmit={() => {}} {...props} />)
}

/** A required FormField's label ends in an aria-hidden "*", so its text content is "Email*". */
const email = () => screen.getByLabelText(/^Email\*?$/)
const subscribe = () => screen.getByRole('button', { name: /Subscribe/ })

/** A promise a test settles by hand, so the pending state can be looked at. */
function deferred() {
  let resolve!: () => void
  let reject!: (reason: Error) => void
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('NewsletterForm', () => {
  it('is a named form with one email field, the consent line and a submit button', () => {
    const { container } = renderForm()
    expect(screen.getByRole('form', { name: 'Newsletter sign-up' })).toBeInTheDocument()
    expect(container.querySelectorAll('input')).toHaveLength(1)
    expect(email()).toHaveAttribute('type', 'email')
    expect(email()).toBeRequired()
    expect(screen.getByText(CONSENT)).toBeInTheDocument()
    expect(subscribe()).toHaveAttribute('type', 'submit')
  })

  // Only the type-check matters, so the test is skipped: both have to fail `tsc -b`.
  it.skip('requires a label and a consent line at compile time', () => {
    // @ts-expect-error label is required: the form draws no heading to be named by
    render(<NewsletterForm consent={CONSENT} onSubmit={() => {}} />)
    // @ts-expect-error consent is required: a sign-up says what it signs you up to
    render(<NewsletterForm label="Newsletter sign-up" onSubmit={() => {}} />)
  })

  it('carries the autocomplete token and the name a browser fills an address into', () => {
    renderForm()
    expect(email()).toHaveAttribute('autocomplete', 'email')
    expect(email()).toHaveAttribute('name', 'email')
  })

  // Mutation: drop aria-describedby from the Button -> the description is empty.
  it('reads the consent line as the description of the submit button', () => {
    renderForm()
    expect(subscribe()).toHaveAccessibleDescription(CONSENT)
  })

  describe('validation', () => {
    // Mutation: call errors.blur from onChange -> the message appears after the first character.
    it('raises nothing on a keystroke, and says what is wrong on blur', async () => {
      renderForm()
      await userEvent.type(email(), 'not-an-address')
      expect(screen.queryByText('Enter an email address like name@example.com.')).not.toBeInTheDocument()
      await userEvent.tab()
      expect(screen.getByText('Enter an email address like name@example.com.')).toBeInTheDocument()
      expect(email()).toBeInvalid()
      // A blur alone does not mount the summary: it would move the button under a click.
      expect(screen.queryByRole('group', { name: 'There is a problem' })).not.toBeInTheDocument()
    })

    // Mutation: drop the attempt effect's focus call -> the summary shows, focus stays put.
    it('on an empty submit, lists the problem, moves focus to the summary and does not submit', async () => {
      const onSubmit = vi.fn()
      renderForm({ onSubmit })
      await userEvent.click(subscribe())
      const summary = screen.getByRole('group', { name: 'There is a problem' })
      expect(summary).toHaveFocus()
      expect(within(summary).getByRole('link', { name: 'Enter your email address.' })).toBeInTheDocument()
      expect(email()).toBeInvalid()
      expect(email()).toHaveAccessibleDescription('Enter your email address.')
      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('focuses the field from the summary entry, and clears the error once the address is fine', async () => {
      renderForm()
      await userEvent.click(subscribe())
      await userEvent.click(screen.getByRole('link', { name: 'Enter your email address.' }))
      expect(email()).toHaveFocus()
      await userEvent.type(email(), 'ana@hexline.test')
      expect(screen.queryByText('Enter your email address.')).not.toBeInTheDocument()
      expect(email()).toBeValid()
    })

    it('raises the error summary heading at the level it is given', async () => {
      renderForm({ headingLevel: 4 })
      await userEvent.click(subscribe())
      expect(screen.getByRole('heading', { level: 4, name: 'There is a problem' })).toBeInTheDocument()
    })
  })

  describe('while onSubmit is pending', () => {
    it('hands onSubmit the trimmed address and marks the button busy, still focused', async () => {
      const request = deferred()
      const onSubmit = vi.fn(() => request.promise)
      renderForm({ onSubmit })
      await userEvent.type(email(), '  ana@hexline.test ')
      await userEvent.click(subscribe())
      await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('ana@hexline.test'))
      const button = screen.getByRole('button', { name: /Subscribe/ })
      expect(button).toHaveAttribute('aria-busy', 'true')
      // aria-disabled, never `disabled`: the button keeps focus while it works.
      expect(button).toHaveAttribute('aria-disabled', 'true')
      expect(button).not.toBeDisabled()
      expect(button).toHaveFocus()
      expect(within(button).getByText('Subscribing')).toBeInTheDocument()
      await act(async () => request.resolve())
    })

    // Two submits inside one task, before React has rendered `pending`: the shape a real double
    // click can take. Mutation: remove the `inFlight` check -> onSubmit runs twice.
    it('submits once when two submits land in the same task', async () => {
      const request = deferred()
      const onSubmit = vi.fn(() => request.promise)
      renderForm({ onSubmit })
      await userEvent.type(email(), 'ana@hexline.test')
      const form = screen.getByRole('form', { name: 'Newsletter sign-up' })
      await act(async () => {
        fireEvent.submit(form)
        fireEvent.submit(form)
      })
      expect(onSubmit).toHaveBeenCalledTimes(1)
      await act(async () => request.resolve())
    })
  })

  describe('when onSubmit rejects', () => {
    it('shows the alert, keeps what was typed, and lets go of the busy state', async () => {
      renderForm({ onSubmit: () => Promise.reject(new Error('offline')) })
      await userEvent.type(email(), 'ana@hexline.test')
      await userEvent.click(subscribe())
      const alert = await screen.findByRole('alert')
      await waitFor(() => expect(alert).toHaveTextContent('Something went wrong. Please try again.'))
      expect(alert).toHaveClass('sr-only')
      // The sighted copy is a duplicate, hidden from assistive tech so it is not read twice.
      const visible = screen
        .getAllByText('Something went wrong. Please try again.')
        .find(node => node.getAttribute('aria-hidden') === 'true')
      expect(visible).toBeDefined()
      expect(email()).toHaveValue('ana@hexline.test')
      expect(subscribe()).not.toHaveAttribute('aria-busy')
      expect(screen.getByRole('form', { name: 'Newsletter sign-up' })).toBeInTheDocument()
    })

    // Mutation: remove `setSubmitError('')` before the retry -> the alert never empties between
    // two identical failures, so the second one is not announced.
    it('clears the alert before a retry, so the same failure is announced a second time', async () => {
      const first = deferred()
      const second = deferred()
      const onSubmit = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
      renderForm({ onSubmit })
      await userEvent.type(email(), 'ana@hexline.test')
      await userEvent.click(subscribe())
      await act(async () => first.reject(new Error('offline')))
      const alert = screen.getByRole('alert')
      expect(alert).toHaveTextContent('Something went wrong. Please try again.')
      await userEvent.click(subscribe())
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2))
      expect(alert).toBeEmptyDOMElement()
      await act(async () => second.reject(new Error('offline')))
      expect(alert).toHaveTextContent('Something went wrong. Please try again.')
    })

    it('succeeds on a retry that resolves', async () => {
      const onSubmit = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(undefined)
      renderForm({ onSubmit })
      await userEvent.type(email(), 'ana@hexline.test')
      await userEvent.click(subscribe())
      await waitFor(() => expect(screen.getByRole('alert')).not.toBeEmptyDOMElement())
      await userEvent.click(subscribe())
      expect(await screen.findByRole('heading', { name: 'You are subscribed' })).toBeInTheDocument()
    })
  })

  describe('when onSubmit resolves', () => {
    // Mutation: drop the success effect's focus call -> focus is on the body, since the button
    // that held it is gone.
    it('replaces the form with the success message and moves focus to its heading', async () => {
      renderForm()
      await userEvent.type(email(), 'ana@hexline.test')
      await userEvent.click(subscribe())
      const heading = await screen.findByRole('heading', { level: 3, name: 'You are subscribed' })
      await waitFor(() => expect(heading).toHaveFocus())
      expect(screen.getByText('Updates go to ana@hexline.test.')).toBeInTheDocument()
      expect(screen.queryByRole('form')).not.toBeInTheDocument()
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
      // Focus did the announcing; the status region stays silent so it is not said twice.
      expect(screen.getByRole('status')).toBeEmptyDOMElement()
    })

    // Mutation: always focus the success heading -> focus is pulled off the other field.
    it('leaves focus alone when it has moved elsewhere, and announces through the status region', async () => {
      const request = deferred()
      render(
        <>
          <NewsletterForm label="Newsletter sign-up" consent={CONSENT} onSubmit={() => request.promise} />
          <button type="button">Elsewhere</button>
        </>
      )
      // The status region exists before there is anything to say.
      const status = screen.getByRole('status')
      expect(status).toBeEmptyDOMElement()
      await userEvent.type(email(), 'ana@hexline.test')
      await userEvent.click(subscribe())
      const elsewhere = screen.getByRole('button', { name: 'Elsewhere' })
      elsewhere.focus()
      await act(async () => request.resolve())
      expect(await screen.findByRole('heading', { name: 'You are subscribed' })).toBeInTheDocument()
      expect(elsewhere).toHaveFocus()
      expect(status).toHaveTextContent('You are subscribed')
    })

    it('uses the title, body and heading level it is given', async () => {
      renderForm({
        successTitle: 'On the list',
        successBody: address => `Field notes go to ${address}.`,
        headingLevel: 2,
      })
      await userEvent.type(email(), 'ana@hexline.test')
      await userEvent.click(subscribe())
      expect(await screen.findByRole('heading', { level: 2, name: 'On the list' })).toBeInTheDocument()
      expect(screen.getByText('Field notes go to ana@hexline.test.')).toBeInTheDocument()
    })

    it('sets no state after it has been unmounted', async () => {
      const request = deferred()
      function Harness() {
        const [shown, setShown] = useState(true)
        return (
          <>
            <button type="button" onClick={() => setShown(false)}>
              Leave
            </button>
            {shown ? <NewsletterForm label="Newsletter sign-up" consent={CONSENT} onSubmit={() => request.promise} /> : null}
          </>
        )
      }
      const error = vi.spyOn(console, 'error').mockImplementation(() => {})
      render(<Harness />)
      await userEvent.type(email(), 'ana@hexline.test')
      await userEvent.click(subscribe())
      await userEvent.click(screen.getByRole('button', { name: 'Leave' }))
      await act(async () => request.resolve())
      expect(screen.queryByRole('heading', { name: 'You are subscribed' })).not.toBeInTheDocument()
      expect(error).not.toHaveBeenCalled()
      error.mockRestore()
    })
  })

  // One string is the visible label and the accessible name, and the error summary's entry
  // still lands on the field. Mutation: put `label="Email"` back on the FormField -> no textbox
  // has the given name.
  it('names the field with fieldLabel, visibly and for assistive technology', async () => {
    renderForm({ fieldLabel: 'Email for field notes' })
    const field = screen.getByRole('textbox', { name: 'Email for field notes' })
    expect(screen.queryByRole('textbox', { name: 'Email' })).toBeNull()
    expect(screen.getByText('Email for field notes').tagName).toBe('LABEL')
    await userEvent.click(screen.getByRole('button', { name: 'Subscribe' }))
    await userEvent.click(await screen.findByRole('link', { name: 'Enter your email address.' }))
    expect(field).toHaveFocus()
  })

  it('uses the labels it is given for the button and its busy state', async () => {
    const request = deferred()
    renderForm({ submitLabel: 'Sign me up', busyLabel: 'Signing you up', onSubmit: () => request.promise })
    await userEvent.type(email(), 'ana@hexline.test')
    const button = screen.getByRole('button', { name: 'Sign me up' })
    await userEvent.click(button)
    await waitFor(() => expect(button).toHaveAttribute('aria-busy', 'true'))
    expect(within(button).getByText('Signing you up')).toBeInTheDocument()
    await act(async () => request.resolve())
  })

  it('paints its own opaque surface, forwards a ref to the root and merges a className', async () => {
    const ref = createRef<HTMLDivElement>()
    renderForm({ ref, className: 'mt-8' })
    expect(ref.current).toHaveClass('mt-8')
    expect(ref.current!.className).toContain('--color-surface-base')
    // The root outlives the form.
    await userEvent.type(email(), 'ana@hexline.test')
    await userEvent.click(subscribe())
    const heading = await screen.findByRole('heading', { name: 'You are subscribed' })
    expect(ref.current).toContainElement(heading)
  })

  it('is axe clean at rest, with the error summary showing, and after success', async () => {
    const { container } = render(
      <main>
        <h1>Hexline</h1>
        <h2>Field notes by email</h2>
        <NewsletterForm label="Newsletter sign-up" consent={CONSENT} onSubmit={() => {}} />
      </main>
    )
    expect(await axeClean(container)).toHaveNoViolations()
    await userEvent.click(subscribe())
    expect(screen.getByRole('group', { name: 'There is a problem' })).toBeInTheDocument()
    expect(await axeClean(container)).toHaveNoViolations()
    await userEvent.type(email(), 'ana@hexline.test')
    await userEvent.click(subscribe())
    expect(await screen.findByRole('heading', { name: 'You are subscribed' })).toBeInTheDocument()
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
