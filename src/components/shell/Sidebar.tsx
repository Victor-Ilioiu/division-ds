import { useState, type ReactNode } from 'react'
import { Atom, Blocks, BookOpen, Component, Store } from 'lucide-react'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import { Sidebar as SidebarOrganism, type SidebarGroup } from '../organisms/sidebar/Sidebar'
import type { LinkRenderProps } from '../../lib/render-link'

export type NavItem = { to: string; label: string }
export type NavGroup = {
  title: string
  /** The group title's icon. The atomic-design tiers read as a progression: an atom, a component
   *  assembled from parts, blocks stacked into a larger unit. */
  icon: ReactNode
  /** Only Guidelines starts open; the organism still opens whichever group holds the current page. */
  defaultOpen?: boolean
  items: NavItem[]
}

export const NAV: NavGroup[] = [
  {
    title: 'Guidelines',
    icon: <BookOpen />,
    defaultOpen: true,
    items: [
      { to: '/', label: 'Overview' },
      { to: '/guidelines/install', label: 'Install' },
      { to: '/guidelines/color', label: 'Color' },
      { to: '/guidelines/theme', label: 'Theme builder' },
      { to: '/guidelines/typography', label: 'Typography' },
      { to: '/guidelines/spacing', label: 'Spacing & layout' },
      { to: '/guidelines/shape', label: 'Shape' },
      { to: '/guidelines/elevation', label: 'Elevation' },
      { to: '/guidelines/iconography', label: 'Iconography' },
      { to: '/guidelines/motion', label: 'Motion' },
      { to: '/guidelines/tokens', label: 'Tokens browser' },
      { to: '/guidelines/accessibility', label: 'Accessibility' },
      { to: '/guidelines/host-apps', label: 'Host apps' },
    ],
  },
  {
    title: 'Atoms',
    icon: <Atom />,
    items: [
      { to: '/components/ai-label', label: 'AI label' },
      { to: '/components/avatar', label: 'Avatar' },
      { to: '/components/badge', label: 'Badge' },
      { to: '/components/button', label: 'Button' },
      { to: '/components/checkbox', label: 'Checkbox' },
      { to: '/components/divider', label: 'Divider' },
      { to: '/components/icon-button', label: 'Icon button' },
      { to: '/components/input', label: 'Input' },
      { to: '/components/kbd', label: 'Kbd' },
      { to: '/components/link', label: 'Link' },
      { to: '/components/loading-animation', label: 'Loading animation' },
      { to: '/components/progress', label: 'Progress' },
      { to: '/components/radio', label: 'Radio' },
      { to: '/components/score-ring', label: 'Score ring' },
      { to: '/components/select', label: 'Select' },
      { to: '/components/skeleton', label: 'Skeleton' },
      { to: '/components/slider', label: 'Slider' },
      { to: '/components/sparkline', label: 'Sparkline' },
      { to: '/components/spinner', label: 'Spinner' },
      { to: '/components/switch', label: 'Switch' },
      { to: '/components/tag', label: 'Tag' },
      { to: '/components/textarea', label: 'Textarea' },
      { to: '/components/tooltip', label: 'Tooltip' },
    ],
  },
  {
    title: 'Molecules',
    icon: <Component />,
    items: [
      { to: '/components/accordion', label: 'Accordion' },
      { to: '/components/alert', label: 'Alert' },
      { to: '/components/approval-request', label: 'Approval request' },
      { to: '/components/avatar-group', label: 'Avatar group' },
      { to: '/components/breadcrumbs', label: 'Breadcrumbs' },
      { to: '/components/card', label: 'Card' },
      { to: '/components/chat-message', label: 'Chat message' },
      { to: '/components/date-picker', label: 'Date picker' },
      { to: '/components/date-presets', label: 'Date presets' },
      { to: '/components/date-range-picker', label: 'Date range picker' },
      { to: '/components/description-list', label: 'Description list' },
      { to: '/components/dropdown-menu', label: 'Dropdown menu' },
      { to: '/components/empty-state', label: 'Empty state' },
      { to: '/components/form-field', label: 'Form field' },
      { to: '/components/list-item', label: 'List item' },
      { to: '/components/multi-select', label: 'Multi-select' },
      { to: '/components/page-header', label: 'Page header' },
      { to: '/components/pagination', label: 'Pagination' },
      { to: '/components/prompt-input', label: 'Prompt input' },
      { to: '/components/quantity-stepper', label: 'Quantity stepper' },
      { to: '/components/rating', label: 'Rating' },
      { to: '/components/search', label: 'Search' },
      { to: '/components/section-heading', label: 'Section heading' },
      { to: '/components/segmented-control', label: 'Segmented control' },
      { to: '/components/stat', label: 'Stat' },
      { to: '/components/status-tracker', label: 'Status tracker' },
      { to: '/components/stepper', label: 'Stepper' },
      { to: '/components/tabs', label: 'Tabs' },
      { to: '/components/time-field', label: 'Time field' },
      { to: '/components/timeline', label: 'Timeline' },
      { to: '/components/toast', label: 'Toast' },
      { to: '/components/tool-call', label: 'Tool call' },
    ],
  },
  {
    title: 'Organisms',
    icon: <Blocks />,
    items: [
      { to: '/components/alert-dialog', label: 'Alert dialog' },
      { to: '/components/auth-form', label: 'Auth form' },
      { to: '/components/carousel', label: 'Carousel' },
      { to: '/components/cart', label: 'Cart' },
      { to: '/components/chart-panel', label: 'Chart panel' },
      { to: '/components/chat-thread', label: 'Chat thread' },
      { to: '/components/checkout-form', label: 'Checkout form' },
      { to: '/components/command-palette', label: 'Command palette' },
      { to: '/components/data-table', label: 'Data table' },
      { to: '/components/dialog', label: 'Dialog' },
      { to: '/components/footer', label: 'Footer' },
      { to: '/components/kanban-board', label: 'Kanban board' },
      { to: '/components/navbar', label: 'Navbar' },
      { to: '/components/newsletter-form', label: 'Newsletter form' },
      { to: '/components/product-card', label: 'Product card' },
      { to: '/components/sheet', label: 'Sheet' },
      { to: '/components/sidebar', label: 'Sidebar' },
    ],
  },
  {
    title: 'Demo site',
    icon: <Store />,
    items: [
      { to: '/demo', label: 'Hexline store' },
      { to: '/crm', label: 'Corvane CRM' },
      { to: '/console', label: 'Halden Console' },
    ],
  },
]

