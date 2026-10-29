# EmptyState

> What a list, a table or a page region shows when it has nothing in it: an icon, a title that names what is empty, a sentence on why, and the action that fills it.

- **Best for:** A list, table or region with nothing in it, along with the action that fills it.
- **Not for:** A list that's still loading: use Skeleton or Spinner. A failed load: use Alert in the hostile tone.
- Molecule. Source: `src/components/molecules/empty-state/EmptyState.tsx`
- Rendered docs page: `/components/empty-state`

## Import

```tsx
import { EmptyState } from 'src/components/molecules/empty-state/EmptyState'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file. An install has no index barrels: import each component from its own file, never from `components/molecules`.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` | `string` |  | Required. What is empty, said plainly: “No orders yet”. |
| `level` | `2 \| 3 \| 4` |  | Required, with no default. The heading level the page's outline of headings needs at this point. |
| `description` | `ReactNode` |  | One or two sentences: why it's empty, or what fills it. |
| `icon` | `ReactNode` |  | A lucide icon element. The component sizes it and wraps it in a tile that screen readers skip (aria-hidden). |
| `actions` | `ReactNode` |  | One or two Buttons. The component lays out the row and its gap. |
| `size` | `'sm' \| 'md'` | `'md'` | md for a page region. sm inside a table, a card or a panel. |
| `framed` | `boolean` | `true` | The dashed frame. Turn it off where the container already draws an edge. |
| `className` | `string` |  | Extra CSS classes, merged onto the outer element. When two Tailwind classes clash, the later one wins. |
| `ref` | `Ref<HTMLDivElement>` |  | Passed through to the outer element. |
| `...rest` | `Omit<HTMLAttributes<HTMLDivElement>, 'title'>` |  | Any other div attribute, put on the outer element. role="status" goes here when nothing else on the page tells screen readers that the list has emptied. |

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### A page region, after a filter

```tsx
<EmptyState
  level={4}
  icon={<PackageSearch />}
  title="No replicas match"
  description="Nothing in stock matches all three filters. Remove one, or clear them and start again."
  actions={
    <>
      <Button>Clear filters</Button>
      <Button variant="secondary">Browse all replicas</Button>
    </>
  }
/>
```

### First use, one action

```tsx
<EmptyState
  level={4}
  icon={<Heart />}
  title="Your wishlist is empty"
  description="Save a replica from its page and it waits here, with its price and stock."
  actions={<Button variant="secondary">Browse replicas</Button>}
/>
```

### Small and unframed, inside a card

```tsx
<Card as="div" className="max-w-md">
  <CardBody>
    <EmptyState
      level={4}
      size="sm"
      framed={false}
      icon={<StickyNote />}
      title="No notes on this order"
      description="Notes added at the counter show up here."
    />
  </CardBody>
</Card>
```

### Title only

```tsx
<EmptyState level={4} size="sm" title="No returns yet" />
```

## Keyboard

| Keys | Result |
|---|---|
| `Tab` | Moves through the actions, if there are any. The empty state itself never takes keyboard focus. |

## Do

- Name what is empty in the title (“No orders yet”), not the state (“Empty”).
- Say in the description what fills it, or why a filter emptied it.
- Offer the action that fixes it: “Clear filters” after a filter, “Browse replicas” on an empty wishlist.
- Use size="sm" and framed={false} inside a table, a card or a panel.

## Don't

- Don’t use it for a list that’s still loading. Nothing has been found yet, so show a spinner or a skeleton.
- Don’t use it for an error. A failed load is an Alert in the hostile tone, with a retry.
- Don’t put more than two actions in it. A third belongs on the page, not in the empty region.
- Don’t add role="status" when a count on the page already announces the change. A screen reader user would hear it twice.

## Common mistakes

Wrong:

```tsx
<EmptyState title="No orders yet" />
```

Right:

```tsx
<EmptyState level={2} title="No orders yet" />
```

The level is required, because only the page knows what the empty region is: a whole page (an h2, a level-2 heading, under the h1), a section (h3) or a card (h4).

Wrong:

```tsx
<Card><EmptyState level={3} title="No notes" /></Card>
```

Right:

```tsx
<Card><EmptyState level={3} size="sm" framed={false} title="No notes" /></Card>
```

The card already draws an edge, so a dashed frame inside it makes a second one. And the md (medium) padding is sized for a page region.

## Anatomy

- **Frame**: A dashed edge in border.hairline-strong. It's the one border in the system that reads as an empty slot instead of a surface. Optional, through framed.
- **Icon tile**: Optional. A square on surface.sunken with a thin edge, holding a lucide icon in text.secondary. Screen readers skip it (aria-hidden), because the title already says what the icon would.
- **Title**: A heading element, h2 to h4. Oxanium, semibold, 18px (pixels) at md size and 16px at sm (small), in text.primary.
- **Description**: Optional. 14px body text in text.secondary, with lines no longer than 48 characters.
- **Actions**: Optional. One or two Buttons, centred, in a row that wraps onto a new line with a 12px gap.
