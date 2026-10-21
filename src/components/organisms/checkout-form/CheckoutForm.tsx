import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent, type Ref } from 'react'
import { CircleAlert } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { hasErrors, summarize, useFieldErrors } from '../../../lib/field-errors'
import { formatMoney } from '../../../lib/money'
import { Button, Checkbox, Input, Radio, RadioGroup, Select, type InputProps, type SelectOption } from '../../atoms'
import { Alert, ErrorSummary, FormField, Stepper } from '../../molecules'
import type { CartLine } from '../cart/Cart'

export type DeliveryOption = {
  id: string
  label: string
  detail: string
  /** In the currency's minor unit (cents for EUR). Zero shows as "Free". */
  price: number
}

export const DELIVERY_OPTIONS: DeliveryOption[] = [
  { id: 'standard', label: 'Standard', detail: '3 to 5 working days', price: 0 },
  { id: 'express', label: 'Express', detail: 'Next working day', price: 1200 },
]

export type CheckoutAddress = { line1: string; line2: string; city: string; postalCode: string; country: string }

/** What the form hands over. No card field ever leaves it, demo or not. */
export type CheckoutOrder = {
  email: string
  name: string
  phone: string
  shipping: CheckoutAddress
  deliveryId: string
  billing: CheckoutAddress | 'same-as-shipping'
  /** In the currency's minor unit: the lines plus delivery. */
  total: number
}

export type CheckoutFormProps = {
  lines: CartLine[]
  countries: SelectOption[]
  /** @default DELIVERY_OPTIONS */
  deliveryOptions?: DeliveryOption[]
  /** Runs once the last step's fields pass, with the order. A rejection is never dropped: the form
   *  catches it, shows a retryable alert (the order is only ever placed from the Payment step, so
   *  that is already where the message belongs), and leaves everything typed in place. May
   *  instead RESOLVE `{ error }` for a failure the caller can name a specific fix for -- the form
   *  shows that string in the same alert rather than the generic one, and everything typed stays
   *  in place exactly as it does for a rejection. Additive and optional: a caller that only ever
   *  resolves `void` or rejects keeps working exactly as before. */
  onPlaceOrder: (order: CheckoutOrder) => void | { error: string } | Promise<void | { error: string }>
  /** @default 2. Never 4: the step heading (one level below) would then sit below ErrorSummary's
   *  own fixed h4, breaking the nesting it depends on. */
  headingLevel?: 2 | 3
  /** @default 'EUR' */
  currency?: string
  /** @default 'en-IE' */
  locale?: string
  className?: string
  ref?: Ref<HTMLDivElement>
}

type Field =
  | 'email'
  | 'name'
  | 'line1'
  | 'line2'
  | 'city'
  | 'postalCode'
  | 'country'
  | 'phone'
  | 'delivery'
  | 'billingLine1'
  | 'billingCity'
  | 'billingPostalCode'
  | 'billingCountry'
  | 'cardName'
  | 'cardNumber'
  | 'cardExpiry'
  | 'cardCode'

const EMPTY: Record<Field, string> = {
  email: '',
  name: '',
  line1: '',
  line2: '',
  city: '',
  postalCode: '',
  country: '',
  phone: '',
  delivery: '',
  billingLine1: '',
  billingCity: '',
  billingPostalCode: '',
  billingCountry: '',
  cardName: '',
  cardNumber: '',
  cardExpiry: '',
  cardCode: '',
}

const STEPS = [{ label: 'Shipping' }, { label: 'Delivery' }, { label: 'Payment' }]

const SHIPPING: readonly Field[] = ['email', 'name', 'line1', 'line2', 'city', 'postalCode', 'country', 'phone']
const DELIVERY: readonly Field[] = ['delivery']
const BILLING: readonly Field[] = ['billingLine1', 'billingCity', 'billingPostalCode', 'billingCountry']
const CARD: readonly Field[] = ['cardName', 'cardNumber', 'cardExpiry', 'cardCode']

