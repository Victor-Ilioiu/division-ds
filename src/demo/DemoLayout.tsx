import { Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link as RouterLink, Outlet, matchPath, useLocation, useNavigate } from 'react-router-dom'
import { Search, User } from 'lucide-react'
import { Button } from '../components/atoms/button/Button'
import { IconButton } from '../components/atoms/icon-button/IconButton'
import { TooltipProvider } from '../components/atoms/tooltip/Tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/molecules/dropdown-menu/DropdownMenu'
import { Toaster } from '../components/molecules/toast/Toast'
import { Navbar } from '../components/organisms/navbar/Navbar'
import { Footer, type FooterColumn } from '../components/organisms/footer/Footer'
import { NewsletterForm } from '../components/organisms/newsletter-form/NewsletterForm'
import { BackToDocs } from '../components/shell/BackToDocs'
import { DocsSearch } from '../search/DocsSearch'
import { DivisionSymbol } from '../components/shell/DivisionSymbol'
import { ThemeToggle } from '../components/shell/ThemeToggle'
import { hasWebGL2 } from '../fx/core/webgl'
import { CartSheet } from './CartSheet'
import { DISCLAIMER, NEWSLETTER } from './content'
import { DemoErrorBoundary } from './DemoErrorBoundary'
import { routerLink } from './routerLink'
import { DEMO_HOME, DEMO_PAGES, type DemoPage } from './routes'
import { CartProvider } from './store/cart'
import { subscribeToNewsletter } from './store/api'
import { CATEGORIES } from './store/catalog'
import { SessionProvider, useSession } from './store/session'
import { Terrain } from './terrain/Terrain'
import { useSmoothScroll } from './useSmoothScroll'

// Same classes as NavbarDocs.tsx's own BRAND, swapped from a plain anchor to a router link home.
// The Division DS symbol shows at every width. Below `sm` the word is visually hidden (still the
// link's accessible name): the 320px row has no room for the symbol, the word, the menu button
// and the account, cart and theme controls on one line (demo.spec header-height test). From `sm`
// the word comes back with its 0.14em tracking.
function Brand() {
  return (
    <RouterLink
      to={DEMO_HOME}
      className="inline-flex items-center gap-2 min-h-10 font-display font-bold uppercase tracking-[0.14em] text-[var(--color-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
    >
      <DivisionSymbol className="size-5" />
      <span className="sr-only sm:not-sr-only">Hexline</span>
    </RouterLink>
  )
}

/**
 * The Navbar's sign-in/account slot. Signed out: a plain link styled as a ghost Button. Signed
 * in: the account name plus a sign-out menu. Radix's own close-autofocus would try to send focus
 * back to this trigger, but signing out removes it from the DOM in the same render that closes
 * the menu, so that default is prevented and focus goes to the Sign in link that replaces it
 * instead, once it exists.
 *
 * Below `sm` the text form (which the Navbar's actions row cannot fit alongside the cart and
 * theme toggle without wrapping at 320px) is replaced by an icon-only `IconButton`/`DropdownMenu`
 * trigger carrying the same accessible name. Both forms are always mounted, each in its own plain
 * `<span>` that carries the responsive `hidden`/`sm:*` class -- never on `wrapperClassName`
 * itself, the same reasoning as Navbar's own `@2xl:hidden` mobile-menu wrapper: `.bevel-focus-
 * wrap` sets its own `display` outside Tailwind's layers, so a breakpoint utility landing on that
 * class loses the cascade and never actually hides anything. The hidden span carries no width or
 * flex `gap`, and is out of the tab order and the accessible tree, and this is a plain CSS switch
 * rather than a JS media-query read: swapping DOM nodes on a breakpoint would drop focus if it
 * happened to land on the one going away.
 *
 * Each signed-in menu carries a second item, "Your account", alongside Sign out. Radix's own
 * close-autofocus default (return focus to the trigger) is exactly right for that one -- the
 * trigger is still there, still signed in, nothing forces focus off it. It is wrong for Sign out,
 * which removes the trigger from the DOM in the same render that closes the menu: the `signingOut`
 * ref is what tells `onCloseAutoFocus` which of the two just happened, so it only overrides the
 * default (and lets the `wasSignedIn` effect above send focus to the Sign in control instead) on
 * the path that actually needs it.
 */
