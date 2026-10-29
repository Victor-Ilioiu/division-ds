# Select

> A single choice from a list, shown in a portalled listbox (a pop-up list rendered at the top level of the page, so nothing around it can clip it). Options come in as an array instead of as children, because the trigger, the panel and the look of each row are decisions the system makes once, not per use.

- **Best for:** One choice from a list of about five options or more.
- **Not for:** Several values: use MultiSelect. Fewer than about five options: use Radio.
- Atom. Source: `src/components/atoms/select/Select.tsx`
- Rendered docs page: `/components/select`

## Import

```tsx
import { Select } from 'src/components/atoms/select/Select'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file.

## Requires

- A <FormField> around it. On its own the control has no label. FormField supplies the label, the help text and the error, and connects their ids so assistive tech (screen readers and similar tools) reads them together.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` |  | Required. The trigger’s accessible name, the name a screen reader announces for it. |
| `options` | `SelectOptionWithIcon[]` |  | { value, label, disabled?, icon? } rows shown in the listbox. Pass this or groups, never both. |
| `groups` | `SelectGroup[]` |  | { label, options }[]: rows under headings. Pass this or options, never both. |
| `placeholder` | `string` | `'Select…'` | Shown until a value is chosen. |
| `value` | `string` |  | The selection, when you control it from outside. Following Radix’s own convention, pass it together with onValueChange. |
| `defaultValue` | `string` |  | The starting selection, when the select manages it itself (uncontrolled). Pass this or value, never both. |
| `onValueChange` | `(value: string) => void` |  | Fires with the new value when a row is chosen, whether the select is controlled or uncontrolled. |
| `disabled` | `boolean` |  | Disables the whole control. |
| `required` | `boolean` |  | Marks the control as required for form submission. |
| `name` | `string` |  | The form field name, for native form submission. |
| `inputSize` | `'sm' \| 'md' \| 'lg'` | `'md'` | Matches Input’s sizes so the two line up. |
| `invalid` | `boolean` | `false` | Sets aria-invalid, which tells assistive tech the field has an error, and shows the invalid border. |
| `className` | `string` |  | Merged with the trigger’s classes. Later Tailwind utilities (Tailwind is the CSS framework the system uses) win. |
| `ref` | `Ref<HTMLButtonElement>` |  | Passed through to the trigger button. |
| `id` | `string` |  | The trigger’s id. FormField sets it. |
| `aria-describedby` | `string` |  | The ids of the help and error text, set on the trigger so a screen reader reads them with it. FormField sets it. |
| `triggerProps` | `Omit<ComponentPropsWithoutRef<'button'>, 'aria-label' \| 'aria-invalid' \| 'className'>` |  | Extra props for the visible trigger button, e.g. data-testid. These are separate from the top-level rest, which goes to Radix’s Root (value, onValueChange, disabled, required, name, dir, form…) and never reaches an element on the page. aria-label and aria-invalid are typed away instead of being quietly overridden at runtime, because label and invalid already decide those. |
| `...rest` | `Omit<Select.Root props, 'children'>, minus every aria-* key and data-testid` |  | Radix’s Root control props only. Every aria-* attribute and data-testid are typed away at the top level, because Root renders no element on the page, and anything that lands there vanishes with no error anywhere. Send them through triggerProps instead. children is typed away because this component renders its own Trigger and Portal. |

## Types and helpers

Exported beside the component, from the same file. Import a type with `import type { ... }`.

```ts
export type SelectOption = { value: string; label: string; disabled?: boolean }
```

```ts
/** A Select row: a `SelectOption` plus an optional leading icon. Kept as its own type rather than
 *  an `icon` field on `SelectOption`, because MultiSelect takes `SelectOption[]` too and renders
 *  no icons: widening the shared type would let an icon compile there and vanish. */
export type SelectOptionWithIcon = SelectOption & {
  /** Leading glyph, aria-hidden: the label names the row. Not repeated in the trigger. */
  icon?: ReactNode
}
```

```ts
/** A titled run of rows. The heading is not selectable; it names the group for screen readers. */
export type SelectGroup = { label: string; options: SelectOptionWithIcon[] }
```

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Placeholder

```tsx
const SPEED_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'priority', label: 'Priority' },
  { value: 'overnight', label: 'Overnight', disabled: true },
]

<Select label="Dispatch speed" options={SPEED_OPTIONS} placeholder="Choose a speed" />
```

### With a value

```tsx
const SPEED_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'priority', label: 'Priority' },
  { value: 'overnight', label: 'Overnight', disabled: true },
]

<Select label="Dispatch speed" options={SPEED_OPTIONS} defaultValue="priority" />
```

### Groups with headings and icons

```tsx
const DELIVERY_GROUPS: SelectGroup[] = [
  {
    label: 'Courier',
    options: [
      { value: 'standard', label: 'Standard', icon: <Truck /> },
      { value: 'priority', label: 'Priority', icon: <Zap /> },
    ],
  },
  {
    label: 'Collect',
    options: [
      { value: 'depot', label: 'Brasov depot', icon: <Package /> },
      { value: 'field', label: 'At the field', icon: <Crosshair /> },
    ],
  },
]

<Select label="Delivery" groups={DELIVERY_GROUPS} placeholder="Choose delivery" />
```

