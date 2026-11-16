# MeterRow

> A ranked-list row: a label at the left, its value at the right in the data font, and a 2px bar under both showing the value against the list’s max. MeterBar is the bar on its own; MeterAxis puts tick labels under a list of rows.

- **Best for:** A ranked list of values against one max, such as the busiest warehouses or spend per project.
- **Not for:** A trend over time: use ChartPanel or Sparkline. Progress toward a goal: use Progress.
- **Also on this page:** `MeterAxis`, `MeterBar`
- Molecule. Source: `src/components/molecules/meter-row/MeterRow.tsx`
- Rendered docs page: `/components/meter-row`

## Import

```tsx
import { MeterAxis, MeterBar, MeterRow } from 'src/components/molecules/meter-row/MeterRow'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file. An install has no index barrels: import each component from its own file, never from `components/molecules`.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `ReactNode` |  | Required. The row’s name. |
| `value` | `number` |  | Required. The raw value the bar is drawn from. |
| `max` | `number` |  | Required. The value of a full bar: the largest in the list, or a fixed cap. |
| `display` | `ReactNode` | `String(value)` | The value as shown: "12.4K", "€1,200". |
| `color` | `CategoryColor` | `'gray'` | The bar colour. Use about five categories at most in one view; never as an accent. |
| `scale` | `'linear' \| 'log'` | `'linear'` | log for values that span orders of magnitude; pair it with a MeterAxis. |
| `state` | `'active' \| 'rest' \| 'pending'` | `'rest'` | Text brightness: active for the live row, pending for one not started. |
| `href` | `string` |  | Makes the row one link, named by the label. |
| `renderLink` | `(props: LinkRenderProps) => ReactNode` |  | Renders the link, for a router. Defaults to a plain a element. |
| `onActivate` | `() => void` |  | Makes the row one button, named by the label. Ignored when href is set. |
| `className` | `string` |  | Merged with the component's classes (on MeterRow, MeterBar or MeterAxis). |
| `ref` | `Ref<HTMLDivElement>` |  | Passed through to the row div. |
| `ticks (MeterAxis)` | `number[]` | `powers of ten from 1K to max` | The tick values under the rows. |

## Types and helpers

Exported beside the component, from the same file. Import a type with `import type { ... }`.

```ts
export type MeterScale = 'linear' | 'log'
```

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Parcels per site, linear

```tsx
const ROWS = [
  { label: 'North depot', value: 1240, display: '1,240' },
  { label: 'Harbour store', value: 860, display: '860' },
  { label: 'East yard', value: 410, display: '410' },
  { label: 'Hill annex', value: 95, display: '95' },
]

<div className="w-full max-w-sm">
  {ROWS.map((row, index) => (
    <MeterRow key={row.label} {...row} max={1240} color="blue" state={index === 0 ? 'active' : 'rest'} />
  ))}
</div>
```

### Spend per project, log scale with an axis

```tsx
const SPEND = [
  { label: 'Spring restock', value: 182000, display: '182K' },
  { label: 'Warehouse move', value: 24500, display: '24.5K' },
  { label: 'Label printer', value: 3100, display: '3.1K' },
]

<div className="w-full max-w-sm">
  {SPEND.map(row => (
    <MeterRow key={row.label} {...row} max={200000} scale="log" color="teal" href={`#${row.label}`} />
  ))}
  <MeterAxis max={200000} className="mt-1" />
</div>
```

### States: active, rest, pending

```tsx
<div className="w-full max-w-sm">
  <MeterRow label="Packing" value={8} max={10} state="active" />
  <MeterRow label="Picking" value={5} max={10} />
  <MeterRow label="Loading" value={0} max={10} state="pending" />
</div>
```

## Keyboard

| Keys | Result |
|---|---|
| `Enter` | Follows the link or presses the button when the row has href or onActivate. |

## Do

- Sort the rows by value.
- Use one colour for one list unless the colours mean groups.
- Use the log scale with a MeterAxis when the top value dwarfs the rest.

## Don't

- Don’t use signal orange for the bars: categories say "same group", the accent says "act here".
- Don’t change the row size to show state; change its brightness.

## Anatomy

- **Label**: Saira, 14px. Becomes a link or a button stretched over the row with href or onActivate.
- **Value**: The formatted value in the data font (mono, tabular figures).
- **Bar**: A 2px bar on the border.hairline track, in a category text colour (every one passes 3:1 in both themes). Hidden from screen readers: the value says it.
- **State**: Brightness, never size: text.active, text.rest or text.pending.