function AccountAction() {
  const { user, signOut } = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const compactSignInRef = useRef<HTMLAnchorElement>(null)
  const fullSignInRef = useRef<HTMLAnchorElement>(null)
  const wasSignedIn = useRef(false)
  const signingOut = useRef(false)
  const stayingPut = useRef(false)

  useEffect(() => {
    if (wasSignedIn.current && !user) {
      // Whichever Sign in control the current breakpoint actually shows: the other one is
      // display:none (via its wrapping span) and cannot take focus.
      const visible = [compactSignInRef.current, fullSignInRef.current].find(el => el?.offsetParent)
      visible?.focus()
    }
    wasSignedIn.current = user !== null
  }, [user])

  const handleSignOut = () => {
    signingOut.current = true
    signOut()
  }

  // Already there: a navigate() to the page already showing pushes a duplicate history entry and
  // moves no focus at all (React Router skips the render since nothing about the location
  // changed), so the menu item would do nothing visible while still cluttering Back. Move focus
  // to #main instead -- restarting reading at the page's own content is the one useful thing
  // "Your account" can still do here, the same target every other in-app navigation lands on.
  //
  // The focus() call itself has to happen from `onCloseAutoFocus`, not from this handler: while
  // the menu's own content is still mounted (even mid-close), its focus trap intercepts and
  // reverts a focus() call aimed anywhere outside it, so calling it here, synchronously on select,
  // is silently undone the instant the trap is still active -- confirmed directly (focus lands on
  // `<body>`, not `#main`, when the call is made from here instead). `stayingPut` only records
  // that this is the "same page" case; `onCloseAutoFocus`, which fires once the menu has actually
  // finished unmounting and released its trap, is what both blocks Radix's own default (return
  // focus to the trigger) and performs the real focus move, in the one place it can stick.
  const handleAccountSelect = () => {
    if (location.pathname === '/store/account') {
      stayingPut.current = true
      return
    }
    navigate('/store/account')
  }

  const closeAutoFocus = (event: Event) => {
    if (signingOut.current) {
      event.preventDefault()
      signingOut.current = false
    } else if (stayingPut.current) {
      event.preventDefault()
      stayingPut.current = false
      document.getElementById('main')?.focus()
    }
  }

  if (!user) {
    return (
      <>
        <span className="sm:hidden">
          <IconButton asChild label="Sign in" variant="ghost" size="sm">
            <RouterLink ref={compactSignInRef} to="/store/sign-in">
              <User aria-hidden="true" className="w-4 h-4" />
            </RouterLink>
          </IconButton>
        </span>
        <span className="hidden sm:inline-flex">
          <Button asChild variant="ghost" size="sm">
            <RouterLink ref={fullSignInRef} to="/store/sign-in">
              Sign in
            </RouterLink>
          </Button>
        </span>
      </>
    )
  }

  const label = `Account: ${user.name}`
  return (
    <>
      <span className="sm:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton label={label} variant="ghost" size="sm">
              <User aria-hidden="true" className="w-4 h-4" />
            </IconButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onCloseAutoFocus={closeAutoFocus}>
            <DropdownMenuItem onSelect={handleAccountSelect}>Your account</DropdownMenuItem>
            <DropdownMenuItem onSelect={handleSignOut}>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </span>
      <span className="hidden sm:inline-flex">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" aria-label={label}>
              Account
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onCloseAutoFocus={closeAutoFocus}>
            <DropdownMenuItem onSelect={handleAccountSelect}>Your account</DropdownMenuItem>
            <DropdownMenuItem onSelect={handleSignOut}>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </span>
    </>
  )
}

/**
 * The four field guides, as the footer lists them. Typed here and not read from
 * `content/journal.ts` for one reason: that module is the guides' whole text, it loads with the
 * Field notes pages, and importing it into the shell would put it in the main chunk for a list
 * of four titles. `DemoLayout.test.tsx` holds this list equal to the real one, slug and title,
 * so a new or renamed guide fails the build until it is here.
 */
export const FOOTER_GUIDES = [
  { slug: 'cleaning-after-a-field-day', title: 'Cleaning a replica after a field day' },
  { slug: 'fitting-an-optic-to-a-rail', title: 'Fitting an optic to a rail' },
  { slug: 'choosing-bb-weight', title: 'Choosing a BB weight' },
  { slug: 'battery-care-and-storage', title: 'Battery care and storage' },
]

