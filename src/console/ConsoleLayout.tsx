import { Suspense, useEffect, useMemo, useState, type ReactElement } from 'react'
import { Link as RouterLink, matchPath, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BellRing, Info, LayoutDashboard, Menu, Pause, Play, Sparkles, Warehouse } from 'lucide-react'
import { Avatar } from '../components/atoms/avatar/Avatar'
import { Button } from '../components/atoms/button/Button'
import { IconButton } from '../components/atoms/icon-button/IconButton'
import { Spinner } from '../components/atoms/spinner/Spinner'
import { TooltipProvider } from '../components/atoms/tooltip/Tooltip'
import { SegmentedControl } from '../components/molecules/segmented-control/SegmentedControl'
import { Toaster } from '../components/molecules/toast/Toast'
import type { Command } from '../components/organisms/command-palette/CommandPalette'
import { Sheet, SheetContent } from '../components/organisms/sheet/Sheet'
import { Sidebar, type SidebarGroup } from '../components/organisms/sidebar/Sidebar'
import { BackToDocs } from '../components/shell/BackToDocs'
import { DocsSearch } from '../search/DocsSearch'
import { DivisionSymbol } from '../components/shell/DivisionSymbol'
import { ThemeToggle } from '../components/shell/ThemeToggle'
import { AlertSheet } from './AlertSheet'
import { scriptFor, SUGGESTIONS } from './assistant'
import { AssistantView } from './AssistantView'
import { ALERT_ICON, newestFirst } from './bits'
import { OPERATOR, PRODUCT_NAME, SITES, WORKSPACE } from './data'
import { isActive } from './model'
import { consoleLink, useOpenAlert } from './navigation'
import { CONSOLE_ASSISTANT, CONSOLE_HOME, CONSOLE_NOT_FOUND_TITLE, CONSOLE_PAGES } from './routes'
import { clockOf, ConsoleProvider, useConsole } from './store'
import { ConsoleUiContext, useMediaQuery, WIDE_QUERY } from './ui'

const NAV_ICON: Record<string, ReactElement> = {
  [CONSOLE_HOME]: <LayoutDashboard />,
  '/console/sites': <Warehouse />,
  '/console/alerts': <BellRing />,
  [CONSOLE_ASSISTANT]: <Sparkles />,
  '/console/about': <Info />,
}

/** The one persistent statement that nothing here is real, on every page and at every width. */
export const DEMO_NOTE =
  'Halden Console is a demo: every site, sensor and reading is invented, the live feed is simulated, and your changes reset when the page reloads.'

function useDocumentTitle(path: string) {
  useEffect(() => {
    const page = CONSOLE_PAGES.find(p => matchPath({ path: p.path, end: true }, path))
    if (page?.titleFromPage) return
    document.title = page ? page.title : CONSOLE_NOT_FOUND_TITLE
  }, [path])
}

function Brand() {
  return (
    <div className="flex flex-col gap-0.5 px-1">
      <span className="inline-flex items-center gap-2 font-display font-bold uppercase leading-none">
        <DivisionSymbol />
        <span className="sr-only">{PRODUCT_NAME}</span>
        {/* One wordmark, not two lines: "Console" is set small and its letters spread to Halden's width. */}
        <span aria-hidden="true" className="inline-grid gap-1">
          <span className="-mr-[0.14em] text-lg tracking-[0.14em]">{PRODUCT_NAME.split(' ')[0]}</span>
          <span className="flex justify-between text-[0.5rem] tracking-normal text-[var(--color-text-secondary)]">
            {[...PRODUCT_NAME.split(' ')[1]].map((letter, i) => (
              <span key={i}>{letter}</span>
            ))}
          </span>
        </span>
      </span>
      <span className="font-body text-sm text-[var(--color-text-secondary)]">{WORKSPACE}</span>
    </div>
  )
}

function SignedIn() {
  return (
    <div className="flex items-center gap-3 border-t border-[var(--color-border-hairline)] pt-4">
      <Avatar name={OPERATOR.name} size="md" status="online" />
      <div className="flex min-w-0 flex-col">
        <span className="truncate font-body text-sm font-semibold">{OPERATOR.name}</span>
        <span className="truncate font-body text-sm text-[var(--color-text-secondary)]">{OPERATOR.role}</span>
      </div>
    </div>
  )
}

function ConsoleNav({ path, className }: { path: string; className?: string }) {
  const { state } = useConsole()
  const open = state.alerts.filter(a => a.status === 'open').length
  const groups: SidebarGroup[] = [
    {
      title: 'Monitoring',
      collapsible: false,
      items: CONSOLE_PAGES.filter(page => page.inNav).map(page => ({
        label: page.label,
        href: page.path,
        icon: NAV_ICON[page.path],
        count: page.path === '/console/alerts' ? open : undefined,
        // A site's page sits under Sites.
        current: path === page.path || (page.path !== CONSOLE_HOME && path.startsWith(`${page.path}/`)),
      })),
    },
  ]
  return (
    <Sidebar
      label={PRODUCT_NAME}
      className={className}
      renderLink={consoleLink}
      header={<Brand />}
      groups={groups}
      footer={<SignedIn />}
    />
  )
}

