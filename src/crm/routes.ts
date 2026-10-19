import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

/**
 * Corvane's route list: the one place a CRM page becomes routable. `App.tsx` mounts these under
 * the CRM shell, `CrmLayout` builds its nav and its per-page title from them, and `e2e/crm.spec.ts`
 * iterates them. Every page is lazy, and so is the shell itself (in App.tsx): the docs site and
 * the Hexline store load none of Corvane's code, and the forecast's charts load with that page
 * only.
 *
 * This file is imported by App.tsx, so it holds nothing but strings and `lazy()` calls.
 */
export type CrmPage = {
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
  /** The page sets document.title itself (an account's name). */
  titleFromPage?: true
}

export const CRM_HOME = '/crm'
export const CRM_NOT_FOUND_TITLE = 'Corvane — page not found'

const Pipeline = lazy(() => import('./pages/Pipeline').then(m => ({ default: m.Pipeline })))
const Accounts = lazy(() => import('./pages/Accounts').then(m => ({ default: m.Accounts })))
const AccountDetail = lazy(() => import('./pages/AccountDetail').then(m => ({ default: m.AccountDetail })))
const Contacts = lazy(() => import('./pages/Contacts').then(m => ({ default: m.Contacts })))
const ActivityFeed = lazy(() => import('./pages/ActivityFeed').then(m => ({ default: m.ActivityFeed })))
const Forecast = lazy(() => import('./pages/Forecast').then(m => ({ default: m.Forecast })))
const About = lazy(() => import('./pages/About').then(m => ({ default: m.About })))
export const CrmNotFound = lazy(() => import('./pages/CrmNotFound').then(m => ({ default: m.CrmNotFound })))

export const CRM_PAGES: CrmPage[] = [
  { path: CRM_HOME, label: 'Pipeline', title: 'Corvane — pipeline', Component: Pipeline, inNav: true },
  { path: '/crm/accounts', label: 'Accounts', title: 'Corvane — accounts', Component: Accounts, inNav: true },
  {
    path: '/crm/accounts/:id',
    label: 'Account',
    title: 'Corvane — account',
    Component: AccountDetail,
    inNav: false,
    samplePath: '/crm/accounts/acc-vellmark',
    sampleTitle: 'Corvane — Vellmark Logistics',
    titleFromPage: true,
  },
  { path: '/crm/contacts', label: 'Contacts', title: 'Corvane — contacts', Component: Contacts, inNav: true },
  { path: '/crm/activity', label: 'Activity', title: 'Corvane — activity', Component: ActivityFeed, inNav: true },
  { path: '/crm/forecast', label: 'Forecast', title: 'Corvane — forecast', Component: Forecast, inNav: true },
  { path: '/crm/about', label: 'About', title: 'Corvane — about', Component: About, inNav: true },
]