/**
 * The footer's link groups. Every link is a page that exists (`DemoLayout.test.tsx` checks each
 * against the route registry and the docs sidebar). The shop's categories are read from the
 * catalogue, never retyped, and their links carry the
 * shop's own filter parameter (`?category=`, src/demo/filters.ts). The account links land on
 * sign-in, with a notice, for a visitor who is signed out. Four groups, so one row at the widest.
 * There is no link home here: the Navbar's brand is one on every page, and the footer's wordmark
 * is the name, not a link.
 */
export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: 'Shop',
    links: [
      { label: 'All products', href: '/store/shop' },
      ...CATEGORIES.map(category => ({ label: category.label, href: `/store/shop?category=${category.id}` })),
    ],
  },
  {
    title: 'Guides',
    links: [
      { label: 'Field notes', href: '/store/journal' },
      ...FOOTER_GUIDES.map(guide => ({ label: guide.title, href: `/store/journal/${guide.slug}` })),
    ],
  },
  {
    title: 'Service',
    links: [
      { label: 'Care', href: '/store/care' },
      { label: 'Your account', href: '/store/account' },
      { label: 'Orders', href: '/store/account/orders' },
      { label: 'Cart', href: '/store/cart' },
      { label: 'Back office', href: '/store/ops' },
    ],
  },
  {
    title: 'Design system',
    links: [
      { label: 'Documentation', href: '/components' },
      { label: 'Tokens', href: '/guidelines/tokens' },
      { label: 'Motion', href: '/guidelines/motion' },
      { label: 'Accessibility', href: '/guidelines/accessibility' },
      { label: 'Footer', href: '/components/footer' },
      { label: 'Error states', href: '/store/status/error' },
    ],
  },
]

/** Same reasoning as ChartPanelDocsFallback in App.tsx: the fallback mounts already holding its
 *  text, so there is nothing for a live-region role to announce a change to.
 *
 *  `onShown` tells the shell while this is on screen. For as long as it is, `<main>` is exactly
 *  its floor (one screen less the Navbar, see DemoLayout), so the Footer starts right at the
 *  fold, inside the terrain's 300px "near the viewport" margin, on a route whose Footer really
 *  starts far below it. Anything in the Footer that waits to be near the viewport would start
 *  for that reason alone. A layout effect, so the shell knows before the first paint of the
 *  fallback. */
function DemoPageFallback({ onShown }: { onShown: (shown: boolean) => void }) {
  useLayoutEffect(() => {
    onShown(true)
    return () => onShown(false)
  }, [onShown])
  return <p className="px-gutter py-6 font-body text-sm text-[var(--color-text-secondary)]">Loading…</p>
}

/** Sets the tab title from the matching route, or the 404 title once none matches -- the docs
 *  shell has no equivalent because it never leaves the static title in index.html. `matchPath`,
 *  not `===`: a registry path can carry a param (`/store/shop/:id`), which a plain string compare
 *  never matches against the real URL. */
function useDocumentTitle(path: string) {
  useEffect(() => {
    const page = DEMO_PAGES.find(p => matchPath({ path: p.path, end: true }, path))
    // A page that sets its own title (reading a name out of the catalogue, say) owns it from
    // here on -- without this the registry's generic title would win the race back on every
    // render of a page that never re-navigates.
    if (page?.titleFromPage) return
    document.title = page ? page.title : 'Hexline — page not found'
  }, [path])
}

/** Whether `path` sits under `page`'s own registered path, one level or deeper. Home is an
 *  explicit exception to the prefix rule and has no descendants at all: `/store` is a literal
 *  prefix of `/store/sign-in`, `/store/cart` and everything else in the shell, and treating that as
 *  ancestry would mark Home current on all of them. Every other `inNav` entry keeps the plain
 *  prefix rule (Shop covers its own unlisted `/store/shop/:id`). */
function isDescendantOf(page: DemoPage, path: string): boolean {
  if (page.path === DEMO_HOME) return false
  return path.startsWith(`${page.path}/`)
}

/** The single inNav entry current for `matched` (never a 404): its own exact route, or, when
 *  `matched` is an unlisted route nested under it (a product page under Shop), the LONGEST such
 *  nav-registered ancestor path -- so a page nested under more than one inNav prefix resolves to
 *  the more specific one. */
function isNavCurrent(page: DemoPage, matched: DemoPage | undefined): boolean {
  if (!matched) return false
  if (matched.path === page.path) return true
  if (!isDescendantOf(page, matched.path)) return false
  const ancestors = DEMO_PAGES.filter(p => p.inNav && (matched.path === p.path || isDescendantOf(p, matched.path)))
  const longest = ancestors.reduce((a, b) => (b.path.length > a.path.length ? b : a))
  return longest.path === page.path
}

