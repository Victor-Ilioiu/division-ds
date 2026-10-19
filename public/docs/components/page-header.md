# PageHeader

> The top of a screen. It holds the page’s one h1 (the main, level-1 heading), and can add an eyebrow, a description, a breadcrumb trail and the page’s own actions at the far edge.

- **Best for:** The top of every screen: its one h1, with eyebrow, description, breadcrumbs and page actions.
- **Not for:** A section inside a page: use SectionHeading.
- Molecule. Source: `src/components/molecules/page-header/PageHeader.tsx`
- Rendered docs page: `/components/page-header`

## Import

```tsx
import { PageHeader } from 'src/components/molecules/page-header/PageHeader'
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` | `string` |  | Required. The page’s name, shown as its h1. |
| `eyebrow` | `ReactNode` |  | A short label above the title: the area the page belongs to. |
| `description` | `ReactNode` |  | One or two sentences under the title. |
| `actions` | `ReactNode` |  | The page’s own actions, usually one or two Buttons. The component lays out the row and its gap. |
| `breadcrumbs` | `ReactNode` |  | A Breadcrumbs element, drawn above the eyebrow. |
| `id` | `string` |  | Goes on the h1, not the wrapper, so main can point aria-labelledby at it. That ARIA (Accessible Rich Internet Applications) attribute lets the main area take its name from the heading. |
| `level` | `1 \| 2` | `1` | Use 2 only for a page-style header inside a page that already has its h1 (a pane, a tab panel). It looks the same either way. |
| `className` | `string` |  | Extra CSS classes, merged onto the outer element. When two Tailwind classes clash, the later one wins. |
| `ref` | `Ref<HTMLDivElement>` |  | Passed through to the outer element. |

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Title and description

```tsx
<PageHeader level={2} title="Orders" description="Every order from the last 90 days, newest first." />
```

### With an eyebrow and actions

```tsx
<PageHeader
  level={2}
  eyebrow="Operations"
  title="Inventory"
  description="Stock across both depots, counted at close of day."
  actions={
    <>
      <Button variant="secondary">Export</Button>
      <Button>Add replica</Button>
    </>
  }
/>
```

### Under a breadcrumb trail

```tsx
<PageHeader
  level={2}
  breadcrumbs={
    <Breadcrumbs
      items={[
        { label: 'Account', href: '#account' },
        { label: 'Settings', href: '#settings' },
        { label: 'Notifications' },
      ]}
    />
  }
  title="Notifications"
  description="What we send, and where."
  actions={<Button variant="secondary">Reset to defaults</Button>}
/>
```

## Keyboard

| Keys | Result |
|---|---|
| `Tab` | Moves through the breadcrumb links, then the actions. The header itself never takes keyboard focus. |

## Do

- Use one per screen, at the top, inside main.
- Keep the eyebrow to the area’s name (“Operations”), and the title to the page’s.
- Put the page’s primary action last in the actions row, so it lands at the far edge.
- When the page has more than one landmark (a named region screen readers can jump to), give the h1 an id and use it to name main.

## Don't

- Don’t use it for a section inside a page. That’s a SectionHeading.
- Don’t put the page’s filters or tabs in the actions slot. They belong to the content under it.
- Don’t repeat the title in the eyebrow. The eyebrow names where the page sits, and the title names the page.
- Don’t add a second h1 inside the description or the actions.

## Common mistakes

Wrong:

```tsx
<PageHeader level={2} title="Orders" />
```

Right:

```tsx
<PageHeader title="Orders" />
```

The examples on this page pass level={2} only because they sit inside this docs page, which has its own h1. A screen’s own header is its h1, so leave level out.

Wrong:

```tsx
<PageHeader title="Inventory" />
<PageHeader title="Low stock" />
```

Right:

```tsx
<PageHeader title="Inventory" />
<SectionHeading level={2} title="Low stock" />
```

A page has one h1. Every heading under it is a SectionHeading, at the level the page’s outline of headings needs.

Wrong:

```tsx
<PageHeader title="Inventory" breadcrumbs={[{ label: "Operations" }]} />
```

Right:

```tsx
<PageHeader title="Inventory" breadcrumbs={<Breadcrumbs items={[{ label: "Operations", href: "/ops" }, { label: "Inventory" }]} />} />
```

breadcrumbs is a slot, not an array. Pass a Breadcrumbs element, which keeps its own renderLink and maxItems.

## Anatomy

- **Breadcrumbs**: Optional. A Breadcrumbs trail above everything else, first in reading order.
- **Eyebrow**: Optional. A small label: JetBrains Mono, 12px (pixels), semibold, uppercase, in text.muted. It's a paragraph above the h1 and isn't part of the heading's name.
- **Title**: The page’s h1. Oxanium, semibold, 24px, growing to 30px when the header gets 48rem or more of width (a rem is the base text size, usually 16px).
- **Description**: Optional. 16px body text in text.secondary, with lines no longer than 64 characters.
- **Actions**: Optional. The page’s own controls at the far edge, in a row with a 12px gap. The row drops under the title when it runs out of room.
