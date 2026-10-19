import { Suspense, useEffect, useMemo, useState, type ReactElement } from 'react'
import { matchPath, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Activity as ActivityIcon,
  Building2,
  Columns3,
  Handshake,
  Info,
  Menu,
  Search as SearchIcon,
  TrendingUp,
  UserRound,
  Users,
} from 'lucide-react'
import { Avatar } from '../components/atoms/avatar/Avatar'
import { Button } from '../components/atoms/button/Button'
import { IconButton } from '../components/atoms/icon-button/IconButton'
import { Kbd } from '../components/atoms/kbd/Kbd'
import { Spinner } from '../components/atoms/spinner/Spinner'
import { TooltipProvider } from '../components/atoms/tooltip/Tooltip'
import { Toaster } from '../components/molecules/toast/Toast'
import { CommandPalette, type Command } from '../components/organisms/command-palette/CommandPalette'
import { Sheet, SheetContent } from '../components/organisms/sheet/Sheet'
import { Sidebar, type SidebarGroup } from '../components/organisms/sidebar/Sidebar'
import { BackToDocs } from '../components/shell/BackToDocs'
import { ThemeToggle } from '../components/shell/ThemeToggle'
import { ACCOUNTS, CURRENT_REP_ID, PRODUCT_NAME, repById, WORKSPACE } from './data'
import { DealSheet } from './DealSheet'
import { isOpen } from './model'
import { crmLink, useOpenSheet } from './navigation'
import { CRM_HOME, CRM_NOT_FOUND_TITLE, CRM_PAGES } from './routes'
import { CrmProvider, useCrm } from './store'

const NAV_ICON: Record<string, ReactElement> = {
  '/crm': <Columns3 />,
  '/crm/accounts': <Building2 />,
  '/crm/contacts': <Users />,
  '/crm/activity': <ActivityIcon />,
  '/crm/forecast': <TrendingUp />,
  '/crm/about': <Info />,
}

/** The one persistent statement that nothing here is real, on every page and at every width. */
export const DEMO_NOTE =
  'Corvane is a demo: every company, person and figure is invented, and your changes reset when the page reloads.'

function useDocumentTitle(path: string) {
  useEffect(() => {
    const page = CRM_PAGES.find(p => matchPath({ path: p.path, end: true }, path))
    if (page?.titleFromPage) return
    document.title = page ? page.title : CRM_NOT_FOUND_TITLE
  }, [path])
}

function Brand() {
  return (
    <div className="flex flex-col gap-0.5 px-1">
      <span className="font-display text-lg font-bold uppercase tracking-[0.14em] leading-none">{PRODUCT_NAME}</span>
      <span className="font-body text-sm text-[var(--color-text-secondary)]">{WORKSPACE}</span>
    </div>
  )
}

function SignedIn() {
  const rep = repById(CURRENT_REP_ID)
  return (
    <div className="flex items-center gap-3 border-t border-[var(--color-border-hairline)] pt-4">
      <Avatar name={rep.name} size="md" status="online" />
      <div className="flex min-w-0 flex-col">
        <span className="truncate font-body text-sm font-semibold">{rep.name}</span>
        <span className="truncate font-body text-sm text-[var(--color-text-secondary)]">{rep.title}</span>
      </div>
    </div>
  )
}

function CrmNav({ path, className }: { path: string; className?: string }) {
  const { state } = useCrm()
  const openDeals = state.deals.filter(isOpen).length
  const groups: SidebarGroup[] = [
    {
      title: 'Workspace',
      collapsible: false,
      items: CRM_PAGES.filter(page => page.inNav).map(page => ({
        label: page.label,
        href: page.path,
        icon: NAV_ICON[page.path],
        count: page.path === CRM_HOME ? openDeals : undefined,
        // An account page sits under Accounts.
        current: path === page.path || (page.path !== CRM_HOME && path.startsWith(`${page.path}/`)),
      })),
    },
  ]
  return (
    <Sidebar
      label={PRODUCT_NAME}
      className={className}
      renderLink={crmLink}
      header={<Brand />}
      groups={groups}
      footer={<SignedIn />}
    />
  )
}

