import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Outlet, Navigate, useLocation } from 'react-router-dom'
import { AppShell } from './components/shell/AppShell'
import { DemoLayout } from './demo/DemoLayout'
import { NotFound } from './demo/pages/NotFound'
import { DEMO_PAGES } from './demo/routes'
import { CRM_PAGES, CrmNotFound } from './crm/routes'
import { CONSOLE_PAGES, ConsoleNotFound } from './console/routes'
import { useFocusMainOnNavigate } from './demo/useFocusMainOnNavigate'
import { Spinner } from './components/atoms/spinner/Spinner'
import { useScrollResetOnNavigate } from './demo/useScrollResetOnNavigate'
import { DocsNotFound } from './pages/DocsNotFound'
import { Components } from './pages/Components'
import { DOCS_PAGES } from './docsPages'
import { routerBasename } from './base-path'
import { COMPONENTS_HOME, LEGACY_DESIGN_SYSTEM, LEGACY_THEME_BUILDER, SHOWCASE_PAGES, THEMES_HOME } from './showcase/routes'

// The showcase site (marketing, dashboard, store): its shell loads on the first visit to the homepage (`/`).
const ShowcaseLayout = lazy(() => import('./showcase/ShowcaseLayout').then(module => ({ default: module.ShowcaseLayout })))

// Corvane, the CRM demo: its whole shell (store, data, sheets) loads on the first visit to /crm,
// never with the docs site or the Hexline store. Its pages are lazy too (src/crm/routes.ts).
const CrmLayout = lazy(() => import('./crm/CrmLayout').then(module => ({ default: module.CrmLayout })))

function CrmFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface-base)]">
      <Spinner variant="conveyor" size="lg" label="Loading Corvane" />
    </div>
  )
}

// Halden Console, the monitoring demo, the same way: its shell, store, simulator and assistant
// load on the first visit to /console. Its pages are lazy too (src/console/routes.ts).
const ConsoleLayout = lazy(() => import('./console/ConsoleLayout').then(module => ({ default: module.ConsoleLayout })))

function ConsoleFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface-base)]">
      <Spinner variant="conveyor" size="lg" label="Loading Halden Console" />
    </div>
  )
}

function ShowcaseFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface-base)]">
      <Spinner variant="conveyor" size="lg" label="Loading the showcase" />
    </div>
  )
}

/**
 * A parent route with no path of its own, so it sits above both the docs shell and the Hexline
 * demo shell without owning either one's chrome. It exists to call the focus and scroll-reset
 * hooks exactly once per navigation regardless of which shell is mounted -- `useScrollResetOnNavigate`
 * before `useFocusMainOnNavigate` (a layout effect before a passive one, scroll first then focus,
 * matching what a full page load does), so a docs-to-docs navigation resets scroll too, not only
 * one under the Hexline demo shell (the one place `useSmoothScroll` itself ever mounts). The
 * document title is not decided here: each shell owns its own (AppShell sets 'Division DS' on
 * every render; DemoLayout sets a per-route title), which is what lets AppShell win the title back
 * correctly no matter what path it renders -- including a trailing-slash docs URL a route-list
 * lookup here would have missed.
 */
/**
 * Old URLs that published links still point at: the showcase lived at /showcase (its own dashboard
 * and store are gone; the homepage is `/` now) and the Hexline store at /demo/*. A /demo URL keeps
 * the rest of its path, query and hash, so a shared product link lands on the same product.
 */
function LegacyDemoRedirect() {
  const { pathname, search, hash } = useLocation()
  return <Navigate replace to={pathname.replace(/^\/demo(?=\/|$)/, '/store') + search + hash} />
}

/** The theme builder moved out of the docs; a shared theme link keeps its preset, fonts and shape. */
function LegacyThemeRedirect() {
  const { search, hash } = useLocation()
  return <Navigate replace to={THEMES_HOME + search + hash} />
}

function RouteFocus() {
  useScrollResetOnNavigate()
  useFocusMainOnNavigate()
  return <Outlet />
}

export default function App() {
  return (
    <BrowserRouter basename={routerBasename}>
      <Routes>
        <Route element={<RouteFocus />}>
          <Route element={<AppShell />}>
              <Route path={COMPONENTS_HOME} element={<Components />} />
              {DOCS_PAGES.map(({ path, Component }) => (
                <Route key={path} path={path} element={<Component />} />
              ))}
          </Route>
          <Route element={<DemoLayout />}>
            {DEMO_PAGES.map(({ path, Component }) => (
              <Route key={path} path={path} element={<Component />} />
            ))}
            <Route path="/store/*" element={<NotFound />} />
          </Route>
          <Route
            element={
              <Suspense fallback={<CrmFallback />}>
                <CrmLayout />
              </Suspense>
            }
          >
            {CRM_PAGES.map(({ path, Component }) => (
              <Route key={path} path={path} element={<Component />} />
            ))}
            <Route path="/crm/*" element={<CrmNotFound />} />
          </Route>
          <Route
            element={
              <Suspense fallback={<ConsoleFallback />}>
                <ConsoleLayout />
              </Suspense>
            }
          >
            {CONSOLE_PAGES.map(({ path, Component }) => (
              <Route key={path} path={path} element={<Component />} />
            ))}
            <Route path="/console/*" element={<ConsoleNotFound />} />
          </Route>
          <Route
            element={
              <Suspense fallback={<ShowcaseFallback />}>
                <ShowcaseLayout />
              </Suspense>
            }
          >
            {SHOWCASE_PAGES.map(({ path, Component }) => (
              <Route key={path} path={path} element={<Component />} />
            ))}
          </Route>
          <Route path="/showcase/*" element={<Navigate replace to="/" />} />
          {/* The docs Overview folded into the components index. */}
          <Route path={LEGACY_DESIGN_SYSTEM} element={<Navigate replace to={COMPONENTS_HOME} />} />
          <Route path="/demo/*" element={<LegacyDemoRedirect />} />
          <Route path={LEGACY_THEME_BUILDER} element={<LegacyThemeRedirect />} />
          {/* Every path neither the docs shell nor /store claims: styled as a docs page (a
              mistyped `/components/*` path, or a bare `/does-not-exist`), not the Hexline
              store's own 404, since nothing about it is scoped to the demo. */}
          <Route element={<AppShell title="Division DS — page not found" />}>
            <Route path="*" element={<DocsNotFound />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
