import { cloneElement, useId, type ReactElement, type Ref } from 'react'
import { CircleAlert } from 'lucide-react'
import { cn } from '../../../lib/cn'

/** The five props FormField injects. Input and Textarea accept all five; any control that does
 *  can be wrapped. `invalid`, never `aria-invalid`: every form atom types that key away and
 *  derives it from `invalid`, so passing the attribute directly would be a compile error. */
export type FieldControlProps = {
  id?: string
  'aria-describedby'?: string
  invalid?: boolean
  required?: boolean
  /** A control that names itself (Select, QuantityStepper) declares `label`. FormField replaces
   *  it with its own, so the visible label and the accessible name are one string (SC 2.5.3). */
  label?: string
}

export type FormFieldProps = {
  label: string
  help?: string
  error?: string
  required?: boolean
  /** Exactly one control element. FormField clones it and injects the props above. */
  children: ReactElement<FieldControlProps>
  className?: string
  ref?: Ref<HTMLDivElement>
}

export function FormField({
  label,
  help,
  error,
  required = false,
  children,
  className,
  ref,
}: FormFieldProps) {
  const generated = useId()
  // A caller's own id wins: something else on the page (a skip link, an analytics hook) may
  // already point at it.
  const controlId = children.props.id ?? `${generated}-control`
  const helpId = help ? `${generated}-help` : undefined
  const errorId = error ? `${generated}-error` : undefined
  // Help before error, so the instruction is heard before what went wrong with it. Any
  // describedby the caller set on the control is kept, last.
  const describedBy =
    [helpId, errorId, children.props['aria-describedby']].filter(Boolean).join(' ') || undefined

  return (
    <div ref={ref} className={cn('flex flex-col gap-1.5', className)}>
      <label
        htmlFor={controlId}
        className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-primary)]"
      >
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-1 text-[var(--color-accent-signal-text)]">
            *
          </span>
        ) : null}
      </label>
      {cloneElement(children, {
        id: controlId,
        'aria-describedby': describedBy,
        invalid: Boolean(error) || children.props.invalid,
        required: required || children.props.required,
        ...(children.props.label !== undefined ? { label } : {}),
      })}
      {help ? (
        <p id={helpId} className="font-body text-xs text-[var(--color-text-secondary)]">
          {help}
        </p>
      ) : null}
      {error ? (
        <p
          id={errorId}
          className="flex items-start gap-1.5 font-body text-xs text-[var(--color-accent-hostile-text)]"
        >
          <CircleAlert aria-hidden="true" className="w-3.5 h-3.5 mt-px shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  )
}
