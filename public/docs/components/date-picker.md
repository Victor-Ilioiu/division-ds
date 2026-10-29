# DatePicker

> One date, typed or picked. The field has a segment for the day, the month and the year, in the order your language writes them: type the digits and it moves on by itself, or use the arrow keys. The button inside it opens a calendar. The value is a plain 'YYYY-MM-DD' string with no time zone, so it means the same day for everyone. Calendar and DateField are exported too, for building your own.

- **Best for:** One date: a delivery day, a deadline, a birthday.
- **Not for:** A range: DateRangePicker. A time: TimeField.
- **Also on this page:** `Calendar`, `DateField`
- Molecule. Source: `src/components/molecules/date-picker/DatePicker.tsx`
- Rendered docs page: `/components/date-picker`

## Import

```tsx
import { Calendar } from 'src/components/molecules/date-picker/Calendar'
import { DateField } from 'src/components/molecules/date-picker/DateField'
import { DatePicker } from 'src/components/molecules/date-picker/DatePicker'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` |  | Required. Names the field. Inside a FormField, FormField sets it from its own label. |
| `value` | `string ('YYYY-MM-DD' \| '')` |  | Controlled value (your page holds it). |
| `defaultValue` | `string` | `''` | Starting value when the picker holds the value itself. |
| `onValueChange` | `(value: string) => void` |  | Fires with a whole, real date, or '' when the field is emptied. A half-typed date does not fire. |
| `min` | `string` |  | Earliest date, 'YYYY-MM-DD'. Earlier days are struck through; typing one marks the field invalid. |
| `max` | `string` |  | Latest date, 'YYYY-MM-DD'. |
| `isDateDisabled` | `(date: string) => boolean` |  | Days that cannot be picked, such as weekends or holidays. |
| `locale` | `string` |  | A language tag such as 'en-GB' or 'de'. Sets the segment order, the separator, the month and day names and the first day of the week. Defaults to the browser's. |
| `weekStartsOn` | `number` |  | 0 Sunday to 6 Saturday. Defaults to the locale's. |
| `showToday` | `boolean` | `true` | Shows the Today button under the calendar when today can be picked. |
| `disabled` | `boolean` | `false` | Disables the field and the calendar button. |
| `name` | `string` |  | Submits the 'YYYY-MM-DD' value with a form, through a hidden input. |
| `invalid` | `boolean` |  | Marks the field invalid. FormField sets it when there is an error. |
| `required` | `boolean` |  | Marks the field required. FormField sets it. |
| `id` | `string` |  | The field's id, so a FormField's error text can point at it. FormField sets it. |
| `aria-describedby` | `string` |  | The ids of the help and error text. FormField sets it. |
| `className` | `string` |  | Combined with the field's classes. |
| `ref` | `Ref<HTMLDivElement>` |  | The field's group element. |
| `trailing (DateField)` | `ReactNode` |  | Something inside the field after the segments. DatePicker puts its calendar button here. |
| `bare (DateField)` | `boolean` | `false` | No border, fill or ring of its own, for two dates inside one border (DateRangePicker draws them). |
| `onSelect (Calendar)` | `(date: string) => void` |  | A day was picked with a click, Enter or Space. |
| `value (Calendar)` | `string \| null` |  | The picked day. Ignored when dayState is given. |
| `month (Calendar)` | `string` |  | Any day in the first month shown. Controlled with onMonthChange. |
| `defaultMonth (Calendar)` | `string` |  | The first month shown when the calendar holds it itself. Defaults to the value's month, or today's. |
| `onMonthChange (Calendar)` | `(month: string) => void` |  | Fires with the new first month's 1st day. |
| `dayState (Calendar)` | `(date: string) => 'single' \| 'start' \| 'end' \| 'start-end' \| 'middle' \| undefined` |  | Draws each day yourself, for a range or any other selection. |
| `onDayEnter (Calendar)` | `(date: string) => void` |  | The keyboard or the pointer moved onto a day. A range uses it to preview the band. |
| `numberOfMonths (Calendar)` | `1 \| 2` | `1` | Months side by side, stacked on narrow screens. |
| `autoFocus (Calendar)` | `boolean` | `false` | Moves focus to the picked day, or today, when the calendar appears. |

