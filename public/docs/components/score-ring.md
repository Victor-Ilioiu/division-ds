# ScoreRing

> One 0 to 100 score shown as a ring with the number in its centre, split into bands the way Lighthouse (Google’s website audit tool) bands its scores. It’s a meter, so a screen reader, the software that reads the page aloud, hears both the score and its band.

- **Best for:** A 0 to 100 score with good and bad bands, like an audit, a health check or a quality score. Several side by side read as one report.
- **Not for:** Progress through a task: use Progress. A number with a change over time: use Stat. Parts of a whole: use a donut ChartPanel.
- Atom. Source: `src/components/atoms/score-ring/ScoreRing.tsx`
- Rendered docs page: `/components/score-ring`

## Import

```tsx
import { ScoreRing, scoreBand } from 'src/components/atoms/score-ring/ScoreRing'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` |  | Required. What’s being scored. It’s both the accessible name and the caption. |
| `value` | `number` |  | Required. 0 to 100, clamped and rounded to a whole number. |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | The ring is 56, 96 or 128px (pixels) wide. |
| `className` | `string` |  | Merged with the meter’s classes. Later Tailwind utilities (Tailwind is the CSS framework the system uses) win. |
| `ref` | `Ref<HTMLDivElement>` |  | Points to the meter. |
| `...rest` | `Omit<HTMLAttributes<HTMLDivElement>, 'children'>` |  | Every native div prop except children, spread onto the meter. The ring draws its own content. |
| `scoreBand()` | `(value: number) => 'hostile' \| 'warning' \| 'ok'` |  | The banding the ring uses. It’s exported so a table or a sentence beside the ring agrees with it. |

## Types and helpers

Exported beside the component, from the same file. Import a type with `import type { ... }`.

```ts
export type ScoreBand = 'hostile' | 'warning' | 'ok'
```

```ts
/** Lighthouse's own bands, and its own words for them: 0-49 poor, 50-89 needs improvement, 90-100
 *  good. Exported so a table or a summary sentence beside the rings can band a score the same way. */
export function scoreBand(value: number): ScoreBand
```

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### A report like Lighthouse (Google's website audit tool): four scores in a row

```tsx
<ScoreRing label="Performance" value={42} />
<ScoreRing label="Accessibility" value={98} />
<ScoreRing label="Best practices" value={77} />
<ScoreRing label="SEO" value={100} />
```

### Sizes: sm, md and lg

```tsx
<ScoreRing label="Stock health" value={64} size="sm" />
<ScoreRing label="Stock health" value={64} />
<ScoreRing label="Stock health" value={64} size="lg" />
```

### The band boundaries: 49, 50, 89 and 90

```tsx
<ScoreRing label="Depot A" value={49} size="sm" />
<ScoreRing label="Depot B" value={50} size="sm" />
<ScoreRing label="Depot C" value={89} size="sm" />
<ScoreRing label="Depot D" value={90} size="sm" />
```

## Keyboard

Not focusable. No keyboard behaviour of its own.

## Do

- Put several rings in a row for one report, like Lighthouse’s four scores.
- Name what’s being scored in a word or two.
- State the weakest score in the sentence beside the rings.

## Don't

- Don't use it for a value that isn't out of 100. Rescale it first, or use Stat.
- Don't colour the number. The arc carries the band, and the number stays text.primary.

## Anatomy

- **Ring**: A hairline track plus an arc as long as the score, with square (butt) ends.
- **Arc colour**: Set by band: hostile below 50, warning from 50 to 89, ok from 90. Colour is never the only signal, because the number is always printed.
- **Ticks**: Three marks outside the ring at 0, 50 and 90. They mark the start and the two band boundaries.
- **Number**: The score in display figures, centred in the ring.
- **Label**: Mono (a monospaced font), uppercase, under the ring. It’s also the meter’s accessible name, the name assistive tech announces for it.
