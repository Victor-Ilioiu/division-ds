import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { cn } from '../../../lib/cn'
import { DEFAULT_PAGE } from '../../DefaultPage'

const RING =
  'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]'
const TAB =
  'inline-flex items-center min-h-10 px-1 font-mono text-xs font-semibold uppercase tracking-[0.12em] border-b-2 border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
const TAB_ACTIVE = 'border-[var(--color-accent-signal-indicator)] text-[var(--color-text-primary)]'

/**
 * The shared frame for every page under the Account menu: a real `h1`, a sub-nav to the three
 * account pages, and a note that everything shown under it is demo data. Each of Overview, Orders
 * and Settings renders this itself, inside its own `<RequireSession>`, rather than this file
 * owning a nested route -- the registry in `routes.ts` stays flat, matching every other page here.
 *
 * `NavLink`, not a plain router `Link`: it computes `aria-current="page"` on the active item for
 * free, needed for a person using a screen reader to tell which of the three sub-nav pages is
 * showing. `end` on Overview only -- `/store/account` is a literal
 * prefix of `/store/account/orders` and `/store/account/settings`, so without `end` Overview would
 * stay marked current on every other account page too, the same prefix hazard DemoLayout's own
 * `isNavCurrent`/`isDescendantOf` comment documents for the main Navbar.
 */
export function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <div className={cn(DEFAULT_PAGE, 'py-12 flex flex-col gap-6')}>
      <h1 className="font-display font-semibold text-2xl text-[var(--color-text-primary)]">Your account</h1>
      <nav aria-label="Account" className="flex gap-6 border-b border-[var(--color-border-hairline)]">
        <NavLink end to="/store/account" className={({ isActive }) => cn(TAB, RING, isActive && TAB_ACTIVE)}>
          Overview
        </NavLink>
        <NavLink to="/store/account/orders" className={({ isActive }) => cn(TAB, RING, isActive && TAB_ACTIVE)}>
          Orders
        </NavLink>
        <NavLink to="/store/account/settings" className={({ isActive }) => cn(TAB, RING, isActive && TAB_ACTIVE)}>
          Settings
        </NavLink>
      </nav>
      <p className="font-body text-sm text-[var(--color-text-secondary)]">
        Everything in your account here is demo data.
      </p>
      {children}
    </div>
  )
}
