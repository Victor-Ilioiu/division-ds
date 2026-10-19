# Sparkline

> A small trend line with no axes. It sits beside a Stat or in a table cell. It's plain SVG (Scalable Vector Graphics, the web's format for drawn shapes): one image named by a sentence, with an optional safe band behind it and a square on the last value.

- **Best for:** You want the shape of a recent series, not its values. Think of a reading over the last hour.
- **Not for:** Values people need to read, compare or hover over. Use ChartPanel for those.
- Atom. Source: `src/components/atoms/sparkline/Sparkline.tsx`
- Rendered docs page: `/components/sparkline`

## Import

```tsx
import { Sparkline } from 'src/components/atoms/sparkline/Sparkline'
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `values` | `readonly number[]` |  | Required. Oldest first. Non-finite values (such as NaN or Infinity) are dropped. |
| `label` | `string` |  | Required. The chart as one sentence: "Temperature, last hour: 3.1 to 4.2 °C, rising". |
| `tone` | `'neutral' \| 'signal' \| 'ok' \| 'warning' \| 'hostile' \| 'info'` | `'neutral'` | The line's colour. Each tone means what it means on Badge. |
| `min` | `number` |  | A fixed bottom for the scale. Without it, the scale follows the data (and the band). |
| `max` | `number` |  | A fixed top for the scale. Without it, the scale follows the data (and the band). |
| `band` | `{ from: number; to: number }` |  | A range drawn behind the line. |
| `showLast` | `boolean` | `false` | Puts a square on the last value. |
| `width` | `number` | `96` | In CSS px, the pixel unit of Cascading Style Sheets. className="w-full" overrides it. |
| `height` | `number` | `24` | In CSS px. |
| `className` | `string` |  | Goes on the frame. |
| `ref` | `Ref<HTMLSpanElement>` |  | Forwarded to the frame. |

## Types and helpers

Exported beside the component, from the same file. Import a type with `import type { ... }`.

```ts
export type SparklineTone = 'neutral' | 'signal' | 'ok' | 'warning' | 'hostile' | 'info'
```

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Beside the value it trends

```tsx
<div className="flex items-center gap-3">
  <span className="font-mono text-sm tabular-nums">4.2 °C</span>
  <Sparkline
    values={[3.1, 3.2, 3.2, 3.4, 3.3, 3.6, 3.8, 3.7, 4.0, 4.2]}
    label="Cold room 2, last hour: 3.1 to 4.2 °C, rising"
    band={{ from: 2, to: 8 }}
    showLast
  />
</div>
<div className="flex items-center gap-3">
  <span className="font-mono text-sm tabular-nums">412</span>
  <Sparkline
    values={[380, 365, 402, 398, 371, 420, 412]}
    label="Orders, last 7 days: 365 to 420, steady"
    tone="signal"
    showLast
  />
</div>
```

### Tones

```tsx
<Sparkline values={[5, 6, 5, 7, 6, 8]} label="Neutral trend, rising" />
<Sparkline values={[5, 6, 5, 7, 6, 8]} label="Healthy trend, rising" tone="ok" />
<Sparkline values={[5, 6, 5, 7, 6, 8]} label="Degraded trend, rising" tone="warning" />
<Sparkline values={[5, 6, 5, 7, 6, 8]} label="Failing trend, rising" tone="hostile" />
<Sparkline values={[5, 6, 5, 7, 6, 8]} label="Informational trend, rising" tone="info" />
```

### Stretched to its container, with a safe band from 2 to 8 °C

```tsx
<div className="w-full max-w-md">
  <Sparkline
    values={[4.1, 4.3, 4.0, 5.2, 6.8, 8.4, 9.1, 8.7, 7.2, 5.9, 5.0, 4.6]}
    label="Cold room 3, last 12 hours: 4.0 to 9.1 °C, above the safe band for 3 hours, now back inside it"
    tone="warning"
    band={{ from: 2, to: 8 }}
    min={0}
    max={10}
    height={40}
    className="w-full"
    showLast
  />
</div>
```

### No values, one value, a flat run

```tsx
<Sparkline values={[]} label="No readings yet" />
<Sparkline values={[12]} label="One reading: 12" showLast />
<Sparkline values={[7, 7, 7, 7]} label="Flat at 7" showLast />
```

## Keyboard

Not focusable. No keyboard behaviour of its own.

## Do

- Write the label as the reading a person takes from the shape: the range and the direction.
- Fix min and max when several sparklines sit side by side and have to share a scale.
- Put the current value beside it in text. The line shows the trend, not the number.
- Use a tone for what the trend means (hostile for out of range), and say it in text too.

## Don't

- Don't use a sparkline where someone has to read values off it. That's a job for ChartPanel.
- Don't leave the label as a title like "Temperature". It's the only thing a screen reader hears.
- Don't colour every sparkline on a page. Neutral is the default for a reason.

## Anatomy

- **Frame**: An inline box. It's 96 x 24 by default, or the container's width with className="w-full".
- **Image**: An svg with role="img", named by label. Screen readers (software that reads the page aloud) don't get the points one by one.
- **Band**: Optional. A hairline-filled range behind the line, such as a safe range.
- **Line**: 1.5px (pixels) in the tone colour. The stroke doesn't get thicker when the frame stretches.
- **Last value**: An optional 6px square on the newest point. It's aria-hidden, a setting that hides it from screen readers.
