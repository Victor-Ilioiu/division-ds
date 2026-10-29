# MultiSelect

> Pick several choices from a list. The chosen ones sit inside the field as tags you can remove, followed by a text field that filters the list as you type. It's the many-values version of Select.

- **Best for:** Any number of choices, including none, from a list too long to show all at once.
- **Not for:** A single choice: use Select, or Radio when there are fewer than about five options. A handful that all fit: use Checkbox.
- Molecule. Source: `src/components/molecules/multi-select/MultiSelect.tsx`
- Rendered docs page: `/components/multi-select`

## Import

```tsx
import { MultiSelect } from 'src/components/molecules/multi-select/MultiSelect'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file.

## Requires

- A <FormField> around it. FormField supplies the visible label, the help and the error, and replaces the label prop with its own.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` |  | Required. The name screen readers give the text field and the list. FormField replaces it with its own label. |
| `options` | `SelectOption[]` |  | { value, label, disabled? }, the same rows Select takes. |
| `value` | `string[]` |  | The current selection when the page keeps track of it (controlled), as option values in the order they were chosen. |
| `defaultValue` | `string[]` |  | The starting selection when the component keeps track itself (uncontrolled). |
| `onValueChange` | `(value: string[]) => void` |  | Runs with the whole new array every time an option is added or removed. |
| `placeholder` | `string` | `'Select…'` | Shown while nothing is chosen. |
| `emptyMessage` | `string` | `'No matches'` | Shown in the panel when the typed text matches no option. |
| `inputSize` | `'sm' \| 'md' \| 'lg'` | `'md'` | Matches Input and Select: a minimum height of 32, 40 or 48px (pixels), with text at size xs, sm or base. It also sets the size of the typed text and of the option rows in the list (28, 32 or 40px). The tags come in one size, so sm fits a single row of them snugly, and md and lg add room around it. The field grows past the minimum as tags wrap. |
| `invalid` | `boolean` | `false` | Sets aria-invalid (which tells screen readers the value has a problem) and the invalid border. FormField sets it from error. |
| `disabled` | `boolean` | `false` | Turns the field off. The chosen tags stay visible, without their remove buttons. |
| `required` | `boolean` | `false` | Sets aria-required on the text field, so screen readers say it's required. |
| `name` | `string` |  | Sends each chosen value with the form as its own hidden input under this name. |
| `className` | `string` |  | Extra CSS classes, merged onto the field. |
| `ref` | `Ref<HTMLInputElement>` |  | Passed through to the text field. |
| `id` | `string` |  | The text field’s id. FormField sets it. |
| `aria-describedby` | `string` |  | The ids of the help and error text, put on the text field so screen readers read them. FormField sets it. |

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Default

```tsx
const LOADOUT = [
  { value: 'mags', label: 'Spare magazines' },
  { value: 'goggles', label: 'Full-seal goggles' },
  { value: 'mesh', label: 'Mesh face guard' },
  { value: 'radio', label: 'Team radio', disabled: true },
  { value: 'gloves', label: 'Gloves' },
  { value: 'loader', label: 'Speed loader' },
  { value: 'tracer', label: 'Tracer unit' },
  { value: 'pouch', label: 'Dump pouch' },
]

<div className="w-full max-w-md">
  <FormField label="Loadout">
    <MultiSelect label="Loadout" options={LOADOUT} placeholder="Choose your kit…" />
  </FormField>
</div>
```

### Controlled: the page holds the chosen options

```tsx
const LOADOUT = [
  { value: 'mags', label: 'Spare magazines' },
  { value: 'goggles', label: 'Full-seal goggles' },
  { value: 'mesh', label: 'Mesh face guard' },
  { value: 'radio', label: 'Team radio', disabled: true },
  { value: 'gloves', label: 'Gloves' },
  { value: 'loader', label: 'Speed loader' },
  { value: 'tracer', label: 'Tracer unit' },
  { value: 'pouch', label: 'Dump pouch' },
]

function ControlledExample() {
  const [kit, setKit] = useState<string[]>(['mags', 'goggles', 'gloves'])
  return (
    <div className="flex flex-col gap-2 w-full max-w-md">
      <FormField label="Loadout" help="Remove a tag and watch the others close the gap.">
        <MultiSelect label="Loadout" options={LOADOUT} value={kit} onValueChange={setKit} />
      </FormField>
      <span className="font-mono text-xs text-[var(--color-text-secondary)]">value: [{kit.join(', ')}]</span>
    </div>
  )
}

<ControlledExample />
```

