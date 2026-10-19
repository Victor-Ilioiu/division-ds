import type { CSSProperties, Ref } from 'react'
import { Check } from 'lucide-react'
import { cn } from '../../../lib/cn'

export type Step = { label: string; description?: string }

export type StepperProps = {
  steps: Step[]
  /** 0-based index of the current step. steps.length means every step is complete. */
  current: number
  /** The list's accessible name. @default 'Progress' */
  label?: string
  /** 'horizontal' stacks below the sm breakpoint and runs in a row from it; 'vertical' is a
   *  column at every width, with a connector between markers. @default 'horizontal' */
  orientation?: 'horizontal' | 'vertical'
  className?: string
  ref?: Ref<HTMLOListElement>
}

const STATUS = { done: 'completed', current: 'current', upcoming: 'not started' } as const

/**
 * Where someone is in a multi-step flow: which steps are done, which is current, what is left.
 * An ordered list -- the sequence is the information -- named by `label`, with
 * `aria-current="step"` on the current item and each item's status spoken in words, because the
 * check mark and the fill are visual only (SC 1.4.1 needs a text fallback for both).
 *
 * Not interactive: no button, no link, nothing to click. Going back to a step is the flow's own
 * decision (a Back button, or links the checkout organism adds) -- a clickable stepper invites
 * skipping ahead to steps whose inputs do not exist yet.
 *
 * Done and current both read as a 28px signal-filled square; only the glyph inside tells them
 * apart (a check versus the step's own index), alongside `aria-current` and the spoken status --
 * never colour alone. Upcoming is a `border.selection` outline with the index in `text.secondary`.
 *
 * `role="list"` on the `list-none` `<ol>`: `list-none` drops list semantics in Safari/VoiceOver,
 * not just the marker glyph, the same pattern Breadcrumbs and Pagination already carry.
 *
 * The leading-zero pad: every other hero numeral in this system (Progress, Stat, the Overview)
 * dims its pad with `text.numeral-pad` against `surface.base` or `surface.raised`, both banded
 * rows already gated in contrast-pairs.mjs at a 3:1 floor. The CURRENT step's marker sits on
 * `accent.signal.fill`, not the page, and `numeral.pad` measures only ~1.08:1 (dark) / ~1.22:1
 * (light) there -- nowhere near that floor, and nothing like the "dimmed but present" relationship
 * the token exists for. So the pad is dropped on the filled (current) marker only: it shows its
 * bare digit ("2"), never a padded one ("02"). Logged in BUILD-LOG.md. The upcoming marker's pad
 * sits on the page or `surface.raised` like
 * every other use, so it keeps the pad and reuses those two existing rows unchanged.
 *
 * Every colour painted here is an existing, reused pair in contrast-pairs.mjs:
 * - "accent.signal.ink on accent.signal.fill" -- the current step's digit and the done check icon.
 * - "checked/on fill (accent.signal.fill) on surface.base" and "rating filled star
 *   (accent.signal.fill) on surface.raised (over surface.base)" -- the done/current marker's fill
 *   and the connector once the step before it is done, on both surfaces the docs render on.
 * - "rating empty star (border.selection) on surface.base" and "rating empty star
 *   (border.selection) on surface.raised (over surface.base)" -- the upcoming marker's outline.
 * - "numeral.pad on surface.base (dimmed, banded)" and "numeral.pad on surface.raised (over
 *   surface.base) (dimmed, banded)" -- the upcoming marker's pad.
 * - "text.primary on surface.base" and "text.primary on surface.raised (over surface.base)" --
 *   the done/current label.
 * - "text.secondary on surface.base" and "alert body and ghost dismiss (text.secondary) on
 *   surface.raised (over surface.base)" -- the upcoming label, the upcoming marker's digit, and
 *   every step's optional description. The `surface.raised` half is named for Alert's own text,
 *   not Stepper's -- same token, same measured pixel (7.68:1 dark, 15.65:1 light), reused rather
 *   than duplicated under a second name.
 * Horizontal, from sm, the steps take three placements: the first step's marker and text sit flush
 * left, middle steps centre their text on the marker, and the last sits flush right, so the
 * connectors span the whole container with the same 8px clearance at every marker.
 *
 * `orientation="vertical"` is for a sequence read top to bottom beside other content (a shipment
 * timeline on an order page): the markers form a rail, a 2px connector runs between them at
 * every width, and each step's text sits to the right with room for a description. Same
 * markers, colours and pairs as the horizontal layout; only the arrangement changes.
 *
 * The default connector (not yet reached) is `border.hairline-strong`, the same structural divider
 * Tabs' underline and DropdownMenu's own border already paint ungated -- a decorative rule, not a
 * value SC 1.4.11 reaches, consistent with every other use of that token in this system.
 */