/** A field with no message here is optional. */
const REQUIRED: Partial<Record<Field, string>> = {
  email: 'Enter your email address.',
  name: 'Enter the name to deliver to.',
  line1: 'Enter the first line of the address.',
  city: 'Enter the town or city.',
  postalCode: 'Enter the postal code.',
  country: 'Choose a country.',
  delivery: 'Choose a delivery option.',
  billingLine1: 'Enter the first line of the billing address.',
  billingCity: 'Enter the billing town or city.',
  billingPostalCode: 'Enter the billing postal code.',
  billingCountry: 'Choose the billing country.',
  cardName: 'Enter the name on the card.',
  cardNumber: 'Enter a card number. Any digits work in this demo.',
  cardExpiry: 'Enter an expiry date. Any date works in this demo.',
  cardCode: 'Enter a security code. Any digits work in this demo.',
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Filled in, and an email that looks like one. Nothing checks a card: this is a demo. */
function validate(field: Field, value: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) return REQUIRED[field]
  if (field === 'email' && !EMAIL.test(trimmed)) return 'Enter an email address like name@example.com.'
  return undefined
}

function orderFrom(values: Record<Field, string>, billingSame: boolean, total: number): CheckoutOrder {
  return {
    email: values.email.trim(),
    name: values.name.trim(),
    phone: values.phone.trim(),
    shipping: {
      line1: values.line1.trim(),
      line2: values.line2.trim(),
      city: values.city.trim(),
      postalCode: values.postalCode.trim(),
      country: values.country,
    },
    deliveryId: values.delivery,
    billing: billingSame
      ? 'same-as-shipping'
      : {
          line1: values.billingLine1.trim(),
          line2: '',
          city: values.billingCity.trim(),
          postalCode: values.billingPostalCode.trim(),
          country: values.billingCountry,
        },
    total,
  }
}

const FIELD_ERROR = 'flex items-start gap-1.5 font-body text-xs text-[var(--color-accent-hostile-text)]'
const LABEL = 'font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-primary)]'
const RING =
  'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]'

/**
 * Checkout in three steps (Shipping, Delivery, Payment) with the order summary beside it. One
 * state for the whole checkout, so Back never loses anything and nothing is asked twice (SC
 * 3.3.7). Each step is its own form: Continue validates that step's fields, a failure fills the
 * ErrorSummary and focuses it, and a success moves focus to the next step's heading.
 *
 * A demo: the card fields sit under a visible "Demo only" notice, nothing validates a card beyond
 * "is it filled in", and no card field is ever handed to onPlaceOrder.
 *
 * Placing an order is single and final. While `onPlaceOrder` is in flight, Back is `aria-disabled`
 * and inert (still focusable; its click and any Enter-triggered submit both do nothing) rather
 * than merely discouraged, so nothing can move the checkout to another step while an order is
 * still being placed; `goTo` itself also refuses to run in that window, a second line of defence
 * at the one place every step change goes through. Once an order is placed, Place order and Back
 * both stay `aria-disabled` and inert for the rest of the form's life: nothing on it can start a
 * second order or leave the confirmation. A generation counter, bumped on every step change, still
 * guards `onPlaceOrder`'s result, its catch and its `finally` against a stale resolution landing
 * under the wrong step or clearing a later placement's own busy state -- kept as a further line of
 * defence even though Back can no longer trigger the race it was written for. A failure is never
 * dropped silently, whichever way `onPlaceOrder` reports it: the standing alert is cleared and
 * that cleared state is rendered before the next attempt runs, so an identical failure on a
 * second try is announced again rather than reusing text a screen reader already read once, and
 * the fields already typed stay in place so Place order can simply be tried again. A rejection
 * shows a generic message -- there is no per-field home for it and nothing more honest to say
 * about it. `onPlaceOrder` may instead resolve `{ error }` when it has a specific fix to name (a
 * caller-side, additive choice); the form shows that string in the same alert in its place. Both
 * the confirmation and the failure alert are
 * persistent, `sr-only` live regions (a live region has to already exist before a later change to
 * its text is picked up), each paired with a visible, `aria-hidden` duplicate that mounts only
 * once there is something to show, so neither one holds an empty flex slot open in the button row
 * the rest of the time.
 *
 * Paints its own opaque surface.base, like every form here. Contrast rows, by exact name: text
 * "text.primary on surface.base" and "text.secondary on surface.base"; input text "toast title
 * (text.primary) on surface.sunken"; errors, including the order-placement alert,
 * "accent.hostile.text on surface.base"; required markers "accent.signal.text on surface.base";
 * rings "focus.ring on surface.base"; Continue and Place order "accent.signal.ink on
 * accent.signal.fill"; Back "button secondary border on surface.base"; the demo Alert "alert icon
 * and border (accent.info.text) on surface.raised (over surface.base)", "text.primary on
 * surface.raised (over surface.base)" and "alert body and ghost dismiss (text.secondary) on
 * surface.raised (over surface.base)". Inputs, Select, Radio, Checkbox and Stepper bring their own
 * rows.
 */
