import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import { Home } from './pages/Home'

export type DemoPage = {
  /** Absolute path, no trailing slash. May carry a react-router param (`/store/shop/:id`). */
  path: string
  /** Navbar / sidebar label. */
  label: string
  /** document.title and the e2e test name, unless `titleFromPage` is set. */
  title: string
  /** A plain component only for `DEMO_HOME` (see below) -- every other route stays a
   *  `LazyExoticComponent`. */
  Component: LazyExoticComponent<ComponentType> | ComponentType
  /** Listed in the demo Navbar. Flow steps are not. */
  inNav: boolean
  /** A concrete path e2e can `goto`, for a route registered with a param in `path` (demo.spec
   *  does `goto(samplePath ?? path)`). */
  samplePath?: string
  /** The `<title>` expected at `samplePath`, when the page sets its own and it differs from
   *  `title` (demo.spec checks `toHaveTitle(sampleTitle ?? title)`). */
  sampleTitle?: string
  /** The page computes and sets `document.title` itself (from data `useDocumentTitle` doesn't
   *  have, e.g. a product name) -- `DemoLayout`'s own title effect skips this route instead of
   *  racing it back to `title` on every render. */
  titleFromPage?: true
}

export const DEMO_HOME = '/store'

// `Home` is a plain, eager import (top of this file), not `lazy()`: the one deliberate exception
// to every other route here. `DEMO_HOME` is the app's own default landing page, reached directly
// far more often than any other route. While it was lazy, a direct load showed `DemoLayout`'s
// Suspense fallback (a "Loading…" paragraph, a few lines tall) and then swapped in the real, much
// taller page once the chunk's extra network round trip resolved, moving the Footer a long way
// down. That swap was the dominant layout-shift source behind a Lighthouse CLS of 0.59 (one
// ~0.36 shift on the Footer). Bundled eagerly, `<Suspense>` has nothing to suspend on for this
// route and it renders straight through on the first pass.
//
// That measurement was taken against the pinned scroll-scrub hero this page used to carry, which
// was removed on 2026-10-02. The reason outlives it: any lazy homepage taller than the fallback
// shifts the Footer the same way, and `e2e/pages.spec.ts`'s "Homepage layout stability" test
// still holds this route under 0.1.
//
// Eager means `Home.tsx` and `HomeHero.tsx`, which are markup and design-system components. It
// does NOT mean the hero's three.js scene: `HomeHero` reaches `scene/hero.js` only through a
// dynamic `import()`, so three.js and the models are their own chunks, and the scene loads
// INSIDE the hero's pre-sized box, so nothing below the hero moves when it lands. A static
// import of anything under `scene/` from this file, `Home.tsx` or `HomeHero.tsx` would put all
// of three.js in a chunk every page loads, and `npm run build` fails on that: the chunk gate,
// `scripts/check-chunks.mjs`, runs as `postbuild`.
//
// Every other route is lazy and needs no such exception: `DemoLayout`'s `<main>` has a floor of
// one screen less the Navbar, so the Footer is off screen while a route's chunk loads and a page
// landing in place of the fallback moves nothing a visitor can see.
const Shop = lazy(() => import('./pages/shop/Shop').then(m => ({ default: m.Shop })))
const Product = lazy(() => import('./pages/shop/Product').then(m => ({ default: m.Product })))
const Cart = lazy(() => import('./pages/Cart').then(m => ({ default: m.Cart })))
const Checkout = lazy(() => import('./pages/Checkout').then(m => ({ default: m.Checkout })))
const Confirmation = lazy(() => import('./pages/Confirmation').then(m => ({ default: m.Confirmation })))
const SignIn = lazy(() => import('./pages/auth/SignIn').then(m => ({ default: m.SignIn })))
const Verify = lazy(() => import('./pages/auth/Verify').then(m => ({ default: m.Verify })))
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword').then(m => ({ default: m.ResetPassword })))
const CreateAccount = lazy(() => import('./pages/auth/CreateAccount').then(m => ({ default: m.CreateAccount })))
const Onboarding = lazy(() => import('./pages/Onboarding').then(m => ({ default: m.Onboarding })))
const Journal = lazy(() => import('./pages/journal/Journal').then(m => ({ default: m.Journal })))
const Article = lazy(() => import('./pages/journal/Article').then(m => ({ default: m.Article })))
const Pricing = lazy(() => import('./pages/Pricing').then(m => ({ default: m.Pricing })))
const About = lazy(() => import('./pages/About').then(m => ({ default: m.About })))
const StatusError = lazy(() => import('./pages/StatusError').then(m => ({ default: m.StatusError })))
const AccountOverview = lazy(() => import('./pages/account/Overview').then(m => ({ default: m.Overview })))
const AccountOrders = lazy(() => import('./pages/account/Orders').then(m => ({ default: m.Orders })))
const AccountSettings = lazy(() => import('./pages/account/Settings').then(m => ({ default: m.Settings })))
const OpsDashboard = lazy(() => import('./pages/ops/Dashboard').then(m => ({ default: m.Dashboard })))
const OpsInventory = lazy(() => import('./pages/ops/Inventory').then(m => ({ default: m.Inventory })))
const OpsSettings = lazy(() => import('./pages/ops/Settings').then(m => ({ default: m.Settings })))

/** Shared with `sampleTitle` below: a direct load of `/store/sign-in/verify` with no address
 *  pending redirects straight back here, so that is the title demo.spec actually finds there. */
const SIGN_IN_TITLE = 'Hexline — sign in'
/** Shared the same way: a direct load of `/store/onboarding` with no one signed in redirects
 *  straight back here, so that is the title demo.spec actually finds there. */