export function DemoLayout() {
  const { pathname } = useLocation()
  // A trailing slash is the same page, not a 404: /store/ must render Home, not NotFound.
  const path = pathname.replace(/\/+$/, '') || '/'
  useDocumentTitle(path)
  // Hexline's own smooth scroll (design.md's "Demo site and effects"). Called only here, never
  // in AppShell, is what makes "the docs shell never creates a Lenis instance" true structurally
  // rather than by a runtime check.
  useSmoothScroll()

  // Bumped by DemoRouteError's own "Try again" (via DemoErrorBoundary's `onRetry`), through the
  // key below -- see DemoErrorBoundary's own comment for why clearing its caught error in place,
  // without changing this key, would not be enough on its own.
  const [resetCount, setResetCount] = useState(0)
  // True while a lazy route's chunk is loading (see DemoPageFallback).
  const [pageLoading, setPageLoading] = useState(false)
  // The site search, lifted so the menu sheet's Search entry opens the one DocsSearch in the
  // header (hidden below @4xl, still mounted, still the only owner of Ctrl+K and /).
  const [searchOpen, setSearchOpen] = useState(false)
  // From the menu: close the sheet, wait for it to unmount (Radix then hands focus back to the
  // menu button), and only then open the palette, so closing the palette returns focus to the
  // menu button instead of to a Search entry that no longer exists.
  const searchFromMenu = (closeMenu: () => void) => {
    closeMenu()
    const started = performance.now()
    const openWhenClosed = () => {
      if (!document.querySelector('[role="dialog"]') || performance.now() - started > 1000) setSearchOpen(true)
      else requestAnimationFrame(openWhenClosed)
    }
    requestAnimationFrame(openWhenClosed)
  }

  // "Try again" recovers the page but removes the very button that had focus (the same reasoning
  // DemoRouteError's own focus-on-mount effect exists for): the fresh page that remounts under it
  // has nothing of its own to focus, so without this, focus drops to <body>. Skipped on the first
  // render (resetCount starts at 0, never bumped there) -- a fresh load already starts at the top
  // of the document. `useLayoutEffect`, not `useEffect`: this has to win the race against
  // whatever the recovered page's own mount effects do, landing before the browser paints.
  useLayoutEffect(() => {
    if (resetCount > 0) document.getElementById('main')?.focus()
  }, [resetCount])

  // The route this path actually matches (never a bare string compare -- a registry path can
  // carry a param), or undefined for a real 404: neither Home nor Shop is current on one.
  const matched = DEMO_PAGES.find(p => matchPath({ path: p.path, end: true }, path))
  // Shop (`/store/shop`) also covers its own product pages (`/store/shop/:id`): those are reached
  // without ever being listed in the Navbar themselves, so without `isNavCurrent`'s ancestor
  // check the `inNav` entry above them stayed unmarked as soon as the URL moved past its own
  // exact path. Home has no such children (see `isDescendantOf`).
  const navItems = DEMO_PAGES.filter(page => page.inNav).map(page => ({
    label: page.label,
    href: page.path,
    current: isNavCurrent(page, matched),
  }))

  return (
    <TooltipProvider>
      <Toaster>
        {/* The whole shell, Navbar and Footer included, not just the outlet: CartSheet lives in
            the Navbar's own actions slot, and a footer or hero link can reach useCart()/
            useSession() too. */}
        <SessionProvider>
          <CartProvider>
            {/* `--page-gutter` is set here and nowhere else: 16px, and 64px from `lg` (the
                breakpoint the hero goes side by side at). The Navbar, every page, the sliders
                and the Footer read it (`px-gutter`, `mx-gutter`, or the property itself; see
                src/styles/tailwind.css), so the brand, the hero copy, the headings and every
                grid start on one left edge and end on one right edge. This is the demo store's
                gutter. The docs shell does not set it. */}
            <div data-demo-shell="" className="[--page-gutter:1rem] lg:[--page-gutter:4rem] min-h-screen flex flex-col bg-[var(--color-surface-base)] text-[var(--color-text-primary)] font-body">
              <a
                className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-40 focus:bg-[var(--color-accent-signal-fill)] focus:text-[var(--color-accent-signal-ink)] focus:px-3 focus:py-2"
                href="#main"
              >
                Skip to content
              </a>
              <Navbar
                className="sticky top-0 z-30 bg-[var(--color-surface-base)] [--page-gutter:1rem]"
                label="Hexline"
                collapseBelow="4xl"
                brand={<Brand />}
                items={navItems}
                actions={
                  <>
                    {/* Same order as every header: search, Design system, then the store's own
                        account and cart, then the theme. The search is icon only below @5xl,
                        where the row has no room for its word. Below @4xl the button does
                        not fit the row (demo.spec's 320px and 680px header-height tests), so it
                        is hidden there; Ctrl+K and / still open it, and so does the menu
                        sheet's Search entry. */}
                    <div className="hidden @4xl:flex">
                      <DocsSearch labelClassName="hidden @5xl:inline-flex" open={searchOpen} onOpenChange={setSearchOpen} />
                    </div>
                    {/* The Navbar's own breakpoint: below it, BackToDocs is in the menu. Icon only
                        until @5xl: signed in, the row has no room for the word just above @2xl. */}
                    <div className="hidden @2xl:flex">
                      <BackToDocs labelClassName="ml-2 hidden @5xl:inline" />
                    </div>
                    <AccountAction />
                    <CartSheet />
                    <ThemeToggle />
                  </>
                }
                renderLink={routerLink}
                menuFooter={close => (
                  <div className="flex flex-col items-start gap-2">
                    <Button variant="secondary" size="sm" iconStart={<Search />} onClick={() => searchFromMenu(close)}>
                      Search
                    </Button>
                    <BackToDocs />
                  </div>
                )}
              />
              {/* At least one screen less the Navbar (3.5rem, the figure HomeHero's own height
                  uses). That puts the Footer's top edge at or below the fold on every demo page,
                  in every state. It is what keeps a lazy route's chunk landing from being a
                  layout shift: while the chunk loads `<main>` holds a one-line fallback, and
                  without this floor the Footer sat right under that line, on screen, and was
                  thrown down the page when the real content arrived (0.74 measured on a direct
                  load of a product page at 1280x800, 2026-10-02). With the floor the Footer is
                  off screen before and after, and something that moves off screen is not a
                  shift. On `<main>`, not on the fallback: a floor on the fallback alone would
                  swap the direction for a page shorter than a screen (sign-in, the cart), whose
                  Footer would then jump UP into view. `e2e/pages.spec.ts` holds it on four lazy
                  routes. The fallback's text is untouched, so what assistive technology is told
                  while a page loads is what it was told before. */}
              <main id="main" tabIndex={-1} className="flex-1 min-w-0 min-h-[calc(100dvh-3.5rem)] focus:outline-none">
                <DemoErrorBoundary key={resetCount} resetKey={path} onRetry={() => setResetCount(count => count + 1)}>
                  <Suspense fallback={<DemoPageFallback onShown={setPageLoading} />}>
                    <Outlet />
                  </Suspense>
                </DemoErrorBoundary>
              </main>
              <Footer
                label="Hexline footer"
                columns={FOOTER_COLUMNS}
                // The sign-up, on every page (it was the homepage's last section): the same
                // form, through the same demo API, so its busy, failure and success states are
                // the real ones.
                aside={{
                  title: NEWSLETTER.title,
                  content: (
                    <>
                      <p className="font-body text-sm text-[var(--color-text-secondary)]">{NEWSLETTER.description}</p>
                      <NewsletterForm
                        className="mt-1"
                        label={NEWSLETTER.label}
                        consent={NEWSLETTER.consent}
                        fieldLabel={NEWSLETTER.field}
                        submitLabel={NEWSLETTER.submit}
                        busyLabel={NEWSLETTER.busy}
                        successTitle={NEWSLETTER.successTitle}
                        headingLevel={3}
                        onSubmit={subscribeToNewsletter}
                      />
                    </>
                  ),
                }}
                // The disclaimer, on every page: the small print over the wordmark.
                legal={DISCLAIMER}
                // The brand, once: the wordmark is the footer's only statement of the name.
                wordmark="Hexline"
                // Decoration, and only where it can run: without WebGL2 the footer gets no
                // backdrop and closes on the wordmark alone. `hasWebGL2()` is asked once per
                // page and remembered, so this is the same answer on every render.
                backdrop={hasWebGL2() ? <Terrain hold={pageLoading} /> : undefined}
                renderLink={routerLink}
              />
            </div>
          </CartProvider>
        </SessionProvider>
      </Toaster>
    </TooltipProvider>
  )
}
