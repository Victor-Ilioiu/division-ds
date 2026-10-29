# SegmentedControl

> Two to five options in one framed row, with one selected. It changes what's on screen in place. Under the hood it's a radio group: Tab stops on it once, the arrow keys move and select, and the selected option has a signal fill with ink text.

- **Best for:** Switching the view of the same content in place: Board or Table, 24 h or 7 d.
- **Not for:** Panels of different content: use Tabs. A choice in a form: use Radio.
- Molecule. Source: `src/components/molecules/segmented-control/SegmentedControl.tsx`
- Rendered docs page: `/components/segmented-control`

## Import

```tsx
import { SegmentedControl } from 'src/components/molecules/segmented-control/SegmentedControl'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` |  | Required. Names the group: "View", "Range". |
| `options` | `readonly SegmentedControlOption[]` |  | Required. Two to five. |
| `value` | `string` |  | Required. The selected option. |
| `onValueChange` | `(value: string) => void` |  | Required. Called with the new value. |
| `size` | `'sm' \| 'md'` | `'md'` | The same height as Button's sm or md. |
| `className` | `string` |  | Added to the group. |
| `ref` | `Ref<HTMLDivElement>` |  | Passed through to the group. |
| `value (SegmentedControlOption)` | `string` |  | Required. What onValueChange receives. |
| `label (SegmentedControlOption)` | `string` |  | Required. Always shown. |
| `icon (SegmentedControlOption)` | `ReactNode` |  | A lucide icon before the label, aria-hidden so screen readers skip it. |

## Types and helpers

Exported beside the component, from the same file. Import a type with `import type { ... }`.

```ts
export type SegmentedControlOption = {
  value: string
  /** Always shown. The icon, if any, sits before it. */
  label: string
  /** A lucide icon, aria-hidden: the label names the option. */
  icon?: ReactNode
}
```

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### A time range

```tsx
const RANGES = [
  { value: '1h', label: '1 h' },
  { value: '24h', label: '24 h' },
  { value: '7d', label: '7 d' },
  { value: '30d', label: '30 d' },
]

function RangeExample() {
  const [range, setRange] = useState('24h')
  return (
    <div className="flex flex-col items-center gap-3">
      <SegmentedControl label="Range" options={RANGES} value={range} onValueChange={setRange} />
      <p className="font-body text-sm text-[var(--color-text-secondary)]">Showing the last {RANGES.find(option => option.value === range)?.label}.</p>
    </div>
  )
}

<RangeExample />
```

### Small, with icons, lined up with a small Button

```tsx
function ToolbarExample() {
  const [view, setView] = useState('board')
  return (
    <div className="flex flex-wrap items-center gap-3">
      <SegmentedControl
        label="View"
        size="sm"
        options={[
          { value: 'board', label: 'Board', icon: <Columns3 /> },
          { value: 'table', label: 'Table', icon: <Table /> },
        ]}
        value={view}
        onValueChange={setView}
      />
      <Button size="sm" variant="secondary">
        Export
      </Button>
    </div>
  )
}

<ToolbarExample />
```

## Keyboard

| Keys | Result |
|---|---|
| `Tab` | Moves into the group, onto the selected option, and out again. |
| `ArrowLeft` `ArrowRight` | Moves to the previous or next option and selects it. Wraps round at the ends. |
| `ArrowUp` `ArrowDown` | The same as Left and Right. |
| `Space` | Selects the focused option, if it isn't selected already. |

## Do

- Use it where the change happens straight away and can be undone: the view, a time range, a unit.
- Keep labels to a word or two; they're set in uppercase monospace.
- Match the size to the buttons beside it: sm in a busy toolbar, md otherwise.

## Don't

- Don't use it for panels of different content; that's Tabs, which links each tab to its panel.
- Don't use it for a choice that's sent with a form; that's a RadioGroup inside the form.
- Don't drop the label. Every option keeps its words, even with an icon.

## Anatomy

- **Group**: A radiogroup named by label, framed with the control hairline. It scrolls sideways if it's too wide.
- **Option**: A radio with a monospace label and an optional icon, the same height as a Button at sm or md.
- **Selected option**: Signal fill, ink text, semibold. Its focus ring is drawn in ink.
