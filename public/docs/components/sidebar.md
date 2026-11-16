# Sidebar

> The navigation down the side of an app. It holds groups of pages, each page with an icon and an optional count. Groups can fold away, and there is room for a header and an account line.

- **Best for:** App navigation down the side: grouped pages with icons and counts.
- **Not for:** A site header with a few links: use Navbar.
- Organism. Source: `src/components/organisms/sidebar/Sidebar.tsx`
- Rendered docs page: `/components/sidebar`

## Import

```tsx
import { Sidebar } from 'src/components/organisms/sidebar/Sidebar'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file. An install has no index barrels: import each component from its own file, never from `components/molecules`.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` |  | Required. The name screen readers give the navigation region. |
| `groups` | `SidebarGroup[]` |  | Required. Each group has title, icon, items, collapsible and defaultOpen, and optionally action (a small icon button at the right end of the title row, beside the fold toggle, never inside it) footer (under the items, lined up with them, hidden while the group is folded), count (a short right-aligned readout in the data font, such as "2/2", read as part of the toggle’s name) onOpenChange (called with the new state when the reader folds or unfolds it) and open (controls the fold from outside, paired with onOpenChange, for a page that opens one group and folds the rest). Each item can carry count (a number in the data font) and bar (a 2px MeterBar under the item). Labels truncate in a narrow column instead of pushing the count out. |
| `header` | `ReactNode` |  | Sits above the groups: a product name, a workspace switcher. |
| `footer` | `ReactNode` |  | Pinned below the groups when the Sidebar has a height (h-full in a column layout): the signed-in account, a help link. |
| `renderLink` | `(props: LinkRenderProps) => ReactNode` | `a plain anchor` | Pass your router's link component here. Map href to its own prop, and pass className, aria-current and onClick through. |
| `className` | `string` |  | Added to the root classes. Where two Tailwind utility classes clash, the later one wins. |
| `ref` | `Ref<HTMLElement>` |  | The nav element. |

## Types and helpers

Exported beside the component, from the same file. Import a type with `import type { ... }`.

```ts
export type SidebarItem = {
  label: string
  href: string
  /** An icon, drawn aria-hidden; the label carries the meaning. */
  icon?: ReactNode
  current?: boolean
  /** A number shown at the end of the item and read as part of its name ("Orders 12"). */
  count?: number
  /** A 2px bar under the item (the MeterRow bar), inset to the item's padding. */
  bar?: Omit<MeterBarProps, 'className'>
}
```

```ts
export type SidebarGroup = {
  /** Also the React key for this group; unique within a Sidebar. */
  title: string
  /** Drawn before the title, aria-hidden; the title alone names the group. */
  icon?: ReactNode
  items: SidebarItem[]
  /** @default true */
  collapsible?: boolean
  /** Ignored when the group holds the current item, which always starts open. @default true */
  defaultOpen?: boolean
  /** Drawn at the far right of the title row: a small icon button, e.g. a ghost size="sm" Button
   *  with a Plus icon and aria-label="New project". It sits beside the fold toggle, never inside it,
   *  so pressing it does not open or close the group. The title truncates before it is pushed out. */
  action?: ReactNode
  /** Drawn under the items, inside the group, lined up with the items' left edge and padding: an
   *  "Add project" button. Hidden (and unreachable by Tab) while the group is folded. */
  footer?: ReactNode
  /** Right-aligned data before the chevron ("2/2"). Read as part of the toggle's name. */
  count?: string
  /** Called when the reader folds or unfolds the group. */
  onOpenChange?: (open: boolean) => void
  /** Controls the fold from outside, for a page that opens one group and folds the rest (for
   *  example to reveal an item picked elsewhere). Pair it with onOpenChange. Unset, the group keeps
   *  its own state. */
  open?: boolean
}
```

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Dashboard navigation