export function Stepper({ steps, current, label = 'Progress', orientation = 'horizontal', className, ref }: StepperProps) {
  const vertical = orientation === 'vertical'
  // Horizontal, from sm: a grid of 2 columns per gap between steps. The first and last step take
  // one column each and the middle steps two, so every marker lands exactly on a column line:
  // the first flush left, the last flush right, the middle ones centred on their span.
  const columns = Math.max(1, 2 * (steps.length - 1))
  return (
    <ol
      ref={ref}
      role="list"
      aria-label={label}
      data-orientation={orientation}
      style={vertical ? undefined : ({ '--stepper-columns': columns } as CSSProperties)}
      className={cn(
        vertical
          ? 'flex flex-col list-none'
          : 'flex flex-col gap-4 sm:grid sm:grid-cols-[repeat(var(--stepper-columns),minmax(0,1fr))] sm:gap-0 list-none',
        className
      )}
    >
      {steps.map((step, index) => {
        const state: StepState = index < current ? 'done' : index === current ? 'current' : 'upcoming'
        const first = index === 0
        const last = index === steps.length - 1

        if (vertical) {
          // Vertical: the marker and its connector form a rail on the left, and the connector
          // grows with the text beside it, so a long description never breaks the line.
          return (
            <li key={step.label} aria-current={state === 'current' ? 'step' : undefined} className="flex gap-3">
              <div className="flex flex-col items-center">
                <Marker state={state} index={index} />
                {last ? null : <Connector done={state === 'done'} className="w-0.5 grow min-h-4 my-1" />}
              </div>
              <StepText step={step} state={state} className={cn('pt-1.5', !last && 'pb-6')} />
            </li>
          )
        }

        // Each step draws the half of the connector on either side of its marker, 8px clear of it,
        // and the two halves of one connector meet at the column line between the steps. A half
        // is done-coloured when the step it leads away from is done.
        const placement = steps.length === 1 || first ? 'first' : last ? 'last' : 'middle'
        return (
          <li
            key={step.label}
            aria-current={state === 'current' ? 'step' : undefined}
            data-placement={placement}
            className={cn(
              'flex items-start gap-3 sm:flex-col sm:gap-2',
              placement === 'middle' ? 'sm:col-span-2 sm:items-center' : 'sm:col-span-1',
              placement === 'last' && 'sm:items-end'
            )}
          >
            <div className="flex items-center sm:w-full">
              {placement === 'first' ? null : (
                <Connector done={index - 1 < current} className="hidden sm:block h-0.5 grow mr-2" />
              )}
              <Marker state={state} index={index} />
              {last ? null : <Connector done={state === 'done'} className="hidden sm:block h-0.5 grow ml-2" />}
            </div>
            <StepText
              step={step}
              state={state}
              className={placement === 'middle' ? 'sm:text-center' : placement === 'last' ? 'sm:text-right' : undefined}
            />
          </li>
        )
      })}
    </ol>
  )
}

function Connector({ done, className }: { done: boolean; className: string }) {
  return (
    <span
      aria-hidden="true"
      data-part="connector"
      className={cn(
        className,
        done ? 'bg-[var(--color-accent-signal-fill)]' : 'bg-[var(--color-border-hairline-strong)]'
      )}
    />
  )
}

type StepState = 'done' | 'current' | 'upcoming'

function Marker({ state, index }: { state: StepState; index: number }) {
  const filled = state !== 'upcoming'
  const digits = String(index + 1)
  // The pad is dropped on the filled (current) marker -- see the block comment on Stepper.
  const pad = state === 'upcoming' && digits.length < 2 ? '0' : ''
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex items-center justify-center w-7 h-7 shrink-0 font-display font-bold text-sm tabular-nums',
        filled
          ? 'bg-[var(--color-accent-signal-fill)] text-[var(--color-accent-signal-ink)]'
          : 'border border-[var(--color-border-selection)] text-[var(--color-text-secondary)]'
      )}
    >
      {state === 'done' ? (
        <Check className="w-4 h-4" />
      ) : (
        <>
          {pad ? <span className="text-[var(--color-numeral-pad)]">{pad}</span> : null}
          {digits}
        </>
      )}
    </span>
  )
}

function StepText({ step, state, className }: { step: Step; state: StepState; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <p
        className={cn(
          'font-mono text-xs uppercase tracking-[0.12em]',
          state === 'upcoming'
            ? 'text-[var(--color-text-secondary)]'
            : 'font-semibold text-[var(--color-text-primary)]'
        )}
      >
        {step.label}
        <span className="sr-only">, {STATUS[state]}</span>
      </p>
      {step.description ? (
        <p className="mt-0.5 font-body text-sm text-[var(--color-text-secondary)]">{step.description}</p>
      ) : null}
    </div>
  )
}
