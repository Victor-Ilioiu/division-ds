# Rating

> A score out of five, either shown or collected. The display is one image that a screen reader reads as one sentence. The input is a radio group, because picking a rating means picking one value.

- **Best for:** Showing or collecting a score out of five.
- **Not for:** Anything that isn't a rating, such as a difficulty grade.
- Molecule. Source: `src/components/molecules/rating/Rating.tsx`
- Rendered docs page: `/components/rating`

## Import

```tsx
import { Rating, RatingInput } from 'src/components/molecules/rating/Rating'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file. An install has no index barrels: import each component from its own file, never from `components/molecules`.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `value (Rating)` | `number` |  | From 0 up to max, rounded to the nearest half for both the drawing and what screen readers say. |
| `max (Rating)` | `number` | `5` | Number of stars. |
| `label (Rating)` | `string` |  | What is being rated, read out as "<label> rated 4.5 out of 5". |
| `showValue (Rating)` | `boolean` | `false` | Prints the rounded value beside the stars, aria-hidden. |
| `size (Rating)` | `'sm' \| 'md'` | `'md'` | Star size. |
| `className (Rating)` | `string` |  | Combined with the root classes. Where Tailwind utility classes clash, the later one wins. |
| `ref (Rating)` | `Ref<HTMLSpanElement>` |  | Passed through to the root span. |
| `label (RatingInput)` | `string` |  | Required. The radiogroup's name, for example "Rate the Prism holo sight". |
| `value (RatingInput)` | `number` |  | The selected value, when your page holds it (controlled). |
| `defaultValue (RatingInput)` | `number` |  | Starting value when the component holds it itself (uncontrolled). |
| `onValueChange (RatingInput)` | `(value: number) => void` |  | Fires when a star is picked by click or arrow key. |
| `max (RatingInput)` | `number` | `5` | Number of stars. |
| `disabled (RatingInput)` | `boolean` |  | Disables every star. |
| `className (RatingInput)` | `string` |  | Combined with the root classes. |
| `ref (RatingInput)` | `Ref<HTMLDivElement>` |  | Passed through to the Radix radiogroup root. It's built straight on that, not on the Radio atom: see the anatomy row above. |

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Display

```tsx
<div className="flex flex-col gap-3">
  <Rating value={4.5} label="Prism holo sight" showValue />
  <Rating value={3} label="Bump helmet" showValue />
  <Rating value={5} label="Field goggles" showValue />
  <Rating value={0.5} label="Dummy radio" showValue />
</div>
```

### Small, beside a price

```tsx
<div className="flex items-center gap-2">
  <span className="font-display font-semibold">€128</span>
  <Rating value={4} size="sm" label="Prism holo sight" />
</div>
```

### Input

```tsx
function LiveInput() {
  const [value, setValue] = useState(4)
  return (
    <div className="flex items-center gap-3">
      <RatingInput label="Rate the Prism holo sight" value={value} onValueChange={setValue} />
      <span className="font-mono text-xs text-[var(--color-text-secondary)]">
        You rated it {value} {value === 1 ? 'star' : 'stars'}
      </span>
    </div>
  )
}

<LiveInput />
```

## Keyboard

| Keys | Result |
|---|---|
| `Tab` | Moves into the group, onto the selected star, or the first one. |
| `←` `↑` `→` `↓` | One star less (Left or Up) or more (Right or Down), selecting as it goes. It wraps round: past the last star goes to the first, and past the first goes to the last. |
| `Space` | Selects the focused star. |

## Do

- Name what is rated in the display's label when the surrounding page doesn't.
- Show the number of reviews next to the stars: "4.5 (212)".
- Label an input with the action: "Rate the Prism holo sight".

## Don't

- Don't use more than five stars.
- Don't let hovering over a star select anything.
- Don't use stars for anything that isn't a rating, such as a difficulty grade.

## Anatomy

- **Rating**: Has role=img and the name "4.5 out of 5", so a screen reader treats it as one picture. The stars are aria-hidden (screen readers skip them).
- **Star**: Full, half or empty. Filled ones use the signal colour; empty ones are a border.selection outline.
- **Value**: An optional printed number. It's aria-hidden because the name already says it.
- **RatingInput**: A radiogroup named by label, built straight on Radix RadioGroup (Radix is the library of unstyled, accessible building blocks this system uses) instead of the Radio atom. Radio draws a 20px (pixel) square box with a filled inner square to show it's selected, and a star can't be drawn inside a square without either cropping it or leaving the box empty around it.
- **Star option**: A 28px radio named "3 stars".
