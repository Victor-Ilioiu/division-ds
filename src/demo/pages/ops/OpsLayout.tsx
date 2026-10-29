import type { ReactNode } from 'react'
import { Link as RouterLink, NavLink, useLocation } from 'react-router-dom'
import { Boxes, LayoutDashboard, Settings as SettingsIcon } from 'lucide-react'
import { linkVariants } from '../../../components/atoms/link/Link'
import { Sidebar, type SidebarGroup } from '../../../components/organisms/sidebar/Sidebar'
import { cn } from '../../../lib/cn'
import { routerLink } from '../../routerLink'

export const OPS_PAGES = [
  { href: '/demo/ops', label: 'Dashboard', icon: <LayoutDashboard /> },
  { href: '/demo/ops/inventory', label: 'Inventory', icon: <Boxes /> },
  { href: '/demo/ops/settings', label: 'Settings', icon: <SettingsIcon /> },
] as const

const RING =
  'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]'
const TAB =
  'inline-flex shrink-0 items-center min-h-10 px-1 font-mono text-xs font-semibold uppercase tracking-[0.12em] border-b-2 border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
const TAB_ACTIVE = 'border-[var(--color-accent-signal-indicator)] text-[var(--color-text-primary)]'

/**
 * The frame for the Hexline back office: the store's own `Sidebar` organism down the side from
 * `md`, and the same three links as a row of underlined tabs below it, where a 13rem column would
 * leave the page a strip. Both are rendered and CSS picks one (each wrapper's `hidden`/`md:*`
 * class), the reasoning `AccountAction` in DemoLayout gives: a JS media-query swap would drop
 * focus if it landed on the link going away. `display: none` keeps the hidden one out of the tab
 * order and the accessibility tree, so there is only ever one "Back office" landmark to a reader.
 *
 * The Sidebar has no horizontal form of its own, which is the only reason the narrow row is
 * hand-built here (the same `NavLink` tabs AccountLayout uses). Each page renders this itself,
 * the way the account pages render AccountLayout, so `routes.ts` stays a flat list.
 *
 * Unlike the account pages, nothing here asks for a session: the back office is a showcase of
 * the system's range, reached from the footer, and a sign-in wall in front of it would hide the
 * very thing it exists to show.
 */
export function OpsLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const path = pathname.replace(/\/+$/, '')
  const groups: SidebarGroup[] = [
    {
      title: 'Hexline ops',
      collapsible: false,
      items: OPS_PAGES.map(page => ({
        label: page.label,
        href: page.href,
        icon: page.icon,
        current: path === page.href,
      })),
    },
  ]

  return (
    <div className="box-content max-w-screen-2xl px-gutter pt-8 pb-16 flex flex-col gap-6 md:grid md:grid-cols-[12rem_minmax(0,1fr)] md:gap-10 lg:gap-14">
      <div className="hidden md:block">
        <Sidebar
          label="Back office"
          className="sticky top-20"
          renderLink={routerLink}
          groups={groups}
          footer={
            <div className="flex flex-col gap-2 border-t border-[var(--color-border-hairline)] pt-4">
              <p className="font-body text-sm text-[var(--color-text-secondary)]">Every figure here is demo data.</p>
              <RouterLink to="/demo" className={cn(linkVariants(), 'text-sm')}>
                Back to the store
              </RouterLink>
            </div>
          }
        />
      </div>
      <nav
        aria-label="Back office"
        className="md:hidden flex gap-4 overflow-x-auto border-b border-[var(--color-border-hairline)]"
      >
        {OPS_PAGES.map(page => (
          <NavLink
            key={page.href}
            end
            to={page.href}
            className={({ isActive }) => cn(TAB, RING, isActive && TAB_ACTIVE)}
          >
            {page.label}
          </NavLink>
        ))}
      </nav>
      <div className="min-w-0 flex flex-col gap-8">{children}</div>
    </div>
  )
}
