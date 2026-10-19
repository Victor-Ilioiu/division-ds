import type { ReactNode, Ref } from 'react'
import { cn } from '../../../lib/cn'

export type PageHeaderProps = {
  /** The page's name: the h1's text, and so the name of any region that points at `id`. */
  title: string
  /** A short mono label above the title: the section the page belongs to ("Operations"). */
  eyebrow?: ReactNode
  /** One or two sentences under the title. */
  description?: ReactNode
  /** The page's own actions, usually one or two Buttons. They sit at the trailing edge and drop
   *  under the title when the row runs out of room. */
  actions?: ReactNode
  /** A `Breadcrumbs` trail, drawn above everything else. */
  breadcrumbs?: ReactNode
  /** Lands on the h1, not the wrapper, so `<main aria-labelledby={id}>` is named by the title. */
  id?: string
  /** 1, the page's title, unless the header sits inside a page that already has its h1: a pane,
   *  a tab panel, a docs example. Then 2. */
  level?: 1 | 2
  className?: string
  ref?: Ref<HTMLDivElement>
}

/**
 * The top of a screen: an optional breadcrumb trail, an optional eyebrow, the page's one h1, an
 * optional description, and the page's own actions at the trailing edge.
 *
 * The h1 is the AGENTS.md page title exactly, `font-display font-semibold text-2xl`, stepping to
 * `text-3xl` once the header is given 48rem: a screen that wrote its own h1 before this existed
 * and one that uses this component read as the same page. A page has one h1 and this is it; a
 * heading further down the page is a SectionHeading. `level={2}` exists for the one case where a
 * page-shaped header sits inside another page (a pane, a tab panel, a docs example): the docs page
 * for this component drew four h1s before it existed. The look does not change with the level.
 *
 * The eyebrow is the system's label role (mono, 12px, uppercase, tracked) in `text.muted`, and a
 * `p` above the h1 rather than a span inside it, so the page is announced as "Inventory" and not
 * as "Operations Inventory". Reading order is still eyebrow then title, as it is drawn.
 *
 * The breadcrumbs slot comes first in the DOM, so "where am I" is heard before "what is this",
 * the order every screen reader user meets on a site that has a trail at all. It is a slot, not
 * an `items` array, so the trail keeps its own `renderLink` and `maxItems` and this component
 * never has to re-export them.
 *
 * `@container` on the root, the way SectionHeading does it: the title steps up and the actions
 * wrap with the width the header is given, not with the viewport, so the same header works in a
 * full page and in a narrow pane beside a sidebar.
 *
 * A `div`, not a `header`. Inside `main` a `header` is a plain group, and outside it, which is
 * where a header near the top of a layout often ends up, it becomes a second banner landmark
 * beside the shell's own.
 *
 * Contrast rows, by exact name: title "text.primary on surface.base"; eyebrow "text.muted on
 * surface.base"; description "text.secondary on surface.base".
 */
export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
  breadcrumbs,
  id,
  level = 1,
  className,
  ref,
}: PageHeaderProps) {
  const Heading = level === 2 ? 'h2' : 'h1'
  return (
    <div ref={ref} className={cn('@container flex flex-col gap-4', className)}>
      {breadcrumbs ? <div data-slot="breadcrumbs">{breadcrumbs}</div> : null}
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="flex min-w-0 flex-[1_1_20rem] flex-col gap-2">
          {eyebrow ? (
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              {eyebrow}
            </p>
          ) : null}
          <Heading
            id={id}
            className="font-display text-2xl font-semibold leading-tight text-[var(--color-text-primary)] [overflow-wrap:anywhere] @3xl:text-3xl"
          >
            {title}
          </Heading>
          {description ? (
            <p className="max-w-[64ch] font-body text-base leading-relaxed text-[var(--color-text-secondary)]">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div data-slot="actions" className="flex min-w-0 max-w-full flex-wrap items-center gap-3">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  )
}