```tsx
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

const HEADER = <p className="font-display font-semibold">Hexline ops</p>

const FOOTER = <p className="text-xs text-[var(--color-text-secondary)]">Signed in as Ana Pop</p>

<div className="max-w-64">
  <Sidebar label="Dashboard navigation" groups={GROUPS} header={HEADER} footer={FOOTER} />
</div>
```

### A Projects group with an action in its title row and a footer under its items

```tsx
const PROJECT_GROUPS: SidebarGroup[] = [
  {
    title: 'Projects',
    icon: <FolderKanban />,
    action: (
      <IconButton label="New project" variant="ghost" size="sm">
        <Plus aria-hidden="true" />
      </IconButton>
    ),
    items: [
      { label: 'Spring restock', href: '#spring-restock', icon: <Folder /> },
      { label: 'Warehouse move', href: '#warehouse-move', icon: <Folder /> },
    ],
    footer: (
      <Button variant="ghost" size="sm">
        <Plus aria-hidden="true" />
        New project
      </Button>
    ),
  },
]

<div className="max-w-64">
  <Sidebar label="Projects navigation" groups={PROJECT_GROUPS} />
</div>
```

### Group counts, item bars and a narrow column: labels truncate, counts stay

```tsx
const METER_GROUPS: SidebarGroup[] = [
  {
    title: 'Warehouses',
    icon: <Warehouse />,
    count: '3/4',
    items: [
      { label: 'North depot and loading bay', href: '#north', icon: <Box />, count: 412, bar: { value: 412, max: 600, color: 'teal' } },
      { label: 'Harbour store', href: '#harbour', icon: <Box />, count: 268, bar: { value: 268, max: 600, color: 'teal' } },
      { label: 'East yard', href: '#east', icon: <Box />, count: 74, bar: { value: 74, max: 600, color: 'teal' } },
    ],
  },
]

<div className="max-w-48">
  <Sidebar label="Warehouse navigation" groups={METER_GROUPS} />
</div>
```

### In a sheet on a narrow screen: picking a link closes the sheet, through renderLink

```tsx
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

const HEADER = <p className="font-display font-semibold">Hexline ops</p>

const FOOTER = <p className="text-xs text-[var(--color-text-secondary)]">Signed in as Ana Pop</p>

const closeOnChoose = ({ onClick, ...props }: LinkRenderProps) => (
  <SheetClose asChild type={undefined}>
    <a {...props} onClick={onClick} />
  </SheetClose>
)

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
```

## Keyboard

| Keys | Result |
|---|---|
| `Tab` | Moves through each group title that can fold, then each visible item. |
| `Enter` | Follows an item, or folds and unfolds a group. |
| `Space` | Folds and unfolds a group. |

## Do

- Only show counts for things that need attention: open orders, not total products.
- Keep the group that holds the current page open.
- On a narrow screen, put the whole sidebar in a Sheet behind a button.

## Don't

- Don't nest groups inside groups.
- Don't show a count of zero. Leave it off.
- Don't rely on icons alone. Every item keeps its label.

## Anatomy

- **nav**: The navigation region. Screen readers call it by the label prop.
- **Group title**: A disclosure button (one that shows and hides the list) when the group can fold, plain text when it can't. It's text.secondary, so it still reads on a raised panel. Its list opens and closes by animating its height. Opening also fades and slides each item in, each one a little later than the one before (capped, so a long group never feels slow). Closing fades everything out together, all at once. If someone has asked their system for less motion (prefers-reduced-motion: reduce), both happen instantly.
- **Item**: An icon, a label and an optional count. The current page gets the fill, plus aria-current, an ARIA attribute (Accessible Rich Internet Applications, the labels screen readers rely on) that tells screen readers this is the page you are on.
- **Group action**: Optional. A small icon button at the right end of the title row, such as New project. It sits next to the fold toggle, not inside it, so pressing it never folds the group. A long title is cut short before it can push the action out.
- **Group footer**: Optional. Under the group's items and lined up with them: an Add project button. It folds away with the items.
- **Header**: Sits above the groups: a product name, a workspace switcher.
- **Footer**: Pinned below the groups: the signed-in account, a help link.
