import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type Ref,
} from 'react'
import { Eye, EyeOff, X } from 'lucide-react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../../lib/cn'
import { disabledText } from '../../../lib/disabled'
import { useMergedRefs } from '../../../lib/refs'
import { IconButton } from '../icon-button/IconButton'
import { AI_FILLED_CLASS, AiFieldMark, AiRevertButton, aiFieldState, setNativeValue } from './ai-field'

export const inputVariants = cva(
  cn(
    'block w-full font-body rounded-[var(--shape-radius,0px)]',
    'bg-[var(--component-control-fill-rest)] text-[var(--component-control-text-rest)]',
    'border placeholder:text-[var(--component-control-text-placeholder)]',
    // `transition-control`, not `transition-colors`: Tailwind v4's colour transition
    // includes `outline-color`, which made the focus ring animate in from currentColor
    // (near-white) instead of painting the ring token at the instant of focus. See
    // control.css, which also owns the reduced-motion case.
    'transition-control',
    // Not bevelled, so it draws its own ring — nothing clips it here.
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
    disabledText,
    'disabled:bg-[var(--component-control-fill-disabled)] aria-disabled:bg-[var(--component-control-fill-disabled)] data-[disabled]:bg-[var(--component-control-fill-disabled)]',
    'read-only:text-[var(--color-text-secondary)]'
  ),
  {
    variants: {
      inputSize: {
        sm: 'h-[var(--component-control-height-sm)] px-2.5 text-xs',
        md: 'h-[var(--component-control-height-md)] px-3 text-sm',
        lg: 'h-[var(--component-control-height-lg)] px-4 text-base',
      },
      invalid: {
        true: 'border-[var(--component-control-border-invalid)]',
        false: cn(
          'border-[var(--component-control-border-rest)]',
          'hover:border-[var(--component-control-border-hover)]'
        ),
      },
    },
    defaultVariants: { inputSize: 'md', invalid: false },
  }
)

/** Input computes `aria-invalid` from `invalid` and spreads `{...rest}` after it onto the same
 *  element, so a caller-supplied `aria-invalid` in rest would silently win at runtime (JSX later
 *  attributes override earlier ones), defeating the one thing this prop promises. `aria-invalid`
 *  is hyphenated, so `Omit<>` alone is a no-op — TypeScript's JSX checker never treats an
 *  aria-/data-prefixed attribute as an excess/unknown property — so the key is also redeclared
 *  with type `never`, which TypeScript does enforce. Same remedy as `IconButton`'s `aria-label`
 *  exclusion and `Avatar`'s `aria-label` exclusion. */
export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'aria-invalid'> &
  VariantProps<typeof inputVariants> & {
    /** The native size attribute, kept available because the variant prop is inputSize. */
    size?: number
    ref?: Ref<HTMLInputElement>
    'aria-invalid'?: never
    /** On a `type="password"` field, adds a show/hide toggle inside it. Ignored on any other type. */
    revealable?: boolean
    /** With `maxLength`, shows "12/80" inside the field and describes the field with it. */
    showCount?: boolean
    /** Adds a clear button while the field has a value. */
    clearable?: boolean
    /** Called after the clear button empties the field (onChange has already fired with ''). */
    onClear?: () => void
    /** The clear button's accessible name. */
    clearLabel?: string
    /** The value an AI proposed for this field. While the field holds it, the field looks AI-filled;
     *  once the person changes it, the field looks normal and offers a revert button. */
    aiValue?: string
    /** Classes for the wrapper an adorned field renders. Without an adornment there is none. */
    wrapperClassName?: string
  }

/** The live region speaks only inside this many characters of the limit: the last tenth, and never
 *  fewer than the last three. Announcing every keystroke from the first would bury what the
 *  person is typing under a running count they did not ask for. */
function nearLimitAt(max: number) {
  return Math.max(3, Math.ceil(max * 0.1))
}

function remainingMessage(remaining: number) {
  if (remaining <= 0) return 'No characters left'
  return `${remaining} character${remaining === 1 ? '' : 's'} left`
}

/** The adornment buttons: Search's clear button exactly (ghost, 28px inside a 40px field, no
 *  reticle, which would land on the field's own border). */
const ADORNMENT_BUTTON = { variant: 'ghost', size: 'sm', className: 'h-7 w-7', wrapperClassName: 'no-reticle' } as const

/**
 * A single-line text control. Bare, it is exactly one `<input>` with no wrapper. Three opt-in
 * adornments sit inside the field's right edge, and asking for any of them wraps it in a relative
 * box:
 *
 * - `revealable` (password fields only, opt-in): an icon toggle inside the field, with a constant
 *   name, "Show password", and `aria-pressed` for its state. AuthForm uses it. A name that flipped to "Hide password" while also pressed would say the state twice.
 *   The field goes back to hidden when its form submits, so a password manager's save prompt
 *   never sees a revealed `type="text"`.
 * - `showCount` with `maxLength`: the count in mono, wired by `aria-describedby` merged onto
 *   whatever describedby it was given (FormField passes one), and a polite live region that only
 *   speaks near the limit. Promoted from the counter TextareaDocs built by hand.
 * - `clearable`: an X while there is a value, the same button as Search's. Clearing fires the
 *   caller's onChange with an empty value, then onClear, and returns focus to the input, because
 *   the button that held focus has just gone.
 * - `aiValue`: the AI-filled state (Carbon for AI). While the value equals `aiValue` the field
 *   takes ai.border and ai.wash and a sparkle mark that describes it as "Filled by AI"; once the
 *   person changes it, the field looks normal and a revert button puts `aiValue` back through
 *   onChange, the same path as clearing. An invalid field keeps its invalid border.
 *
 * The wrapper is there whenever an adornment is asked for, even while the clear button is hidden:
 * if it appeared on the first keystroke, React would remount the input and drop focus.
 */
