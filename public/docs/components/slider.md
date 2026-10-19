# Slider

> A value or a range picked on a track. Each thumb (the handle you drag) gets its own name. If a range slider shared one name, a screen-reader user (someone using software that reads the page aloud) would get two controls called the same thing.

- **Best for:** A value or range on a track, where the rough position matters and the value is shown.
- **Not for:** A precise value with no other way to enter it. Use Input.
- Atom. Source: `src/components/atoms/slider/Slider.tsx`
- Rendered docs page: `/components/slider`

## Import

```tsx
import { Slider } from 'src/components/atoms/slider/Slider'
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` |  | Required. Applied to each thumb. A single thumb gets it as-is, and a range adds "minimum" / "maximum" to the end. |
| `value` | `number[]` |  | The value(s), when you control them from outside. One number makes a single slider; two make a range. |
| `defaultValue` | `number[]` |  | The starting value(s), when the slider manages them itself (uncontrolled). |
| `onValueChange` | `(value: number[]) => void` |  | Fires as the thumb moves. |
| `min` | `number` | `0` | The lowest value. |
| `max` | `number` | `100` | The highest value. |
| `step` | `number` | `1` | The increment for both snapping while dragging and the arrow keys. |
| `disabled` | `boolean` |  | Takes it out of the tab order and blocks input. |
| `formatValue` | `(value: number) => string` |  | One function feeds both the readout and aria-valuetext (the ARIA, or Accessible Rich Internet Applications, attribute a screen reader speaks as the value). So the spoken value and the printed one can’t drift apart, whether the slider is controlled or not. |
| `showValue` | `boolean` | `false` | Shows the current value(s) as a readout. |
| `className` | `string` |  | Merged with the outer wrapper's classes. Later Tailwind utilities (Tailwind is the CSS framework the system uses) win. |
| `ref` | `Ref<HTMLSpanElement>` |  | Passed through to the Radix Slider root. Radix is the library of accessible building blocks this sits on. |
| `...rest` | `Omit<Slider.Root props, 'aria-label' \| 'aria-labelledby' \| 'children'>` |  | Every Radix Slider.Root prop except those three, spread onto the root. aria-label and aria-labelledby are left out because the accessible name lives on each thumb, where label puts it. One on the root would do nothing at all, not override anything. children is typed away because this component draws its own Track/Range/Thumbs, and a children prop would be thrown away without any warning. |

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Single value

```tsx
function SingleValueLive() {
  const [weight, setWeight] = useState([8])
  return (
    <div className="w-full max-w-sm">
      <Slider
        label="Kit weight"
        value={weight}
        onValueChange={setWeight}
        max={20}
        formatValue={v => `${v} kg`}
        showValue
      />
    </div>
  )
}

<SingleValueLive />
```

### Range

```tsx
<div className="w-full max-w-sm">
  <Slider label="Weight range" defaultValue={[4, 12]} max={20} />
</div>
```

### Stepped

```tsx
<div className="w-full max-w-sm">
  <Slider label="BB bottles" defaultValue={[5]} max={20} step={5} />
</div>
```

### Disabled

```tsx
<div className="w-full max-w-sm">
  <Slider label="Locked ration" defaultValue={[8]} max={20} disabled />
</div>
```

## Keyboard

| Keys | Result |
|---|---|
| `→` `↑` | Goes up by one step. |
| `←` `↓` | Goes down by one step. |
| `Page Up` | Goes up by a bigger jump. |
| `Page Down` | Goes down by a bigger jump. |
| `Home` | Jumps to the minimum. |
| `End` | Jumps to the maximum. |

## Do

- Use formatValue whenever the number has a unit.
- Show the value. A slider with no readout asks people to guess.
- Put a number input beside it when the exact value matters.

## Don't

- Don't use a slider where a precise value is required and nothing else lets people enter one.
- Don't shrink the thumb below 24×24 of hit area.
- Don't rely on dragging alone. Every slider here works fully from the keyboard, and it should stay that way.

## Anatomy

- **Label and readout**: An 11px (pixel) mono label, in a monospaced font, and a 24px Oxanium readout with tabular figures, digits that all take the same width. Unlike Progress, there are no dimmed leading zeros. min and max belong to the caller and formatValue can return anything, so a fixed digit width would be one the value doesn’t actually have.
- **Track**: 4px tall, sunken, no border.
- **Range**: The filled span, in signal.fill.
- **Thumb**: A 20px square inside a 24px hit area, the region that responds to a click or tap. There’s one per value.
