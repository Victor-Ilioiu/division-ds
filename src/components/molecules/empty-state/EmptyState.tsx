import type { HTMLAttributes, ReactNode, Ref } from 'react'
import { cn } from '../../../lib/cn'

export type EmptyStateProps = Omit<HTMLAttributes<HTMLDivElement>, 'title'> & {
  /** What is empty, said plainly: "No orders yet", "No replicas match". */
  title: string
  /** Required, with no default: an empty state sits inside a page, a section or a card, and only
   *  the page knows which level continues its outline there. */
  level: 2 | 3 | 4
  /** One or two sentences: why it is empty, or what fills it. */
  description?: ReactNode
  /** A lucide icon. It is wrapped in an aria-hidden tile, so it never reaches the accessible tree. */
  icon?: ReactNode
  /** One or two Buttons, laid out in a wrapping row with a gap. */
  actions?: ReactNode
  /** `md` for a page region; `sm` inside a table, a card or a panel. */
  size?: 'sm' | 'md'
  /** A dashed hairline frame. Turn it off where the container already draws an edge. */
  framed?: boolean
  ref?: Ref<HTMLDivElement>
}

const SIZE = {
  md: { root: 'gap-3 p-10', tile: 'size-12 [&>svg]:size-6', title: 'text-lg', actions: 'mt-2' },
  sm: { root: 'gap-2 p-6', tile: 'size-10 [&>svg]:size-5', title: 'text-base', actions: 'mt-1' },
} as const

/**
 * What a list, a table or a page region shows when it has nothing in it: an icon, a title that
 * names what is empty, a sentence on why, and the action that fills it.
 *
 * Promoted from the demo's own placeholder (`src/demo/states/EmptyState.tsx`), keeping what
 * worked there: centred, quiet, and framed by a DASHED hairline. Dashed is the one border in the
 * system that reads as a slot rather than a surface, which is what an empty region is. It is a
 * prop because inside a card or a table cell the container already draws the edge, and a second
 * frame inside it is noise.
 *
 * The icon sits in a small square tile on `surface.sunken`, the fill the system uses for small
 * opaque surfaces (Kbd, Tag). No cut corner: like Kbd, the tile is chrome too small for a bevel
 * to read as anything but a chipped square. The tile is `aria-hidden`, so an icon passed without
 * `aria-hidden` of its own still stays out of the accessible tree: the title already says what
 * the icon would.
 *
 * The heading level is required, for the reason SectionHeading's is. A page h1 sits above it,
 * and whether it is an h2 (the whole page is empty), an h3 (one section) or an h4 (inside a card
 * under a section heading) is the page's outline, not the component's.
 *
 * No live role. Everywhere it has been used, a page-level count ("0 replicas") already
 * announces the change that emptied the list, and a second region would announce the same event
 * twice. A caller with no such count passes `role="status"`, which `...rest` puts on the root.
 *
 * Contrast rows, by exact name: title "text.primary on surface.base"; description
 * "text.secondary on surface.base". Inside a Card or a Panel: "text.primary on surface.raised
 * (over surface.base)" and "alert body and ghost dismiss (text.secondary) on surface.raised (over
 * surface.base)", the token pair Card's own description already reuses.
 */
export function EmptyState({
  title,
  level,
  description,
  icon,
  actions,
  size = 'md',
  framed = true,
  className,
  ref,
  ...rest
}: EmptyStateProps) {
  const Heading = `h${level}` as const
  const s = SIZE[size]
  return (
    <div
      ref={ref}
      data-size={size}
      className={cn(
        'flex flex-col items-center text-center',
        s.root,
        framed && 'border border-dashed border-[var(--color-border-hairline-strong)]',
        className
      )}
      {...rest}
    >
      {icon ? (
        <span
          aria-hidden="true"
          className={cn(
            'inline-flex shrink-0 items-center justify-center',
            'border border-[var(--color-border-hairline)] bg-[var(--color-surface-sunken)] text-[var(--color-text-secondary)]',
            s.tile
          )}
        >
          {icon}
        </span>
      ) : null}
      <Heading
        className={cn(
          'font-display font-semibold leading-snug text-[var(--color-text-primary)] [overflow-wrap:anywhere]',
          s.title
        )}
      >
        {title}
      </Heading>
      {description ? (
        <p className="max-w-[48ch] font-body text-sm leading-relaxed text-[var(--color-text-secondary)]">
          {description}
        </p>
      ) : null}
      {actions ? (
        <div data-slot="actions" className={cn('flex flex-wrap items-center justify-center gap-3', s.actions)}>
          {actions}
        </div>
      ) : null}
    </div>
  )
}
