# Radio

> Pick one choice from a set. The whole group is a single tab stop, and the arrow keys move inside it. That’s how native radio buttons behave, and it’s most of the reason this is built on a Radix primitive (Radix is a library of accessible building blocks) instead of three styled inputs.

- **Best for:** One choice from a short set, up to about seven, all shown at once.
- **Not for:** A yes/no question: use Checkbox or Switch. A longer list: use Select.
- Atom. Source: `src/components/atoms/radio/Radio.tsx`
- Rendered docs page: `/components/radio`

## Import

```tsx
import { Radio, RadioGroup } from 'src/components/atoms/radio/Radio'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `value (RadioGroup)` | `string` |  | The selected value, when you control it from outside. |
| `defaultValue (RadioGroup)` | `string` |  | The starting value, when the group manages it itself (uncontrolled). |
| `onValueChange (RadioGroup)` | `(value: string) => void` |  | Fires when the selection changes. |
| `name (RadioGroup)` | `string` |  | The native form field name. |
| `required (RadioGroup)` | `boolean` |  | Uses the browser’s native form validation. |
| `disabled (RadioGroup)` | `boolean` |  | Disables every option in the group. |
| `orientation (RadioGroup)` | `'horizontal' \| 'vertical'` |  | Sets which arrow keys move between options. The visual layout is still up to className. |
| `aria-label / aria-labelledby (RadioGroup)` | `string` |  | One of these is required. They’re ARIA attributes (from Accessible Rich Internet Applications) that give the group a name screen readers announce. A radiogroup with no name is a bug. |
| `value (Radio)` | `string` |  | Required. This option’s value. |
| `disabled (Radio)` | `boolean` |  | Takes just this option out of selection. |
| `id (Radio)` | `string` |  | Pair it with a real label using htmlFor. |
| `invalid (Radio)` | `boolean` | `false` | Sets aria-invalid, which tells assistive tech the field has an error, and shows the invalid border. |
| `className` | `string` |  | Merged with the control's classes. Later Tailwind utilities (Tailwind is the CSS framework the system uses) win. |
| `ref` | `Ref<HTMLDivElement> (RadioGroup) / Ref<HTMLButtonElement> (Radio)` |  | Passed through to the Radix root element. |
| `...rest` | `(Radio) Omit<RadioGroup.Item props, 'aria-invalid'>` |  | Every Radix RadioGroup.Item prop except aria-invalid, spread onto the item. aria-invalid is typed away instead of being quietly overridden at runtime, because invalid is the only source of both the attribute and the border. RadioGroup itself excludes nothing. It computes no value of its own that a rest prop could defeat. |

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### A group

```tsx
const SPEEDS = ['standard', 'priority', 'overnight'] as const

function LiveExample() {
  const [value, setValue] = useState<string>('standard')
  return (
    <RadioGroup aria-label="Dispatch speed" value={value} onValueChange={setValue}>
      {SPEEDS.map(speed => (
        <div key={speed} className="flex items-center gap-2">
          <Radio value={speed} id={`dispatch-${speed}`} />
          <label htmlFor={`dispatch-${speed}`} className="capitalize">
            {speed}
          </label>
        </div>
      ))}
    </RadioGroup>
  )
}

<LiveExample />
```

### With a default

```tsx
const SPEEDS = ['standard', 'priority', 'overnight'] as const

<RadioGroup aria-label="Dispatch speed, defaulted" defaultValue="priority">
  {SPEEDS.map(speed => (
    <div key={speed} className="flex items-center gap-2">
      <Radio value={speed} id={`default-${speed}`} />
      <label htmlFor={`default-${speed}`} className="capitalize">
        {speed}
      </label>
    </div>
  ))}
</RadioGroup>
```

### Horizontal

```tsx
const SPEEDS = ['standard', 'priority', 'overnight'] as const

<RadioGroup aria-label="Dispatch speed, horizontal" orientation="horizontal" defaultValue="standard" className="flex-row flex-wrap gap-4">
  {SPEEDS.map(speed => (
    <div key={speed} className="flex items-center gap-2">
      <Radio value={speed} id={`horizontal-${speed}`} />
      <label htmlFor={`horizontal-${speed}`} className="capitalize">
        {speed}
      </label>
    </div>
  ))}
</RadioGroup>
```

### Disabled option

```tsx
const SPEEDS = ['standard', 'priority', 'overnight'] as const

<RadioGroup aria-label="Dispatch speed, one option disabled" defaultValue="standard">
  {SPEEDS.map(speed => (
    <div key={speed} className="flex items-center gap-2">
      <Radio value={speed} id={`disabled-${speed}`} disabled={speed === 'overnight'} />
      <label htmlFor={`disabled-${speed}`} className="capitalize">
        {speed}
      </label>
    </div>
  ))}
</RadioGroup>
```

## Keyboard

| Keys | Result |
|---|---|
| `Tab` | Enters the group at the selected option, or at the first one if nothing’s selected. |
| `↓` `→` | Selects the next option. |
| `↑` `←` | Selects the previous option. |
| `Space` | Selects the focused option. |

## Do

- Name the group: in a form, a fieldset legend that the RadioGroup points at with aria-labelledby; elsewhere, aria-label.
- Offer a default when one option really is the norm.
- Keep the set short. Past about seven options, use a Select.

## Don't

- Don't use radios for a yes/no. That's a Checkbox or a Switch.
- Don't put a radio outside a RadioGroup. Both the roving focus and the value come from the group.
- Don't make choosing an option perform the action. Put a button after the group.

## Common mistakes

Wrong:

```tsx
<FormField label="Difficulty" error={error}>
  <RadioGroup>
    <Radio value="easy" />
  </RadioGroup>
</FormField>
```

Right:

```tsx
<fieldset aria-describedby={error ? 'difficulty-error' : undefined}>
  <legend id="difficulty-label" className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-primary)]">
    Difficulty
  </legend>
  <RadioGroup aria-labelledby="difficulty-label" aria-required="true" value={value} onValueChange={setValue} className="mt-2">
    {['easy', 'moderate', 'hard'].map(option => (
      <div key={option} className="flex items-center gap-2">
        <Radio id={`difficulty-${option}`} value={option} invalid={Boolean(error)} />
        <label htmlFor={`difficulty-${option}`} className="font-body text-sm">{option}</label>
      </div>
    ))}
  </RadioGroup>
  {error ? (
    <p id="difficulty-error" className="mt-1.5 font-body text-sm text-[var(--color-accent-hostile-text)]">{error}</p>
  ) : null}
</fieldset>
```

FormField clones one control and gives it an id and a label; a group of radios has neither. The fieldset and legend name the group, the label styles match FormField, and the error is linked through aria-describedby. Give ErrorSummary the id of the first Radio so its link lands in the group.

## Anatomy

- **RadioGroup**: Has role=radiogroup, which tells assistive tech (screen readers and similar tools) this is a set of radios. It handles roving focus, where only one option is reachable by Tab and the arrows move between the rest, and it owns the value.
- **Radio**: Has role=radio. A 20px (pixel) square inside a 24px hit area, the region that responds to a click or tap.
- **Indicator**: A filled 10px square, not a dot. The system’s shape language has no circles.
