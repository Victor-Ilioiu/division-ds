# Progress

> A progress bar that's either determinate (it knows how far along the task is) or indeterminate (it doesn't). The readout is real text in the DOM (the Document Object Model, the live page structure the browser builds) from the very first render. That's motion token M3's rule, and it means a screen reader, the software that reads the page aloud for blind and low-vision people, never hears a number roll.

- **Best for:** Showing how far a measurable task has got. Switch to indeterminate once you no longer know how much is left.
- **Not for:** A wait with no measurable work. Use Spinner.
- Atom. Source: `src/components/atoms/progress/Progress.tsx`
- Rendered docs page: `/components/progress`

## Import

```tsx
import { Progress } from 'src/components/atoms/progress/Progress'
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` |  | Required. The bar’s accessible name. |
| `value` | `number \| null` |  | null means indeterminate. The value is clamped to [0, max], so an out-of-range value shows as complete instead of overflowing the track. |
| `max` | `number` | `100` | The value at which the bar is complete. |
| `showValue` | `boolean` | `false` | Shows the percentage (or "In progress") as a readout. |
| `tone` | `'signal' \| 'ok' \| 'warning' \| 'hostile'` | `'signal'` | The fill colour. signal paints accent.signal.fill to match Slider. On the track in light theme that’s a 2.15:1 contrast ratio, below the 3:1 a bar needs when it’s the only sign of progress. So set showValue there. |
| `className` | `string` |  | Merged with the outer wrapper’s classes. Later Tailwind utilities (Tailwind is the CSS framework the system is styled with) win. |
| `ref` | `Ref<HTMLDivElement>` |  | Passed through to the Radix Progress root, which is the bar itself. Radix is the library of accessible building blocks this component sits on. |
| `...rest` | `Omit<HTMLAttributes<HTMLDivElement>, 'children'>` |  | Every native div prop except children, spread onto the outer wrapper, so a molecule can attach a data-testid there. children is typed away because this component draws its own label row and track, and a children prop would be thrown away without any warning. |

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Determinate

```tsx
<div className="w-full max-w-sm">
  <Progress label="Uploading manifest" value={40} />
</div>
```

### With a readout

```tsx
<div className="w-full max-w-sm">
  <Progress label="Uploading manifest" value={65} showValue />
</div>
```

### Custom max

```tsx
<div className="w-full max-w-sm">
  <Progress label="Packing crates" value={3} max={12} showValue />
</div>
```

### Indeterminate

```tsx
<div className="w-full max-w-sm">
  <Progress label="Syncing manifest" value={null} showValue />
</div>
```

### Tones

```tsx
<div className="flex flex-col gap-4 w-full max-w-sm">
  <Progress label="Signal supply run" value={40} tone="signal" showValue />
  <Progress label="BB reserves" value={82} tone="ok" showValue />
  <Progress label="Gas reserves" value={22} tone="warning" showValue />
  <Progress label="Battery reserves" value={6} tone="hostile" showValue />
</div>
```

## Keyboard

Not focusable. No keyboard behaviour of its own.

## Do

- Name what’s progressing, not the act of progressing.
- Use showValue whenever the number itself is useful to the reader.
- Switch to null the moment you stop knowing how much is left. Don’t freeze at 90%.

## Don't

- Don't animate the number up from zero and call that animated value the readout. The real value belongs in the DOM straight away.
- Don't use Progress for a wait with no measurable work. That's a Spinner.
- Don't put the padded readout into the accessible name. That's exactly why the pad is a separate aria-hidden span, and label is what Radix announces.
- Don't rely on the tone alone to say something failed. Say it in text.

## Anatomy

- **Label**: Required. Set in mono (a monospaced font, where every character is the same width) and uppercase. It’s also the bar’s accessible name, the name assistive tech such as a screen reader announces for it.
- **Readout**: Optional, and the star of the row: 24px (pixels) Oxanium against an 11px label. It uses tabular figures, digits that all take the same width, so the number doesn’t jitter as it changes.
- **Leading zeros**: These are padding, not part of the value. They’re dimmed to numeral.pad and marked aria-hidden (an ARIA attribute, from Accessible Rich Internet Applications, that hides an element from assistive tech). So the readout keeps a fixed three-digit width, while a screen reader still hears 40%, not zero four zero percent.
- **Track**: 6px tall, a sunken surface, no border. It’s the same track as Slider.
- **Indicator**: It’s moved rather than resized. That way the browser animates a transform, which is cheap, instead of recalculating the layout.