/**
 * Every routable page, flattened. e2e/guidelines.spec.ts and e2e/reflow.spec.ts each iterate a
 * page list derived from NAV, so adding a page to any group above adds coverage automatically.
 */
export const SECTIONS: NavItem[] = NAV.flatMap(group => group.items)

/**
 * SECTIONS minus the demo sites (Hexline at /demo, Corvane at /crm, Halden Console at /console, each with its own e2e spec): the docs guideline/reflow suites run each page in a
 * real Chrome instance with its own timing and layout assumptions, and /demo is covered by its
 * own e2e/demo.spec.ts instead -- iterating it a second time under the docs spec would double-run
 * it against the wrong assumptions (no /demo page's document.title matches the docs pattern, for
 * one). e2e/guidelines.spec.ts and e2e/reflow.spec.ts import this instead of SECTIONS;
 * e2e/keyboard.spec.ts stays on SECTIONS, since its bounded tab walk needs the sidebar's real
 * length, /demo entry included.
 */
export const DOCS_SECTIONS: NavItem[] = SECTIONS.filter(
  section => !section.to.startsWith('/demo') && !section.to.startsWith('/crm') && !section.to.startsWith('/console')
)

/** The shell's own `renderLink`, kept separate from the demo-scoped `src/demo/routerLink.tsx`. */
function shellRouterLink({ href, ...rest }: LinkRenderProps) {
  return <RouterLink to={href} {...rest} />
}

export function Sidebar() {
  // Below `md` the sidebar stops being a column beside `<main>` and becomes a disclosure above
  // it. It used to be a hard `min-w-[220px]` inside a plain flex row with no responsive
  // behaviour at all: at 320px it took 220px of the viewport and pushed `<main>` off-screen,
  // cutting content off mid-word — SC 1.4.10 (reflow), on all 28 pages, in both themes.
  //
  // A disclosure rather than an always-stacked list, because every nav entry stacked above the
  // content would put every page's heading roughly two screens down on a phone. Collapsed by
  // default, expanded by a real <button> with aria-expanded/aria-controls — no JS beyond the
  // toggle, and the nav stays reachable, which matters more than the failure being fixed: a nav
  // that becomes unreachable is a worse defect than the one it replaces.
  const [open, setOpen] = useState(false)
  const location = useLocation()

  // Every NAV route is a leaf page with no children (including '/'), so an exact pathname match
  // is `current` for all of them — no `end`/prefix special case needed, unlike the NavLink this
  // replaces — but only once the pathname is normalized: a trailing slash (e.g.
  // `/components/button/`) must still match `/components/button`, or nothing is ever marked
  // current on such a URL, and the organism's own reopen-on-navigation effect (which depends on
  // `current` too) silently stops firing along with it.
  const path = location.pathname.replace(/\/+$/, '') || '/'
  const groups: SidebarGroup[] = NAV.map(group => ({
    title: group.title,
    icon: group.icon,
    defaultOpen: group.defaultOpen ?? false,
    items: group.items.map(item => ({
      label: item.label,
      href: item.to,
      current: path === item.to,
    })),
  }))

  return (
    <div
      className={[
        'p-4 shrink-0 border-[var(--color-border-hairline)]',
        // Stacked below md: a full-width band with a rule underneath it.
        'border-b',
        // Beside <main> from md up: the same left column as before, unchanged.
        'md:border-b-0 md:border-r md:min-w-[220px] md:max-h-[calc(100vh-57px)]',
        // A stable gutter: collapsing a group can drop the column below its max height, and
        // without the reserved lane the scrollbar vanishing would shift every item sideways.
        'md:overflow-y-auto md:[scrollbar-gutter:stable] md:sticky md:top-[57px]',
      ].join(' ')}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls="sidebar-nav"
        onClick={() => setOpen(o => !o)}
        className="md:hidden font-mono text-xs uppercase tracking-widest border border-[var(--color-border-control)] px-3 py-2 min-h-[36px] w-full text-left text-[var(--color-text-secondary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
      >
        {open ? 'Hide navigation' : 'Show navigation'}
      </button>

      {/* No outer <nav> here: the organism renders its own, named by `label` below, so this
          stays the one "Documentation" landmark instead of nesting two. */}
      <div id="sidebar-nav" className={`${open ? 'block mt-4' : 'hidden'} md:block`}>
        <SidebarOrganism label="Documentation" groups={groups} renderLink={shellRouterLink} />
      </div>
    </div>
  )
}
