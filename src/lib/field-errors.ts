import { useState } from 'react'

/** Each field's current error message. A field with no entry has no error. */
export type FieldErrors<F extends string> = Partial<Record<F, string>>

/** The message for a value, or undefined when the value is fine. */
export type Validate<F extends string> = (field: F, value: string) => string | undefined

function withMessage<F extends string>(
  errors: FieldErrors<F>,
  field: F,
  message: string | undefined
): FieldErrors<F> {
  if (errors[field] === message) return errors
  const next = { ...errors }
  if (message === undefined) delete next[field]
  else next[field] = message
  return next
}

export function hasErrors<F extends string>(errors: FieldErrors<F>): boolean {
  return Object.values(errors).some(message => message !== undefined)
}

/** The errors in `order`, each with the id of the control an ErrorSummary entry should focus. */
export function summarize<F extends string>(
  errors: FieldErrors<F>,
  order: readonly F[],
  idOf: (field: F) => string
): { fieldId: string; message: string }[] {
  return order.flatMap(field => {
    const message = errors[field]
    return message === undefined ? [] : [{ fieldId: idOf(field), message }]
  })
}

/** What `useFieldErrors` returns. Written out, not inferred, so the generated helpers page prints it. */
export type FieldErrorsApi<F extends string> = {
  /** Each field's current error, for `FormField`'s `error` and for `summarize`. */
  errors: FieldErrors<F>
  /** Call from the control's onBlur with its current value and `event.relatedTarget`, where focus
   *  is going. A blur caused by pressing a submit button shows nothing: submit validates every
   *  field. */
  blur: (field: F, value: string, to?: EventTarget | null) => void
  /** Call from the control's onChange with its new value. */
  change: (field: F, value: string) => void
  /** Call on submit with every field and a way to read its value; returns the errors found. */
  validateAll: (fields: readonly F[], valueOf: (field: F) => string) => FieldErrors<F>
  /** Replace every error, with a server's or with `{}`. */
  replace: (next: FieldErrors<F>) => void
}

/** A submit button being pressed by the pointer right now. `:active` is set on pointer down,
 *  before the field blurs; a Tab onto the button never sets it, so keyboard users still hear the
 *  error on the way past, where there is no click to miss. */
function isSubmitPress(target: EventTarget | null | undefined): boolean {
  return (
    (target instanceof HTMLButtonElement || target instanceof HTMLInputElement) &&
    target.type === 'submit' &&
    target.matches(':active')
  )
}

/**
 * When a form's field errors may appear, change or clear, in one place (SC 3.3.1, and the rule
 * this system's forms share: never on a keystroke).
 *
 * - `blur`: show whatever is wrong with the value now, or clear the error when nothing is. Not
 *   when the pointer is pressing a submit button: the error line would push the button down
 *   under it mid-click, the click would miss, and submit validates every field anyway.
 * - `change`: never raises an error. Clears one as soon as its message no longer describes the
 *   value, so a stale "required" does not sit under a field that has text in it; the next blur
 *   says what, if anything, is wrong instead.
 * - `validateAll`: on submit, every given field at once, replacing what was shown. Returns what it
 *   found, so the caller can decide whether to submit.
 * - `replace`: errors from elsewhere (a server), or none.
 */
export function useFieldErrors<F extends string>(validate: Validate<F>): FieldErrorsApi<F> {
  const [errors, setErrors] = useState<FieldErrors<F>>({})
  return {
    errors,
    blur: (field: F, value: string, to?: EventTarget | null) => {
      if (isSubmitPress(to)) return
      setErrors(current => withMessage(current, field, validate(field, value)))
    },
    change: (field: F, value: string) =>
      setErrors(current => {
        const shown = current[field]
        return shown !== undefined && validate(field, value) !== shown ? withMessage(current, field, undefined) : current
      }),
    validateAll: (fields: readonly F[], valueOf: (field: F) => string): FieldErrors<F> => {
      const found: FieldErrors<F> = {}
      for (const field of fields) {
        const message = validate(field, valueOf(field))
        if (message !== undefined) found[field] = message
      }
      setErrors(found)
      return found
    },
    replace: (next: FieldErrors<F>) => setErrors(next),
  }
}