### Sizes

```tsx
const TERRAIN_OPTIONS = [
  { value: 'woodland', label: 'Woodland' },
  { value: 'urban', label: 'Urban' },
  { value: 'desert', label: 'Desert' },
  { value: 'indoor', label: 'Indoor' },
]

<Select label="Terrain (small)" inputSize="sm" options={TERRAIN_OPTIONS} placeholder="Terrain" />
<Select label="Terrain (medium)" inputSize="md" options={TERRAIN_OPTIONS} placeholder="Terrain" />
<Select label="Terrain (large)" inputSize="lg" options={TERRAIN_OPTIONS} placeholder="Terrain" />
```

### Disabled control

```tsx
const SPEED_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'priority', label: 'Priority' },
  { value: 'overnight', label: 'Overnight', disabled: true },
]

<Select label="Dispatch speed, unavailable" options={SPEED_OPTIONS} defaultValue="standard" disabled />
```

### Invalid

```tsx
const SPEED_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'priority', label: 'Priority' },
  { value: 'overnight', label: 'Overnight', disabled: true },
]

<Select label="Dispatch speed" options={SPEED_OPTIONS} invalid placeholder="Choose a speed" />
```

### Beside an Input

```tsx
const TERRAIN_OPTIONS = [
  { value: 'woodland', label: 'Woodland' },
  { value: 'urban', label: 'Urban' },
  { value: 'desert', label: 'Desert' },
  { value: 'indoor', label: 'Indoor' },
]

<label className="flex flex-col gap-1 text-sm">
  Call sign
  <Input placeholder="Anvil-3" />
</label>
{/* Deliberately NOT a <label>. A <label> associates with a labelable element — input,
    select, textarea, button among them — but Radix's trigger is a <button>, and a
    <label> wrapping a button is inert: it neither names it nor forwards a click. The
    Select's accessible name comes from its required `label` prop, and the visible text
    here matches it exactly (SC 2.5.3, label in name). Wrapping it in a <label> would
    have looked correct and done nothing. */}
<div className="flex flex-col gap-1 text-sm">
  <span>Terrain</span>
  <Select label="Terrain" options={TERRAIN_OPTIONS} placeholder="Choose terrain" />
</div>
```

## Keyboard

| Keys | Result |
|---|---|
| `Tab` | Moves focus to the trigger. |
| `Space` `Enter` | Opens the listbox. |
| `↑` `↓` | Moves the highlight. |
| `Home` `End` | Jumps to the first or last option. |
| `A–Z` | Typeahead: jumps to the first option that starts with the letters you type. |
| `Enter` | Selects the highlighted option and closes the list. |
| `Esc` | Closes without selecting and puts focus back on the trigger. |

## Do

- Keep option labels short and written the same way.
- Use a placeholder that says what’s being chosen.
- Disable an unavailable option instead of removing it, so the list stops jumping around.
- Below about five options, use radios instead.
- Group rows under headings once the list mixes different kinds of thing, and keep each group to a handful.
- Give every row an icon, or none of them.
- Wrap it in a FormField for a visible label, help and error. FormField hands it the label.

## Don't

- Don't build a searchable select out of this. That's the command palette's job.
- Don't use it for several values. That's MultiSelect, which shows each choice as a removable tag.
- Don't put more than a couple of dozen options in it without search.
- Don't make a group of one. A heading over a single row is just noise.
- Don't style the trigger differently from Input. A form with mismatched control heights looks broken.
- Don't bevel the trigger. It shares Input's frame and draws its own focus ring (the outline that shows which control the keyboard is on), and a cut corner would clip it. The listbox carries the crosshair instead: the shape lives on the surface, not on the control.
- Don't pass aria-label or aria-invalid through triggerProps. Both are typed away, not overridable, because label and invalid already decide them.

## Anatomy

- **Trigger**: Uses exactly the same frame and styling as Input, so a select and a text field line up in a form.
- **Value**: Shows the placeholder until something’s chosen.
- **Content**: Portalled and positioned by Radix, the library of accessible building blocks this sits on. It slides down out of the trigger as it opens (M7; Radix’s Select closes at once, with no exit animation). It’s the one atom that carries the corner crosshair, because it’s a surface framing other content, and that’s what the crosshair marks. It’s also the shape that can’t be cut, since clip-path would clip the crosshair’s arms and the last row’s selection fill along with them.
- **Item**: Highlighted rows use accent.signal.indicator with accent.signal.indicator-ink. That’s the fill-selection grammar, the system’s rule for how a selection looks.
- **ItemIndicator**: A tick on the selected row, so selection isn’t shown by the highlight alone.
- **Item icon**: Optional. Sits before the label and is aria-hidden, an ARIA (Accessible Rich Internet Applications) attribute that hides it from assistive tech. It follows the row colour, so it turns ink on the highlight. It isn’t shown in the trigger.
- **Group label**: Used with groups: a mono (monospaced font) heading over its rows that names the group for screen readers. It can’t be selected. A hairline separates the groups.
