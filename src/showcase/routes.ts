import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

/**
 * The showcase site: the marketing homepage at `/` and the theme builder at `/themes`, under one Navbar (ShowcaseLayout). The page is
 * lazy, so nothing under src/showcase/ lands in the chunk the docs site loads. The dashboard and the
 * store it links to are the real demos: Corvane at /crm and the Hexline store at /store.
 */
export type ShowcasePage = {
  path: string
  title: string
  Component: LazyExoticComponent<ComponentType>
}

export const SHOWCASE_HOME = '/'
/** The components index, which the old docs Overview (/design-system, now a redirect) folded into. */
export const COMPONENTS_HOME = '/components'
/** The old Overview path, kept as a redirect to COMPONENTS_HOME for published links. */
export const LEGACY_DESIGN_SYSTEM = '/design-system'
/** "Dashboard" in the showcase is the Corvane CRM. */
export const SHOWCASE_APP = '/crm'
/** "Store" in the showcase is the Hexline store. */
export const SHOWCASE_STORE = '/store'

const Home = lazy(() => import('./pages/Home').then(m => ({ default: m.Home })))
const Themes = lazy(() => import('../pages/Themes').then(m => ({ default: m.Themes })))

/** The theme builder: full width under the site header, no docs sidebar. */
export const THEMES_HOME = '/themes'
/** Where the theme builder used to live, inside the docs; redirects to THEMES_HOME with its query. */
export const LEGACY_THEME_BUILDER = '/guidelines/theme'

export const SHOWCASE_PAGES: ShowcasePage[] = [
  { path: SHOWCASE_HOME, title: 'Division DS', Component: Home },
  { path: THEMES_HOME, title: 'Theme Builder · Division DS', Component: Themes },
]
