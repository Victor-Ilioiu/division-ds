import { Boxes, Inbox, LayoutDashboard, Map, Package, Settings, Box, Truck, UserCog, Users, Warehouse } from 'lucide-react'
import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './Sidebar.meta'
import { Example } from '../../docs/Example'
import { Button } from '../../atoms'
import type { LinkRenderProps } from '../../../lib/render-link'
import { Sheet, SheetClose, SheetContent, SheetTrigger } from '../sheet/Sheet'
import { Sidebar, type SidebarGroup } from './Sidebar'

const GROUPS: SidebarGroup[] = [
  {
    title: 'Operations',
    icon: <Warehouse />,
    items: [
      { label: 'Overview', href: '#overview', icon: <LayoutDashboard /> },
      { label: 'Orders', href: '#orders', icon: <Package />, current: true, count: 12 },
      { label: 'Shipments', href: '#shipments', icon: <Truck /> },
      { label: 'Returns', href: '#returns', icon: <Inbox />, count: 3 },
    ],
  },
  {
    title: 'Catalogue',
    icon: <Boxes />,
    defaultOpen: false,
    items: [
      { label: 'Products', href: '#products', icon: <Box /> },
      { label: 'Inventory', href: '#inventory', icon: <Map /> },
    ],
  },
  {
    title: 'Account',
    icon: <UserCog />,
    collapsible: false,
    items: [
      { label: 'Settings', href: '#settings', icon: <Settings /> },
      { label: 'Team', href: '#team', icon: <Users /> },
    ],
  },
]

// Contrast: "text.primary on surface.raised (over surface.base)" in the Example wrapper, which is
// surface.raised, and "text.primary on surface.base" inside the Sheet example, which is base.
const HEADER = <p className="font-display font-semibold">Hexline ops</p>
// Contrast: "alert body and ghost dismiss (text.secondary) on surface.raised (over surface.base)" in the
// Example wrapper, and "text.secondary on surface.base" inside the Sheet example.
const FOOTER = <p className="text-xs text-[var(--color-text-secondary)]">Signed in as Ana Pop</p>

// Sidebar itself never closes a Sheet it's placed in — unlike Navbar, it doesn't own the Sheet, so
// it has no open state to flip. Wrapping the rendered link in SheetClose (asChild, so the anchor
// stays the DOM node) closes the sheet the moment a reader picks a destination, the pattern any app
// composing Sidebar inside a Sheet should follow.
// Radix's Close is a button and sets type="button"; asChild carries that onto the anchor, where
// `type` names a MIME type. Passing undefined overrides it, so the anchor carries no type at all.
const closeOnChoose = ({ onClick, ...props }: LinkRenderProps) => (
  <SheetClose asChild type={undefined}>
    <a {...props} onClick={onClick} />
  </SheetClose>
)

export function SidebarDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Dashboard navigation" className="block">
        <div className="max-w-64">
          <Sidebar label="Dashboard navigation" groups={GROUPS} header={HEADER} footer={FOOTER} />
        </div>
      </Example>

      <Example caption="In a sheet on a narrow screen: picking a link closes the sheet, through renderLink" className="block">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="secondary">Open navigation</Button>
          </SheetTrigger>
          <SheetContent side="left" title="Navigation">
            <Sidebar
              label="Dashboard navigation, in a sheet"
              groups={GROUPS}
              header={HEADER}
              footer={FOOTER}
              renderLink={closeOnChoose}
            />
          </SheetContent>
        </Sheet>
      </Example>
    </ComponentDocs>
  )
}
