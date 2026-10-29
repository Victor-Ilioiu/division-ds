# TimeField

> A time of day, an add-on to the date pickers. Hours and minutes are segments you type into or step with the arrow keys, like DateField; the clock button opens a list of times every step minutes. With a 12-hour clock there is an AM/PM segment. The value is 'HH:MM' on a 24-hour clock whatever is shown. Put it next to a DatePicker for a date and a time.

- **Best for:** A pickup slot, a meeting start, a shift.
- **Not for:** A duration: Input with a unit.
- Molecule. Source: `src/components/molecules/time-field/TimeField.tsx`
- Rendered docs page: `/components/time-field`

## Import

```tsx
import { TimeField, hourCycleFor } from 'src/components/molecules/time-field/TimeField'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` |  | Required. Names the field. Inside a FormField, FormField sets it. |
| `value` | `string ('HH:MM' \| '')` |  | Controlled value, 24-hour. |
| `defaultValue` | `string` | `''` | Starting value when the field holds it itself. |
| `onValueChange` | `(value: string) => void` |  | Fires with a whole time, or '' when emptied. |
| `hourCycle` | `12 \| 24` |  | 12 adds an AM/PM segment. The value stays 24-hour. Defaults to the locale's clock. |
| `step` | `number` | `30` | Minutes between the times in the list. |
| `min` | `string` |  | Earliest time, 'HH:MM'. Earlier times are left out of the list; typing one marks the field invalid. |
| `max` | `string` |  | Latest time, 'HH:MM'. |
| `showSlots` | `boolean` | `true` | Shows the clock button and its list. |
| `locale` | `string` |  | Decides the default clock. Defaults to the browser's. |
| `disabled` | `boolean` | `false` | Disables the field and the button. |
| `invalid` | `boolean` |  | Marks the field invalid. FormField sets it. |
| `required` | `boolean` |  | Marks the field required. FormField sets it. |
| `name` | `string` |  | Submits the 'HH:MM' value with a form. |
| `id` | `string` |  | The field's id. FormField sets it. |
| `aria-describedby` | `string` |  | The ids of the help and error text. FormField sets it. |
| `className` | `string` |  | Combined with the field's classes. |
| `ref` | `Ref<HTMLDivElement>` |  | The field's group element. |
| `hourCycleFor()` | `(locale?: string) => 12 \| 24` |  | The locale's own clock. |

## Types and helpers

Exported beside the component, from the same file. Import a type with `import type { ... }`.

```ts
/** 'HH:MM', 24-hour, or '' for no time. */
export type TimeValue = string
```

```ts
/** 12 or 24, from the locale's own clock. */
export function hourCycleFor(locale?: string): 12 | 24
```

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Default, 24-hour

```tsx
<div className="w-36">
  <TimeField label="Start time" hourCycle={24} />
</div>
```

### 12-hour, with AM and PM

```tsx
<div className="w-40">
  <TimeField label="Call time" hourCycle={12} defaultValue="14:30" />
</div>
```

### With a DatePicker: a date and a time

```tsx
function DateAndTime() {
  const [date, setDate] = useState('2026-11-14')
  const [time, setTime] = useState('09:30')
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
        <FormField label="Pickup date">
          <DatePicker label="Pickup date" value={date} onValueChange={setDate} />
        </FormField>
        <FormField label="Pickup time">
          <TimeField label="Pickup time" value={time} onValueChange={setTime} step={15} min="08:00" max="18:00" />
        </FormField>
      </div>
      <span className="font-mono text-xs text-[var(--color-text-secondary)]">
        {date && time ? `${date}T${time}` : 'Pick a date and a time'}
      </span>
    </div>
  )
}

<DateAndTime />
```

## Keyboard

| Keys | Result |
|---|---|
| `0–9` | Types the hour or minute and moves on once it is full. |
| `A` `P` | On the AM/PM segment, sets AM or PM. |
| `↑` `↓` | In the field: one more or one less. In the list: the next or previous time. |
| `←` `→` | The previous or next segment. |
| `Page Up` `Page Down` | In the list: six times earlier or later. |
| `Enter` `Space` | In the list: picks the time and closes it. |
| `Esc` | Closes the list without a change. |

## Do

- Set step to the real booking grid, such as 15 for 15-minute slots.
- Store the value with its date and the time zone it means, separately.

## Don't

- Don't parse 'HH:MM' with new Date(): keep it a string until you combine it with a date and a zone.

## Anatomy

- **Field**: A group named by the label: Hour, Minute and, on a 12-hour clock, AM or PM, each a spinbutton.
- **Clock button**: A ghost IconButton. Its name includes the time: "Choose time, 14:30".
- **Time list**: A listbox of times between min and max, every step minutes. It opens on the picked time, or the next slot after now.
