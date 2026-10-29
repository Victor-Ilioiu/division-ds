import type { CSSProperties, HTMLAttributes, Ref } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../../lib/cn'

export const spinnerVariants = cva(
  // The arc takes `currentColor`, so a caller can recolour it with one text utility: Button does
  // exactly that, so the arc matches whatever ink the button label is set in.
  'inline-block shrink-0 text-[var(--color-accent-signal-indicator)]',
  {
    variants: {
      size: { sm: 'w-3.5 h-3.5', md: 'w-5 h-5', lg: 'w-6 h-6' },
    },
    defaultVariants: { size: 'md' },
  }
)

/** The conveyor's glyph size per step. It is a row of text, so it scales with font size rather
 *  than with a box. */
const CONVEYOR_SIZE = { sm: 'text-xs', md: 'text-sm', lg: 'text-base' } as const

/** Lead block first: full, then two trailing shades. */
const CONVEYOR_BLOCKS = ['█', '▓', '▒'] as const
const CONVEYOR_TRACK = '░'
const CONVEYOR_COLUMNS = 10

/** Every native span prop except `role` is available — a molecule composing a Spinner can attach
 *  a `data-testid` or extra `aria-*`/`data-*` attributes. `role` is typed `never` rather than
 *  merely omitted: the component's whole guarantee is that `label` decides between
 *  `role="status"` (a live region a screen reader announces) and no role at all (decorative,
 *  the parent announces `aria-busy` itself), and this element spreads `{...rest}` AFTER its own
 *  computed `role` — so a caller-supplied `role` surviving into rest would silently win at
 *  runtime, silencing the live region a caller asked for by passing `label` in the first place.
 *  `role` is an ordinary (non-hyphenated) key, so — unlike `aria-busy`/`aria-label`/
 *  `aria-invalid` elsewhere in this codebase — `Omit<>` alone genuinely does the rejecting here;
 *  the declared `never` only makes the resulting error legible. Same shape and same remedy as
 *  `Divider`'s own `role` exclusion (`Divider.tsx`) — the established precedent for this exact
 *  key. */
export type SpinnerProps = Omit<HTMLAttributes<HTMLSpanElement>, 'role'> &
  VariantProps<typeof spinnerVariants> & {
    /** `ring` (default): a rotating arc. `conveyor`: a row of shaded blocks running along a
     *  track, for a wait that sits in a line of text or a readout. */
    variant?: 'ring' | 'conveyor'
    /** Visually hidden status text. Omit for a decorative spinner whose state the parent announces. */
    label?: string
    ref?: Ref<HTMLSpanElement>
    role?: never
  }

export function Spinner({ size, variant = 'ring', label, className, style, ref, ...rest }: SpinnerProps) {
  const status = label ? <span className="sr-only">{label}</span> : null

  if (variant === 'conveyor') {
    return (
      <span
        ref={ref}
        role={label ? 'status' : undefined}
        className={cn(
          // A fixed row of `CONVEYOR_COLUMNS` 1ch cells, clipped, so the blocks enter from the left
          // edge and leave past the right one. Text colour is the blocks; the track is dimmed.
          'spinner-conveyor relative inline-flex h-[1em] items-center overflow-hidden',
          'font-mono leading-none select-none text-[var(--color-accent-signal-indicator)]',
          CONVEYOR_SIZE[size ?? 'md'],
          className
        )}
        style={
          {
            width: `${CONVEYOR_COLUMNS}ch`,
            '--conveyor-start': `-${CONVEYOR_BLOCKS.length - 1}ch`,
            '--conveyor-end': `${CONVEYOR_COLUMNS + CONVEYOR_BLOCKS.length - 1}ch`,
            ...style,
          } as CSSProperties
        }
        {...rest}
      >
        {/* The track is one 1ch cell per column rather than one repeated string: if the mono face
            ever falls back for these block glyphs, a string would take the fallback's advance
            width and drift out of step with the 1ch blocks running over it. */}
        <span aria-hidden="true" className="spinner-conveyor-track pointer-events-none absolute inset-0 flex text-[var(--color-border-control)]">
          {Array.from({ length: CONVEYOR_COLUMNS }, (_, i) => (
            <span key={i} className="w-[1ch] shrink-0 text-center">
              {CONVEYOR_TRACK}
            </span>
          ))}
        </span>
        {CONVEYOR_BLOCKS.map((glyph, index) => (
          <span
            key={index}
            aria-hidden="true"
            // No fill. The pasted reference painted each block in the page colour to hide the
            // track under it, which shows as a dark square on any panel. The track hides itself
            // instead: see `.spinner-conveyor-track` in motion.css.
            className="spinner-conveyor-block pointer-events-none absolute top-0 left-0 flex h-full w-[1ch] items-center justify-center"
            style={{ '--i': index, zIndex: CONVEYOR_BLOCKS.length - index } as CSSProperties}
          >
            {glyph}
          </span>
        ))}
        {status}
      </span>
    )
  }

  return (
    <span
      ref={ref}
      role={label ? 'status' : undefined}
      className={cn(spinnerVariants({ size }), className)}
      style={style}
      {...rest}
    >
      {/* A ring whose lit arc grows and shrinks as it turns. The motion lives in motion.css, not
          in SMIL <animate> tags: CSS animations answer to prefers-reduced-motion, SMIL ignores it. */}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true" className="spinner-ring block w-full h-full">
        <circle cx="12" cy="12" r="9.5" strokeWidth="2.5" opacity="0.2" />
        <circle className="spinner-ring-arc" cx="12" cy="12" r="9.5" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      {status}
    </span>
  )
}
