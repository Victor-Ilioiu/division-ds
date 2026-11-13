# Select

> A single choice from a list, shown in a portalled listbox (a pop-up list rendered at the top level of the page, so nothing around it can clip it). Options come in as an array instead of as children, because the trigger, the panel and the look of each row are decisions the system makes once, not per use.

- **Best for:** One choice from a list of about five options or more: a country, a time zone, a currency.
- **Not for:** Several values: use MultiSelect. Fewer than about five options: use Radio.
- Atom. Source: `src/components/atoms/select/Select.tsx`
- Rendered docs page: `/components/select`

## Import

```tsx
import { Select } from 'src/components/atoms/select/Select'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file. An install has no index barrels: import each component from its own file, never from `components/molecules`.

## Requires

- A <FormField> around it. On its own the control has no label. FormField supplies the label, the help text and the error, and connects their ids so assistive tech (screen readers and similar tools) reads them together.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` |  | The trigger’s accessible name, the name a screen reader announces for it. Leave it out inside a FormField, which sets it from its own label. Outside one it is required, and `division-ds check` flags a missing one. |
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
| `iconInTrigger` | `boolean` | `false` | Repeats the chosen row’s icon in the trigger, before its label, still aria-hidden. For icons people recognise the option by, such as a country’s flag; leave it off for decorative ones. |
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
  /** Leading glyph, aria-hidden: the label names the row. Shown in the trigger only with `iconInTrigger`. */
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

### Countries

```tsx
type Stripes = { dir: 'v' | 'h'; colors: string[] }

const FLAGS: Record<string, Stripes> = {
  at: { dir: 'h', colors: ['#c8102e', '#ffffff', '#c8102e'] }, // token-discipline: allow, Austria's flag colours, not interface colour
  be: { dir: 'v', colors: ['#000000', '#fdda24', '#ef3340'] }, // token-discipline: allow, Belgium's flag colours, not interface colour
  de: { dir: 'h', colors: ['#000000', '#dd0000', '#ffce00'] }, // token-discipline: allow, Germany's flag colours, not interface colour
  es: { dir: 'h', colors: ['#aa151b', '#f1bf00', '#f1bf00', '#aa151b'] }, // token-discipline: allow, Spain's flag colours, not interface colour
  fr: { dir: 'v', colors: ['#0055a4', '#ffffff', '#ef4135'] }, // token-discipline: allow, France's flag colours, not interface colour
  ie: { dir: 'v', colors: ['#169b62', '#ffffff', '#ff883e'] }, // token-discipline: allow, Ireland's flag colours, not interface colour
  it: { dir: 'v', colors: ['#009246', '#ffffff', '#ce2b37'] }, // token-discipline: allow, Italy's flag colours, not interface colour
  nl: { dir: 'h', colors: ['#ae1c28', '#ffffff', '#21468b'] }, // token-discipline: allow, the Netherlands' flag colours, not interface colour
  pl: { dir: 'h', colors: ['#ffffff', '#dc143c'] }, // token-discipline: allow, Poland's flag colours, not interface colour
  ro: { dir: 'v', colors: ['#002b7f', '#fcd116', '#ce1126'] }, // token-discipline: allow, Romania's flag colours, not interface colour
}

function Flag({ code }: { code: string }) {
  const { dir, colors } = FLAGS[code]
  const n = colors.length
  return (
    <svg viewBox="0 0 20 14" style={{ width: 20, height: 14 }} className="block">
      {colors.map((fill, i) =>
        dir === 'v' ? (
          <rect key={i} x={(20 / n) * i} y={0} width={20 / n} height={14} fill={fill} />
        ) : (
          <rect key={i} x={0} y={(14 / n) * i} width={20} height={14 / n} fill={fill} />
        )
      )}
      <rect x={0.5} y={0.5} width={19} height={13} fill="none" stroke="var(--color-border-hairline-strong)" />
    </svg>
  )
}

const COUNTRY_OPTIONS = [
  ['at', 'Austria'], ['be', 'Belgium'], ['fr', 'France'], ['de', 'Germany'], ['ie', 'Ireland'],
  ['it', 'Italy'], ['nl', 'Netherlands'], ['pl', 'Poland'], ['ro', 'Romania'], ['es', 'Spain'],
].map(([value, label]) => ({ value, label, icon: <Flag code={value} /> }))

<Select label="Country" options={COUNTRY_OPTIONS} iconInTrigger defaultValue="ro" />
```

### Long list

```tsx
const MONTH_OPTIONS = Array.from({ length: 30 }, (_, i) => {
  const date = new Date(Date.UTC(2026, 10 - i, 1))
  const label = date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  return { value: date.toISOString().slice(0, 7), label }
})

<Select label="Billing month" options={MONTH_OPTIONS} placeholder="Choose a month" />
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
- Set iconInTrigger when the icon is how people recognise the option, such as a flag in a country list.
- Wrap it in a FormField for a visible label, help and error. FormField hands it the label.

## Don't

- Don't build a searchable select out of this. That's the command palette's job.
- Don't use it for several values. That's MultiSelect, which shows each choice as a removable tag.
- Don't put more than a couple of dozen options in it without search.
- Don't use emoji flags. Windows draws them as letter pairs such as RO; pass a small image or SVG as the icon instead.
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
- **Item icon**: Optional. Sits before the label and is aria-hidden, an ARIA (Accessible Rich Internet Applications) attribute that hides it from assistive tech. It follows the row colour, so it turns ink on the highlight. It isn’t shown in the trigger unless iconInTrigger is set.
- **Group label**: Used with groups: a mono (monospaced font) heading over its rows that names the group for screen readers. It can’t be selected. A hairline separates the groups.
