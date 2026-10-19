import type { HTMLAttributes, ReactNode, Ref } from 'react'
import { cn } from '../../../lib/cn'

/** The fill every shape paints, and the sweep that crosses it, live in `.skeleton-shimmer`
 *  (src/styles/motion.css) so reduced motion can stop the sweep in one place. The fill is
 *  `border.hairline`, not `surface.sunken`: hairline is translucent, so the same placeholder reads
 *  on the page, on a raised Card and inside a Dialog, where sunken is all but invisible against
 *  the dark page background. */
const SHAPE = 'skeleton-shimmer block'

/** Avatar's own footprints, with the same rule for the cut: md and lg are bevelled, sm (24px)
 *  is not. A placeholder that changes shape when the image arrives reads as a layout jump. */
const AVATAR_SIZES = {
  sm: 'w-6 h-6',
  md: 'w-9 h-9 bevel-sm',
  lg: 'w-12 h-12 bevel-sm',
} as const

export type SkeletonProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  /** `text` draws `lines` bars; `block` is any rectangle you size with className; `avatar` is an
   *  Avatar's exact footprint. */
  shape?: 'text' | 'block' | 'avatar'
  /** Only for `text`. The last of several lines is shorter, the way a paragraph ends. */
  lines?: number
  /** Only for `avatar`, matching Avatar's size. */
  size?: 'sm' | 'md' | 'lg'
  className?: string
  ref?: Ref<HTMLDivElement>
  children?: never
}

/**
 * A loading placeholder in the bevel language: square corners, the cut on anything big enough to
 * carry it, no pill and no circle. There is no `circle` shape because the system has no circle;
 * Avatar is a square, so its placeholder is `shape="avatar"`.
 *
 * Every shape is aria-hidden. A grey bar says nothing to a screen reader, and twenty of them say
 * nothing twenty times. The words belong on the container: wrap the placeholders in
 * `SkeletonGroup`, which sets `aria-busy` and carries a visually hidden "Loading…".
 *
 * Text lines are 0.75rem tall with 0.5rem between them, close to a 14px line of body copy, so a
 * text skeleton occupies roughly the height of the text that replaces it.
 */
export function Skeleton({ shape = 'text', lines = 1, size = 'md', className, ref, ...rest }: SkeletonProps) {
  if (shape === 'text') {
    const count = Math.max(1, Math.floor(lines))
    return (
      <div ref={ref} aria-hidden="true" className={cn('flex w-full flex-col gap-2', className)} {...rest}>
        {Array.from({ length: count }, (_, i) => (
          <span
            key={i}
            data-skeleton-line=""
            className={cn(SHAPE, 'h-3', count > 1 && i === count - 1 ? 'w-3/5' : 'w-full')}
          />
        ))}
      </div>
    )
  }
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn(
        SHAPE,
        'shrink-0',
        shape === 'avatar' ? AVATAR_SIZES[size] : 'bevel-sm min-h-6',
        className
      )}
      {...rest}
    />
  )
}

export type SkeletonGroupProps = HTMLAttributes<HTMLDivElement> & {
  /** The words a screen reader hears in place of the shapes. Name what is loading when you can:
   *  "Loading orders" says more than "Loading…". */
  label?: string
  children: ReactNode
  className?: string
  ref?: Ref<HTMLDivElement>
}

/**
 * The container half of the pattern. `aria-busy="true"` tells assistive tech the region is being
 * filled, and the hidden label says so in words, because the shapes inside are aria-hidden.
 *
 * Unmount it when the content arrives rather than flipping `aria-busy` to false around the real
 * content: the real content then renders in its own markup, with no leftover busy region.
 */
export function SkeletonGroup({ label = 'Loading…', children, className, ref, ...rest }: SkeletonGroupProps) {
  return (
    <div ref={ref} aria-busy="true" className={className} {...rest}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  )
}
