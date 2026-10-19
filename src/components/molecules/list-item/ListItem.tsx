import type { HTMLAttributes, ReactNode, Ref } from 'react'
import { cn } from '../../../lib/cn'
import { renderAnchor, type LinkRenderProps } from '../../../lib/render-link'

export type ListProps = HTMLAttributes<HTMLUListElement> & {
  /**
   * A hairline between rows. Off for a list whose rows already sit on their own surfaces, or
   * one short enough that the spacing alone separates it.
   * @default true
   */
  dividers?: boolean
  ref?: Ref<HTMLUListElement>
}

/**
 * The `<ul>` for ListItem rows. `role="list"` is written out, not left to the element: with its
 * bullets removed, Safari drops a `ul` from the accessibility tree as a list, and a screen reader
 * then stops announcing "list, 4 items", which is how a person knows how long the list is.
 */
export function List({ dividers = true, className, ref, ...rest }: ListProps) {
  return (
    <ul
      ref={ref}
      role="list"
      data-dividers={dividers ? 'true' : 'false'}
      className={cn(
        'flex flex-col list-none p-0 m-0',
        dividers && 'divide-y divide-[var(--color-border-hairline)]',
        className
      )}
      {...rest}
    />
  )
}

export type ListItemProps = Omit<HTMLAttributes<HTMLElement>, 'title'> & {
  /** Required. The row's main line, and the accessible name of its link or button. */
  title: ReactNode
  /** A second line under the title, in secondary text. */
  description?: ReactNode
  /** Leading media: an Avatar, an icon, a thumbnail. Sits left of the text, centred on it. */
  media?: ReactNode
  /** Right-aligned mono text: a time, a price, a count. Tabular figures, so a column of them lines up. */
  meta?: ReactNode
  /** Trailing controls: a Button, an IconButton, a DropdownMenu. Each stays its own tab stop. */
  actions?: ReactNode
  /** Makes the whole row one link to this address. The title is the link; a click anywhere on the row follows it. */
  href?: string
  /** Renders the row link when `href` is set. Pass a router adapter; defaults to a plain `<a>`. */
  renderLink?: (props: LinkRenderProps) => ReactNode
  /** Makes the whole row one button. Ignored when `href` is set. */
  onActivate?: () => void
  /**
   * `li` inside a List, `div` anywhere else.
   * @default 'li'
   */
  as?: 'li' | 'div'
  ref?: Ref<HTMLElement>
}

/** The title's link or button stretches over the whole row through its ::after, which is also
 *  where its focus ring is drawn: inset, so a row in a scrolling or clipped container keeps it.
 *  Copied from ProductCard's STRETCHED_LINK, with the ring moved inside. */
const STRETCHED = cn(
  'text-left outline-none hover:underline underline-offset-2',
  "after:absolute after:inset-0 after:content-['']",
  'focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-[var(--color-focus-ring)]'
)

/**
 * One row of a list: leading media, a title with an optional description, right-aligned meta and
 * trailing actions. reui calls it Item.
 *
 * A row that goes somewhere is ONE real control, never a clickable `li`. With `href` (or
 * `onActivate`) the title becomes a link (or a button) whose ::after stretches over the row, so a
 * click anywhere on it lands on that control, and assistive tech meets a link named by the title
 * rather than a row of text with a click handler. The trailing actions are siblings of that link,
 * not children, and sit above its stretched area (`relative z-10`), so they keep their own clicks
 * and their own tab stops. Interactive content inside a link is invalid HTML and announces as one
 * merged control; this structure never nests one in the other.
 *
 * Hover on an interactive row underlines the title, the way ProductCard's name does. No row wash:
 * the description is text.secondary, and text.secondary on the signal wash is not a gated pair.
 *
 * At 320px the meta and the actions wrap under the text rather than squeezing the title to a few
 * characters a line: the text block keeps a 12rem floor before the row wraps.
 */
export function ListItem({
  title,
  description,
  media,
  meta,
  actions,
  href,
  renderLink = renderAnchor,
  onActivate,
  as: Tag = 'li',
  className,
  ref,
  ...rest
}: ListItemProps) {
  let heading: ReactNode = title
  if (href !== undefined) {
    heading = renderLink({ href, className: STRETCHED, children: title })
  } else if (onActivate) {
    heading = (
      <button type="button" onClick={onActivate} className={STRETCHED}>
        {title}
      </button>
    )
  }

  return (
    <Tag
      // Tag is a union of two intrinsic elements whose refs differ; both extend HTMLElement.
      ref={ref as Ref<HTMLLIElement & HTMLDivElement>}
      className={cn('relative flex flex-wrap items-center gap-x-4 gap-y-2 py-3', className)}
      {...rest}
    >
      {media ? <div className="flex shrink-0 items-center">{media}</div> : null}
      <div className="flex min-w-[min(12rem,100%)] flex-1 flex-col gap-0.5">
        <p className="font-body text-base font-semibold leading-snug text-[var(--color-text-primary)]">{heading}</p>
        {description ? (
          <p className="font-body text-sm text-[var(--color-text-secondary)]">{description}</p>
        ) : null}
      </div>
      {meta || actions ? (
        <div className="ml-auto flex shrink-0 items-center gap-3">
          {meta ? (
            <span className="font-mono text-sm tabular-nums text-[var(--color-text-secondary)]">{meta}</span>
          ) : null}
          {actions ? <div className="relative z-10 flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
    </Tag>
  )
}
