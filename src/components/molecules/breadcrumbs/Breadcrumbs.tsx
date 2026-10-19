import type { ReactNode, Ref } from 'react'
import { cn } from '../../../lib/cn'
import { renderAnchor, type LinkRenderProps } from '../../../lib/render-link'
import { linkVariants } from '../../atoms'

export type Crumb = { label: string; href?: string }

export type BreadcrumbsProps = {
  items: Crumb[]
  /** Collapse the middle when there are more items than this. Minimum 3. Default: no collapse. */
  maxItems?: number
  label?: string
  className?: string
  /** How each linked level is drawn. Defaults to a plain anchor. */
  renderLink?: (props: LinkRenderProps) => ReactNode
  ref?: Ref<HTMLElement>
}

/** First item, a gap, then the last (maxItems - 1). Three is the floor: below it there is no
 *  middle left to collapse and the gap would replace the only context the trail gives. */
export function collapseCrumbs(items: Crumb[], maxItems?: number): (Crumb | 'gap')[] {
  if (maxItems === undefined || items.length <= maxItems) return items
  const keep = Math.max(3, maxItems)
  if (items.length <= keep) return items
  return [items[0], 'gap', ...items.slice(items.length - (keep - 1))]
}

/**
 * Where the current page sits in a hierarchy. A named navigation landmark holding an ordered
 * list: the order is the information, so it is never a plain <ul>. The last item is text with
 * aria-current="page", never a link to the page you are on. Separators are a mono slash inside
 * an aria-hidden span, drawn inside the preceding <li> (not between <li>s, which <ol> does not
 * allow), so the list still reports the right item count and a screen reader hears "list, 4
 * items" and the labels, not "slash" three times.
 */
export function Breadcrumbs({
  items,
  maxItems,
  label = 'Breadcrumb',
  className,
  renderLink = renderAnchor,
  ref,
}: BreadcrumbsProps) {
  const shown = collapseCrumbs(items, maxItems)
  const last = shown.length - 1

  return (
    <nav ref={ref} aria-label={label} className={className}>
      {/* role="list" because list-none removes list semantics from VoiceOver/Safari, not just
          the bullet. */}
      <ol
        role="list"
        className="flex flex-wrap items-center gap-x-2 gap-y-2 font-mono text-xs uppercase tracking-[0.12em] list-none"
      >
        {shown.map((item, index) => (
          <li key={item === 'gap' ? 'gap' : `${item.label}-${index}`} className="flex items-center gap-2">
            {item === 'gap' ? (
              <span className="inline-flex items-center min-h-6">
                <span aria-hidden="true" className="text-[var(--color-text-muted)]">
                  …
                </span>
                <span className="sr-only">more levels</span>
              </span>
            ) : index === last ? (
              <span aria-current="page" className="font-semibold text-[var(--color-text-primary)]">
                {item.label}
              </span>
            ) : item.href ? (
              renderLink({
                href: item.href,
                className: cn(
                  linkVariants({ tone: 'quiet' }),
                  'inline-flex items-center min-h-6 no-underline hover:underline'
                ),
                children: item.label,
              })
            ) : (
              <span className="text-[var(--color-text-muted)]">{item.label}</span>
            )}
            {index < last ? (
              <span
                aria-hidden="true"
                data-separator
                className="inline-flex items-center min-h-6 text-[var(--color-text-muted)]"
              >
                /
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </nav>
  )
}
