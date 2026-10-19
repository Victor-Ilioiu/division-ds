# Stat

> One number that matters, and how it has moved. The number is the star of the show. The label is small, set in a monospaced font and kept quiet.

- **Best for:** One headline number and how it has moved. Up to four in a row.
- **Not for:** A value that only makes sense as a chart: use ChartPanel.
- Molecule. Source: `src/components/molecules/stat/Stat.tsx`
- Rendered docs page: `/components/stat`

## Import

```tsx
import { Stat } from 'src/components/molecules/stat/Stat'
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` |  | The stat's name, for example "Kits dispatched". |
| `value` | `number \| string` |  | Whole numbers get padded. Anything else (for example "4.2k") is shown exactly as given. |
| `unit` | `string` |  | Shown beside the value, for example "kg". |
| `padTo` | `number` |  | Pads a whole-number value to this many digits with dimmed zeros that screen readers skip (aria-hidden). |
| `delta` | `{ value: string; direction: 'up' \| 'down'; sentiment: 'positive' \| 'negative' \| 'neutral'; period: string }` |  | value comes already formatted (for example "12%"). direction picks the arrow. sentiment picks the colour, and it doesn't depend on direction: fewer failed syncs is down, and that's positive. period is what the number is compared with, for example "last week". It's both shown and spoken. |
| `className` | `string` |  | Merged with the root classes. If two Tailwind utilities clash, the later one wins. |
| `ref` | `Ref<HTMLDivElement>` |  | Passed through to the root div. |
| `...rest` | `HTMLAttributes<HTMLDivElement>` |  | Any standard div attribute, applied to the root div. |

## Types and helpers

Exported beside the component, from the same file. Import a type with `import type { ... }`.

```ts
export type StatDelta = {
  /** Already formatted, e.g. "12%". */
  value: string
  direction: 'up' | 'down'
  /** Whether this movement is good. Independent of direction: fewer failed syncs is down AND good. */
  sentiment: 'positive' | 'negative' | 'neutral'
  /** What it is compared with, e.g. "last week". Spoken and shown. */
  period: string
}
```

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### A row of stats

```tsx
<div className="grid grid-cols-2 sm:grid-cols-4 gap-6 w-full">
  <Stat
    label="Kits dispatched"
    value={18}
    padTo={3}
    delta={{ value: '12%', direction: 'up', sentiment: 'positive', period: 'last week' }}
  />
  <Stat
    label="Failed syncs"
    value={3}
    delta={{ value: '40%', direction: 'down', sentiment: 'positive', period: 'last week' }}
  />
  <Stat
    label="Depots offline"
    value={2}
    delta={{ value: '1', direction: 'up', sentiment: 'negative', period: 'last week' }}
  />
  <Stat label="Payload" value={24} unit="kg" />
</div>
```

### Without a delta

```tsx
<div className="max-w-[10rem] w-full">
  <Stat label="Kits dispatched" value={18} padTo={3} />
</div>
```

## Keyboard

Not focusable. No keyboard behaviour of its own.

## Do

- Lay several Stats out in a plain div grid. Each one renders its own dl (description list), so you don't need a list element around them.
- Set sentiment by what the change means, not by its direction: fewer failed syncs is down, and that's positive.
- Say what the delta is compared with.
- Only pad when every value in a row has the same fixed width.

## Don't

- Don't pad a value whose width isn't fixed. The zeros would be made up.
- Don't put more than four stats in a row.
- Don't use a Stat for a value that only makes sense as a chart.

## Anatomy

- **Label**: A dt (the "term" element of an HTML description list), in text.secondary.
- **Value**: A dd (the matching "description" element) at 36px (pixels), set in Oxanium with tabular figures, so every digit is the same width.
- **Pad**: Optional leading zeros in numeral.pad. They're aria-hidden, so screen readers skip them, and they only appear when the width is real.
- **Unit**: A short suffix beside the value, for example kg.
- **Delta**: The change. An arrow shows the direction, colour shows whether it's good or bad, and a spoken sentence says both for screen reader users.