export function CheckoutForm({
  lines,
  countries,
  deliveryOptions = DELIVERY_OPTIONS,
  onPlaceOrder,
  headingLevel = 2,
  currency,
  locale,
  className,
  ref,
}: CheckoutFormProps) {
  const uid = useId()
  const idOf = (field: Field) => `${uid}-${field}`
  const [step, setStep] = useState(0)
  const [values, setValues] = useState<Record<Field, string>>(EMPTY)
  const [billingSame, setBillingSame] = useState(true)
  const [pending, setPending] = useState(false)
  const [placed, setPlaced] = useState(false)
  const [placeError, setPlaceError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const errors = useFieldErrors<Field>(validate)
  const summary = useRef<HTMLDivElement>(null)
  const stepHeading = useRef<HTMLHeadingElement>(null)
  const moved = useRef(false)
  /** Bumped every time Continue or Back actually leaves the current step. A submit captures the
   *  value at its start and compares it after `onPlaceOrder` settles, so a result would be dropped
   *  rather than confirming under whatever step is current, or clearing a later submit's own
   *  `pending`, if a step change ever did land while one was outstanding. Back cannot cause that
   *  today (see below), so this is a second line of defence, not the only one. */
  const generation = useRef(0)
  const Heading = `h${headingLevel}` as const
  const Sub = `h${headingLevel + 1}` as 'h3' | 'h4'

  const money = (minorUnits: number) => formatMoney(minorUnits, { currency, locale })
  const priceOf = (minorUnits: number) => (minorUnits === 0 ? 'Free' : money(minorUnits))
  const delivery = deliveryOptions.find(option => option.id === values.delivery)
  const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)
  const total = subtotal + (delivery?.price ?? 0)
  const fieldsFor = (at: number): readonly Field[] =>
    at === 0 ? SHIPPING : at === 1 ? DELIVERY : [...(billingSame ? [] : BILLING), ...CARD]
  // While an order is placing, or once one is placed, Back and Place order both go inert: neither
  // can move the checkout to another step or start a second order.
  const locked = pending || placed

  useEffect(() => {
    if (attempt > 0) summary.current?.focus()
  }, [attempt])

  // Continue and Back leave focus on a button that may not exist on the next step; the step's
  // heading is where the new content starts. `moved` is a plain boolean rather than a captured
  // target step: unlike AuthForm's mode (an external prop a caller can decline to change), a step
  // change here is entirely internal state and cannot fail to land, so there is no stale target
  // that could stay armed -- every commit clears the flag before it decides anything.
  useLayoutEffect(() => {
    if (!moved.current) return
    moved.current = false
    stepHeading.current?.focus()
  }, [step])

  const set = (field: Field, value: string) => {
    setValues(all => ({ ...all, [field]: value }))
    errors.change(field, value)
  }
  // A choice (a country, a delivery option) is complete the moment it is made, so it is checked
  // then, the way a text field is checked on blur.
  const choose = (field: Field, value: string) => {
    setValues(all => ({ ...all, [field]: value }))
    errors.blur(field, value)
  }
  const goTo = (next: number) => {
    // The one place every step change goes through: refusing here, not only at the Back button
    // itself, means nothing else that might ever call this can move the checkout while an order
    // is placing or once one is placed.
    if (pending || placed) return
    generation.current += 1
    errors.replace({})
    setPlaceError('')
    moved.current = true
    setStep(next)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // Placing an order is single and final: a submit while one is already in flight, or once one
    // has already succeeded, does nothing.
    if (pending || placed) return
    const found = errors.validateAll(fieldsFor(step), field => values[field])
    if (hasErrors(found)) {
      setAttempt(count => count + 1)
      return
    }
    if (step < STEPS.length - 1) {
      goTo(step + 1)
      return
    }
    setPlaceError('')
    setPending(true)
    // Lets the cleared alert actually reach the DOM before `onPlaceOrder` runs. Without this, a
    // synchronous throw that fails the same way twice in a row goes from one message straight back
    // to the same message in a single React commit -- the DOM text never changes, so there is
    // nothing for a screen reader to notice on the second attempt.
    await Promise.resolve()
    const startGeneration = generation.current
    try {
      const result = await onPlaceOrder(orderFrom(values, billingSame, total))
      if (generation.current !== startGeneration) return
      if (result && 'error' in result) {
        // A caller-named fix, not a generic failure: same alert, same "everything typed stays put"
        // guarantee as the catch below, just a message specific enough to act on.
        setPlaceError(result.error)
        return
      }
      setPlaced(true)
    } catch {
      // Never dropped silently (SC 3.3.1, 4.1.3): there is no per-field home for this -- the order
      // is only ever placed from the Payment step, so that is already the step the message
      // belongs on -- so it surfaces as its own alert instead of an ErrorSummary entry. A caller
      // with a more specific fix resolves `{ error }` instead of rejecting (see above); a plain
      // rejection keeps this generic text because there is nothing more honest to say about it.
      if (generation.current !== startGeneration) return
      setPlaceError('Something went wrong placing your order. Please try again.')
    } finally {
      if (generation.current === startGeneration) setPending(false)
    }
  }

  const text = (
    field: Field,
    label: string,
    input: Omit<InputProps, 'id' | 'value' | 'onChange' | 'onBlur'>,
    options: { help?: string; optional?: boolean } = {}
  ) => (
    <FormField
      label={options.optional ? `${label} (optional)` : label}
      help={options.help}
      error={errors.errors[field]}
      required={!options.optional}
    >
      <Input
        id={idOf(field)}
        value={values[field]}
        onChange={event => set(field, event.target.value)}
        onBlur={event => errors.blur(field, event.target.value, event.relatedTarget)}
        {...input}
      />
    </FormField>
  )

  const country = (field: 'country' | 'billingCountry', label: string, autoComplete: string) => (
    <FormField label={label} error={errors.errors[field]} required>
      <Select
        id={idOf(field)}
        label={label}
        options={countries}
        autoComplete={autoComplete}
        value={values[field]}
        onValueChange={value => choose(field, value)}
      />
    </FormField>
  )

  const shipping = (
    <>
      {text('email', 'Email', { type: 'email', autoComplete: 'email', autoCapitalize: 'none', spellCheck: false })}
      {text('name', 'Full name', { autoComplete: 'shipping name' })}
      {text('line1', 'Address line 1', { autoComplete: 'shipping address-line1' })}
      {text('line2', 'Address line 2', { autoComplete: 'shipping address-line2' }, { optional: true })}
      <div className="grid gap-4 @md:grid-cols-2">
        {text('city', 'Town or city', { autoComplete: 'shipping address-level2' })}
        {text('postalCode', 'Postal code', { autoComplete: 'shipping postal-code' })}
      </div>
      {country('country', 'Country', 'shipping country')}
      {text(
        'phone',
        'Phone',
        { type: 'tel', autoComplete: 'shipping tel' },
        { optional: true, help: 'Only for questions about delivery.' }
      )}
    </>
  )

  const deliveryError = errors.errors.delivery
  const deliveryStep = (
    <div className="flex flex-col gap-3">
      <p id={`${uid}-delivery-label`} className={LABEL}>
        Delivery option
        <span aria-hidden="true" className="ml-1 text-[var(--color-accent-signal-text)]">
          *
        </span>
      </p>
      <RadioGroup
        aria-labelledby={`${uid}-delivery-label`}
        aria-describedby={deliveryError ? `${uid}-delivery-error` : undefined}
        aria-invalid={deliveryError ? true : undefined}
        aria-required
        value={values.delivery}
        onValueChange={value => choose('delivery', value)}
        className="gap-3"
      >
        {deliveryOptions.map((option, index) => {
          // The first option carries the field's own id, so the error summary's entry focuses it.
          const id = index === 0 ? idOf('delivery') : `${idOf('delivery')}-${index}`
          return (
            <div key={option.id} className="flex items-start gap-3">
              <Radio id={id} value={option.id} invalid={Boolean(deliveryError)} className="mt-0.5" />
              <label htmlFor={id} className="flex flex-col font-body text-sm text-[var(--color-text-primary)]">
                <span>
                  <span className="font-semibold">{option.label}</span> · {priceOf(option.price)}
                </span>
                <span className="text-[var(--color-text-secondary)]">{option.detail}</span>
              </label>
            </div>
          )
        })}
      </RadioGroup>
      {deliveryError ? (
        <p id={`${uid}-delivery-error`} className={FIELD_ERROR}>
          <CircleAlert aria-hidden="true" className="w-3.5 h-3.5 mt-px shrink-0" />
          {deliveryError}
        </p>
      ) : null}
    </div>
  )

  const payment = (
    <>
      <div className="flex items-center gap-3">
        <Checkbox
          id={`${uid}-billing-same`}
          checked={billingSame}
          onCheckedChange={checked => {
            const same = checked === true
            setBillingSame(same)
            // Re-ticking hides the billing fields again, but leaving their errors in state would
            // resurface a stale one the moment the fields are next shown, before anyone has
            // touched them in that new showing.
            if (same) {
              const next = { ...errors.errors }
              for (const field of BILLING) delete next[field]
              errors.replace(next)
            }
          }}
        />
        <label htmlFor={`${uid}-billing-same`} className="font-body text-sm text-[var(--color-text-primary)]">
          Billing address is the same as shipping
        </label>
      </div>
      {billingSame ? null : (
        <div className="flex flex-col gap-4">
          {text('billingLine1', 'Billing address line 1', { autoComplete: 'billing address-line1' })}
          <div className="grid gap-4 @md:grid-cols-2">
            {text('billingCity', 'Billing town or city', { autoComplete: 'billing address-level2' })}
            {text('billingPostalCode', 'Billing postal code', { autoComplete: 'billing postal-code' })}
          </div>
          {country('billingCountry', 'Billing country', 'billing country')}
        </div>
      )}
      <Alert tone="info" title="Demo only">
        No payment is taken. Use any numbers.
      </Alert>
      {text('cardName', 'Name on card', { autoComplete: 'cc-name' })}
      {text('cardNumber', 'Card number', { autoComplete: 'cc-number', inputMode: 'numeric' }, { help: 'Any digits work in this demo.' })}
      <div className="grid gap-4 @md:grid-cols-2">
        {text('cardExpiry', 'Expiry date', { autoComplete: 'cc-exp', placeholder: 'MM/YY' })}
        {text('cardCode', 'Security code', { autoComplete: 'cc-csc', inputMode: 'numeric' })}
      </div>
    </>
  )

  const DD = 'font-mono tabular-nums text-[var(--color-text-primary)]'

  return (
    <div
      ref={ref}
      className={cn(
        '@container flex flex-col gap-6 p-6 border border-[var(--color-border-hairline)] bg-[var(--color-surface-base)]',
        className
      )}
    >
      <Heading className="font-display font-semibold text-2xl text-[var(--color-text-primary)]">Checkout</Heading>
      <Stepper steps={STEPS} current={step} label="Checkout progress" />
      <div className="grid gap-8 @3xl:grid-cols-[minmax(0,1fr)_18rem]">
        <form noValidate aria-labelledby={`${uid}-step`} onSubmit={submit} className="flex flex-col gap-4 min-w-0">
          <Sub
            id={`${uid}-step`}
            ref={stepHeading}
            tabIndex={-1}
            className={cn('font-display font-semibold text-lg text-[var(--color-text-primary)]', RING)}
          >
            {/* The trailing space sits outside the sr-only span, not inside it. This is a
                testing-library quirk, not a real accessibility one: Playwright's own injected
                accessible-name algorithm (what its `getByRole` locators query against, run over
                real Chromium) gives "Step 2 of 3: Delivery" with the space either way, confirmed
                by running the e2e keyboard test with the space kept inside the span. The unit
                suite goes through dom-accessibility-api under jsdom instead, and that
                implementation trims each element's own accumulated text before concatenating it
                with its siblings, so a trailing space kept inside the span is stripped there and
                "Step 1 of 3:" runs straight into "Shipping" with no gap. A literal space between
                the two JSX children on one line survives as its own text node, which
                dom-accessibility-api returns unmangled -- and it costs the e2e run nothing, so it
                stays this way rather than carrying two versions of the markup. */}
            <span className="sr-only">{`Step ${step + 1} of ${STEPS.length}:`}</span> {STEPS[step].label}
          </Sub>
          {/* h4 below the step heading at the default level; ErrorSummary goes no deeper. */}
          <ErrorSummary ref={summary} errors={summarize(errors.errors, fieldsFor(step), idOf)} headingLevel={4} />
          {step === 0 ? shipping : step === 1 ? deliveryStep : payment}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {step > 0 ? (
              <Button
                type="button"
                variant="secondary"
                aria-disabled={locked || undefined}
                onClick={event => {
                  // The same pattern Button's own loading state uses: focusable, aria-disabled,
                  // and its click prevented -- inert rather than merely discouraged.
                  if (locked) {
                    event.preventDefault()
                    return
                  }
                  goTo(step - 1)
                }}
              >
                Back
              </Button>
            ) : null}
            <Button
              type="submit"
              loading={pending}
              loadingLabel="Placing order"
              aria-disabled={placed || undefined}
              onClick={event => {
                if (placed) event.preventDefault()
              }}
            >
              {step < STEPS.length - 1 ? 'Continue' : 'Place order'}
            </Button>
            {/* Persistent and sr-only regardless of content: a live region has to already exist
                before a later change to its text is picked up, and out-of-flow (sr-only, in this
                system) means it never becomes a flex item and never opens a gap-3 slot of its own.
                The visible, aria-hidden paragraph below is the sighted duplicate, mounted only
                once there is something to show -- same shape as Cart's own subtotal status. */}
            <p role="status" className="sr-only">
              {placed ? 'Order placed. This is a demo: no payment was taken.' : null}
            </p>
            {placed ? (
              <p aria-hidden="true" className="font-body text-sm text-[var(--color-text-primary)]">
                Order placed. This is a demo: no payment was taken.
              </p>
            ) : null}
            {/* Same shape as the status pair above. */}
            <p role="alert" className="sr-only">
              {placeError || null}
            </p>
            {placeError ? (
              <p
                aria-hidden="true"
                className="flex items-center gap-1.5 font-body text-sm text-[var(--color-accent-hostile-text)]"
              >
                <CircleAlert aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                {placeError}
              </p>
            ) : null}
          </div>
        </form>
        <section aria-labelledby={`${uid}-order`} className="flex flex-col gap-3 self-start p-4 border border-[var(--color-border-hairline)]">
          <Sub id={`${uid}-order`} className="font-display font-semibold text-lg text-[var(--color-text-primary)]">
            Order summary
          </Sub>
          <ul role="list" className="flex flex-col gap-2">
            {lines.map((line, index) => (
              <li key={index} className="flex justify-between gap-3 font-body text-sm">
                <span className="text-[var(--color-text-primary)]">
                  {line.name}
                  <span className="text-[var(--color-text-secondary)]">
                    <span className="sr-only">, quantity</span>
                    <span aria-hidden="true"> ×</span> {line.quantity}
                  </span>
                </span>
                <span className={DD}>{money(line.unitPrice * line.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="flex flex-col gap-1 pt-3 border-t border-[var(--color-border-hairline)] font-body text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--color-text-secondary)]">Subtotal</dt>
              <dd className={DD}>{money(subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--color-text-secondary)]">Delivery</dt>
              <dd className={DD}>{delivery ? priceOf(delivery.price) : 'Chosen at step 2'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="font-semibold text-[var(--color-text-primary)]">Total</dt>
              <dd className={cn(DD, 'font-semibold')}>{money(total)}</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  )
}
