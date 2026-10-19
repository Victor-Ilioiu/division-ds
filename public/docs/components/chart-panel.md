# ChartPanel

> One chart in a card. A sentence says what it shows, and the same numbers sit in a table. The data below is sample data.

- **Best for:** One chart (a line over time, bars by category, a donut of one whole, or a radar of several measures) with a summary sentence and the numbers as a table.
- **Not for:** One number and its change: use Stat. One score from 0 to 100: use ScoreRing. Two measures on two scales: use two panels.
- Organism. Source: `src/components/organisms/chart-panel/ChartPanel.tsx`
- Rendered docs page: `/components/chart-panel`

## Import

```tsx
import { ChartPanel } from 'src/components/organisms/chart-panel/ChartPanel'
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` | `string` |  | Required. The panel's heading and its name. |
| `summary` | `string` |  | Required. One sentence, the chart's caption. |
| `kind` | `'line' \| 'bar' \| 'donut' \| 'radar'` |  | Required. Line for change over time. Bar to compare categories. Donut for parts of one whole (one series, a slice per row). Radar for several measures of one or two things (an axis per row). |
| `data` | `Row[]` |  | Required. One object per category. |
| `xKey` | `keyof Row` |  | Required. The category. Its values must be unique. |
| `xLabel` | `string` |  | Required. The header of the table's first column. |
| `series` | `[ChartSeries] \| [ChartSeries, ChartSeries]` |  | Required. One or two series, coloured chart.series-1 then chart.series-2. Passing a third is a type error, and so is a ChartSeries.key that isn't one of Row's own numeric columns. |
| `area` | `boolean` | `false` | Line only. Fills under each line with a gradient of its colour that fades to nothing. |
| `curve` | `'linear' \| 'smooth'` | `'linear'` | Line only. smooth draws a monotone curve, so it never overshoots a data point. |
| `grid` | `boolean` | `true` | The dashed horizontal grid (on a radar, its web). false also drops the axis lines but keeps the tick labels. |
| `size` | `'md' \| 'sm'` | `'md'` | sm is the stat-card size: a short sparkline with no axes or grid, and the caption under it. Pair it with headline. |
| `headline` | `string` |  | A formatted figure printed large under the title. |
| `centerLabel` | `string` |  | Donut only. The caption under the total in the centre of the ring. |
| `formatValue` | `(value: number) => string` | `Intl.NumberFormat('en-IE')` | Formats numbers in the tooltip and the table. It formats the y-axis too, unless you give formatAxisValue. |
| `formatAxisValue` | `(value: number) => string` | `formatValue` | Formats only the y-axis tick labels. Use a shorter, compact formatter when formatValue's output is too wide for the axis. SpendChart's compact euro formatter is one example. |
| `axisWidth` | `number` | `48` | The width the y-axis reserves, in px (pixels). 48 is Recharts' own YAxis default. Make it bigger if formatAxisValue's labels still get cut off. |
| `headingLevel` | `2 \| 3 \| 4` | `3` | Pick the level that fits the page's heading outline. |
| `className` | `string` |  | Merged with the Card classes. Later Tailwind utilities win. |
| `ref` | `Ref<HTMLElement>` |  | Points at the section element. |

## Types and helpers

Exported beside the component, from the same file. Import a type with `import type { ... }`.

```ts
export type ChartSeries<Row> = { key: NumericKey<Row>; label: string }
```

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Line, two series

```tsx
type Week = { week: string; online: number; store: number }

const WEEKS: Week[] = [
  { week: 'W1', online: 120, store: 160 },
  { week: 'W2', online: 131, store: 158 },
  { week: 'W3', online: 142, store: 163 },
  { week: 'W4', online: 150, store: 155 },
  { week: 'W5', online: 171, store: 162 },
  { week: 'W6', online: 188, store: 159 },
  { week: 'W7', online: 197, store: 166 },
  { week: 'W8', online: 214, store: 161 },
]

<ChartPanel<Week>
  title="Weekly orders"
  summary="Online orders rose from 120 to 214 over eight weeks and passed in-store orders in week 5."
  kind="line"
  data={WEEKS}
  xKey="week"
  xLabel="Week"
  series={[
    { key: 'online', label: 'Online' },
    { key: 'store', label: 'In store' },
  ]}
  headingLevel={4}
/>
```

