import {
  Fragment,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactElement,
  type Ref,
} from 'react'
import { CircleAlert } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { hasErrors, summarize, useFieldErrors, type FieldErrors } from '../../../lib/field-errors'
import { Button, Input, linkVariants, type InputProps } from '../../atoms'
import { ErrorSummary, FormField } from '../../molecules'

export type AuthMode = 'sign-in' | 'create-account' | 'reset-password' | 'verify-code'
export type AuthField = 'name' | 'email' | 'password' | 'code'
export type AuthValues = Record<AuthField, string>
export type AuthErrors = FieldErrors<AuthField>

export type AuthFormProps = {
  mode: AuthMode
  /** Runs once every field passes. Resolve with nothing on success, or with errors keyed by field
   *  (a wrong password, an address already registered) to show them in the summary and at the
   *  field. Prefer keying to a field the current mode renders (current.fields); one keyed to a
   *  field this mode doesn't show (e.g. `name` while signing in) is never dropped silently
   *  (SC 3.3.1, 4.1.3) -- it is moved onto email instead, in every mode that renders it (code, in
   *  verify-code, the one mode that doesn't), joined with anything already shown there, so it
   *  still reaches the summary and takes focus. A dev-only console.warn names the field that had
   *  nowhere to go.
   *  A rejection is never dropped silently either: the form catches it and shows a generic
   *  form-level alert. Prefer resolving with field-keyed errors when the failure can be
   *  attributed to a field -- the alert has no field to link to or focus. */
  onSubmit: (values: AuthValues, mode: AuthMode) => void | AuthErrors | Promise<void | AuthErrors>
  /** When given, the form offers the other modes ("Forgot your password?") and calls this. */
  onModeChange?: (mode: AuthMode) => void
  /** @default 2 */
  headingLevel?: 2 | 3 | 4
  className?: string
  ref?: Ref<HTMLFormElement>
}

const MODES: Record<AuthMode, { title: string; submit: string; busy: string; fields: readonly AuthField[] }> = {
  'sign-in': { title: 'Sign in', submit: 'Sign in', busy: 'Signing in', fields: ['email', 'password'] },
  'create-account': {
    title: 'Create an account',
    submit: 'Create account',
    busy: 'Creating your account',
    fields: ['name', 'email', 'password'],
  },
  'reset-password': { title: 'Reset your password', submit: 'Send reset link', busy: 'Sending the link', fields: ['email'] },
  'verify-code': { title: 'Enter your code', submit: 'Verify', busy: 'Checking the code', fields: ['code'] },
}

const SWITCHES: Record<AuthMode, Array<{ to: AuthMode; label: string }>> = {
  'sign-in': [
    { to: 'reset-password', label: 'Forgot your password?' },
    { to: 'create-account', label: 'No account yet? Create one' },
  ],
  'create-account': [{ to: 'sign-in', label: 'Already have an account? Sign in' }],
  'reset-password': [{ to: 'sign-in', label: 'Back to sign in' }],
  'verify-code': [{ to: 'sign-in', label: 'Back to sign in' }],
}

const MIN_PASSWORD_LENGTH = 8
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CODE = /^\d{6}$/
/** Authenticator apps often show a code as "123 456"; a pasted space is not an error. */
const digitsOf = (code: string) => code.replace(/\s/g, '')

function validatorFor(mode: AuthMode) {
  return (field: AuthField, value: string): string | undefined => {
    const trimmed = value.trim()
    if (field === 'name') return trimmed ? undefined : 'Enter your name.'
    if (field === 'email') {
      if (!trimmed) return 'Enter your email address.'
      return EMAIL.test(trimmed) ? undefined : 'Enter an email address like name@example.com.'
    }
    if (field === 'password') {
      // Never trimmed: a space is a legitimate password character.
      if (!value) return 'Enter your password.'
      return mode === 'create-account' && value.length < MIN_PASSWORD_LENGTH
        ? `Use at least ${MIN_PASSWORD_LENGTH} characters.`
        : undefined
    }
    if (!trimmed) return 'Enter the 6-digit code.'
    return CODE.test(digitsOf(value)) ? undefined : 'The code is 6 digits.'
  }
}