/** Pages, sites, active alerts, the two scripted questions and the live switch, for the palette. */
function usePaletteCommands(onAsk: () => void): Command[] {
  const { state, run, startScript } = useConsole()
  const navigate = useNavigate()
  const openAlert = useOpenAlert()
  return useMemo(() => {
    const pages: Command[] = CONSOLE_PAGES.filter(page => page.inNav).map(page => ({
      id: `page-${page.path}`,
      label: page.label,
      group: 'Pages',
      icon: NAV_ICON[page.path],
      onSelect: () => navigate(page.path),
    }))
    const sites: Command[] = SITES.map(site => ({
      id: `site-${site.id}`,
      label: site.name,
      group: 'Sites',
      keywords: [site.customer, site.city, site.gateway],
      icon: <Warehouse />,
      onSelect: () => navigate(`/console/sites/${site.id}`),
    }))
    const alerts: Command[] = state.alerts
      .filter(isActive)
      .sort(newestFirst)
      .map(alert => ({
        id: `alert-${alert.id}`,
        label: alert.title,
        group: 'Active alerts',
        keywords: [SITES.find(s => s.id === alert.siteId)?.name ?? '', alert.severity],
        icon: ALERT_ICON[alert.kind],
        onSelect: () => openAlert(alert.id),
      }))
    const actions: Command[] = [
      {
        id: 'live',
        label: state.live ? 'Pause live updates' : 'Resume live updates',
        group: 'Actions',
        icon: state.live ? <Pause /> : <Play />,
        onSelect: () => run({ type: 'setLive', live: !state.live }),
      },
      ...SUGGESTIONS.map((text, i) => ({
        id: `ask-${i}`,
        label: `Ask: ${text}`,
        group: 'Actions',
        icon: <Sparkles />,
        onSelect: () => {
          startScript(scriptFor(text, state.readings, state.alerts))
          onAsk()
        },
      })),
    ]
    return [...pages, ...actions, ...sites, ...alerts]
  }, [state.alerts, state.live, state.readings, navigate, openAlert, run, startScript, onAsk])
}

function PageFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Spinner variant="conveyor" size="lg" label="Loading page" />
    </div>
  )
}

const LIVE_OPTIONS = [
  { value: 'live', label: 'Live', icon: <Play /> },
  { value: 'paused', label: 'Paused', icon: <Pause /> },
]

/** The live/paused switch (WCAG 2.2.2: content that updates on its own can be paused) and the
 *  time of the last update, in tabular figures so the digits never shift. */
function LiveControl() {
  const { state, run } = useConsole()
  return (
    <div className="flex items-center gap-3">
      <SegmentedControl
        label="Live updates"
        size="sm"
        options={LIVE_OPTIONS}
        value={state.live ? 'live' : 'paused'}
        onValueChange={value => run({ type: 'setLive', live: value === 'live' })}
      />
      <span className="font-mono text-sm tabular-nums text-[var(--color-text-secondary)]" data-testid="console-clock">
        Updated <time dateTime={`2026-10-15T${clockOf(state).label}`}>{clockOf(state).label}</time>
      </span>
    </div>
  )
}

