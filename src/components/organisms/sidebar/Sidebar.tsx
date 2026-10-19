import { useEffect, useId, useState, type ReactNode, type Ref } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { renderAnchor, type LinkRenderProps } from '../../../lib/render-link'

export type SidebarItem = {
  label: string
  href: string
  /** An icon, drawn aria-hidden; the label carries the meaning. */
  icon?: ReactNode
  current?: boolean
  /** A number shown at the end of the item and read as part of its name ("Orders 12"). */
  count?: number
}

export type SidebarGroup = {
  /** Also the React key for this group; unique within a Sidebar. */
  title: string
  /** Drawn before the title, aria-hidden; the title alone names the group. */
  icon?: ReactNode
  items: SidebarItem[]
  /** @default true */
  collapsible?: boolean
  /** Ignored when the group holds the current item, which always starts open. @default true */
  defaultOpen?: boolean
}

export type SidebarProps = {
  /** Required: the nav landmark's name. */
  label: string
  groups: SidebarGroup[]
  /** Above the groups: a product name, a workspace switcher. */
  header?: ReactNode
  /** Pinned below the groups when the Sidebar is given a height (h-full in a column layout): the
   *  signed-in account, a help link. */
  footer?: ReactNode
  renderLink?: (props: LinkRenderProps) => ReactNode
  className?: string
  ref?: Ref<HTMLElement>
}

/**
 * Contrast rows, by exact name. Titles and resting items: "text.secondary on surface.base", and "alert body
 * and ghost dismiss (text.secondary) on surface.raised (over surface.base)" inside a docs Example.
 * Hovered items: "hover wash text (text.primary) on accent.signal.wash over surface.base" and "hover
 * wash text (text.primary) on accent.signal.wash over surface.raised (over surface.base)". Current
 * item: "accent.signal.ink on accent.signal.fill", its fill "sidebar active item fill on surface.base"
 * and "rating filled star (accent.signal.fill) on surface.raised (over surface.base)". Focus:
 * "focus.ring on surface.base" and "focus ring (focus.ring) on surface.raised (over surface.base)".
 * Titles are text.secondary, not text.label: text.label measures 4.00:1 on surface.raised in dark.
 */
const RING = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]'
const ITEM = cn('flex items-center gap-3 w-full min-h-9 px-3 font-body text-sm transition-control', RING)
const ITEM_REST =
  'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-accent-signal-wash)]'
const ITEM_CURRENT = 'font-semibold bg-[var(--color-accent-signal-fill)] text-[var(--color-accent-signal-ink)]'
const TITLE = 'font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-secondary)]'

// The staggered reveal's per-item delay, capped so a group with many items never feels sluggish
// to open, whatever consumes this component: 40ms/item up to 5 items, 200ms of total stagger.
// 40ms/5 steps is the closer match to this codebase's only other index-based stagger precedent,
// the Spinner conveyor's 50ms block step in motion.css, and reads more clearly as a cascade than
// a smaller step over more items did. The last item then lands at 200ms (its delay) + 120ms
// (--duration-fast, its own fade/slide) = 320ms, which is this system's own --duration-slow
// rather than an arbitrary number -- a deliberate finishing point, not one that trails off past
// every named duration the rest of the system uses.
const STAGGER_STEP_MS = 40
const STAGGER_CAP = 5

