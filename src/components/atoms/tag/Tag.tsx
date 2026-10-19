import { useLayoutEffect, useRef, type HTMLAttributes, type Ref } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { exitTag, slideIntoPlace } from '../../../lib/exit'
import { useMergedRefs } from '../../../lib/refs'
import { IconButton } from '../icon-button/IconButton'

export type TagProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
  /** Text, not ReactNode: the dismiss button's accessible name is built from it. */
  children: string
  /** Runs once the tag has faded out (M7), not on the click: remove the tag from the list here.
   *  Its neighbours then slide into the space it left. With reduced motion it runs at once. */
  onDismiss?: () => void
  /** Override the composed dismiss name, e.g. for another verb or another language. */
  dismissLabel?: (text: string) => string
  ref?: Ref<HTMLSpanElement>
}

export function Tag({
  children,
  onDismiss,
  dismissLabel = text => `Remove ${text}`,
  className,
  ref,
  ...rest
}: TagProps) {
  const rootRef = useRef<HTMLSpanElement | null>(null)
  const setRefs = useMergedRefs(rootRef, ref)
  const exiting = useRef(false)

  // No deps on purpose: after the render that removed a neighbour, every remaining tag checks
  // whether it moved and, if it did, slides there instead of jumping (src/lib/exit.ts).
  useLayoutEffect(() => {
    slideIntoPlace(rootRef.current)
  })

  const dismiss = () => {
    if (!onDismiss || exiting.current) return
    exiting.current = true
    exitTag(rootRef.current, () => {
      exiting.current = false
      onDismiss()
    })
  }

  return (
    <span
      ref={setRefs}
      className={cn(
        // `isolate` so the backing layer's -z-10 stacks under this tag's text, not under the page.
        'relative isolate inline-flex items-center gap-1 h-[28px] pl-[9px] shrink-0',
        // With a dismiss button, the button sits 2px in from the right and bottom outer edges, so
        // its own 8px cut runs parallel to the tag's, one even gap inside it, and the two corners
        // read as one shape.
        onDismiss ? 'pr-[2px]' : 'pr-[9px]',
        'font-mono text-[11px] uppercase tracking-wider text-[var(--color-text-secondary)]',
        className
      )}
      {...rest}
    >
      {/* The cut corner lives on a backing layer, never on the tag itself. A clip-path on the root
          would also clip the dismiss button's focus ring, which is drawn 3px outside that button
          and so reaches past the tag's own edge. The layer carries the shape, fill and border;
          the root stays unclipped. See design.md, "The focus ring is never clipped". */}
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-0 -z-10 pointer-events-none',
          'bevel-sm bevel-edge [--bevel-edge-color:var(--color-border-hairline-strong)]',
          'border border-[var(--color-border-hairline-strong)] bg-[var(--color-surface-sunken)]'
        )}
      />
      {children}
      {onDismiss ? (
        <IconButton
          label={dismissLabel(children)}
          variant="ghost"
          size="sm"
          onClick={dismiss}
          className="h-6 w-6 min-w-0"
          // No reticle: brackets outside a 24px button would land on the tag's own border.
          wrapperClassName="leading-none no-reticle"
        >
          <X aria-hidden="true" className="w-3 h-3" />
        </IconButton>
      ) : null}
    </span>
  )
}