### Bar, one series

```tsx
type Category = { category: string; returns: number }

const RETURNS: Category[] = [
  { category: 'Replicas', returns: 18 },
  { category: 'Optics', returns: 11 },
  { category: 'Parts', returns: 26 },
  { category: 'Ammo', returns: 7 },
  { category: 'Tactical', returns: 4 },
]

<ChartPanel<Category>
  title="Returns by category"
  summary="Parts have the most returns (26), then replicas (18); tactical equipment has the fewest (4)."
  kind="bar"
  data={RETURNS}
  xKey="category"
  xLabel="Category"
  series={[{ key: 'returns', label: 'Returns' }]}
  headingLevel={4}
/>
```

### Area under a smooth line

```tsx
type Day = { day: string; visits: number; orders: number }

const DAYS: Day[] = [
  { day: 'Mon', visits: 1840, orders: 61 },
  { day: 'Tue', visits: 2210, orders: 74 },
  { day: 'Wed', visits: 1960, orders: 58 },
  { day: 'Thu', visits: 2650, orders: 92 },
  { day: 'Fri', visits: 3120, orders: 118 },
  { day: 'Sat', visits: 3890, orders: 141 },
  { day: 'Sun', visits: 3370, orders: 126 },
]

<ChartPanel<Day>
  title="Visits this week"
  summary="Visits climbed from 1,840 on Monday to a Saturday peak of 3,890."
  kind="line"
  area
  curve="smooth"
  data={DAYS}
  xKey="day"
  xLabel="Day"
  series={[{ key: 'visits', label: 'Visits' }]}
  headline="19,040"
  headingLevel={4}
/>
```

### No grid lines: only the labels along the axes

```tsx
type Week = { week: string; online: number; store: number }

const WEEKS: Week[] = [
  { week: 'W1', online: 120, store: 160 },
  { week: 'W2', online: 131, store: 158 },
  { week: 'W3', online: 142, store: 163 },
  { week: 'W4', online: 150, store: 155 },
  { week: 'W5', online: 171, store: 162 },
  { week: 'W6', online: 188, store: 159 },
  { week: 'W7', online: 197, store: 166 },
  { week: 'W8', online: 214, store: 161 },
]

<ChartPanel<Week>
  title="Weekly orders, gridless"
  summary="Online orders rose from 120 to 214 over eight weeks and passed in-store orders in week 5."
  kind="line"
  area
  curve="smooth"
  grid={false}
  data={WEEKS}
  xKey="week"
  xLabel="Week"
  series={[
    { key: 'online', label: 'Online' },
    { key: 'store', label: 'In store' },
  ]}
  headingLevel={4}
/>
```

### Small: stat cards, each with a sparkline (a tiny line chart with no axes)

```tsx
type Week = { week: string; online: number; store: number }

type Day = { day: string; visits: number; orders: number }

const WEEKS: Week[] = [
  { week: 'W1', online: 120, store: 160 },
  { week: 'W2', online: 131, store: 158 },
  { week: 'W3', online: 142, store: 163 },
  { week: 'W4', online: 150, store: 155 },
  { week: 'W5', online: 171, store: 162 },
  { week: 'W6', online: 188, store: 159 },
  { week: 'W7', online: 197, store: 166 },
  { week: 'W8', online: 214, store: 161 },
]

const DAYS: Day[] = [
  { day: 'Mon', visits: 1840, orders: 61 },
  { day: 'Tue', visits: 2210, orders: 74 },
  { day: 'Wed', visits: 1960, orders: 58 },
  { day: 'Thu', visits: 2650, orders: 92 },
  { day: 'Fri', visits: 3120, orders: 118 },
  { day: 'Sat', visits: 3890, orders: 141 },
  { day: 'Sun', visits: 3370, orders: 126 },
]

<ChartPanel<Day>
  title="Visits"
  headline="19,040"
  summary="Up every day but Wednesday and Sunday."
  kind="line"
  area
  curve="smooth"
  size="sm"
  data={DAYS}
  xKey="day"
  xLabel="Day"
  series={[{ key: 'visits', label: 'Visits' }]}
  headingLevel={4}
/>
<ChartPanel<Day>
  title="Orders"
  headline="670"
  summary="Saturday took 141, the most of the week."
  kind="bar"
  size="sm"
  data={DAYS}
  xKey="day"
  xLabel="Day"
  series={[{ key: 'orders', label: 'Orders' }]}
  headingLevel={4}
/>
<ChartPanel<Week>
  title="Online orders"
  headline="214"
  summary="Eight weeks of growth, from 120 a week."
  kind="line"
  curve="smooth"
  size="sm"
  data={WEEKS}
  xKey="week"
  xLabel="Week"
  series={[{ key: 'online', label: 'Online' }]}
  headingLevel={4}
/>
```