function Section({ group, renderLink }: { group: SidebarGroup; renderLink: (props: LinkRenderProps) => ReactNode }) {
  const id = useId()
  const titleId = `${id}-title`
  const listId = `${id}-list`
  const collapsible = group.collapsible ?? true
  const holdsCurrent = group.items.some(item => item.current)
  const [open, setOpen] = useState(holdsCurrent || (group.defaultOpen ?? true))
  // Re-opens the group the moment holdsCurrent turns true (e.g. a router navigation moves the
  // current page into a group that was collapsed), without forcing it open on every render — a
  // reader who deliberately collapses a group that already holds the current page keeps it
  // collapsed across unrelated re-renders, since the dependency only fires on a real transition.
  useEffect(() => {
    if (holdsCurrent) setOpen(true)
  }, [holdsCurrent])
  const expanded = !collapsible || open
  // The icon sits in the title's own flex row at the chevron's 14px, so the two read as a pair
  // bracketing the label, and inherits the title's colour (and its hover shift) via currentColor.
  const heading = (
    <span className="flex items-center gap-2 min-w-0">
      {group.icon ? (
        <span aria-hidden="true" className="shrink-0 [&>svg]:w-3.5 [&>svg]:h-3.5">
          {group.icon}
        </span>
      ) : null}
      <span className="truncate">{group.title}</span>
    </span>
  )

  return (
    <div className="flex flex-col gap-2">
      {collapsible ? (
        <button
          type="button"
          id={titleId}
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen(value => !value)}
          className={cn(TITLE, 'flex w-full items-center justify-between min-h-6 px-3 cursor-pointer hover:text-[var(--color-text-primary)]', RING)}
        >
          {heading}
          <ChevronDown
            aria-hidden="true"
            className={cn('w-3.5 h-3.5 shrink-0 transition-transform motion-reduce:transition-none', !open && '-rotate-90')}
          />
        </button>
      ) : (
        <p id={titleId} className={cn(TITLE, 'px-3')}>
          {heading}
        </p>
      )}
      {/* inert sits on this wrapper, not the ul itself, so the list stays reachable by name from a
          jsdom/Testing Library role query the same way it did under the old `hidden` attribute:
          dom-accessibility-api's accname computation (step 2A) only checks the node it was asked
          to name, never an ancestor, so a directly-inert ul with aria-labelledby risks the same
          empty-name-before-labelledby-runs hazard `hidden` would have hit there. A real browser
          drops an inert subtree from the accessibility tree the same way regardless of which
          element in it carries the attribute, so this placement costs nothing there either.

          inert (not hidden) is what makes the height transition below possible: unlike hidden, it
          does not force display:none, so the grid-rows animation can still paint while the group
          is inert on close, and toggles in the same render as `expanded` -- immediately, not
          delayed to match the animation -- so a collapsed group's items are unreachable by Tab
          exactly when they are today, and an expanding group's items become reachable the instant
          it starts opening, not when the animation finishes.

          The CSS grid-rows technique (0fr collapsed, 1fr expanded, on this `grid` wrapper) animates
          to the list's real height with no JS measuring, which a max-height transition can't do
          without either guessing a ceiling or measuring in an effect. The child holding the ul
          carries overflow-clip and min-h-0, so content never spills past the 0fr row while it's
          collapsing -- overflow-clip, not overflow-hidden: `hidden` is still a scroll container,
          so a Tab landing on an item before the row finishes growing scrolled that container to
          reveal it, then snapped back as the height kept animating, a visible jump. `clip` isn't a
          scroll container at all, so it can't be scrolled into, while clipping identically. p-1 on
          the ul leaves room for each item's outside ring inside a sidebar that scrolls.

          The wrapper's own transition-duration switches with `expanded` too: --duration-base while
          opening (a graceful reveal; the staggered items keep landing past it anyway), but
          --duration-fast while closing, matching the items' own close-fade duration exactly so the
          box and the (already-uniform, unstaggered) fade-out finish on the same frame -- without
          this, the box kept shrinking for another ~60ms after every item had already faded to
          nothing, a visible empty band collapsing on its own. */}
      <div
        inert={!expanded}
        className={cn(
          'grid transition-[grid-template-rows]',
          expanded ? '[transition-duration:var(--duration-base)]' : '[transition-duration:var(--duration-fast)]',
          '[transition-timing-function:var(--ease-snap)] motion-reduce:transition-none',
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-clip min-h-0">
          <ul id={listId} role="list" aria-labelledby={titleId} className="flex flex-col gap-1 list-none p-1">
            {group.items.map((item, index) => (
              <li
                key={index}
                className={cn(
                  // `translate`, not `transform`: Tailwind's translate-y-* utilities set the CSS
                  // `translate` property (a separate property from `transform` since CSS
                  // Transforms Level 2), so transitioning `transform` here animated nothing --
                  // `translate` jumped from its start value to its end value on the very first
                  // frame, with `transform` computing to `none` the whole time.
                  'transition-[opacity,translate] [transition-duration:var(--duration-fast)]',
                  '[transition-timing-function:var(--ease-snap)] motion-reduce:transition-none',
                  expanded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
                )}
                // Staggered on open only; each item's delay grows with its index, capped at
                // STAGGER_CAP. On close every item drops back to a 0ms delay, so they fade out
                // uniformly, together. Under prefers-reduced-motion the delay is still computed
                // and set here -- CSS-only, matching the rest of this file's motion-reduce
                // convention -- but has no visible effect once motion-reduce:transition-none above
                // zeroes transition-property: a transition-delay on a property that isn't
                // transitioning never fires, the same relationship control.css and motion.css
                // already document for their own rules.
                style={{ transitionDelay: expanded ? `${Math.min(index, STAGGER_CAP) * STAGGER_STEP_MS}ms` : '0ms' }}
              >
                {renderLink({
                  href: item.href,
                  className: cn(ITEM, item.current ? ITEM_CURRENT : ITEM_REST),
                  'aria-current': item.current ? 'page' : undefined,
                  children: (
                    <>
                      {item.icon ? (
                        <span aria-hidden="true" className="shrink-0 [&>svg]:w-4 [&>svg]:h-4">
                          {item.icon}
                        </span>
                      ) : null}
                      <span className="truncate">{item.label}</span>
                      {item.count !== undefined ? (
                        <>
                          {/* A real space, so the name reads "Orders 12", not "Orders12". */}{' '}
                          <span className="ml-auto font-mono text-xs tabular-nums">{item.count}</span>
                        </>
                      ) : null}
                    </>
                  ),
                })}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

export function Sidebar({ label, groups, header, footer, renderLink = renderAnchor, className, ref }: SidebarProps) {
  return (
    <nav ref={ref} aria-label={label} className={cn('flex flex-col gap-6 w-full', className)}>
      {header}
      {groups.map(group => (
        <Section key={group.title} group={group} renderLink={renderLink} />
      ))}
      {footer ? <div className="mt-auto">{footer}</div> : null}
    </nav>
  )
}