/**
 * An `onSubmit` error keyed to a field the current mode doesn't render would otherwise vanish
 * entirely -- no field to attach it to, no summary entry to link to -- and silent failure
 * feedback fails SC 3.3.1 and 4.1.3. Moved onto email instead, in every mode that renders it
 * (code, in verify-code, the one mode that doesn't), joined with any message already there. Warns,
 * dev builds only, naming the field that had nowhere to go: a signal for whoever wired `onSubmit`,
 * never something a person using the form sees.
 */
function remapOffMode(result: AuthErrors, fields: readonly AuthField[], mode: AuthMode): AuthErrors {
  // Email in every mode that renders it (create-account's own fields[0] is name, not email); the
  // code field otherwise (verify-code is the only mode with neither).
  const target = fields.includes('email') ? 'email' : fields[0]
  const remapped: AuthErrors = {}
  for (const key of Object.keys(result) as AuthField[]) {
    const message = result[key]
    if (message === undefined) continue
    const inMode = fields.includes(key)
    const field = inMode ? key : target
    if (!inMode && import.meta.env.DEV) {
      console.warn(
        `AuthForm: onSubmit resolved an error for "${key}", which the "${mode}" mode doesn't render. Showing it on "${target}" instead.`
      )
    }
    remapped[field] = remapped[field] ? `${remapped[field]} ${message}` : message
  }
  return remapped
}

/** The mode switches change state in place, so they stay buttons (a button is the right element
 *  for an action that navigates nowhere), but they must read and behave as links: Link's own
 *  `linkVariants` supplies colour, underline, hover and focus ring, so they can never drift from
 *  it. A button needs the pointer cursor and left alignment an anchor gets for free, and min-h-6
 *  keeps the 24px target (SC 2.5.8). */
const SWITCH = cn(linkVariants(), 'inline-flex items-center min-h-6 font-body text-sm text-left cursor-pointer')

/**
 * Sign in, create an account, reset a password or enter a two-step code: four modes of one form.
 * The caller owns the mode (a route, usually); the form owns its fields, their errors and focus.
 *
 * Errors appear on blur or submit, never on a keystroke (useFieldErrors). A failed submit lists
 * them in an ErrorSummary at the top and moves focus there; each entry focuses its field. Every
 * field carries the autocomplete token, and a `name`, a password manager looks for; nothing
 * blocks paste, and nothing tests memory or transcription (SC 3.3.8). A mode switch keeps what
 * was typed (SC 3.3.7) and moves focus to the new heading, since the control that switched it is
 * gone; it also clears a submit still in flight (its own busy state ends, and its result, if any
 * arrives later, is dropped rather than landing under the new mode) and any showing confirmation.
 * Editing the reset email clears that confirmation too, since it named the address before the
 * edit. The password field uses Input's `revealable` (an icon button inside the field, one per
 * password field; there is no confirm field). It resets to hidden on the next mode switch (the
 * input is keyed by mode) and on submit (Input hides it), so a password manager's own save prompt
 * always sees `type="password"`. A rejected submit is
 * never dropped silently either (SC 3.3.1, 4.1.3): it shows as a persistent, `sr-only` form-level
 * alert paired with a visible, `aria-hidden` duplicate -- the same shape as CheckoutForm's own
 * order-placement alert -- cleared on the next submit and on a mode switch, and never shown for a
 * stale rejection (one that resolves after the mode has since moved on).
 *
 * Paints its own opaque surface.base, like every form here. Contrast rows, by exact name: heading,
 * labels and confirmation "text.primary on surface.base"; mode links (Link's signal tone)
 * "accent.signal.text on surface.base"; input text "toast title
 * (text.primary) on surface.sunken"; help and the reveal icon "text.secondary on surface.base",
 * its hover "text.primary on surface.raised (over surface.base)"; errors "accent.hostile.text on
 * surface.base"; required marker "accent.signal.text on surface.base"; rings "focus.ring on
 * surface.base"; submit "accent.signal.ink on accent.signal.fill"; controls "control border (over
 * control fill) on surface.base", "control border on control fill", "control border, invalid, on
 * control fill", "control border, invalid (over control fill), on surface.base".
 */
