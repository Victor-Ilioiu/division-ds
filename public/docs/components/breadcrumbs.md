# Breadcrumbs

> Shows where this page sits among the pages above it. The last level is the current page, shown as text. Every level above it is a link.

- **Best for:** Showing where a page sits in a hierarchy more than one level deep.
- **Not for:** Steps in a sequence: use Stepper.
- Molecule. Source: `src/components/molecules/breadcrumbs/Breadcrumbs.tsx`
- Rendered docs page: `/components/breadcrumbs`

## Import

```tsx
import { Breadcrumbs, collapseCrumbs } from 'src/components/molecules/breadcrumbs/Breadcrumbs'
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `items` | `Crumb[]` |  | { label, href? }. A level with no href shows as plain text. |
| `maxItems` | `number` |  | Collapse the trail when it has more levels than this. It never goes below 3. |
| `label` | `string` | `'Breadcrumb'` | The name of the nav landmark. |
| `className` | `string` |  | Merged onto the nav. |
| `renderLink` | `(props: LinkRenderProps) => ReactNode` | `a plain anchor` | How each linked level is drawn. Pass your router's link component to move between pages inside the app. |
| `ref` | `Ref<HTMLElement>` |  | Passed through to the nav DOM element. |

## Types and helpers

Exported beside the component, from the same file. Import a type with `import type { ... }`.

```ts
export type Crumb = { label: string; href?: string }
```

```ts
/** First item, a gap, then the last (maxItems - 1). Three is the floor: below it there is no
 *  middle left to collapse and the gap would replace the only context the trail gives. */
export function collapseCrumbs(items: Crumb[], maxItems?: number): (Crumb | 'gap')[]
```

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Default

```tsx
const TRAIL = [
  { label: 'Catalogue', href: '/catalogue' },
  { label: 'Optics', href: '/catalogue/optics' },
  { label: 'Holo sights', href: '/catalogue/optics/holo-sights' },
  { label: 'Prism holo sight' },
]

<Breadcrumbs items={TRAIL} label="Breadcrumb, default example" />
```

### Collapsed

```tsx
const DEPOT_TRAIL = [
  { label: 'Depot', href: '/depot' },
  { label: 'Region: North', href: '/depot/north' },
  { label: 'Site: Fell Beck', href: '/depot/north/fell-beck' },
  { label: 'Building: Stores', href: '/depot/north/fell-beck/stores' },
  { label: 'Bay 4', href: '/depot/north/fell-beck/stores/bay-4' },
  { label: 'Crate 118' },
]

<Breadcrumbs items={DEPOT_TRAIL} maxItems={3} label="Breadcrumb, collapsed" />
```

### A level that is not a page

```tsx
const MID_LEVEL_TRAIL = [
  { label: 'Catalogue', href: '/catalogue' },
  { label: 'Optics' },
  { label: 'Holo sights', href: '/catalogue/optics/holo-sights' },
]

<Breadcrumbs items={MID_LEVEL_TRAIL} label="Breadcrumb, mid-level example" />
```

## Keyboard

| Keys | Result |
|---|---|
| `Tab` | Moves through the linked levels in order. The current page isn't a stop. |

## Do

- Start from the top of the hierarchy, not from the home page, when the site has one obvious root.
- Use the page's own heading text as its crumb.
- Collapse long trails on narrow layouts with maxItems.

## Don't

- Don't use breadcrumbs for a sequence of steps. That's Stepper.
- Don't make the current page a link.
- Don't put a breadcrumb trail on a page that's only one level deep.

## Anatomy

- **nav**: A navigation landmark (a region screen readers can jump to) named 'Breadcrumb'.
- **ol**: An ordered list, because the order is the information.
- **Level**: A quiet Link.
- **Current page**: Text with aria-current=page, which tells screen readers it's the page you're on. Never a link to itself.
- **Separator**: A slash in monospaced type, marked aria-hidden so screen readers skip it.
- **Gap**: An ellipsis (…) when the middle levels are collapsed, read out as 'more levels' by screen readers. It isn't a button.
