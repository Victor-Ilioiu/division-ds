import { useId, useState, type ReactNode, type Ref } from 'react'
import { ChevronDown, Menu } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { renderAnchor, type LinkRenderProps } from '../../../lib/render-link'
import { IconButton } from '../../atoms'
import { Sheet, SheetContent, SheetTrigger } from '../sheet/Sheet'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../molecules/dropdown-menu/DropdownMenu'

/** One entry of a menu item: a link, with an optional line under its label. */
export type NavbarMenuEntry = { label: string; href: string; description?: string }
/** A plain link in the bar. */
export type NavbarLink = { label: string; href: string; current?: boolean }
/** A menu among the links: a button that opens a dropdown of links on a wide bar, and a labelled
 *  group of the same links in the menu sheet on a narrow one. `current` fills the button when the
 *  page is one of its entries. */
export type NavbarMenu = { label: string; menu: NavbarMenuEntry[]; current?: boolean }
export type NavbarItem = NavbarLink | NavbarMenu

const isMenu = (item: NavbarItem): item is NavbarMenu => 'menu' in item

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
   *  with a wrapper carrying `hidden @2xl:flex` (`@4xl` with `collapseBelow="4xl"`). A function receives `close`, for an entry that
   *  opens something else (a search dialog) and has to shut the sheet first. */
  menuFooter?: ReactNode | ((close: () => void) => ReactNode)
  /** The bar's own width below which the links fold into the menu sheet. Pick the one at which
   *  brand + links + actions still fit on one row with room to spare: '2xl' (42rem) for a short
   *  set, '4xl' (56rem) for four or more links next to a labelled search. @default '2xl' */
  collapseBelow?: '2xl' | '4xl'
  className?: string
  ref?: Ref<HTMLElement>
}

/**
 * Contrast rows, by exact name. Resting link: "text.secondary on surface.base", and "alert body and ghost
 * dismiss (text.secondary) on surface.raised (over surface.base)" inside a docs Example. Hovered:
 * "hover wash text (text.primary) on accent.signal.wash over surface.base" and "hover wash text
 * (text.primary) on accent.signal.wash over surface.raised (over surface.base)". Current: "accent.
 * signal.ink on accent.signal.indicator", the fill itself "sidebar active item fill on surface.base" and
 * "rating filled star (accent.signal.indicator) on surface.raised (over surface.base)". Focus: "focus.ring
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
const LINK_CURRENT = 'font-semibold bg-[var(--color-accent-signal-indicator)] text-[var(--color-accent-signal-indicator-ink)]'

const BREAKPOINTS = {
  '2xl': { nav: 'hidden @2xl:block', trigger: '@2xl:hidden' },
  '4xl': { nav: 'hidden @4xl:block', trigger: '@4xl:hidden' },
} as const

export function Navbar({
  label,
  brand,
  items,
  actions,
  renderLink = renderAnchor,
  menuLabel = 'Menu',
  menuFooter,
  collapseBelow = '2xl',
  className,
  ref,
}: NavbarProps) {
  // Literal class names, so Tailwind's scanner sees every one.
  const bp = BREAKPOINTS[collapseBelow]
  const [menuOpen, setMenuOpen] = useState(false)
  const uid = useId()

  const link = (item: NavbarLink, extra?: string, onClick?: () => void) =>
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
        <nav aria-label={label} className={bp.nav}>
          <ul role="list" className="flex items-center gap-2 list-none">
            {items.map((item, index) => (
              <li key={index}>
                {isMenu(item) ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button type="button" className={cn(LINK, 'gap-1', item.current ? LINK_CURRENT : LINK_REST)}>
                        {item.label}
                        <ChevronDown aria-hidden="true" className="w-3.5 h-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-72">
                      {item.menu.map(entry => (
                        <DropdownMenuItem key={entry.href} asChild className="py-2">
                          {renderLink({
                            href: entry.href,
                            className: '',
                            children: (
                              <span className="flex flex-col gap-0.5">
                                <span className="font-semibold">{entry.label}</span>
                                {entry.description ? (
                                  <span className="text-xs text-[var(--color-text-secondary)] group-data-[highlighted]:text-inherit">{entry.description}</span>
                                ) : null}
                              </span>
                            ),
                          })}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  link(item)
                )}
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {actions}
          {/* The breakpoint sits on this div: .bevel-focus-wrap sets its own display outside
              Tailwind's layers, so `@2xl:hidden` on the IconButton's wrapper would lose. */}
          <div className={bp.trigger}>
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <IconButton label={menuLabel} variant="ghost" size="sm">
                  <Menu aria-hidden="true" className="w-5 h-5" />
                </IconButton>
              </SheetTrigger>
              <SheetContent title={menuLabel}>
                <nav aria-label={label}>
                  <ul role="list" className="flex flex-col gap-1 list-none p-1">
                    {items.map((item, index) =>
                      isMenu(item) ? (
                        <li key={index} className="mt-3">
                          <p id={`${uid}menu-${index}`} className="px-3 pb-2 font-mono text-xs uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
                            {item.label}
                          </p>
                          <ul role="list" aria-labelledby={`${uid}menu-${index}`} className="flex flex-col gap-1 list-none">
                            {item.menu.map(entry => (
                              <li key={entry.href}>
                                {renderLink({
                                  href: entry.href,
                                  className: 'flex flex-col min-h-11 justify-center px-3 py-1 text-[var(--color-text-primary)] hover:bg-[var(--color-accent-signal-wash)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
                                  onClick: () => setMenuOpen(false),
                                  children: (
                                    <>
                                      <span className="font-semibold text-sm">{entry.label}</span>
                                      {entry.description ? <span className="text-xs text-[var(--color-text-secondary)]">{entry.description}</span> : null}
                                    </>
                                  ),
                                })}
                              </li>
                            ))}
                          </ul>
                        </li>
                      ) : (
                        <li key={index}>{link(item, 'flex w-full min-h-11', () => setMenuOpen(false))}</li>
                      )
                    )}
                  </ul>
                </nav>
                {menuFooter === undefined ? null : (
                  <div className="mt-4 border-t border-[var(--color-border-hairline)] p-1 pt-4">
                    {typeof menuFooter === 'function' ? menuFooter(() => setMenuOpen(false)) : menuFooter}
                  </div>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  )
}
