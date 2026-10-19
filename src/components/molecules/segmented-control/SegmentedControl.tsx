import { useRef, type KeyboardEvent, type ReactNode, type Ref } from 'react'
import { RadioGroup as RadixRadioGroup } from 'radix-ui'
import { cn } from '../../../lib/cn'

export type SegmentedControlOption = {
  value: string
  /** Always shown. The icon, if any, sits before it. */
  label: string
  /** A lucide icon, aria-hidden: the label names the option. */
  icon?: ReactNode
}

export type SegmentedControlProps = {
  /** Required. Names the group: "View", "Range". */
  label: string
  options: readonly SegmentedControlOption[]
  value: string
  onValueChange: (value: string) => void
  /** Button's sm and md heights. @default 'md' */
  size?: 'sm' | 'md'
  className?: string
  ref?: Ref<HTMLDivElement>
}

const SIZE = {
  sm: 'h-[var(--component-control-height-sm)] px-3 gap-1.5 [&_svg]:w-3.5 [&_svg]:h-3.5',
  md: 'h-[var(--component-control-height-md)] px-4 gap-2 [&_svg]:w-4 [&_svg]:h-4',
} as const

/**
 * One choice out of two to five that changes what is on screen in place: Board or Table, 1 h,
 * 24 h or 7 d. Radix RadioGroup underneath, so the semantics are a `radiogroup` named by `label`
 * with one `radio` per option, and Radix owns the keyboard: one tab stop on the selected option,
 * and the arrow keys move and select together, the way a native radio group behaves.
 *
 * Tabs is the other component that looks like this. Tabs is for panels (each tab owns a region
 * of content with `role="tabpanel"`); this is for a setting that filters or re-renders the same
 * content, which has no panel to point at.
 *
 * Selection is a block of `accent.signal.fill` with `accent.signal.ink` text in semibold, the
 * same grammar as the Tabs fill variant and Select's highlighted row, so the state is a change of
 * shape and weight as well as hue. The frame is `border.control`, the informational hairline,
 * because the frame is what tells a reader the options belong together.
 *
 * Heights are Button's `sm` and `md` (`component.control.height.*`), so a control sits level with
 * the buttons beside it in a toolbar. The row scrolls sideways inside itself rather than pushing
 * the page wide at 320px.
 *
 * Contrast rows, by exact name. Selected: "accent.signal.ink on accent.signal.fill", "checked/on
 * fill (accent.signal.fill) on surface.base" and "rating filled star (accent.signal.fill) on
 * surface.raised (over surface.base)". Unselected text: "text.secondary on surface.base" and
 * "alert body and ghost dismiss (text.secondary) on surface.raised (over surface.base)". Frame:
 * "control border (over control fill) on surface.base" and "button secondary border
 * (border.control) on surface.raised (over surface.base)".
 */
export function SegmentedControl({
  label,
  options,
  value,
  onValueChange,
  size = 'md',
  className,
  ref,
}: SegmentedControlProps) {
  const items = useRef<(HTMLButtonElement | null)[]>([])

  // The arrow keys are handled here and not left to Radix. Radix moves focus a macrotask after the
  // keydown and selects the newly focused radio only if the key is still down when focus lands, so
  // a quick press (or two in a row, or a scripted one) moved focus without selecting, or selected
  // from a stale position. Here one keydown moves focus and selects, synchronously, and
  // `preventDefault` keeps Radix's own handler out of it. Wraps at the ends, as Radix does.
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key]
    if (step === undefined) return
    event.preventDefault()
    const next = (index + step + options.length) % options.length
    items.current[next]?.focus()
    if (options[next].value !== value) onValueChange(options[next].value)
  }

  return (
    <RadixRadioGroup.Root
      ref={ref}
      aria-label={label}
      value={value}
      onValueChange={onValueChange}
      className={cn(
        // w-fit: as wide as its options, even as a child of a flex column, which would stretch it.
        'inline-flex w-fit max-w-full overflow-x-auto p-0.5 gap-0.5',
        'border border-[var(--color-border-control)]',
        className
      )}
    >
      {options.map((option, index) => (
        <RadixRadioGroup.Item
          key={option.value}
          ref={node => {
            items.current[index] = node
          }}
          value={option.value}
          onKeyDown={event => onKeyDown(event, index)}
          className={cn(
            'inline-flex shrink-0 items-center justify-center whitespace-nowrap',
            'font-mono text-xs uppercase tracking-[0.12em]',
            'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-control',
            'data-[state=checked]:bg-[var(--color-accent-signal-fill)] data-[state=checked]:font-semibold',
            'data-[state=checked]:text-[var(--color-accent-signal-ink)]',
            // Inset, so the ring stays inside the frame and inside the scrolling row. On the
            // selected option the signal ring would vanish into the signal fill, so it is drawn in
            // ink there, as the active Tabs trigger does.
            'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
            'data-[state=checked]:focus-visible:outline-[var(--color-accent-signal-ink)]',
            SIZE[size]
          )}
        >
          {option.icon === undefined ? null : (
            <span aria-hidden="true" className="inline-flex shrink-0">
              {option.icon}
            </span>
          )}
          {option.label}
        </RadixRadioGroup.Item>
      ))}
    </RadixRadioGroup.Root>
  )
}
