# DatePresets

> Named periods such as Last 7 days, one click each. The defaults: Today, Yesterday, Last 7 days, Last 30 days, This month, Last month, This year, or your own. An add-on: put it in a DateRangePicker's aside and it reads and sets the picker's range by itself, then closes it. On its own it is a list you give a value and an onSelect. Installs DateRangePicker and DatePicker with it.

- **Best for:** Reports and logs, where people want the usual periods.
- **Not for:** Exact dates: DateRangePicker alone.
- Molecule. Source: `src/components/molecules/date-presets/DatePresets.tsx`
- Rendered docs page: `/components/date-presets`

## Import

```tsx
import { DatePresets, defaultPresets } from 'src/components/molecules/date-presets/DatePresets'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `presets` | `DatePreset[]` | `defaultPresets()` | Each { label, range }. Make your own, or start from defaultPresets(today). |
| `value` | `{ start: string; end: string }` |  | The current range. Inside a DateRangePicker it comes from the picker. |
| `onSelect` | `(range: DateRange) => void` |  | A preset was chosen. Inside a DateRangePicker the picker also takes it and closes. |
| `label` | `string` | `'Presets'` | The list's accessible name. |
| `className` | `string` |  | Combined with the list's classes. |
| `ref` | `Ref<HTMLDivElement>` |  | The list element. |
| `defaultPresets()` | `(today?: string) => DatePreset[]` |  | The seven usual periods counted back from today ('YYYY-MM-DD'; defaults to the reader's today). Every one includes today. |

## Types and helpers

Exported beside the component, from the same file. Import a type with `import type { ... }`.

```ts
export type DatePreset = { label: string; range: DateRange }
```

```ts
/** The usual periods, counted back from `today` (default: the reader's today). Each includes today. */
export function defaultPresets(today: IsoDate = todayIso()): DatePreset[]
```

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Inside a DateRangePicker: no wiring

```tsx
<div className="w-full max-w-sm">
  <DateRangePicker label="Activity" aside={<DatePresets />} />
</div>
```

### On its own

```tsx
function OnItsOwn() {
  const [range, setRange] = useState<DateRange>(defaultPresets()[2].range)
  return (
    <div className="flex flex-col gap-3">
      <DatePresets value={range} onSelect={setRange} />
      <span className="font-mono text-xs text-[var(--color-text-secondary)]">
        {range.start} to {range.end}
      </span>
    </div>
  )
}

<OnItsOwn />
```

### Your own periods

```tsx
<div className="w-full max-w-sm">
  <DateRangePicker
    label="Season"
    aside={
      <DatePresets
        label="Seasons"
        presets={[
          { label: 'Winter 2026', range: { start: '2026-01-01', end: '2026-03-31' } },
          { label: 'Spring 2026', range: { start: '2026-04-01', end: '2026-06-30' } },
          { label: 'Summer 2026', range: { start: '2026-07-01', end: '2026-09-30' } },
        ]}
      />
    }
  />
</div>
```

## Keyboard

| Keys | Result |
|---|---|
| `Tab` | Moves through the presets. |
| `Enter` `Space` | Chooses the focused preset. |

## Do

- Keep the list short, seven or fewer.
- Name periods the way your users say them: "This quarter" if they plan in quarters.

## Don't

- Don't offer a preset nobody can pick, such as a future period when max is today.

## Anatomy

- **List**: A group named "Presets". Each period is a button; the one matching the current range is pressed (aria-pressed) and filled.
