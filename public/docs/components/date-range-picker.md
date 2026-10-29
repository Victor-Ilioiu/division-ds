# DateRangePicker

> A start and an end date in one field, an add-on to DatePicker. Type both, or open two months side by side: the first day you pick is the start, the band follows you to the second, which sets the end and closes the calendar. Put DatePresets in `aside` for one-click periods like Last 7 days. Installs DatePicker with it.

- **Best for:** A booking, a report window, a leave request.
- **Not for:** One day: DatePicker.
- Molecule. Source: `src/components/molecules/date-range-picker/DateRangePicker.tsx`
- Rendered docs page: `/components/date-range-picker`

## Import

```tsx
import { DateRangePicker, EMPTY_RANGE, useDateRangePicker } from 'src/components/molecules/date-range-picker/DateRangePicker'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` |  | Required. Names the field. Inside a FormField, FormField sets it. |
| `value` | `{ start: string; end: string }` |  | Controlled range. Each end is 'YYYY-MM-DD' or ''. |
| `defaultValue` | `{ start: string; end: string }` | `{ start: '', end: '' }` | Starting range when the picker holds it itself. |
| `onValueChange` | `(range: DateRange) => void` |  | Fires when either end changes. Days picked in the calendar always arrive in order. |
| `min` | `string` |  | Earliest date, 'YYYY-MM-DD'. |
| `max` | `string` |  | Latest date, 'YYYY-MM-DD'. |
| `isDateDisabled` | `(date: string) => boolean` |  | Days that cannot be picked. |
| `locale` | `string` |  | Segment order, names and first day of the week. Defaults to the browser's. |
| `weekStartsOn` | `number` |  | 0 Sunday to 6 Saturday. Defaults to the locale's. |
| `aside` | `ReactNode` |  | Beside the months, in the popover. DatePresets reads and sets the range by itself here. |
| `partLabels` | `[string, string]` | `['Start date', 'End date']` | The names of the two dates. |
| `disabled` | `boolean` | `false` | Disables both dates and the button. |
| `invalid` | `boolean` |  | Marks the field invalid. FormField sets it. |
| `required` | `boolean` |  | Marks both dates required. FormField sets it. |
| `name` | `string` |  | Submits name-start and name-end with a form. |
| `id` | `string` |  | The field's id. FormField sets it. |
| `aria-describedby` | `string` |  | The ids of the help and error text. FormField sets it. |
| `className` | `string` |  | Combined with the field's classes. |
| `ref` | `Ref<HTMLDivElement>` |  | The field's group element. |
| `useDateRangePicker()` | `() => { value: DateRange; select: (range: DateRange) => void } \| null` |  | Inside the popover: the range, and a way to set it and close. For your own aside content. |

## Types and helpers

Exported beside the component, from the same file. Import a type with `import type { ... }`.

```ts
/** A start and an end, each 'YYYY-MM-DD' or '' while not chosen. */
export type DateRange = { start: IsoDate | ''; end: IsoDate | '' }
```

```ts
export const EMPTY_RANGE: DateRange = { start: '', end: '' }
```

```ts
/** The open picker's range, and a way to set it and close. DatePresets reads it, so a preset in
 *  `aside` needs no wiring. null outside a DateRangePicker. */
export const useDateRangePicker = () => useContext(Context)
```

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Default

```tsx
<div className="w-full max-w-sm">
  <DateRangePicker label="Stay" />
</div>
```

### With DatePresets beside the months

```tsx
<div className="w-full max-w-sm">
  <FormField label="Report period" help="Pick a preset, or two days.">
    <DateRangePicker label="Report period" aside={<DatePresets />} />
  </FormField>
</div>
```

### Controlled: the page holds the range

```tsx
function Controlled() {
  const [range, setRange] = useState<DateRange>({ start: '2026-11-09', end: '2026-11-13' })
  return (
    <div className="flex w-full max-w-sm flex-col gap-2">
      <DateRangePicker label="Leave" value={range} onValueChange={setRange} />
      <span className="font-mono text-xs text-[var(--color-text-secondary)]">
        start: {range.start || '—'}, end: {range.end || '—'}
      </span>
    </div>
  )
}

<Controlled />
```

### Limits: November and December only

```tsx
<div className="w-full max-w-sm">
  <DateRangePicker label="Rental" min="2026-11-01" max="2026-12-30" defaultValue={{ start: '2026-11-20', end: '2026-11-23' }} />
</div>
```

## Keyboard

| Keys | Result |
|---|---|
| `0–9` `↑` `↓` | Types or steps the focused segment of either date. |
| `←` `→` | In the field: the next segment, across both dates. In the calendar: the day before or after, moving the band. |
| `Page Up` `Page Down` | A month earlier or later. With Shift, a year. |
| `Enter` `Space` | Picks the start, then the end, which closes the calendar. |
| `Esc` | Closes the calendar. A start picked without an end stays as the start. |

## Do

- Add DatePresets in aside when people mostly want the usual periods.
- Validate the length yourself if a range has a limit (a 30-day report), and say so in help text.

## Don't

- Don't use two separate DatePickers for a start and an end: nobody sees the band.
- Don't reorder a typed range for the user; the field marks it invalid so they can see what they typed.

## Anatomy

- **Field**: A group named by the label, holding two segmented dates (Start date, End date) and the calendar button. A typed end before the start marks it invalid.
- **Calendar**: Two months, stacked on narrow screens. The ends are solid accent squares, the days between a light accent band.
- **Hint**: "Pick the first day." or "Pick the last day.", under the months, announced when it changes.
- **Aside**: An optional column beside the months, for DatePresets.