const CREATE_ACCOUNT_TITLE = 'Hexline — create an account'
/** Shared with checkout's own `sampleTitle` below: an empty cart sends a direct load of
 *  `/store/checkout` straight back here, so this is the title demo.spec actually finds there. */
const CART_TITLE = 'Hexline — cart'

/**
 * The one place a Hexline page becomes routable. DemoLayout builds its nav and its per-page
 * document title from this list, and e2e/demo.spec.ts iterates it directly, so adding a page here
 * is the whole job -- nothing else registers a route into the demo shell.
 */
export const DEMO_PAGES: DemoPage[] = [
  { path: DEMO_HOME, label: 'Home', title: 'Hexline — home', Component: Home, inNav: true },
  { path: '/store/shop', label: 'Shop', title: 'Hexline — shop', Component: Shop, inNav: true },
  {
    path: '/store/shop/:id',
    label: 'Product',
    title: 'Hexline — product',
    Component: Product,
    inNav: false,
    // Unlisted in the Navbar itself (see isNavCurrent/isDescendantOf in DemoLayout.tsx): Shop
    // stays current on its own unlisted product pages.
    samplePath: '/store/shop/bump-helmet',
    sampleTitle: 'Hexline — Bump helmet',
    titleFromPage: true,
  },
  { path: '/store/cart', label: 'Cart', title: CART_TITLE, Component: Cart, inNav: false },
  {
    path: '/store/checkout',
    label: 'Checkout',
    title: 'Hexline — checkout',
    Component: Checkout,
    inNav: false,
    // An empty cart bounces a direct load straight to /store/cart (see Checkout.tsx), so that is
    // the title the generic demo.spec pass actually finds here, not this route's own.
    sampleTitle: CART_TITLE,
  },
  {
    path: '/store/checkout/confirmation',
    label: 'Order confirmation',
    title: 'Hexline — order confirmation',
    Component: Confirmation,
    inNav: false,
  },
  { path: '/store/sign-in', label: 'Sign in', title: SIGN_IN_TITLE, Component: SignIn, inNav: false },
  {
    path: '/store/sign-in/verify',
    label: 'Verify your code',
    title: 'Hexline — verify your code',
    Component: Verify,
    inNav: false,
    // A direct load has no pending email, so the generic demo.spec pass always lands on the
    // redirect it bounces to, not this page's own title.
    sampleTitle: SIGN_IN_TITLE,
  },
  {
    path: '/store/reset-password',
    label: 'Reset password',
    title: 'Hexline — reset your password',
    Component: ResetPassword,
    inNav: false,
  },
  {
    path: '/store/create-account',
    label: 'Create account',
    title: CREATE_ACCOUNT_TITLE,
    Component: CreateAccount,
    inNav: false,
  },
  {
    path: '/store/onboarding',
    label: 'Onboarding',
    title: 'Hexline — set up your account',
    Component: Onboarding,
    inNav: false,
    // A direct load has no one signed in, so the generic demo.spec pass always lands on the
    // redirect it bounces to, not this page's own title.
    sampleTitle: CREATE_ACCOUNT_TITLE,
  },
  {
    path: '/store/journal',
    label: 'Field notes',
    title: 'Hexline — field notes',
    Component: Journal,
    inNav: false,
  },
  {
    path: '/store/journal/:slug',
    label: 'Field note',
    title: 'Hexline — field note',
    Component: Article,
    inNav: false,
    // A route registered with a param needs a concrete URL demo.spec can `goto` -- see the
    // module doc comment on `samplePath` above.
    samplePath: '/store/journal/cleaning-after-a-field-day',
    sampleTitle: 'Hexline — Cleaning a replica after a field day',
    titleFromPage: true,
  },
  { path: '/store/care', label: 'Care', title: 'Hexline — Care', Component: Pricing, inNav: true },
  { path: '/store/about', label: 'About', title: 'Hexline — about', Component: About, inNav: true },
  {
    path: '/store/status/error',
    label: 'Error states',
    title: 'Hexline — error states',
    Component: StatusError,
    inNav: false,
  },
  // Reached only from the Account menu (AccountAction's "Your account" item), never the Navbar
  // itself -- all three are inNav: false. Each renders <RequireSession> first, so signed out, a
  // direct load or the demo.spec generic pass both bounce straight to sign-in; that redirect's
  // own title is what demo.spec actually finds at any of these three paths, hence sampleTitle.
  {
    path: '/store/account',
    label: 'Overview',
    title: 'Hexline — your account',
    Component: AccountOverview,
    inNav: false,
    sampleTitle: SIGN_IN_TITLE,
  },
  {
    path: '/store/account/orders',
    label: 'Orders',
    title: 'Hexline — orders',
    Component: AccountOrders,
    inNav: false,
    sampleTitle: SIGN_IN_TITLE,
  },
  {
    path: '/store/account/settings',
    label: 'Settings',
    title: 'Hexline — settings',
    Component: AccountSettings,
    inNav: false,
    sampleTitle: SIGN_IN_TITLE,
  },
  // The Hexline back office: the tool that runs the store, reached from the footer's Service
  // column. All three are inNav: false (the store's Navbar is for shoppers) and none asks for a
  // session (see OpsLayout), so demo.spec's direct load lands on each page itself.
  { path: '/store/ops', label: 'Dashboard', title: 'Hexline ops — dashboard', Component: OpsDashboard, inNav: false },
  {
    path: '/store/ops/inventory',
    label: 'Inventory',
    title: 'Hexline ops — inventory',
    Component: OpsInventory,
    inNav: false,
  },
  {
    path: '/store/ops/settings',
    label: 'Settings',
    title: 'Hexline ops — settings',
    Component: OpsSettings,
    inNav: false,
  },
]
