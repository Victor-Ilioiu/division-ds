import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode, type Ref } from 'react'
import { CircleAlert, CircleCheck } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { hasErrors, summarize, useFieldErrors } from '../../../lib/field-errors'
import { Button, Input } from '../../atoms'
import { ErrorSummary, FormField } from '../../molecules'

export type NewsletterFormProps = {
  /** Required: the form's accessible name, e.g. "Newsletter sign-up". The form draws no heading
   *  of its own (the section it sits in has one), so without this it would be an unnamed form. */
  label: string
  /** Runs once the address passes validation, with the address trimmed. Resolve to show the
   *  success state; reject (a network failure, a server error) to show the form-level alert with
   *  what was typed kept in place. The form owns the busy state while it is pending. */
  onSubmit: (email: string) => void | Promise<void>
  /** Required: what the person agrees to by subscribing, and how to stop. Shown above the button
   *  and read as the button's description. A sign-up with no consent line cannot be written. */
  consent: ReactNode
  /** The email field's label: what is drawn over it and its accessible name, one string. Say
   *  what the address is for wherever the page can hold another email field (a footer under a
   *  sign-in form): two fields both named "Email" are two indistinguishable entries in a screen
   *  reader's list of form fields. @default 'Email' */
  fieldLabel?: string
  /** @default 'Subscribe' */
  submitLabel?: string
  /** What a screen reader hears while `onSubmit` is pending. @default 'Subscribing' */
  busyLabel?: string
  /** @default 'You are subscribed' */
  successTitle?: string
  /** The line under the success title, given the address that was subscribed.
   *  @default email => `Updates go to ${email}.` */
  successBody?: (email: string) => ReactNode
  /** The level of the two headings the form can raise: the error summary's and the success
   *  message's. One below the heading of the section the form sits in. @default 3 */
  headingLevel?: 2 | 3 | 4
  className?: string
  /** The root, which stays mounted when the form is replaced by the success message. */
  ref?: Ref<HTMLDivElement>
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const FIELDS = ['email'] as const
type Field = (typeof FIELDS)[number]

/** The same two messages AuthForm gives for an address, so one mistake reads one way everywhere. */
function validate(_field: Field, value: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) return 'Enter your email address.'
  return EMAIL.test(trimmed) ? undefined : 'Enter an email address like name@example.com.'
}

const RING =
  'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]'

/**
 * An email field, a consent line and a submit button; then, once `onSubmit` resolves, a success
 * message in the form's place. Built from FormField, Input, Button and ErrorSummary, and it
 * validates the way every form here does.
 *
 * **Errors** appear on blur or submit, never on a keystroke (`useFieldErrors`). A failed submit
 * fills an ErrorSummary at the top and moves focus to it, so what went wrong is heard even when
 * focus was already in the field; its one entry focuses the field. The summary waits for a
 * submit attempt: mounting it on a blur would push the button down from under a pointer on its
 * way to click it.
 *
 * **Busy.** While `onSubmit` is pending the button is a loading Button: `aria-busy`,
 * `aria-disabled`, still focused, its click and the form's submit both prevented. A ref, not the
 * `pending` state, stops a second submit that lands before React has rendered the first.
 *
 * **Failure.** A rejected `onSubmit` is never dropped: it shows as a persistent, `sr-only`
 * `role="alert"` paired with a visible, `aria-hidden` duplicate, the shape AuthForm and
 * CheckoutForm use. The alert is cleared, and that clear rendered, before the next attempt runs,
 * so an identical failure is announced again. What was typed stays.
 *
 * **Success** replaces the form, so the button that held focus is gone. Focus moves to the
 * success heading, which is how it is announced. If focus had already left the form while the
 * request was out, focus is not taken back: the same words go to a status region instead, which
 * is mounted from the start so the change is heard.
 *
 * There is no network code here. `onSubmit` is the caller's.
 *
 * Paints its own opaque surface.base, like every form here. Contrast rows, by exact name: label,
 * success heading "text.primary on surface.base"; input text "toast title (text.primary) on
 * surface.sunken"; consent and success body "text.secondary on surface.base"; errors
 * "accent.hostile.text on surface.base"; required marker "accent.signal.text on surface.base";
 * success icon "accent.ok.text on surface.base"; rings "focus.ring on surface.base"; submit
 * "accent.signal.ink on accent.signal.fill"; the field "control border (over control fill) on
 * surface.base", "control border on control fill", "control border, invalid, on control fill",
 * "control border, invalid (over control fill), on surface.base".
 */