/** Every deal, account, contact and page, for the command palette. */
function usePaletteCommands(): Command[] {
  const { state } = useCrm()
  const navigate = useNavigate()
  const openDeal = useOpenSheet('deal')
  return useMemo(() => {
    const pages: Command[] = CRM_PAGES.filter(page => page.inNav).map(page => ({
      id: `page-${page.path}`,
      label: page.label,
      group: 'Pages',
      icon: NAV_ICON[page.path],
      onSelect: () => navigate(page.path),
    }))
    const deals: Command[] = state.deals.map(deal => ({
      id: `deal-${deal.id}`,
      label: deal.name,
      group: 'Deals',
      keywords: [ACCOUNTS.find(a => a.id === deal.accountId)?.name ?? ''],
      icon: <Handshake />,
      onSelect: () => openDeal(deal.id),
    }))
    const accounts: Command[] = ACCOUNTS.map(account => ({
      id: `account-${account.id}`,
      label: account.name,
      group: 'Accounts',
      keywords: [account.city, account.industry],
      icon: <Building2 />,
      onSelect: () => navigate(`/crm/accounts/${account.id}`),
    }))
    const contacts: Command[] = state.contacts.map(contact => ({
      id: `contact-${contact.id}`,
      label: contact.name,
      group: 'Contacts',
      keywords: [contact.title, ACCOUNTS.find(a => a.id === contact.accountId)?.name ?? ''],
      icon: <UserRound />,
      onSelect: () => navigate(`/crm/contacts?contact=${contact.id}`, { state: { sheetFromApp: true } }),
    }))
    return [...pages, ...deals, ...accounts, ...contacts]
  }, [state.deals, state.contacts, navigate, openDeal])
}

function PageFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Spinner variant="conveyor" size="lg" label="Loading page" />
    </div>
  )
}

function Shell() {
  const { pathname } = useLocation()
  const path = pathname.replace(/\/+$/, '') || '/'
  useDocumentTitle(path)
  const [navOpen, setNavOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const commands = usePaletteCommands()

  // A link chosen in the narrow-screen menu sheet navigates; the sheet then has nothing left to do.
  useEffect(() => setNavOpen(false), [path])

  return (
    <div className="min-h-screen bg-[var(--color-surface-base)] text-[var(--color-text-primary)] font-body md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
      <a
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-20 focus:bg-[var(--color-accent-signal-fill)] focus:text-[var(--color-accent-signal-ink)] focus:px-3 focus:py-2"
        href="#main"
      >
        Skip to content
      </a>
      <div className="hidden md:block sticky top-0 h-screen border-r border-[var(--color-border-hairline)] px-3 py-5">
        <CrmNav path={path} className="h-full" />
      </div>
      <div className="flex min-h-screen min-w-0 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-[var(--color-border-hairline)] bg-[var(--color-surface-base)] px-4 md:px-8">
          <span className="md:hidden">
            <Sheet open={navOpen} onOpenChange={setNavOpen}>
              <IconButton label="Menu" variant="ghost" size="sm" onClick={() => setNavOpen(true)}>
                <Menu aria-hidden="true" />
              </IconButton>
              <SheetContent side="left" title="Menu">
                <CrmNav path={path} />
                <div className="mt-4 border-t border-[var(--color-border-hairline)] pt-4">
                  <BackToDocs />
                </div>
              </SheetContent>
            </Sheet>
          </span>
          <span className="md:hidden font-display font-bold uppercase tracking-[0.14em]">{PRODUCT_NAME}</span>
          <div className="ml-auto flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              iconStart={<SearchIcon />}
              onClick={() => setPaletteOpen(true)}
              aria-label="Search deals, accounts, contacts and pages"
              aria-keyshortcuts="Control+K Meta+K"
            >
              <span className="hidden sm:inline">Search</span>
              <Kbd aria-hidden="true" className="hidden sm:inline-flex ml-2">
                Ctrl K
              </Kbd>
            </Button>
            {/* Below md the nav is in the menu sheet, and so is this. */}
            <span className="hidden md:inline-flex">
              <BackToDocs />
            </span>
            <ThemeToggle />
          </div>
        </header>
        <main id="main" tabIndex={-1} className="flex-1 min-w-0 px-4 py-6 md:px-8 md:py-8 focus:outline-none">
          <Suspense fallback={<PageFallback />}>
            <Outlet />
          </Suspense>
        </main>
        <p className="border-t border-[var(--color-border-hairline)] px-4 py-4 font-body text-sm text-[var(--color-text-secondary)] md:px-8">
          {DEMO_NOTE}
        </p>
      </div>
      <DealSheet />
      <CommandPalette
        commands={commands}
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        label="Search Corvane"
        searchLabel="Search deals, accounts, contacts and pages"
        placeholder="Search deals, accounts, contacts"
        emptyMessage="Nothing matches"
      />
    </div>
  )
}

/**
 * Corvane's shell: the app-shell frame (a Sidebar down the left from `md`, a top bar with search
 * and the theme toggle, the menu in a Sheet below `md`), its own providers, the store, the deal
 * sheet that any page opens through `?deal=`, and the command palette (Ctrl+K or Cmd+K).
 *
 * A separate demo from the Hexline store on purpose: Hexline exercises the system as a shop, and a
 * CRM exercises the dense half (tables with bulk actions, a board, sheets beside lists, a feed)
 * that a shop never needs. Sharing a shell would have bent one or the other.
 */
export function CrmLayout() {
  return (
    <TooltipProvider>
      <Toaster>
        <CrmProvider>
          <Shell />
        </CrmProvider>
      </Toaster>
    </TooltipProvider>
  )
}

export default CrmLayout
