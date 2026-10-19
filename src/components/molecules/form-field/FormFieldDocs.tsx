import { useEffect, useRef, useState } from 'react'
import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './FormField.meta'
import { Example } from '../../docs/Example'
import { Button, Input, Select, Textarea } from '../../atoms'
import { QuantityStepper } from '../quantity-stepper/QuantityStepper'
import { FormField } from './FormField'
import { ErrorSummary, type FormError } from './ErrorSummary'

const RESERVE_COUNTRIES = [
  { value: 'ro', label: 'Romania' },
  { value: 'ie', label: 'Ireland' },
  { value: 'de', label: 'Germany' },
]

/** A live example: a submit that fails renders the ErrorSummary and moves focus to it, so the
 *  heading is heard first. `country` is `useState('')`, never
 *  `useState<string>()` -- an initial `undefined` would make the Select uncontrolled, and the
 *  first selection would flip it to controlled and make Radix warn. Errors are set on submit
 *  only; once one shows, the matching field's own onValueChange clears it as soon as the value
 *  becomes valid, but never adds one mid-interaction. */
function ReserveExample() {
  const [country, setCountry] = useState('')
  const [magazines, setMagazines] = useState(0)
  const [errors, setErrors] = useState<FormError[]>([])
  const [attempt, setAttempt] = useState(0)
  const summary = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (attempt > 0) summary.current?.focus()
  }, [attempt])

  const countryError = errors.find(current => current.fieldId === 'reserve-country')?.message
  const magazinesError = errors.find(current => current.fieldId === 'reserve-magazines')?.message

  return (
    <form
      noValidate
      onSubmit={event => {
        event.preventDefault()
        const next: FormError[] = []
        if (!country) next.push({ fieldId: 'reserve-country', message: 'Choose a country.' })
        if (magazines < 4) next.push({ fieldId: 'reserve-magazines', message: 'Order at least 4 spare magazines.' })
        setErrors(next)
        if (next.length > 0) setAttempt(value => value + 1)
      }}
      className="flex flex-col gap-4 w-full max-w-sm p-5 bg-[var(--color-surface-base)]"
    >
      <ErrorSummary ref={summary} errors={errors} headingLevel={4} />
      <FormField label="Country" required error={countryError}>
        <Select
          id="reserve-country"
          label="Country"
          options={RESERVE_COUNTRIES}
          value={country}
          onValueChange={value => {
            setCountry(value)
            if (value) setErrors(current => current.filter(item => item.fieldId !== 'reserve-country'))
          }}
        />
      </FormField>
      <FormField label="Spare magazines" help="Four per replica." error={magazinesError}>
        <QuantityStepper
          id="reserve-magazines"
          label="Spare magazines"
          max={40}
          value={magazines}
          onValueChange={value => {
            setMagazines(value)
            if (value >= 4) setErrors(current => current.filter(item => item.fieldId !== 'reserve-magazines'))
          }}
        />
      </FormField>
      <Button type="submit">Reserve</Button>
    </form>
  )
}

/** A live example: the error is computed on blur only -- never on keystroke, which is one of the
 *  do/don'ts below -- and covers the empty case too (a required field left untouched-and-empty on
 *  blur is exactly as invalid as one left too short). Once an error is showing, `onChange` is
 *  allowed to clear it, but never to set a new one, so a validation message can never appear
 *  mid-keystroke. The one exception: the "required" message is specifically about the field being
 *  empty, so it stops being true the instant a first character lands, and is cleared right then
 *  rather than sitting there stale (still visible, now describing a field that no longer matches
 *  it) until the next blur recomputes it. */
function RequiredWithErrorExample() {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string>()

  const validate = (next: string) => {
    if (next.length === 0) return 'Callsign is required.'
    if (next.length < 4) return 'Use four to eight letters.'
    return undefined
  }

  return (
    // Field errors sit on a form's own opaque surface.base, as every form in this system does.
    // Contrast: "accent.hostile.text on surface.base".
    <div className="max-w-xs p-4 bg-[var(--color-surface-base)]">
      <FormField label="Callsign" help="Four to eight letters." error={error} required>
        <Input
          value={value}
          onChange={event => {
            const next = event.target.value
            setValue(next)
            if (!error) return
            if (validate(next) === undefined) setError(undefined)
            else if (error === 'Callsign is required.' && next.length > 0) setError(undefined)
          }}
          onBlur={() => setError(validate(value))}
        />
      </FormField>
    </div>
  )
}

export function FormFieldDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Label only">
        <div className="max-w-xs w-full">
          <FormField label="Callsign">
            <Input placeholder="Anvil" />
          </FormField>
        </div>
      </Example>

      <Example caption="With help">
        <div className="max-w-xs w-full">
          <FormField label="Callsign" help="Four to eight letters.">
            <Input placeholder="Anvil" />
          </FormField>
        </div>
      </Example>

      <Example caption="Required, with an error">
        <RequiredWithErrorExample />
      </Example>

      <Example caption="Wrapping a Textarea">
        <div className="max-w-sm w-full">
          <FormField label="Dispatch notes" help="Visible to the whole depot.">
            <Textarea placeholder="Depot code, and anything the next shift needs to know." />
          </FormField>
        </div>
      </Example>

      <Example caption="A form with an error summary">
        <ReserveExample />
      </Example>
    </ComponentDocs>
  )
}
