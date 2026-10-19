import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

/**
 * Halden Console's route list: the one place a console page becomes routable. `App.tsx` mounts
 * these under the console shell, `ConsoleLayout` builds its nav and its per-page title from them,
 * and `e2e/console.spec.ts` iterates them. Every page is lazy, and so is the shell (in App.tsx):
 * the docs site and the other demos load none of the console's code, and the site chart's
 * Recharts loads with that chart only.
 *
 * This file is imported by App.tsx, so it holds nothing but strings and `lazy()` calls.
 */
export type ConsolePage = {
  path: string
  label: string
  /** document.title, unless `titleFromPage`. */
  title: string
  Component: LazyExoticComponent<ComponentType>
  inNav: boolean
  /** A concrete URL e2e can load, for a path with a param. */
  samplePath?: string
  /** The title expected at `samplePath`, when the page sets its own. */
  sampleTitle?: string
  /** The page sets document.title itself (a site's name). */
  titleFromPage?: true
}

export const CONSOLE_HOME = '/console'
export const CONSOLE_ASSISTANT = '/console/assistant'
export const CONSOLE_NOT_FOUND_TITLE = 'Halden Console — page not found'

const Overview = lazy(() => import('./pages/ConsoleOverview').then(m => ({ default: m.ConsoleOverview })))
const Sites = lazy(() => import('./pages/Sites').then(m => ({ default: m.Sites })))
const SiteDetail = lazy(() => import('./pages/SiteDetail').then(m => ({ default: m.SiteDetail })))
const Alerts = lazy(() => import('./pages/Alerts').then(m => ({ default: m.Alerts })))
const Assistant = lazy(() => import('./pages/AssistantPage').then(m => ({ default: m.AssistantPage })))
const About = lazy(() => import('./pages/About').then(m => ({ default: m.About })))
export const ConsoleNotFound = lazy(() => import('./pages/ConsoleNotFound').then(m => ({ default: m.ConsoleNotFound })))

export const CONSOLE_PAGES: ConsolePage[] = [
  { path: CONSOLE_HOME, label: 'Overview', title: 'Halden Console — overview', Component: Overview, inNav: true },
  { path: '/console/sites', label: 'Sites', title: 'Halden Console — sites', Component: Sites, inNav: true },
  {
    path: '/console/sites/:id',
    label: 'Site',
    title: 'Halden Console — site',
    Component: SiteDetail,
    inNav: false,
    samplePath: '/console/sites/brennick',
    sampleTitle: 'Halden Console — Brennick Pharma, Basel',
    titleFromPage: true,
  },
  { path: '/console/alerts', label: 'Alerts', title: 'Halden Console — alerts', Component: Alerts, inNav: true },
  { path: CONSOLE_ASSISTANT, label: 'Assistant', title: 'Halden Console — assistant', Component: Assistant, inNav: true },
  { path: '/console/about', label: 'About', title: 'Halden Console — about', Component: About, inNav: true },
]