export function Input({
  inputSize,
  invalid,
  className,
  ref,
  revealable = false,
  showCount = false,
  clearable = false,
  onClear,
  clearLabel = 'Clear',
  wrapperClassName,
  aiValue,
  ...rest
}: InputProps) {
  const { type, maxLength, value, defaultValue, onChange, disabled, readOnly } = rest
  const generatedId = useId()
  const inputId = rest.id ?? `${generatedId}-input`
  const countId = `${generatedId}-count`
  const aiId = `${generatedId}-ai`
  const inputRef = useRef<HTMLInputElement | null>(null)
  const setInputRef = useMergedRefs(inputRef, ref)
  const adornRef = useRef<HTMLSpanElement | null>(null)

  const [revealed, setRevealed] = useState(false)
  const [uncontrolledValue, setUncontrolledValue] = useState(() => String(defaultValue ?? ''))
  const [padRight, setPadRight] = useState<number>()
  const current = value !== undefined && value !== null ? String(value) : uncontrolledValue
  const length = current.length
  const ai = aiFieldState(aiValue, current, Boolean(disabled || readOnly))

  const canReveal = revealable && type === 'password'
  const counting = showCount && typeof maxLength === 'number' && maxLength > 0
  const canClear = clearable && !disabled && !readOnly && length > 0
  const adorned = canReveal || counting || clearable || aiValue !== undefined

  useEffect(() => {
    if (!canReveal) return
    const form = inputRef.current?.form
    if (!form) return
    const hide = () => setRevealed(false)
    form.addEventListener('submit', hide)
    return () => form.removeEventListener('submit', hide)
  }, [canReveal])

  // The adornments vary in width (a count grows a digit, the clear button comes and goes), so the
  // text's right padding is measured from them rather than guessed, and typed text never runs
  // under a button. `pr-10` is the first-paint fallback.
  useLayoutEffect(() => {
    if (!adorned) return
    const width = adornRef.current?.offsetWidth
    setPadRight(width ? width + 8 : undefined)
  }, [adorned, canClear, canReveal, counting, length, ai.filled, ai.canRevert])

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (value === undefined) setUncontrolledValue(event.target.value)
    onChange?.(event)
  }

  if (!adorned) {
    return (
      <input
        ref={setInputRef}
        aria-invalid={invalid ? true : undefined}
        className={cn(inputVariants({ inputSize, invalid }), className)}
        {...rest}
        onChange={handleChange}
      />
    )
  }

  const describedBy =
    [rest['aria-describedby'], ai.filled ? aiId : undefined, counting ? countId : undefined].filter(Boolean).join(' ') || undefined
  const remaining = counting ? maxLength - length : 0

  return (
    <div className={cn('relative w-full', wrapperClassName)}>
      <input
        ref={setInputRef}
        aria-invalid={invalid ? true : undefined}
        className={cn(inputVariants({ inputSize, invalid }), ai.filled && !invalid && AI_FILLED_CLASS, 'pr-10', className)}
        {...rest}
        id={inputId}
        type={canReveal && revealed ? 'text' : type}
        aria-describedby={describedBy}
        style={padRight ? { ...rest.style, paddingRight: padRight } : rest.style}
        onChange={handleChange}
      />
      <span ref={adornRef} className="absolute inset-y-0 right-1.5 flex items-center gap-0.5">
        {ai.filled ? <AiFieldMark id={aiId} /> : null}
        {ai.canRevert ? (
          <AiRevertButton
            onRevert={() => {
              const node = inputRef.current
              if (!node || aiValue === undefined) return
              setNativeValue(node, aiValue)
              node.focus()
            }}
          />
        ) : null}
        {counting ? (
          <span id={countId} className="px-1 font-mono text-sm tabular-nums text-[var(--color-text-secondary)]">
            <span aria-hidden="true">{`${length}/${maxLength}`}</span>
            <span className="sr-only">{`${length} of ${maxLength} characters`}</span>
          </span>
        ) : null}
        {canClear ? (
          <IconButton
            {...ADORNMENT_BUTTON}
            label={clearLabel}
            onClick={() => {
              const node = inputRef.current
              if (!node) return
              setNativeValue(node, '')
              onClear?.()
              node.focus()
            }}
          >
            <X aria-hidden="true" className="w-3.5 h-3.5" />
          </IconButton>
        ) : null}
        {canReveal ? (
          <IconButton
            {...ADORNMENT_BUTTON}
            label="Show password"
            aria-pressed={revealed}
            aria-controls={inputId}
            disabled={disabled}
            onClick={() => setRevealed(on => !on)}
          >
            {revealed ? <EyeOff aria-hidden="true" className="w-4 h-4" /> : <Eye aria-hidden="true" className="w-4 h-4" />}
          </IconButton>
        ) : null}
      </span>
      {counting ? (
        <span className="sr-only" aria-live="polite">
          {remaining <= nearLimitAt(maxLength) ? remainingMessage(remaining) : ''}
        </span>
      ) : null}
    </div>
  )
}
