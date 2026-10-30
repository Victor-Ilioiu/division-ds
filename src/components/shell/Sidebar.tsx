import type { ReactNode } from 'react'
import { Atom, Blocks, BookOpen, Component } from 'lucide-react'
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
      { to: '/components', label: 'All components' },
      { to: '/guidelines/install', label: 'Install' },
      { to: '/guidelines/color', label: 'Color' },
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
      { to: '/components/panel', label: 'Panel' },
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
      { to: '/components/code-block', label: 'Code block' },
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
]

/**
 * Every routable page, flattened. e2e/guidelines.spec.ts and e2e/reflow.spec.ts each iterate a
 * page list derived from NAV, so adding a page to any group above adds coverage automatically.
 */
export const SECTIONS: NavItem[] = NAV.flatMap(group => group.items)

/**
 * SECTIONS minus the demo sites (Hexline at /store, Corvane at /crm, Halden Console at /console, each with its own e2e spec): the docs guideline/reflow suites run each page in a
 * real Chrome instance with its own timing and layout assumptions, and /store is covered by its
 * own e2e/demo.spec.ts instead -- iterating it a second time under the docs spec would double-run
 * it against the wrong assumptions (no /store page's document.title matches the docs pattern, for
 * one). e2e/guidelines.spec.ts and e2e/reflow.spec.ts import this instead of SECTIONS;
 * e2e/keyboard.spec.ts stays on SECTIONS, since its bounded tab walk needs the sidebar's real
 * length, /store entry included.
 */
export const DOCS_SECTIONS: NavItem[] = SECTIONS.filter(
  section => !section.to.startsWith('/store') && !section.to.startsWith('/crm') && !section.to.startsWith('/console')
)

/** The shell's own `renderLink`, kept separate from the demo-scoped `src/demo/routerLink.tsx`. */
function shellRouterLink({ href, ...rest }: LinkRenderProps) {
  return <RouterLink to={href} {...rest} />
}

/** The docs navigation itself: every NAV group, the current page marked. Rendered by the
 *  desktop column below and by AppShell's narrow-screen menu sheet; only one is ever shown. */
export function DocsNav() {
  const location = useLocation()
  // Every NAV route is a leaf page, so an exact pathname match is `current` -- once the pathname
  // is normalized: a trailing slash (`/components/button/`) must still match, or nothing is
  // marked current and the organism's reopen-on-navigation effect stops firing with it.
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
  // The organism renders its own <nav>, named here: the one "Documentation" landmark.
  return <SidebarOrganism label="Documentation" groups={groups} renderLink={shellRouterLink} />
}

/**
 * The docs sidebar column, from `md` up. Below `md` it is not drawn at all: the top bar's menu
 * button (AppShell) opens the same DocsNav in a sheet, so a phone gets the page heading first
 * and the nav one tap away, with no 220px column pushing `<main>` off screen (SC 1.4.10).
 */
export function Sidebar() {
  return (
    <div
      className={[
        'hidden min-[42rem]:block p-4 shrink-0 border-[var(--color-border-hairline)]',
        'min-[42rem]:border-r min-[42rem]:min-w-[220px] min-[42rem]:max-h-[calc(100vh-57px)]',
        // A stable gutter: collapsing a group can drop the column below its max height, and
        // without the reserved lane the scrollbar vanishing would shift every item sideways.
        'min-[42rem]:overflow-y-auto min-[42rem]:[scrollbar-gutter:stable] min-[42rem]:sticky min-[42rem]:top-[57px]',
      ].join(' ')}
    >
      <DocsNav />
    </div>
  )
}
