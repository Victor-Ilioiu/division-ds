import { Suspense, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { SiteHeader } from './SiteHeader'
import { DocsNav, Sidebar } from './Sidebar'
import { Spinner } from '../atoms/spinner/Spinner'
import { TooltipProvider } from '../atoms/tooltip/Tooltip'
import { Toaster } from '../molecules/toast/Toast'

export function AppShell({ title = 'Division DS' }: { title?: string } = {}) {
  const location = useLocation()
  // React Router gives the very first location the key 'default' and every in-app navigation a
  // generated one, so this is "has the reader navigated yet" without a ref or an effect: a fresh
  // load renders settled, every sidebar click after it animates in (see `.anim-route-in`).
  const navigated = location.key !== 'default'
  // The shell that renders owns its own title. No dependency array: any AppShell render is a
  // docs route, and this needs to win back the title unconditionally after a /store visit has
  // changed it, on every path this shell renders -- including a trailing-slash docs URL, which a
  // path-keyed check would have missed, and including the docs 404's own title (`title` here,
  // passed by the route that renders `DocsNotFound`) once a real page's render wins it back.
  useEffect(() => {
    document.title = title
  })

  return (
    <TooltipProvider>
      <Toaster>
        <div data-docs-shell="" className="min-h-screen bg-[var(--color-surface-base)] text-[var(--color-text-primary)] font-body">
          <a className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-10 focus:bg-[var(--color-accent-signal-fill)] focus:text-[var(--color-accent-signal-ink)] focus:px-3 focus:py-2" href="#main">
            Skip to content
          </a>
          {/* The site header, shared with the homepage (SiteHeader). Below the sidebar's
              breakpoint its menu sheet carries the docs nav too. */}
          <SiteHeader sheetExtra={<DocsNav />} />
          {/* Column on a phone, row from md up — below that breakpoint the sidebar is not drawn
              and the nav lives in the top bar's menu sheet (see Sidebar.tsx). `min-w-0` on <main> is not cosmetic: a flex item
              defaults to `min-width: auto`, so wide content (a docs table, a long type signature)
              refuses to shrink and overflows the page horizontally no matter what the sidebar
              does. Both halves of the 320px reflow failure needed fixing, not just the sidebar. */}
          <div className="flex flex-col min-[42rem]:flex-row">
            <Sidebar />
            <main id="main" tabIndex={-1} className="flex-1 min-w-0 p-4 md:px-10 md:py-12">
              {/* Keyed on the pathname, so only this view remounts on a route change -- and so its
                  entrance animation replays -- while the header and sidebar outside it stay the
                  same DOM nodes. The pathname, not the full location: a query-string-only change
                  is the same page and must not replay the entrance. */}
              <div key={location.pathname} data-route-view="" className={navigated ? 'anim-route-in' : undefined}>
                {/* The docs pages are lazy chunks (src/docsPages.ts). The Suspense sits here, inside
                    the keyed view, so the header and sidebar stay mounted while a page loads. The
                    system's own Conveyor spinner in the space the page will fill; its `label`
                    makes it a `role="status"` region, which announces the rare slow load. */}
                <Suspense
                  fallback={
                    <div className="flex min-h-[40vh] items-center justify-center">
                      <Spinner variant="conveyor" size="lg" label="Loading page" />
                    </div>
                  }
                >
                  <Outlet />
                </Suspense>
              </div>
            </main>
          </div>
        </div>
      </Toaster>
    </TooltipProvider>
  )
}
