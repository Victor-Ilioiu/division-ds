import { Suspense, useEffect } from 'react'
import { Outlet, matchPath, useLocation } from 'react-router-dom'
import { Spinner } from '../components/atoms/spinner/Spinner'
import { TooltipProvider } from '../components/atoms/tooltip/Tooltip'
import { Toaster } from '../components/molecules/toast/Toast'
import { Footer, type FooterColumn } from '../components/organisms/footer/Footer'
import { SiteHeader } from '../components/shell/SiteHeader'
import { routerLink } from '../demo/routerLink'
import { CartProvider } from '../demo/store/cart'
import { FooterBackdrop } from './hero/FooterBackdrop'
import { COMPONENTS_HOME, SHOWCASE_APP, SHOWCASE_HOME, SHOWCASE_PAGES, SHOWCASE_STORE } from './routes'

// The most-used components, one column per tier (as on the components index), then the site's own links.
const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: 'Atoms',
    links: [
      { label: 'Button', href: `${COMPONENTS_HOME}/button` },
      { label: 'Input', href: `${COMPONENTS_HOME}/input` },
      { label: 'Select', href: `${COMPONENTS_HOME}/select` },
      { label: 'Checkbox', href: `${COMPONENTS_HOME}/checkbox` },
      { label: 'Switch', href: `${COMPONENTS_HOME}/switch` },
      { label: 'Badge', href: `${COMPONENTS_HOME}/badge` },
    ],
  },
  {
    title: 'Molecules',
    links: [
      { label: 'Form field', href: `${COMPONENTS_HOME}/form-field` },
      { label: 'Tabs', href: `${COMPONENTS_HOME}/tabs` },
      { label: 'Accordion', href: `${COMPONENTS_HOME}/accordion` },
      { label: 'Chat message', href: `${COMPONENTS_HOME}/chat-message` },
      { label: 'Tool call', href: `${COMPONENTS_HOME}/tool-call` },
      { label: 'Code block', href: `${COMPONENTS_HOME}/code-block` },
    ],
  },
  {
    title: 'Organisms',
    links: [
      { label: 'Data table', href: `${COMPONENTS_HOME}/data-table` },
      { label: 'Dialog', href: `${COMPONENTS_HOME}/dialog` },
      { label: 'Command palette', href: `${COMPONENTS_HOME}/command-palette` },
      { label: 'Chat thread', href: `${COMPONENTS_HOME}/chat-thread` },
      { label: 'Checkout form', href: `${COMPONENTS_HOME}/checkout-form` },
      { label: 'Kanban board', href: `${COMPONENTS_HOME}/kanban-board` },
    ],
  },
  {
    title: 'Showcase',
    links: [
      { label: 'Home', href: SHOWCASE_HOME },
      { label: 'Hexline Store', href: SHOWCASE_STORE },
      { label: 'Corvane CRM', href: SHOWCASE_APP },
      { label: 'Halden Console', href: '/console' },
    ],
  },
  {
    title: 'Design system',
    links: [
      { label: 'Install', href: '/guidelines/install' },
      { label: 'Components', href: COMPONENTS_HOME },
      { label: 'Themes', href: '/themes' },
    ],
  },
  {
    title: 'Source',
    links: [
      { label: 'GitHub', href: 'https://github.com/Victor-Ilioiu/division-ds', external: true },
      { label: 'npm', href: 'https://www.npmjs.com/package/division-ds', external: true },
    ],
  },
]

function useShowcaseTitle(path: string) {
  useEffect(() => {
    const page = SHOWCASE_PAGES.find(p => matchPath({ path: p.path, end: true }, path))
    if (page && !page.path.includes(':')) document.title = page.title
  }, [path])
}

/**
 * The showcase shell. It mounts the two providers once (Toaster, TooltipProvider), the Hexline
 * cart (shared with /store through the same storage key), the page gutter and the background.
 */
export function ShowcaseLayout() {
  const { pathname } = useLocation()
  const path = pathname.replace(/\/+$/, '') || '/'
  useShowcaseTitle(path)


  return (
    <TooltipProvider>
      <Toaster>
        <CartProvider>
          <div className="[--page-gutter:1rem] lg:[--page-gutter:4rem] min-h-screen flex flex-col bg-[var(--color-surface-base)] text-[var(--color-text-primary)] font-body">
            <a
              className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-40 focus:bg-[var(--color-accent-signal-fill)] focus:text-[var(--color-accent-signal-ink)] focus:px-3 focus:py-2"
              href="#main"
            >
              Skip to content
            </a>
            {/* The same header as the docs (SiteHeader), so the two can never drift. */}
            <SiteHeader />
            <main id="main" tabIndex={-1} className="flex-1 min-w-0 min-h-[calc(100dvh-3.5rem)] focus:outline-none">
              <Suspense
                fallback={
                  <div className="flex justify-center py-24">
                    <Spinner label="Loading page" />
                  </div>
                }
              >
                <Outlet />
              </Suspense>
            </main>
            <Footer
              label="Showcase footer"
              columns={FOOTER_COLUMNS}
              tagline="Every screen on this site is built from Division DS components and tokens. All company names, people, orders and figures in the examples are made up."
              legal="Division DS is open source. Hexline, Corvane and Halden Console are fictional."
              wordmark="Division"
              wordmarkFit="contained"
              wordmarkCaption="Agentic Design System"
              backdrop={<FooterBackdrop className="absolute inset-0 size-full" />}
              renderLink={routerLink}
            />
          </div>
        </CartProvider>
      </Toaster>
    </TooltipProvider>
  )
}