### Donut with a centre total

```tsx
type Slice = { channel: string; orders: number }

const CHANNELS: Slice[] = [
  { channel: 'Web shop', orders: 412 },
  { channel: 'Field store', orders: 236 },
  { channel: 'Club orders', orders: 148 },
  { channel: 'Marketplace', orders: 87 },
  { channel: 'Phone', orders: 41 },
]

<ChartPanel<Slice>
  title="Orders by channel"
  summary="The web shop took 412 of 924 orders this month, nearly half; phone orders are 4%."
  kind="donut"
  data={CHANNELS}
  xKey="channel"
  xLabel="Channel"
  series={[{ key: 'orders', label: 'Orders' }]}
  centerLabel="Orders"
  headingLevel={4}
/>
```

### Radar, two series

```tsx
type Profile = { measure: string; m4: number; ak: number }

const PROFILES: Profile[] = [
  { measure: 'Range', m4: 78, ak: 64 },
  { measure: 'Accuracy', m4: 82, ak: 70 },
  { measure: 'Rate of fire', m4: 74, ak: 86 },
  { measure: 'Weight', m4: 58, ak: 44 },
  { measure: 'Reliability', m4: 70, ak: 90 },
  { measure: 'Upgrades', m4: 92, ak: 62 },
]

<ChartPanel<Profile>
  title="Replica profiles"
  summary="The M4 replica leads on range, accuracy and upgrades; the AK replica on rate of fire and reliability."
  kind="radar"
  data={PROFILES}
  xKey="measure"
  xLabel="Measure"
  series={[
    { key: 'm4', label: 'M4 replica' },
    { key: 'ak', label: 'AK replica' },
  ]}
  headingLevel={4}
/>
```

## Keyboard

| Keys | Result |
|---|---|
| `Tab` | Skips the chart, which isn't a tab stop (a place the Tab key lands), and goes to Show as table. |
| `Enter` `Space` | On Show as table, shows or hides the table. |

## Do

- Write the summary as the finding. Don't just describe the axes.
- Use a line for change over time and bars to compare categories.
- Keep to two series. Give a third its own panel.
- In print or greyscale, you can rely on the second line series being dashed. It doesn't depend on colour alone.
- Use size sm with a headline for a stat card. The caption and the table stay.
- Past six slices, fold a donut's smallest slices into one Other row.

## Don't

- Don't give a chart two y-axes. Two measures means two panels.
- Don't colour a series with a status colour. Those colours mean state.
- Don't put a number on every point. The table has them all.
- Don't use a donut to compare categories over time. That's a job for a line or bars.

## Anatomy

- **Title**: The panel's heading. It's also the accessible name, the name a screen reader announces for the panel.
- **Summary**: One sentence that works as the chart's caption: what a reader should take away.
- **Legend**: Names both series when there are two. With one series, the title names it. A donut lists every slice with its value and share.
- **Headline**: Optional. The figure the chart is about, printed large under the title.
- **Chart**: A line, bar, donut or radar chart, with a tooltip that follows the pointer. It's hidden from assistive tech (screen readers and similar tools), which get the table instead.
- **Centre total**: Donut only. The sum of the slices, with centerLabel under it.
- **Show as table**: A button that opens and closes a DataTable with the same rows. It uses aria-expanded, an ARIA (Accessible Rich Internet Applications) attribute that tells screen readers whether it's open.
