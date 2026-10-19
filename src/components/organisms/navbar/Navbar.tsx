import { useState, type ReactNode, type Ref } from 'react'
import { Menu } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { renderAnchor, type LinkRenderProps } from '../../../lib/render-link'
import { IconButton } from '../../atoms'
import { Sheet, SheetContent, SheetTrigger } from '../sheet/Sheet'

export type NavbarItem = { label: string; href: string; current?: boolean }

export type NavbarProps = {
  /** Required: the nav landmark's name. Two navs on one page need two names. */
  label: string
  /** The wordmark or logo, usually a link home. */
  brand: ReactNode
  items: NavbarItem[]
  /** Right-hand controls: icon buttons, a cart link, an account menu. Keep them small; they stay
   *  visible at every width. */
  actions?: ReactNode
  /** How each link is drawn. Defaults to a plain anchor. */
  renderLink?: (props: LinkRenderProps) => ReactNode
  /** The menu button's name and the sheet's title. @default 'Menu' */
  menuLabel?: string
  /** Shown in the menu sheet under the links: an action that lives in `actions` on a wide bar but
   *  has no room there on a narrow one. Hide its `actions` twin below the bar's own breakpoint
   *  with a wrapper carrying `hidden @2xl:flex`. */
  menuFooter?: ReactNode
  className?: string
  ref?: Ref<HTMLElement>
}

/**
 * Contrast rows, by exact name. Resting link: "text.secondary on surface.base", and "alert body and ghost
 * dismiss (text.secondary) on surface.raised (over surface.base)" inside a docs Example. Hovered:
 * "hover wash text (text.primary) on accent.signal.wash over surface.base" and "hover wash text
 * (text.primary) on accent.signal.wash over surface.raised (over surface.base)". Current: "accent.
 * signal.ink on accent.signal.fill", the fill itself "sidebar active item fill on surface.base" and
 * "rating filled star (accent.signal.fill) on surface.raised (over surface.base)". Focus: "focus.ring
 * on surface.base" and "focus ring (focus.ring) on surface.raised (over surface.base)".
 */
const LINK = cn(
  'inline-flex items-center min-h-10 px-3 font-mono text-xs uppercase tracking-[0.12em] transition-control',
  // Outside the link, on the surface: on the fill the ring would vanish, and on the wash it measures
  // under 3:1 in light theme.
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]'
)
const LINK_REST =
  'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-accent-signal-wash)]'
const LINK_CURRENT = 'font-semibold bg-[var(--color-accent-signal-fill)] text-[var(--color-accent-signal-ink)]'

export function Navbar({
  label,
  brand,
  items,
  actions,
  renderLink = renderAnchor,
  menuLabel = 'Menu',
  menuFooter,
  className,
  ref,
}: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  const link = (item: NavbarItem, extra?: string, onClick?: () => void) =>
    renderLink({
      href: item.href,
      className: cn(LINK, item.current ? LINK_CURRENT : LINK_REST, extra),
      'aria-current': item.current ? 'page' : undefined,
      onClick,
      children: item.label,
    })

  return (
    <header ref={ref} className={cn('@container border-b border-[var(--color-border-hairline)]', className)}>
      {/* flex-wrap + gap-x/gap-y rather than a hard nowrap row: below the @2xl breakpoint the bar
          holds only the brand, the actions and the menu button, but a wide brand or a long actions
          slot can still outrun 320px on its own, and a row that wraps stays legible where one that
          clips or forces horizontal scroll would fail SC 1.4.10.

          `px-gutter`: the page gutter (`--page-gutter`, src/styles/tailwind.css), so the brand
          starts on the same left edge as the content of the page under it. 1rem unless the shell
          around the Navbar sets it. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 min-h-14 px-gutter py-2">
        <div className="shrink-0">{brand}</div>
        <nav aria-label={label} className="hidden @2xl:block">
          <ul role="list" className="flex items-center gap-1 list-none">
            {items.map((item, index) => (
              <li key={index}>{link(item)}</li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {actions}
          {/* The breakpoint sits on this div: .bevel-focus-wrap sets its own display outside
              Tailwind's layers, so `@2xl:hidden` on the IconButton's wrapper would lose. */}
          <div className="@2xl:hidden">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <IconButton label={menuLabel} variant="ghost">
                  <Menu aria-hidden="true" className="w-5 h-5" />
                </IconButton>
              </SheetTrigger>
              <SheetContent title={menuLabel}>
                <nav aria-label={label}>
                  <ul role="list" className="flex flex-col gap-1 list-none p-1">
                    {items.map((item, index) => (
                      <li key={index}>{link(item, 'flex w-full min-h-11', () => setMenuOpen(false))}</li>
                    ))}
                  </ul>
                </nav>
                {menuFooter === undefined ? null : (
                  <div className="mt-4 border-t border-[var(--color-border-hairline)] p-1 pt-4">{menuFooter}</div>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  )
}
