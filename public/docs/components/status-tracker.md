# StatusTracker

> Health over time, drawn as a row of thin bars with one bar per period. The oldest is on the left. Each bar says its status in words and shows them in a tooltip when you hover over it or reach it with the keyboard. The whole row is a single Tab stop, and the arrow keys move along it.

- **Best for:** The health history of one service or device, such as uptime over 30 or 90 days.
- **Not for:** A current status: use Badge. A measured value: use Sparkline.
- Molecule. Source: `src/components/molecules/status-tracker/StatusTracker.tsx`
- Rendered docs page: `/components/status-tracker`

## Import

```tsx
import { StatusTracker, statusTrackerText } from 'src/components/molecules/status-tracker/StatusTracker'
```

## Requires

- The root TooltipProvider (AppShell and DemoLayout mount it).

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` |  | Required. Names the row, for example "Uptime, last 30 days". |
| `items` | `readonly StatusTrackerItem[]` |  | Required. Oldest first. |
| `summary` | `ReactNode` |  | Shown on the right of the label row, for example "99.2% up". |
| `statusLabels` | `Partial<Record<StatusTrackerStatus, string>>` |  | Replaces the status words: Operational, Degraded, Down, No data. |
| `className` | `string` |  | Added to the root. |
| `ref` | `Ref<HTMLDivElement>` |  | Passed through to the root. |
| `id (StatusTrackerItem)` | `string` |  | Required. A key that never changes for that item. |
| `status (StatusTrackerItem)` | `'ok' \| 'warning' \| 'hostile' \| 'neutral'` |  | Required. ok means up. warning means degraded. hostile means down or failed. neutral means no data. |
| `label (StatusTrackerItem)` | `string` |  | Required. The period and what happened, for example "12 Oct: 2 alerts, 14 min degraded". |
| `statusTrackerText()` | `(item, words?) => string` |  | Builds the text a bar uses for its name and tooltip, for example "Degraded. 12 Oct: 2 alerts". |

## Types and helpers

Exported beside the component, from the same file. Import a type with `import type { ... }`.

```ts
export type StatusTrackerStatus = 'ok' | 'warning' | 'hostile' | 'neutral'
```

```ts
export type StatusTrackerItem = {
  /** Stable key. */
  id: string
  /** ok up or healthy; warning degraded; hostile down or failed; neutral no data. */
  status: StatusTrackerStatus
  /** The period and what happened in it: "12 Oct: 2 alerts, 14 min degraded". */
  label: string
}
```

```ts
/** Text of one bar: the status word first, then the caller's label. Shared by the accessible name
 *  and the tooltip, so what is heard and what is seen are the same sentence. */
export function statusTrackerText(item: StatusTrackerItem, words: Record<StatusTrackerStatus, string> = STATUS_WORDS)
```

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Thirty days, with a summary

```tsx
const THIRTY: StatusTrackerItem[] = Array.from({ length: 30 }, (_, index) => {
  const day = new Date(Date.UTC(2026, 8, 16 + index))
  const date = day.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
  if (index === 8) return { id: `d${index}`, status: 'warning', label: `${date}: 2 alerts, 14 min degraded` }
  if (index === 19) return { id: `d${index}`, status: 'hostile', label: `${date}: 41 min down` }
  if (index === 23) return { id: `d${index}`, status: 'warning', label: `${date}: 1 alert, 6 min degraded` }
  if (index === 26) return { id: `d${index}`, status: 'neutral', label: `${date}: no readings` }
  return { id: `d${index}`, status: 'ok', label: `${date}: no alerts` }
})

<div className="w-full max-w-xl">
  <StatusTracker label="Uptime, last 30 days" summary="99.2% up" items={THIRTY} />
</div>
```

### Ninety days in the same width

```tsx
const NINETY: StatusTrackerItem[] = Array.from({ length: 90 }, (_, index) => ({
  id: `n${index}`,
  status: index % 37 === 12 ? 'hostile' : index % 23 === 5 ? 'warning' : 'ok',
  label: `Day ${index + 1} of 90`,
}))

<div className="w-full max-w-xl">
  <StatusTracker label="Uptime, last 90 days" summary="99.6% up" items={NINETY} />
</div>
```

### Other status words

```tsx
<div className="w-full max-w-xs">
  <StatusTracker
    label="Door sensor, last 8 hours"
    statusLabels={{ ok: 'Closed', warning: 'Left open', hostile: 'Forced', neutral: 'Offline' }}
    items={[
      { id: 'h1', status: 'ok', label: '02:00 to 03:00' },
      { id: 'h2', status: 'ok', label: '03:00 to 04:00' },
      { id: 'h3', status: 'warning', label: '04:00 to 05:00, open 9 min' },
      { id: 'h4', status: 'ok', label: '05:00 to 06:00' },
      { id: 'h5', status: 'neutral', label: '06:00 to 07:00' },
      { id: 'h6', status: 'ok', label: '07:00 to 08:00' },
      { id: 'h7', status: 'ok', label: '08:00 to 09:00' },
      { id: 'h8', status: 'ok', label: '09:00 to 10:00' },
    ]}
  />
</div>
```

## Keyboard

| Keys | Result |
|---|---|
| `Tab` | Moves into the row, landing on the last bar that had focus (the newest one the first time), and moves out again. |
| `ArrowLeft` `ArrowRight` | Moves one bar older or newer and shows its tooltip. |
| `Home` `End` | Jumps to the oldest or the newest bar. |
| `Escape` | Hides the tooltip. Focus stays on the bar. |

## Do

- Write each item label with its period and what happened, not just the status. The status word is added for you.
- Put the headline figure in summary, so the row has a number people can read before they explore it.
- Use neutral for periods with no data, so a gap looks like a gap and not like a healthy day.

## Don't

- Don't start an item label with the status word as well. It's already said first.
- Don't use it for more than about 90 bars. At a 320px-wide screen the bars get thinner than 2px.
- Don't make a bar do anything when clicked. It's a reading, not a control.

## Anatomy

- **Label row**: The label in a monospaced font on the left, and the optional summary on the right.
- **List**: A ul (bulleted list element) named by the label, with one li (list item) per bar, so a screen reader hears how many bars there are and where each one sits.
- **Bar**: A block 32px (pixels) tall in the status colour. It has role="img" and aria-roledescription="status bar", which tell screen readers what it is, and its name is the status word plus the label.
- **Tooltip**: The same text as the name, shown on hover and on keyboard focus.