export function AuthForm({ mode, onSubmit, onModeChange, headingLevel = 2, className, ref }: AuthFormProps) {
  const uid = useId()
  const idOf = (field: AuthField) => `${uid}-${field}`
  const headingId = `${uid}-heading`
  const current = MODES[mode]
  const [values, setValues] = useState<AuthValues>({ name: '', email: '', password: '', code: '' })
  const [pending, setPending] = useState(false)
  const [status, setStatus] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [shownMode, setShownMode] = useState(mode)
  const errors = useFieldErrors<AuthField>(validatorFor(mode))
  const summary = useRef<HTMLDivElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  /** The mode a pending switchTo asked for. A layout effect compares this against the mode that
   *  actually landed, so a caller who declines a switch (onModeChange does nothing) never leaves a
   *  stale request armed to steal focus on some later, unrelated mode change: the first mode
   *  change after a request clears it, whether or not that change is the one requested. */
  const focusTarget = useRef<AuthMode | null>(null)
  /** Bumped every time the mode actually changes. A submit captures the value at its start and
   *  compares it after `onSubmit` resolves, so a result for a mode the person has since switched
   *  away from is dropped rather than landing under whatever mode happens to be showing. */
  const generation = useRef(0)
  const Heading = `h${headingLevel}` as const
  const summaryLevel = Math.min(headingLevel + 1, 4) as 3 | 4

  // A new mode starts clean: the last mode's errors, confirmation, revealed password and any
  // still-pending submit describe a form that is not here any more. Values stay, so an email
  // typed to sign in is there to reset.
  if (mode !== shownMode) {
    setShownMode(mode)
    errors.replace({})
    setStatus('')
    setSubmitError('')
    setPending(false)
  }

  useEffect(() => {
    if (attempt > 0) summary.current?.focus()
  }, [attempt])

  // The link that switched the mode is gone in the new one; focus goes to the new heading rather
  // than falling to the page. `generation` is bumped here, not in the render-phase block above:
  // mutating a ref during render is impure (React can call a render function more than once for
  // the same commit), so a stale-submit guard that incremented there could double-bump under
  // StrictMode. An effect keyed on `mode` runs exactly once per actual mode change instead.
  useLayoutEffect(() => {
    generation.current += 1
    const target = focusTarget.current
    if (target === null) return
    focusTarget.current = null
    if (target === mode) heading.current?.focus()
  }, [mode])

  const switchTo = (next: AuthMode) => {
    focusTarget.current = next
    onModeChange?.(next)
  }

  const set = (field: AuthField, value: string) => {
    setValues(all => ({ ...all, [field]: value }))
    errors.change(field, value)
    // The confirmation names the address it was sent to; once that address changes, the message
    // describes a request that is no longer the one on screen.
    if (field === 'email' && status) setStatus('')
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending) return
    const found = errors.validateAll(current.fields, field => values[field])
    if (hasErrors(found)) {
      setAttempt(count => count + 1)
      return
    }
    setStatus('')
    setSubmitError('')
    setPending(true)
    // Lets the cleared alert actually reach the DOM before `onSubmit` runs. Without this, a
    // rejection that fails the same way twice in a row goes from one message straight back to the
    // same message in a single React commit -- the DOM text never changes, so there is nothing
    // for a screen reader to notice on the second attempt.
    await Promise.resolve()
    const startGeneration = generation.current
    try {
      const result = await onSubmit({ ...values, email: values.email.trim(), code: digitsOf(values.code) }, mode)
      // The mode moved on while this was in flight (the mode-switch block above already cleared
      // `pending` and this submission's own state): the result describes a form that is no longer
      // showing, so it is dropped rather than surfacing under whatever mode is current now.
      if (generation.current !== startGeneration) return
      if (result && hasErrors(result)) {
        errors.replace(remapOffMode(result, current.fields, mode))
        setAttempt(count => count + 1)
      } else if (mode === 'reset-password') {
        setStatus(`If an account exists for ${values.email.trim()}, a reset link is on its way.`)
      }
    } catch {
      // Never dropped silently (SC 3.3.1, 4.1.3): there is no field to attach a rejection to, so
      // it surfaces as its own alert instead of an ErrorSummary entry. A stale rejection (the mode
      // moved on while this was in flight) shows nothing, same as a stale resolution above.
      if (generation.current !== startGeneration) return
      setSubmitError('Something went wrong. Please try again.')
    } finally {
      // A stale submit reaches here too (the `return` above is inside the `try`, so `finally`
      // still runs for it). Without this check its `finally` would clear a NEWER submit's own
      // `pending` -- the one that started after the mode-switch block cleared this one's -- and
      // the form could be submitted a second time while that newer one is genuinely still working.
      if (generation.current === startGeneration) setPending(false)
    }
  }

  const field = (
    name: AuthField,
    label: string,
    input: Omit<InputProps, 'id' | 'value' | 'onChange' | 'onBlur'>,
    help?: string,
    inputKey?: string
  ) => (
    <FormField label={label} help={help} error={errors.errors[name]} required>
      <Input
        key={inputKey}
        id={idOf(name)}
        value={values[name]}
        onChange={event => set(name, event.target.value)}
        onBlur={event => errors.blur(name, event.target.value, event.relatedTarget)}
        {...input}
      />
    </FormField>
  )

  const fieldFor: Record<AuthField, () => ReactElement> = {
    name: () => field('name', 'Name', { name: 'name', autoComplete: 'name' }),
    email: () =>
      field(
        'email',
        'Email',
        {
          name: mode === 'sign-in' ? 'username' : 'email',
          type: 'email',
          autoComplete: mode === 'sign-in' ? 'username' : 'email',
          autoCapitalize: 'none',
          spellCheck: false,
        },
        mode === 'reset-password' ? 'We send a reset link to this address.' : undefined
      ),
    // `revealable` puts the toggle inside the field (Input owns it and hides it again on submit).
    // The last argument keys the input by mode, remounting it on a switch so a revealed password
    // goes back to hidden, as the old toggle did; the value is controlled here, so nothing typed
    // is lost.
    password: () =>
      field(
        'password',
        'Password',
        {
          name: 'password',
          type: 'password',
          revealable: true,
          autoComplete: mode === 'create-account' ? 'new-password' : 'current-password',
        },
        mode === 'create-account' ? `At least ${MIN_PASSWORD_LENGTH} characters.` : undefined,
        mode
      ),
    code: () =>
      field(
        'code',
        'Code',
        { name: 'code', inputMode: 'numeric', autoComplete: 'one-time-code' },
        'The 6-digit code from your authenticator app.'
      ),
  }

  return (
    <form
      ref={ref}
      noValidate
      aria-labelledby={headingId}
      onSubmit={submit}
      className={cn(
        'crosshair flex flex-col gap-5 w-full max-w-sm p-6 border border-[var(--color-border-hairline)] bg-[var(--color-surface-base)]',
        className
      )}
    >
      <Heading
        id={headingId}
        ref={heading}
        tabIndex={-1}
        className="font-display font-semibold text-2xl text-[var(--color-text-primary)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
      >
        {current.title}
      </Heading>
      {/* Gated on `attempt`, not `errors.errors` directly: a lone blur already puts a message in
          `errors.errors` (useFieldErrors shows a field error on blur, not only on submit), and
          mounting this whole block on that alone pushes every field and the submit button down
          by its own height, out from under a pointer already on its way to click Submit. The
          per-field error under the input itself still shows on blur (FormField's own `error`
          prop, below); only this summary waits for an actual submit attempt. */}
      <ErrorSummary
        ref={summary}
        errors={attempt > 0 ? summarize(errors.errors, current.fields, idOf) : []}
        headingLevel={summaryLevel}
      />
      {/* Keyed by field name: a fixed list per mode, so the email input stays the same node across
          a mode switch. */}
      {current.fields.map(name => (
        <Fragment key={name}>{fieldFor[name]()}</Fragment>
      ))}
      <div className="flex flex-col gap-2">
        <Button type="submit" fullWidth loading={pending} loadingLabel={current.busy}>
          {current.submit}
        </Button>
        {/* Mounted from the start and only its text changes, so the confirmation is announced
            (a live region has to exist before its text does). min-h-5 reserves its line. */}
        <p role="status" className="min-h-5 font-body text-sm text-[var(--color-text-primary)]">
          {status}
        </p>
        {/* Same shape as the status pair above, persistent and sr-only regardless of content: a
            live region has to already exist before a later change to its text is picked up. The
            visible, aria-hidden paragraph below is the sighted duplicate, mounted only once there
            is something to show, so it never opens a gap-2 slot of its own the rest of the time.
            Same pattern as CheckoutForm's own placeError. */}
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
      {onModeChange ? (
        <ul role="list" className="flex flex-col gap-1">
          {SWITCHES[mode].map(link => (
            <li key={link.to}>
              <button type="button" className={SWITCH} onClick={() => switchTo(link.to)}>
                {link.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </form>
  )
}
