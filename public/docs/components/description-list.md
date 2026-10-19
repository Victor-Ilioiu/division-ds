# DescriptionList

> Pairs of a term and its value, all about one thing, in one to three columns. The columns drop away as the space they get narrows. It's a real dl (the HTML description list element): a label in a monospaced font over each value, and a thin line above each pair.

- **Best for:** The fixed fields of one record: serial, firmware, owner, dates.
- **Not for:** Many records: use DataTable; one headline number: use Stat.
- Molecule. Source: `src/components/molecules/description-list/DescriptionList.tsx`
- Rendered docs page: `/components/description-list`

## Import

```tsx
import { DescriptionList } from 'src/components/molecules/description-list/DescriptionList'
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `items` | `readonly DescriptionListItem[]` |  | Required. The pairs, in the order people read them. |
| `columns` | `1 \| 2 \| 3` | `1` | How many columns at full width. It drops to one when the container is narrower than 28rem. |
| `className` | `string` |  | On the container. |
| `ref` | `Ref<HTMLDivElement>` |  | Forwarded to the container. |
| `term (DescriptionListItem)` | `string` |  | Required. The field name: "Serial". |
| `description (DescriptionListItem)` | `ReactNode` |  | Required. Its value. |

## Types and helpers

Exported beside the component, from the same file. Import a type with `import type { ... }`.

```ts
export type DescriptionListItem = {
  /** The name of the field: "Serial", "Last seen". Shown as a mono label. */
  term: string
  /** Its value: text, a Badge, a Link. */
  description: ReactNode
}
```

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### One column

```tsx
<div className="w-full max-w-sm">
  <DescriptionList
    items={[
      { term: 'Serial', description: 'HS-4471-B' },
      { term: 'Status', description: <Badge tone="ok">Online</Badge> },
      { term: 'Firmware', description: '2.8.1' },
      { term: 'Last seen', description: '15 Oct, 09:58' },
    ]}
  />
</div>
```

### Three columns, fewer as the container narrows

```tsx
<div className="w-full">
  <DescriptionList
    columns={3}
    items={[
      { term: 'Order', description: 'ORD-2291' },
      { term: 'Placed', description: '12 Oct 2026' },
      { term: 'Ships', description: '16 Oct 2026' },
      { term: 'Depot', description: 'Cluj, bay 4' },
      { term: 'Carrier', description: 'Regular courier' },
      { term: 'Weight', description: '22.1 kg' },
    ]}
  />
</div>
```

## Keyboard

| Keys | Result |
|---|---|
| `Tab` | Moves to any link or button inside a description. |

## Do

- Order pairs the way someone reads the record: identity first, then state, then dates.
- Say "None" or "Not set" for an empty value rather than leaving the description blank.
- Use two or three columns only for short values; long text reads better in one.

## Don't

- Don't use it for a list of records. That's what DataTable is for.
- Don't put a form field in a description. A record people can edit is a form.
- Don't repeat a term inside one list.

## Anatomy

- **Container**: A div with @container (a container query), so the columns follow the width of this box, not of the screen.
- **List**: A dl laid out as a grid: one column, two from 28rem wide, three from 42rem (as far as columns allows). A rem is the base text size, usually 16 pixels.
- **Pair**: A div holding one dt (the term) and one dd (its value), with a thin line above.
- **Term**: The dt, styled as a label: monospaced, uppercase, 11px (pixels).
- **Description**: The dd, in body text. It holds text, a Badge or a Link.