function Shell() {
  const { pathname } = useLocation()
  const path = pathname.replace(/\/+$/, '') || '/'
  useDocumentTitle(path)
  const { state } = useConsole()
  const navigate = useNavigate()
  const [navOpen, setNavOpen] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const wide = useMediaQuery(WIDE_QUERY)
  const onAssistantPage = path === CONSOLE_ASSISTANT
  const docked = wide && assistantOpen && !onAssistantPage
  const ask = useMemo(
    () => () => {
      if (onAssistantPage) return
      if (wide) setAssistantOpen(true)
      else navigate(CONSOLE_ASSISTANT)
    },
    [onAssistantPage, wide, navigate],
  )
  const commands = usePaletteCommands(ask)
  const ui = useMemo(() => ({ assistantOpen, setAssistantOpen, wide }), [assistantOpen, wide])

  // A link chosen in the narrow-screen menu sheet navigates; the sheet then has nothing left to do.
  useEffect(() => setNavOpen(false), [path])

  return (
    <ConsoleUiContext.Provider value={ui}>
      <div
        className={
          docked
            ? 'min-h-screen bg-[var(--color-surface-base)] text-[var(--color-text-primary)] font-body md:grid md:grid-cols-[15rem_minmax(0,1fr)] lg:grid-cols-[15rem_minmax(0,1fr)_26rem]'
            : 'min-h-screen bg-[var(--color-surface-base)] text-[var(--color-text-primary)] font-body md:grid md:grid-cols-[15rem_minmax(0,1fr)]'
        }
      >
        <a
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-20 focus:bg-[var(--color-accent-signal-fill)] focus:text-[var(--color-accent-signal-ink)] focus:px-3 focus:py-2"
          href="#main"
        >
          Skip to content
        </a>
        <div className="hidden md:block sticky top-0 h-screen border-r border-[var(--color-border-hairline)] px-3 py-5">
          <ConsoleNav path={path} className="h-full" />
        </div>
        <div className="flex min-h-screen min-w-0 flex-col">
          <header className="sticky top-0 z-10 flex min-h-14 flex-wrap items-center gap-x-3 gap-y-2 border-b border-[var(--color-border-hairline)] bg-[var(--color-surface-base)] px-4 py-2 md:px-8">
            <span className="hidden sm:inline-flex md:hidden items-center gap-2 font-display font-bold uppercase tracking-[0.14em]"><DivisionSymbol />{PRODUCT_NAME}</span>
            <div className="order-last w-full md:order-none md:w-auto">
              <LiveControl />
            </div>
            <div className="ml-auto flex items-center gap-2">
              {/* One search: the console's pages, actions, sites and alerts first, then the
                  whole site (components, guidelines, the store, the CRM). Ctrl+K or / opens it. */}
              <DocsSearch commands={commands} />
              {onAssistantPage ? null : wide ? (
                <Button
                  variant={assistantOpen ? 'primary' : 'secondary'}
                  size="sm"
                  iconStart={<Sparkles />}
                  aria-expanded={assistantOpen}
                  aria-controls={assistantOpen ? 'console-assistant' : undefined}
                  onClick={() => setAssistantOpen(open => !open)}
                >
                  Assistant
                </Button>
              ) : (
                <Button asChild variant="secondary" size="sm">
                  <RouterLink to={CONSOLE_ASSISTANT} aria-label="Assistant">
                    <Sparkles aria-hidden="true" className="h-4 w-4" />
                    <span className="hidden sm:inline ml-2">Assistant</span>
                  </RouterLink>
                </Button>
              )}
              {/* Below md the nav is in the menu sheet, and so is this. */}
              <span className="hidden md:inline-flex">
                <BackToDocs />
              </span>
              <ThemeToggle />
              {/* Far right, like every header's menu button: below md the nav lives in this sheet. */}
              <span className="md:hidden">
                <Sheet open={navOpen} onOpenChange={setNavOpen}>
                  <IconButton label="Menu" variant="ghost" size="sm" onClick={() => setNavOpen(true)}>
                    <Menu aria-hidden="true" className="w-5 h-5" />
                  </IconButton>
                  <SheetContent side="right" title="Menu">
                    <ConsoleNav path={path} />
                    <div className="mt-4 border-t border-[var(--color-border-hairline)] pt-4">
                      <BackToDocs />
                    </div>
                  </SheetContent>
                </Sheet>
              </span>
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
        {docked ? (
          <aside
            id="console-assistant"
            aria-label="Assistant panel"
            className="sticky top-0 hidden h-screen flex-col border-l border-[var(--color-border-hairline)] bg-[var(--color-surface-base)] px-4 py-5 lg:flex"
          >
            <AssistantView variant="panel" onClose={() => setAssistantOpen(false)} />
          </aside>
        ) : null}
        {/* A new live alert is said once, politely; a reading changing is never announced. */}
        <p role="status" className="sr-only">
          {state.announcement}
        </p>
        <AlertSheet />
      </div>
    </ConsoleUiContext.Provider>
  )
}

/**
 * Halden Console's shell: a Sidebar down the left from `md`, a top bar with the live/paused
 * switch, search, the assistant toggle and the theme toggle, the menu in a Sheet below `md`, the
 * assistant docked on the right from `lg` when it is open, its own providers, the store, the alert
 * sheet any page opens through `?alert=`, and the command palette (Ctrl+K or Cmd+K).
 *
 * A separate demo from Hexline and Corvane on purpose: a monitoring console exercises live data
 * (updates that must be pausable and must not flash or chatter at a screen reader), status over
 * time, and an assistant that acts only with approval. Neither a shop nor a CRM needs those.
 */
export function ConsoleLayout({ live }: { live?: boolean }) {
  return (
    <TooltipProvider>
      <Toaster>
        <ConsoleProvider live={live}>
          <Shell />
        </ConsoleProvider>
      </Toaster>
    </TooltipProvider>
  )
}

export default ConsoleLayout
