# SegmentedMeter

> A row of small squares for a count out of a small total: filled, empty, or struck through for a step that does not apply. It reads at a glance where a bar would need a number beside it.

- **Best for:** Showing a small count out of a small total, such as 3 of 5 checks passed, where each unit matters.
- **Not for:** A percentage or a large total: use Progress.
- Atom. Source: `src/components/atoms/segmented-meter/SegmentedMeter.tsx`
- Rendered docs page: `/components/segmented-meter`

## Import

```tsx
import { SegmentedMeter } from 'src/components/atoms/segmented-meter/SegmentedMeter'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file. An install has no index barrels: import each component from its own file, never from `components/molecules`.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | `number` |  | Required. How many squares are filled. Clamped to 0 to max. |
| `max` | `number` |  | Required. How many squares there are. Keep it to about 12; past that, use Progress. |
| `none` | `number` | `0` | Squares after the filled ones that are struck through, for steps that do not apply. |
| `tone` | `'signal' \| CategoryColor` | `'signal'` | The fill. signal is the accent; the rest are the category fills. |
| `label` | `string` |  | Required. The accessible name, for example "Checks passed". |
| `valueText` | `string` |  | What a screen reader says for the value. Defaults to "{value} of {max}". |
| `className` | `string` |  | Merged with the component's classes. |
| `ref` | `Ref<HTMLDivElement>` |  | Passed through to the meter div. |
| `...rest` | `HTMLAttributes<HTMLDivElement>` |  | Every native attribute, passed onto the meter div. |

## Types and helpers

Exported beside the component, from the same file. Import a type with `import type { ... }`.

```ts
export type SegmentedMeterTone =
  | 'signal' | 'gray' | 'brown' | 'orange' | 'yellow' | 'green' | 'teal' | 'blue' | 'purple' | 'pink' | 'red'
```

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Checks passed, in the accent

```tsx
<SegmentedMeter label="Checks passed" value={3} max={5} />
<span className="font-data text-sm text-[var(--color-text-secondary)]">3/5</span>
```

### Struck squares: steps that do not apply

```tsx
<SegmentedMeter label="Release steps" value={2} max={6} none={2} valueText="2 of 6 done, 2 not needed" tone="teal" />
```

### Category tones

```tsx
<SegmentedMeter label="Blue" value={4} max={8} tone="blue" />
<SegmentedMeter label="Green" value={6} max={8} tone="green" />
<SegmentedMeter label="Purple" value={2} max={8} tone="purple" />
```

## Keyboard

Not focusable. No keyboard behaviour of its own.

## Do

- Put the number in words nearby, or in valueText, so the meter is never the only place the value lives.
- Use signal for the one meter on a screen that asks for action; a category fill otherwise.

## Don't

- Don’t use more than about 12 squares: they stop being countable.
- Don’t use struck squares for failed steps. They mean "does not apply"; a failure is a status with a word.

## Anatomy

- **Meter**: A div with role="meter", named by label, with its value spoken as valueText.
- **Filled squares**: Painted in the tone: accent.signal.fill, or a category fill.
- **Empty squares**: A one-pixel text.muted outline, which passes the 3:1 graphic floor on every surface.
- **Struck squares**: An empty square with a diagonal line: a step that does not apply.
