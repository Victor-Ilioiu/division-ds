import { useRef, useState, type KeyboardEvent, type Ref } from 'react'
import { Minus, Plus } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { useMergedRefs } from '../../../lib/refs'
import { IconButton, inputVariants } from '../../atoms'

/** The step grid's own last rung at or below `max` -- the real upper bound the control can reach.
 *  `max` itself may not be a step away from `min` (min 0, max 99, step 5: the grid is 0, 5, ...,
 *  95, and 99 is never a rung on it), so this is what `aria-valuemax`, the Increase button's
 *  disabled state, the focus-on-bound check and End all need instead of `max` directly -- a control
 *  that can never reach the value it announces as its maximum is worse than one that announces a
 *  lower, reachable one. */
export function gridMax(min: number, max: number, step = 1): number {
  return min + Math.floor((max - min) / step) * step
}

/**
 * Pure. Parses, snaps to the step grid measured from min, then clamps into `[min, gridMax(min,
 * max, step)]`. Unparseable input returns `min`.
 *
 * `min > max` is the caller's error, not this function's to reject: the formula has no branch that
 * assumes `min <= max`, so it still returns a number rather than throwing -- just not a meaningful
 * one for an inverted range. Callers are expected to pass a sane range.
 */
export function clampQuantity(raw: string | number, min: number, max: number, step = 1): number {
  const parsed = typeof raw === 'number' ? raw : Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed)) return min
  const snapped = min + Math.round((parsed - min) / step) * step
  return Math.min(gridMax(min, max, step), Math.max(min, snapped))
}

export type QuantityStepperProps = {
  /** Required: names the field and both buttons ("Decrease Speed loader quantity"). */
  label?: string
  value?: number
  /** @default min */
  defaultValue?: number
  onValueChange?: (value: number) => void
  /** @default 0 */
  min?: number
  /** @default 99 */
  max?: number
  /** @default 1 */
  step?: number
  disabled?: boolean
  /** @default 'md' */
  inputSize?: 'sm' | 'md'
  className?: string
  ref?: Ref<HTMLInputElement>
  /** The field's id, so a FormField's label and error text can point at it. */
  id?: string
  /** Help and error text ids, on the field. */
  'aria-describedby'?: string
  /** Marks the field invalid: aria-invalid and the invalid border. */
  invalid?: boolean
  required?: boolean
}

/**
 * A bounded whole number with a button either side, built to the WAI-ARIA spinbutton pattern: the
 * field is `role="spinbutton"` and carries every operation itself (Up/Down, Page Up/Down,
 * Home/End, and typing plus blur/Enter to commit), so the Decrease/Increase `IconButton`s are
 * `tabIndex={-1}` -- out of the tab order, exactly as the pattern specifies, rather than two extra
 * tab stops on every cart line.
 *
 * `type="text"` with `inputMode="numeric"`, never `type="number"`: a native number input carries
 * its own spin buttons, its own wheel behaviour and its own validation bubble, all of which would
 * fight this component's. Typing is free -- the field shows exactly what was typed, trimmed and
 * truncated to a leading integer (see the `onChange` handler below) -- and the value commits,
 * clamped once through `clampQuantity`, on blur or Enter. Every keyboard step (arrows, Page
 * Up/Down) steps from whatever is currently typed, not the last committed value, so a step right
 * after typing a new number moves from that number, not from wherever the field was before.
 *
 * A button click that reaches its bound, while the button itself still holds focus, moves focus to
 * the field: a disabled `<button>` cannot hold focus, so the browser would otherwise drop it to
 * `document.body` the instant `disabled` lands on the node focus was just on. The
 * `document.activeElement === event.currentTarget` guard keeps this from firing when the button
 * never actually took focus -- a touch tap, for one, would otherwise pop the field's on-screen
 * numeric keyboard for no reason.
 *
 * Contrast -- every colour this composes is an existing, reused pair in contrast-pairs.mjs, gated in
 * both themes; nothing here needed a new row:
 * - The field reuses `inputVariants`, so its digit text is `component.control.text.rest`
 *   (resolves to `text.primary`) on `component.control.fill.rest` (resolves to `surface.sunken`)
 *   -- the identical fg/bg pair already named "toast title (text.primary) on surface.sunken".
 *   Reused under Toast's name rather than duplicated: same two token values, not a new colour.
 * - The field's own border (`border-x-0` drops the left/right border so it shares the buttons'
 *   borders instead of doubling them) is "control border on control fill" at rest and "control
 *   border, hover, on control fill" on hover -- `inputVariants` paints both classes already.
 * - The field's own (non-bevelled) focus ring is "focus.ring on surface.base" loose on the page,
 *   or "focus ring (focus.ring) on surface.raised (over surface.base)" inside the docs Panel --
 *   the same two rows the IconButtons' own bevel-focus-wrap ring reuses.
 * - Each button is `variant="secondary"`: a transparent fill, so its border and its Minus/Plus
 *   glyph (which inherits the button's own text colour) sit on whatever is behind the whole
 *   control. The border is "button secondary border on surface.base" or "button secondary border
 *   (border.control) on surface.raised (over surface.base)"; the glyph paints
 *   `component.button.secondary.text`, which also resolves to `text.primary`, so it reuses
 *   "text.primary on surface.base" and "text.primary on surface.raised (over surface.base)" --
 *   the same rows the field's own digits reuse above, since it is the identical token painted on
 *   a different backdrop.
 * Disabled -- either button at its bound, or the whole control via `disabled` -- carries no SC
 * 1.4.11 obligation (contrast-pairs.mjs says so for the control-border rows already) and is not
 * gated.
 *
 * `bevel-sm` cuts every bevelled control's own bottom-right corner regardless of where it sits, so
 * the Decrease button's cut used to land at the INNER seam against the field: a notch where the
 * field's bottom border stopped short of the button, plainest in the invalid state. Kept on
 * 2026-09-24, reversed by Victor on 2026-10-14: the Decrease button now takes `bevel-none`, so
 * the whole control reads as one shape with one cut, on the Increase button's outer corner.
 *
 * Inside a FormField, the field takes the id, description, invalid state and label the FormField
 * computes.
 */
