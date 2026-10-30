import type { ReactNode } from 'react'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import { Navbar, type NavbarItem } from '../organisms/navbar/Navbar'
import { DivisionSymbol } from './DivisionSymbol'
import { ThemeToggle } from './ThemeToggle'
import { DocsSearch } from '../../search/DocsSearch'
import type { LinkRenderProps } from '../../lib/render-link'

/** The components index, the target of the header's Components link. */
export const COMPONENTS_HOME = '/components'
/** The theme builder, the header's Theme Builder link: a full-width page of its own. */
export const THEMES_HOME = '/themes'
/** The first Docs page. */
export const DOCS_HOME = '/guidelines/install'

/** The three demos, each with its own shell and header. The Demos menu lists them. */
export const DEMOS: { label: string; href: string; description: string }[] = [
  { label: 'Hexline Store', href: '/store', description: 'A shop: catalogue, product pages, cart and checkout.' },
  { label: 'Corvane CRM', href: '/crm', description: 'A sales pipeline: deals, accounts, contacts, forecast.' },
  { label: 'Halden Console', href: '/console', description: 'Live sensor monitoring, alerts and an assistant.' },
]

/** The top-level links, with the one that holds `path` marked current, then the Demos menu. */
export function siteNavItems(path: string): NavbarItem[] {
  return [
    { label: 'Docs', href: DOCS_HOME, current: path.startsWith('/guidelines/') },
    { label: 'Components', href: COMPONENTS_HOME, current: path === COMPONENTS_HOME || path.startsWith('/components/') },
    { label: 'Theme Builder', href: THEMES_HOME, current: path === THEMES_HOME },
    { label: 'Demos', menu: DEMOS },
  ]
}

function shellRouterLink({ href, ...rest }: LinkRenderProps) {
  return <RouterLink to={href} {...rest} />
}

function Brand() {
  return (
    <RouterLink
      to="/"
      className="inline-flex items-center gap-2 min-h-10 font-display font-bold uppercase tracking-[0.14em] text-base leading-none text-[var(--color-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
    >
      <DivisionSymbol />
      {/* Below 24rem the wordmark would push search and the theme toggle onto a second row; the
          symbol alone stays the home link, and the name stays its accessible name. */}
      <span className="sr-only @sm:not-sr-only">Division DS</span>
    </RouterLink>
  )
}

/**
 * The one header of the docs and the homepage: the wordmark home, Docs, Components, Theme Builder, the
 * Demos menu (a Navbar menu item, so it sits with the links), search and the theme toggle. Built on the Navbar organism, so the links, the current
 * fill and the narrow-screen sheet are the organism's own. `sheetExtra` goes into that sheet under
 * the links: the docs pass their sidebar nav, which has no column of its own on a phone.
 * The demos (store, CRM, console) keep their own headers.
 */
export function SiteHeader({ sheetExtra, className }: { sheetExtra?: ReactNode; className?: string }) {
  const { pathname } = useLocation()
  const path = pathname.replace(/\/+$/, '') || '/'
  return (
    <Navbar
      className={['sticky top-0 z-30 bg-[var(--color-surface-base)] [--page-gutter:1rem]', className].filter(Boolean).join(' ')}
      label="Site"
      brand={<Brand />}
      items={siteNavItems(path)}
      // Brand + four links (one is "Theme Builder") + the labelled search + the toggle need ~860px
      // on one row; below 56rem (896px) the links fold into the sheet. Measured by a width sweep.
      collapseBelow="4xl"
      renderLink={shellRouterLink}
      actions={
        <>
          <DocsSearch labelClassName="hidden @4xl:inline-flex" />
          <ThemeToggle />
        </>
      }
      menuFooter={
        sheetExtra
          ? close => (
              // A link chosen in the docs nav navigates; the sheet then has nothing left to do.
              <div
                onClick={event => {
                  if (event.target instanceof Element && event.target.closest('a')) close()
                }}
              >
                {sheetExtra}
              </div>
            )
          : undefined
      }
    />
  )
}
