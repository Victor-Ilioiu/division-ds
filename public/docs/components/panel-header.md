# PanelHeader

> The header bar of a dense panel: an optional numbered tag in the accent, a tracked uppercase title in the display font, and a quiet readout at the right in the data font.

- **Best for:** Heading a panel in a dense, data-heavy screen where several panels sit side by side and are referred to by number.
- **Not for:** A page title: use PageHeader. A card’s own title: use CardHeader.
- Molecule. Source: `src/components/molecules/panel-header/PanelHeader.tsx`
- Rendered docs page: `/components/panel-header`

## Import

```tsx
import { PanelHeader } from 'src/components/molecules/panel-header/PanelHeader'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file. An install has no index barrels: import each component from its own file, never from `components/molecules`.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` | `ReactNode` |  | Required. The panel’s title. |
| `index` | `number \| string` |  | The panel number shown in the tag. A number is padded to two digits ("01"). |
| `meta` | `ReactNode` |  | The right-aligned readout: "42 notes", "12:04". |
| `level` | `2 \| 3 \| 4 \| 5 \| 6` | `2` | The heading level of the title. Pick it from the page outline, not from the size. |
| `className` | `string` |  | Merged with the component's classes. |
| `ref` | `Ref<HTMLDivElement>` |  | Passed through to the root div. |
| `...rest` | `Omit<HTMLAttributes<HTMLDivElement>, 'title'>` |  | Every native div attribute except title. |

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Numbered, with a readout

```tsx
<div className="flex w-full max-w-md flex-col gap-4">
  <PanelHeader index={1} title="Open orders" meta="42 open" />
  <PanelHeader index={2} title="Shipments" meta="updated 12:04" />
</div>
```

### Title only, at level 3

```tsx
<div className="w-full max-w-md">
  <PanelHeader title="Warehouse stock" level={3} />
</div>
```

## Keyboard

Not focusable. No keyboard behaviour of its own.

## Do

- Number panels only when the numbers are stable and people refer to them.
- Keep the readout to one short value.

## Don't

- Don’t use the index tag as a status: it is always the accent, and it is the panel’s name.
- Don’t skip heading levels to get a smaller title.

## Anatomy

- **Index tag**: Optional. The panel number on accent.signal.fill in accent.signal.ink (the primary Button’s gated pair). A number is padded to two digits.
- **Title**: A real heading (h2 by default): Oxanium, 14px, uppercase, tracked. It truncates before it pushes the readout out.
- **Readout**: Optional. Counts, a time or an id in the data font, text.secondary.