export function QuantityStepper({
  label,
  value,
  defaultValue,
  onValueChange,
  min = 0,
  max = 99,
  step = 1,
  disabled = false,
  inputSize = 'md',
  className,
  ref,
  id,
  'aria-describedby': describedBy,
  invalid = false,
  required = false,
}: QuantityStepperProps) {
  const upperBound = gridMax(min, max, step)
  const [internal, setInternal] = useState(() => clampQuantity(defaultValue ?? min, min, max, step))
  const current = value ?? internal
  // What the field shows while someone is typing; null means "show the committed value".
  const [draft, setDraft] = useState<string | null>(null)
  const fieldRef = useRef<HTMLInputElement | null>(null)
  const setFieldRef = useMergedRefs(fieldRef, ref)

  const commit = (next: string | number): number => {
    const clamped = clampQuantity(next, min, max, step)
    setDraft(null)
    if (value === undefined) setInternal(clamped)
    if (clamped !== current) onValueChange?.(clamped)
    return clamped
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // Steps from what is currently typed, not the last committed value, so a step right after
    // typing a new number moves from that number.
    const base = draft !== null ? clampQuantity(draft, min, max, step) : current
    const moves: Record<string, number> = {
      ArrowUp: base + step,
      ArrowDown: base - step,
      PageUp: base + step * 10,
      PageDown: base - step * 10,
      Home: min,
      End: upperBound,
    }
    if (event.key in moves) {
      event.preventDefault()
      commit(moves[event.key])
    } else if (event.key === 'Enter' && draft !== null) {
      event.preventDefault()
      commit(draft)
    }
  }

  return (
    <div className={cn('inline-flex items-stretch', className)}>
      <IconButton
        label={`Decrease ${label ?? 'quantity'}`}
        variant="secondary"
        size={inputSize}
        tabIndex={-1}
        className="bevel-none"
        disabled={disabled || current <= min}
        onClick={event => {
          const clamped = commit(current - step)
          if (clamped <= min && document.activeElement === event.currentTarget) {
            fieldRef.current?.focus()
          }
        }}
        wrapperClassName="no-reticle"
      >
        <Minus aria-hidden="true" className="w-4 h-4" />
      </IconButton>
      <input
        ref={setFieldRef}
        id={id}
        type="text"
        inputMode="numeric"
        role="spinbutton"
        aria-label={label}
        aria-describedby={describedBy}
        aria-valuenow={current}
        aria-valuemin={min}
        aria-valuemax={upperBound}
        aria-invalid={invalid || undefined}
        aria-required={required || undefined}
        disabled={disabled}
        value={draft ?? String(current)}
        onChange={event => {
          // Keep only a leading integer, after trimming surrounding whitespace (so a pasted
          // " 12" gives "12"): everything from the first character that isn't part of one is
          // dropped, so a typed "1.5" becomes "1".
          setDraft(event.target.value.trim().match(/^-?\d*/)?.[0] ?? '')
        }}
        onBlur={() => {
          if (draft !== null) commit(draft)
        }}
        onKeyDown={onKeyDown}
        className={cn(
          inputVariants({ inputSize, invalid }),
          'w-16 text-center font-mono tabular-nums border-x-0'
        )}
      />
      <IconButton
        label={`Increase ${label ?? 'quantity'}`}
        variant="secondary"
        size={inputSize}
        tabIndex={-1}
        disabled={disabled || current >= upperBound}
        onClick={event => {
          const clamped = commit(current + step)
          if (clamped >= upperBound && document.activeElement === event.currentTarget) {
            fieldRef.current?.focus()
          }
        }}
        wrapperClassName="no-reticle"
      >
        <Plus aria-hidden="true" className="w-4 h-4" />
      </IconButton>
    </div>
  )
}

// FormField passes its own label in. With the marker it does so even when none was written
// here, so a QuantityStepper inside a FormField needs no label of its own.
QuantityStepper.namedByFormField = true
