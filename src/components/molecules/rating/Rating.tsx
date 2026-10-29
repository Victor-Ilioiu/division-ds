import { useState, type HTMLAttributes, type Ref } from 'react'
import { RadioGroup as RadixRadioGroup } from 'radix-ui'
import { Star } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { disabledObject } from '../../../lib/disabled'

// Named pairs in scripts/lib/contrast-pairs.mjs: "rating filled star (accent.signal.indicator) on
// surface.base", "...on surface.raised (over surface.base)", "rating empty star
// (border.selection) on surface.base" and "...on surface.raised (over surface.base)". The stars
// are graphical objects that carry the value (SC 1.4.11), so both colours are gated against both
// surfaces a Rating can sit on: the page, and a Panel (surface.raised, the docs Example's own
// chrome and any card or panel a consumer drops one into).
const FILLED = 'fill-[var(--color-accent-signal-indicator)] text-[var(--color-accent-signal-indicator)]'
const EMPTY = 'fill-transparent text-[var(--color-border-selection)]'
// Hover preview: the filled star's colour as an outline only, so it reads "this would be set"
// without looking set. Same colour as FILLED, so it needs no pair of its own.
const PREVIEW = 'fill-transparent text-[var(--color-accent-signal-indicator)]'

/** One star in one of three states. Half is a filled star clipped to 50% over an empty one. */
function StarGlyph({ state, className }: { state: 'full' | 'half' | 'empty' | 'hover'; className: string }) {
  return (
    <span aria-hidden="true" data-star={state} className={cn('relative inline-block shrink-0', className)}>
      <Star className={cn('absolute inset-0 w-full h-full', state === 'full' ? FILLED : state === 'hover' ? PREVIEW : EMPTY)} strokeWidth={1.5} />
      {state === 'half' ? (
        <span className="absolute inset-y-0 left-0 w-1/2 overflow-hidden">
          <Star className={cn('w-[200%] h-full max-w-none', FILLED)} strokeWidth={1.5} />
        </span>
      ) : null}
    </span>
  )
}

const roundToHalf = (n: number) => Math.round(n * 2) / 2

export type RatingProps = HTMLAttributes<HTMLSpanElement> & {
  /** 0..max, rounded to the nearest half for both drawing and the spoken name. */
  value: number
  /** @default 5 */
  max?: number
  /** What is rated, for the spoken name: "Prism holo sight rated 4.5 out of 5". */
  label?: string
  /** Print the rounded value beside the stars, aria-hidden. @default false */
  showValue?: boolean
  /** @default 'md' */
  size?: 'sm' | 'md'
  ref?: Ref<HTMLSpanElement>
  /** Computed by the component from `value` and `label`: role=img with one spoken sentence,
   *  rather than five decorative stars a screen reader would read one by one. Typed away so a
   *  spread `{...rest}` after the computed value cannot silently override it (the hyphenated-key
   *  rule, design.md). */
  role?: never
  'aria-label'?: never
}

export function Rating({ value, max = 5, label, showValue = false, size = 'md', className, ref, ...rest }: RatingProps) {
  const shown = Math.min(Math.max(0, roundToHalf(value)), max)
  const spoken = `${label ? `${label} rated ` : ''}${shown} out of ${max}`
  const starSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5'

  return (
    <span ref={ref} role="img" aria-label={spoken} className={cn('inline-flex items-center gap-0.5', className)} {...rest}>
      {Array.from({ length: max }, (_, i) => {
        const state = shown >= i + 1 ? 'full' : shown >= i + 0.5 ? 'half' : 'empty'
        return <StarGlyph key={i} state={state} className={starSize} />
      })}
      {showValue ? (
        <span aria-hidden="true" className="ml-1.5 font-mono text-xs tabular-nums text-[var(--color-text-secondary)]">
          {shown}
        </span>
      ) : null}
    </span>
  )
}

export type RatingInputProps = {
  /** Required: the radiogroup's name, e.g. "Rate the Prism holo sight". */
  label: string
  value?: number
  defaultValue?: number
  onValueChange?: (value: number) => void
  /** @default 5 */
  max?: number
  disabled?: boolean
  className?: string
  ref?: Ref<HTMLDivElement>
}

// Hover only previews (outline stars, `data-star="hover"`); the fill is committed by a click or a
// keyboard selection, which is what changes the radio's checked value.
// This builds on Radix's RadioGroup primitive directly rather than the Radio atom, even
// though picking a rating is exactly a radio group's semantics (one value from a small set).
// Radio's own rendering is a 20px square box with a filled inner square as its selection marker
// -- the shape language this system draws every selection control with -- and there is no square
// a star glyph can be drawn inside of without either cropping the star or leaving the box empty
// around it. RatingInput reimplements just the piece Radio would otherwise supply (the item
// button, its hit area and its focus ring) and swaps the box for a star; RadixRadioGroup.Root's
// roving-focus and arrow-key behaviour, the actual reason a radio group is the right primitive
// here, is unchanged from what Radio's own RadioGroup wraps.
export function RatingInput({ label, value, defaultValue, onValueChange, max = 5, disabled, className, ref }: RatingInputProps) {
  const [internal, setInternal] = useState(defaultValue ?? 0)
  const current = value ?? internal
  const [hovered, setHovered] = useState<number | null>(null)

  return (
    <RadixRadioGroup.Root
      ref={ref}
      aria-label={label}
      // No orientation prop, deliberately: Radix's roving-focus group only filters ArrowUp/Down
      // when orientation="vertical" and ArrowLeft/Right when orientation="horizontal" (see
      // getFocusIntent in @radix-ui/react-roving-focus) -- leaving it unset accepts all four. The
      // WAI-ARIA radio-group pattern moves on Up/Left and Down/Right alike regardless of visual
      // layout, a screen-reader user in focus mode reaches for Up/Down, and Radio's own
      // RadioGroup (which also sets no orientation) accepts all four keys for the same reason.
      disabled={disabled}
      value={current ? String(current) : ''}
      onValueChange={next => {
        const n = Number(next)
        if (value === undefined) setInternal(n)
        onValueChange?.(n)
      }}
      onPointerLeave={() => setHovered(null)}
      className={cn('inline-flex items-center', className)}
    >
      {Array.from({ length: max }, (_, i) => {
        const n = i + 1
        return (
          <RadixRadioGroup.Item
            key={n}
            value={String(n)}
            aria-label={`${n} ${n === 1 ? 'star' : 'stars'}`}
            onPointerEnter={() => {
              if (!disabled) setHovered(n)
            }}
            className={cn(
              // 28px, over the 24px SC 2.5.8 floor.
              'inline-flex items-center justify-center w-7 h-7',
              // The hovered star always shows a wash under it, so pointing at a star below the
              // current value (all already filled) still answers "this one".
              'cursor-pointer transition-colors duration-[var(--duration-fast)] hover:bg-[var(--color-accent-signal-wash)]',
              'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
              disabledObject
            )}
          >
            <StarGlyph
              state={current >= n ? 'full' : hovered !== null && hovered >= n ? 'hover' : 'empty'}
              className="w-5 h-5"
            />
          </RadixRadioGroup.Item>
        )
      })}
    </RadixRadioGroup.Root>
  )
}