## Types and helpers

Exported beside the component, from the same file. Import a type with `import type { ... }`.

```ts
/** How a day is drawn. `single` is one picked day; the rest belong to a range. */
export type DayState = 'single' | 'start' | 'end' | 'start-end' | 'middle'
```

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Default

```tsx
<div className="w-full max-w-xs">
  <DatePicker label="Delivery date" />
</div>
```

### In a FormField, with help text

```tsx
<div className="w-full max-w-xs">
  <FormField label="Trip date" help="Type it, or open the calendar.">
    <DatePicker label="Trip date" />
  </FormField>
</div>
```

### Controlled: the page holds the value

```tsx
function Controlled() {
  const [date, setDate] = useState('2026-11-14')
  return (
    <div className="flex w-full max-w-xs flex-col gap-2">
      <DatePicker label="Dispatch date" value={date} onValueChange={setDate} />
      <span className="font-mono text-xs text-[var(--color-text-secondary)]">value: {date ? `'${date}'` : "''"}</span>
    </div>
  )
}

<Controlled />
```

### Limits: weekdays only, within the next two months

```tsx
const weekend = (date: string) => [0, 6].includes(new Date(`${date}T12:00:00Z`).getUTCDay())

<div className="w-full max-w-xs">
  <DatePicker label="Collection day" min="2026-11-02" max="2026-12-31" defaultValue="2026-11-16" isDateDisabled={weekend} />
</div>
```

### US order and a Sunday start, from the locale

```tsx
<div className="w-full max-w-xs">
  <DatePicker label="Ship date" locale="en-US" defaultValue="2026-11-14" />
</div>
```

### The calendar on its own

```tsx
function InlineCalendar() {
  const [date, setDate] = useState<string | null>(null)
  return (
    <div className="flex flex-col gap-2">
      <Calendar value={date} onSelect={setDate} />
      <span className="font-mono text-xs text-[var(--color-text-secondary)]">{date ? formatLong(date) : 'No day picked'}</span>
    </div>
  )
}

<InlineCalendar />
```

## Keyboard

| Keys | Result |
|---|---|
| `0–9` | Types into the focused segment and moves on once it is full. |
| `↑` `↓` | In the field: one more or one less in the segment. In the calendar: a week earlier or later. |
| `←` `→` | In the field: the previous or next segment. In the calendar: the day before or after. |
| `Backspace` | Clears the segment, or moves back when it is already empty. |
| `Page Up` `Page Down` | The same day a month earlier or later. With Shift, a year. |
| `Home` `End` | The first or last day of the week. |
| `Enter` `Space` | Picks the focused day and closes the calendar. |
| `Esc` | Closes the calendar without a change. |

## Do

- Store and send the 'YYYY-MM-DD' value as it is. It has no time zone, so it can't shift by a day.
- Set min and max to the real limits, so days nobody can book are struck through rather than refused after the fact.
- Wrap it in a FormField for a visible label, help text and errors.

## Don't

- Don't convert the value with new Date('2026-11-14'): that reads it as midnight UTC and can show the day before in the Americas.
- Don't hide unavailable days. Struck through and announced, they explain themselves.
- Don't use it for a date of birth without setting max to today.

## Anatomy

- **Field (DateField)**: A group named by the label, holding three spinbuttons (Day, Month, Year). Each says its value or "Empty". A date that does not exist (31 February) or falls outside min and max marks the field invalid.
- **Calendar button**: A ghost IconButton inside the field. Its name includes the picked date: "Choose date, Saturday, 14 November 2026".
- **Calendar**: A grid with one tab stop. Each day is a button named with the full date. The picked day is a solid accent square with a cut corner; today has aria-current and a short bar under its number. Days that can't be picked stay visible, struck through and announced as unavailable.
- **Today**: A secondary Button under the calendar, shown only when today can be picked.