export function NewsletterForm({
  label,
  onSubmit,
  consent,
  fieldLabel = 'Email',
  submitLabel = 'Subscribe',
  busyLabel = 'Subscribing',
  successTitle = 'You are subscribed',
  successBody = email => `Updates go to ${email}.`,
  headingLevel = 3,
  className,
  ref,
}: NewsletterFormProps) {
  const uid = useId()
  const fieldId = `${uid}-email`
  const consentId = `${uid}-consent`
  const [value, setValue] = useState('')
  const [pending, setPending] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [attempt, setAttempt] = useState(0)
  /** The address that was subscribed, once it has been. */
  const [subscribed, setSubscribed] = useState<string | null>(null)
  /** Text for the status region: only for a success that arrived after focus had left the form. */
  const [announcement, setAnnouncement] = useState('')
  const errors = useFieldErrors<Field>(validate)
  const form = useRef<HTMLFormElement>(null)
  const summary = useRef<HTMLDivElement>(null)
  const successHeading = useRef<HTMLHeadingElement>(null)
  /** Set and read synchronously, so two submits in one task cannot both pass. */
  const inFlight = useRef(false)
  const takeFocus = useRef(false)
  const mounted = useRef(true)
  const Heading = `h${headingLevel}` as const

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    if (attempt > 0) summary.current?.focus()
  }, [attempt])

  useEffect(() => {
    if (subscribed !== null && takeFocus.current) successHeading.current?.focus()
  }, [subscribed])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (inFlight.current) return
    const found = errors.validateAll(FIELDS, () => value)
    if (hasErrors(found)) {
      setAttempt(count => count + 1)
      return
    }
    inFlight.current = true
    setSubmitError('')
    setPending(true)
    // Lets the cleared alert reach the DOM before `onSubmit` runs. Without it, a rejection that
    // fails the same way twice goes from one message straight back to the same message in one
    // commit: the text never changes, so there is nothing for a screen reader to notice.
    await Promise.resolve()
    const email = value.trim()
    try {
      await onSubmit(email)
      if (!mounted.current) return
      // Decided now, while the form is still in the DOM: once it is replaced, focus that was on
      // the button has already fallen to the body and looks the same as focus that left earlier.
      const active = document.activeElement
      takeFocus.current = active === null || active === document.body || Boolean(form.current?.contains(active))
      if (!takeFocus.current) setAnnouncement(successTitle)
      setSubscribed(email)
    } catch {
      if (mounted.current) setSubmitError('Something went wrong. Please try again.')
    } finally {
      inFlight.current = false
      if (mounted.current) setPending(false)
    }
  }

  return (
    <div
      ref={ref}
      className={cn(
        'crosshair w-full max-w-md border border-[var(--color-border-hairline)] bg-[var(--color-surface-base)] p-6',
        className
      )}
    >
      {/* Outside the form, so it survives the form being replaced: a live region has to exist
          before the change to its text does. */}
      <p role="status" className="sr-only">
        {announcement}
      </p>
      {subscribed === null ? (
        <form ref={form} noValidate aria-label={label} onSubmit={submit} className="flex flex-col gap-4">
          <ErrorSummary
            ref={summary}
            errors={attempt > 0 ? summarize(errors.errors, FIELDS, () => fieldId) : []}
            headingLevel={headingLevel}
          />
          <FormField label={fieldLabel} error={errors.errors.email} required>
            <Input
              id={fieldId}
              name="email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              value={value}
              onChange={event => {
                setValue(event.target.value)
                errors.change('email', event.target.value)
              }}
              onBlur={event => errors.blur('email', event.target.value, event.relatedTarget)}
            />
          </FormField>
          <p id={consentId} className="font-body text-xs text-[var(--color-text-secondary)]">
            {consent}
          </p>
          <div className="flex flex-col gap-2">
            <Button type="submit" fullWidth loading={pending} loadingLabel={busyLabel} aria-describedby={consentId}>
              {submitLabel}
            </Button>
            {/* Persistent and sr-only whatever it holds; the visible, aria-hidden paragraph under
                it is the sighted duplicate, mounted only with text so it never holds a gap open. */}
            <p role="alert" className="sr-only">
              {submitError || null}
            </p>
            {submitError ? (
              <p
                aria-hidden="true"
                className="flex items-center gap-1.5 font-body text-sm text-[var(--color-accent-hostile-text)]"
              >
                <CircleAlert aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                {submitError}
              </p>
            ) : null}
          </div>
        </form>
      ) : (
        <div className="flex items-start gap-3">
          {/* The icon is a second cue beside the words, never the only one. */}
          <CircleCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-accent-ok-text)]" />
          <div className="flex min-w-0 flex-col gap-1">
            <Heading
              ref={successHeading}
              tabIndex={-1}
              className={cn('font-display text-lg font-semibold text-[var(--color-text-primary)]', RING)}
            >
              {successTitle}
            </Heading>
            <p className="font-body text-sm text-[var(--color-text-secondary)] [overflow-wrap:anywhere]">
              {successBody(subscribed)}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
