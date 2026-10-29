# QuantityStepper

> A whole number between a lowest and a highest value, with a button on each side. It follows the spinbutton pattern (the standard recipe for a number you nudge up and down), so the keyboard can do everything from inside the field.

- **Best for:** A whole number between real limits, such as a quantity in a cart.
- **Not for:** A value that isn't a whole number: use Input. A range of hundreds: use Slider or Input.
- Molecule. Source: `src/components/molecules/quantity-stepper/QuantityStepper.tsx`
- Rendered docs page: `/components/quantity-stepper`

## Import

```tsx
import { QuantityStepper, clampQuantity, gridMax } from 'src/components/molecules/quantity-stepper/QuantityStepper'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file. An install has no index barrels: import each component from its own file, never from `components/molecules`.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` |  | Names the field and both buttons ("Decrease Speed loader quantity"). Leave it out inside a FormField, which sets it from its own label. Outside one it is required, and `division-ds check` flags a missing one. |
| `value` | `number` |  | Controlled value (your page holds it). |
| `defaultValue` | `number` | `min` | Starting value when the component holds the value itself (uncontrolled). |
| `onValueChange` | `(value: number) => void` |  | Fires with the final value, pulled inside the limits: after a button click, an arrow key, Home/End, or when typing is finished by leaving the field or pressing Enter. |
| `min` | `number` | `0` | Lowest allowed value. |
| `max` | `number` | `99` | Highest allowed value. |
| `step` | `number` | `1` | The size of each step the value snaps to, counted from min. |
| `disabled` | `boolean` | `false` | Disables the field and both buttons. |
| `inputSize` | `'sm' \| 'md'` | `'md'` | Size of the field and buttons. |
| `className` | `string` |  | Combined with the root classes. Where Tailwind utility classes clash, the later one wins. |
| `ref` | `Ref<HTMLInputElement>` |  | Passed through to the field. |
| `id` | `string` |  | The field's id, so a FormField's label and error text can point at it. FormField sets it. |
| `aria-describedby` | `string` |  | The ids of the help and error text, set on the field so screen readers read them out. FormField sets it. |
| `invalid` | `boolean` |  | Marks the field as invalid: aria-invalid and the invalid border. FormField sets it when there is an error. |
| `required` | `boolean` |  | Marks the field as required. FormField sets it. |

## Types and helpers

Exported beside the component, from the same file. Import a type with `import type { ... }`.

```ts
/** The step grid's own last rung at or below `max` -- the real upper bound the control can reach.
 *  `max` itself may not be a step away from `min` (min 0, max 99, step 5: the grid is 0, 5, ...,
 *  95, and 99 is never a rung on it), so this is what `aria-valuemax`, the Increase button's
 *  disabled state, the focus-on-bound check and End all need instead of `max` directly -- a control
 *  that can never reach the value it announces as its maximum is worse than one that announces a
 *  lower, reachable one. */
export function gridMax(min: number, max: number, step = 1): number
```

```ts
/**
 * Pure. Parses, snaps to the step grid measured from min, then clamps into `[min, gridMax(min,
 * max, step)]`. Unparseable input returns `min`.
 *
 * `min > max` is the caller's error, not this function's to reject: the formula has no branch that
 * assumes `min <= max`, so it still returns a number rather than throwing -- just not a meaningful
 * one for an inverted range. Callers are expected to pass a sane range.
 */
export function clampQuantity(raw: string | number, min: number, max: number, step = 1): number
```

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Default

```tsx
<QuantityStepper label="Speed loader quantity" defaultValue={1} />
```

### Bounded: with a lowest and a highest allowed number

```tsx
<div className="flex flex-col gap-2">
  <QuantityStepper label="Bump helmet quantity" defaultValue={1} min={1} max={4} />
  <span className="font-mono text-xs text-[var(--color-text-secondary)]">Only four left</span>
</div>
```

### Stepping by five

```tsx
<QuantityStepper label="BB bottle quantity" defaultValue={5} min={0} max={50} step={5} />
```

### In a cart line

```tsx
function CartLine() {
  const price = 38
  const [qty, setQty] = useState(2)
  return (
    <div className="flex items-center gap-4 w-full">
      <span className="flex-1 font-body text-sm text-[var(--color-text-primary)]">Speed loader</span>
      <QuantityStepper
        label="Speed loader quantity"
        defaultValue={2}
        min={1}
        max={9}
        onValueChange={setQty}
      />
      <span className="w-16 text-right font-display font-semibold tabular-nums text-[var(--color-text-primary)]">
        €{price * qty}
      </span>
    </div>
  )
}

<CartLine />
```

## Keyboard

| Keys | Result |
|---|---|
| `↑` `↓` | One step. |
| `Page Up` `Page Down` | Ten steps. |
| `Home` `End` | Jumps to the minimum or maximum. |
| `Enter` | Confirms what you typed. |
| `Tab` | Leaves the field and confirms what you typed. Tab doesn't stop on the buttons. |

## Do

- Set a real maximum, like the stock level or an order limit, not an arbitrary 99.
- Name the field after the item: 'Speed loader quantity'.
- Show the line total beside it, updating as the value changes.

## Don't

- Don't use it for values that aren't whole numbers; that's an Input.
- Don't use it for a range of hundreds; that's a Slider or an Input.
- Don't pull the value back inside the limits while someone's still typing.

## Anatomy

- **Field**: Has role=spinbutton, plus its value and limits, so screen readers know what it is. It's a text field that brings up a number keypad on phones, not the browser's own number input.
- **Decrease / Increase**: Secondary IconButtons named after the field. As the pattern says, Tab skips them. They're disabled at the lowest and highest value.
