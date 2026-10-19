import { useId, type Ref } from 'react'
import { CircleAlert } from 'lucide-react'
import { cn } from '../../../lib/cn'

export type FormError = {
  /** The id of the control to focus, the one its FormField labels. */
  fieldId: string
  message: string
}

export type ErrorSummaryProps = {
  errors: FormError[]
  /** @default 'There is a problem' */
  title?: string
  /** @default 2 */
  headingLevel?: 2 | 3 | 4
  className?: string
  /** The summary itself. A form focuses it after a submit that failed. */
  ref?: Ref<HTMLDivElement>
}

/**
 * The list of what stopped a form from submitting, at the top of the form. A form renders it with
 * the errors from a failed submit and moves focus to it, so the heading is heard first; each
 * entry links to its field and focuses it.
 *
 * On opaque surface.base whatever it sits in, like every form in this system, so its colours never
 * depend on what is behind it. Contrast: heading and links "text.primary on surface.base"; icon and border
 * "accent.hostile.text on surface.base"; focus rings "focus.ring on surface.base".
 */
export function ErrorSummary({
  errors,
  title = 'There is a problem',
  headingLevel = 2,
  className,
  ref,
}: ErrorSummaryProps) {
  const headingId = useId()
  if (errors.length === 0) return null
  const Heading = `h${headingLevel}` as const
  return (
    <div
      ref={ref}
      role="group"
      aria-labelledby={headingId}
      tabIndex={-1}
      className={cn(
        'flex items-start gap-3 p-4 border bg-[var(--color-surface-base)] border-[var(--color-accent-hostile-text)]',
        'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
        className
      )}
    >
      <CircleAlert aria-hidden="true" className="w-5 h-5 mt-0.5 shrink-0 text-[var(--color-accent-hostile-text)]" />
      <div className="grow min-w-0">
        <Heading id={headingId} className="font-display font-semibold text-base text-[var(--color-text-primary)]">
          {title}
        </Heading>
        <ul role="list" className="mt-2 flex flex-col gap-1">
          {errors.map((error, index) => (
            <li key={index}>
              <a
                href={`#${error.fieldId}`}
                onClick={event => {
                  // A fragment jump would change the URL under the router and, for most controls,
                  // not move focus at all. Focus the field itself.
                  event.preventDefault()
                  const field = document.getElementById(error.fieldId)
                  field?.focus()
                  field?.scrollIntoView({ block: 'center' })
                }}
                className="inline-flex items-center min-h-6 font-body text-sm text-[var(--color-text-primary)] underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
              >
                {error.message}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