### Invalid

```tsx
const LOADOUT = [
  { value: 'mags', label: 'Spare magazines' },
  { value: 'goggles', label: 'Full-seal goggles' },
  { value: 'mesh', label: 'Mesh face guard' },
  { value: 'radio', label: 'Team radio', disabled: true },
  { value: 'gloves', label: 'Gloves' },
  { value: 'loader', label: 'Speed loader' },
  { value: 'tracer', label: 'Tracer unit' },
  { value: 'pouch', label: 'Dump pouch' },
]

<div className="w-full max-w-md">
  <FormField label="Loadout" error="Pick eye protection.">
    <MultiSelect label="Loadout" options={LOADOUT} defaultValue={['mags']} />
  </FormField>
</div>
```

### Sizes

```tsx
const LOADOUT = [
  { value: 'mags', label: 'Spare magazines' },
  { value: 'goggles', label: 'Full-seal goggles' },
  { value: 'mesh', label: 'Mesh face guard' },
  { value: 'radio', label: 'Team radio', disabled: true },
  { value: 'gloves', label: 'Gloves' },
  { value: 'loader', label: 'Speed loader' },
  { value: 'tracer', label: 'Tracer unit' },
  { value: 'pouch', label: 'Dump pouch' },
]

<div className="flex flex-col gap-3 w-full max-w-md">
  <MultiSelect label="Small loadout" inputSize="sm" options={LOADOUT} defaultValue={['mags']} />
  <MultiSelect label="Medium loadout" inputSize="md" options={LOADOUT} defaultValue={['mags']} />
  <MultiSelect label="Large loadout" inputSize="lg" options={LOADOUT} defaultValue={['mags']} />
</div>
```

### Disabled

```tsx
const LOADOUT = [
  { value: 'mags', label: 'Spare magazines' },
  { value: 'goggles', label: 'Full-seal goggles' },
  { value: 'mesh', label: 'Mesh face guard' },
  { value: 'radio', label: 'Team radio', disabled: true },
  { value: 'gloves', label: 'Gloves' },
  { value: 'loader', label: 'Speed loader' },
  { value: 'tracer', label: 'Tracer unit' },
  { value: 'pouch', label: 'Dump pouch' },
]

<div className="w-full max-w-md">
  <MultiSelect label="Locked loadout" options={LOADOUT} defaultValue={['mags', 'gloves']} disabled />
</div>
```

## Keyboard

| Keys | Result |
|---|---|
| `↓` `↑` | Opens the list, then moves the highlight, skipping rows that are turned off. |
| `Enter` | Adds or removes the highlighted option. The list stays open. |
| `Backspace` | When the text field is empty, removes the last tag. |
| `Esc` | Closes the list. Press it again to clear the typed text. |
| `Tab` | Moves through the tags’ remove buttons and the text field, and closes the list on the way out. |

## Do

- Use it when someone may pick any number of options, including none.
- Wrap it in a FormField, like every other form control.
- Keep option labels short. They become tags, and long tags wrap the field onto many lines.
- Turn off (disable) an option that isn't available, instead of leaving it out.

## Don't

- Don't use it for a single choice. That's Select, or radios when there are fewer than about five options.
- Don't use it for a handful of options that all fit on screen. Checkboxes show every choice at once.
- Don't put actions in the list. It chooses values, and a command belongs in a DropdownMenu.

## Common mistakes

Wrong:

```tsx
<Select label="Kit" options={kit} /> // then a second Select for the next item
```

Right:

```tsx
<MultiSelect label="Kit" options={kit} value={chosen} onValueChange={setChosen} />
```

Select holds one value. A list of picks is one MultiSelect, whose value is a string array (a list of text values).

## Anatomy

- **Field**: Looks like Input, but grows to fit: it wraps onto more lines as tags are added. Clicking anywhere on it puts focus in the text field and opens the list.
- **Tag**: One for each chosen option, in the order they were chosen. Removing one fades it out and slides the tags after it into its place (M7). Focus goes back to the text field.
- **Text field**: Has role="combobox", which tells screen readers it's a text field with a list attached. Typing filters the list. The placeholder only shows while nothing is chosen.
- **Listbox**: The list, where several options can be chosen. It sits in a panel rendered in a portal (at the end of the page, so nothing clips it), with the same background as Select and the crosshair. It slides down out of the field and back up into it (M7). A tick marks every chosen row.
