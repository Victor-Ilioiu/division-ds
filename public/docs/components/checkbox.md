# Checkbox

> A checkbox with three states: off, on and mixed. Radix (the open-source library of accessible building blocks underneath it) handles the semantics and the keyboard behaviour. The look comes from the system's shape language: a square with no rounding and a tick in ink.

- **Best for:** An on/off choice that applies when the form is saved, or a parent whose children are partly selected.
- **Not for:** A setting that takes effect the moment you flip it. Use Switch for that.
- Atom. Source: `src/components/atoms/checkbox/Checkbox.tsx`
- Rendered docs page: `/components/checkbox`

## Import

```tsx
import { Checkbox } from 'src/components/atoms/checkbox/Checkbox'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `checked` | `boolean \| 'indeterminate'` |  | The checked state, when your code controls it. |
| `defaultChecked` | `boolean` |  | The starting state when the checkbox manages itself (uncontrolled). It's narrower than Radix's own boolean \| 'indeterminate'. The tick or dash can only follow a checked value the caller passed in. Radix would track an uncontrolled mixed state internally but never hand it back, so that state is excluded instead of being drawn with the wrong mark. |
| `onCheckedChange` | `(checked: boolean \| 'indeterminate') => void` |  | Runs every time it toggles. |
| `disabled` | `boolean` |  | Takes it out of the tab order and stops it toggling. |
| `required` | `boolean` |  | Uses the browser's built-in form validation. |
| `name` | `string` |  | The field name sent with a native form. |
| `value` | `string \| number \| readonly string[]` |  | The field value sent with a native form. |
| `invalid` | `boolean` | `false` | Sets aria-invalid (an ARIA attribute, from Accessible Rich Internet Applications, that tells screen readers the field has an error) and shows the invalid border. |
| `id` | `string` |  | Pair it with a real label through htmlFor. |
| `className` | `string` |  | Merged with the control's classes. If two clash, the later Tailwind utility wins (Tailwind is the CSS framework this system styles with). |
| `ref` | `Ref<HTMLButtonElement>` |  | Passed through to the Radix root button. |
| `...rest` | `Omit<CheckboxProps, 'aria-invalid' \| 'defaultChecked'>` |  | Every Radix Checkbox.Root prop except aria-invalid, spread onto the root. aria-invalid is removed from the type, so you can't pass it, instead of being quietly overwritten while the page runs. invalid is the only thing that sets both the attribute and the border. defaultChecked is declared again above, narrowed to boolean. |

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### States

```tsx
<div className="flex items-center gap-2">
  <Checkbox id="state-unchecked" />
  <label htmlFor="state-unchecked">Unchecked</label>
</div>
<div className="flex items-center gap-2">
  <Checkbox id="state-checked" checked />
  <label htmlFor="state-checked">Checked</label>
</div>
<div className="flex items-center gap-2">
  <Checkbox id="state-indeterminate" checked="indeterminate" />
  <label htmlFor="state-indeterminate">Mixed</label>
</div>
<div className="flex items-center gap-2">
  <Checkbox id="state-disabled" disabled />
  <label htmlFor="state-disabled">Disabled</label>
</div>
```

### A group

```tsx
const KIT_ITEMS = ['Speed loader', 'Rail light', 'Spare battery', 'First aid kit']

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-')

function GroupExample() {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({
    'Speed loader': true,
    'Rail light': true,
    'Spare battery': false,
    'First aid kit': false,
  })

  const checkedCount = KIT_ITEMS.filter(item => checkedItems[item]).length
  const parentChecked: boolean | 'indeterminate' =
    checkedCount === 0 ? false : checkedCount === KIT_ITEMS.length ? true : 'indeterminate'

  function setAll(value: boolean) {
    setCheckedItems(Object.fromEntries(KIT_ITEMS.map(item => [item, value])))
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Checkbox
          id="kit-parent"
          checked={parentChecked}
          onCheckedChange={checked => setAll(checked === true)}
        />
        <label htmlFor="kit-parent" className="font-medium">
          Pack full field kit
        </label>
      </div>
      <div className="flex flex-col gap-2 pl-6">
        {KIT_ITEMS.map(item => (
          <div key={item} className="flex items-center gap-2">
            <Checkbox
              id={`kit-item-${slug(item)}`}
              checked={checkedItems[item]}
              onCheckedChange={checked =>
                setCheckedItems(prev => ({ ...prev, [item]: checked === true }))
              }
            />
            <label htmlFor={`kit-item-${slug(item)}`}>{item}</label>
          </div>
        ))}
      </div>
    </div>
  )
}

<GroupExample />
```

### Invalid

```tsx
<div className="flex items-center gap-2">
  <Checkbox id="state-invalid" invalid />
  <label htmlFor="state-invalid">Confirm waiver on file</label>
</div>
```

## Keyboard

| Keys | Result |
|---|---|
| `Tab` | Moves focus to it. |
| `Space` | Toggles it. |
| `Enter` | Nothing. That's how a native checkbox behaves, so it isn't a bug to fix. |

## Do

- Give it a real <label htmlFor>, or let FormField do it.
- Use the mixed state for a parent whose children are partly selected.
- Put the label on the right and make it part of the clickable target.

## Don't

- Don't use a checkbox for something that takes effect right away. That's a Switch.
- Don't rely on the fill colour alone. The tick and the dash are what show the state.
- Don't nest checkbox groups more than one level deep.

## Anatomy

- **Root**: A button with role=checkbox, which tells screen readers it's a checkbox. A native input can't be styled this way. The box is 20px (pixels) and the hit area, the part you can click or tap, is 24px.
- **Indicator**: A tick when checked, a dash when mixed. The shape changes, so the state never depends on colour alone.
- **Hit area**: A ::before inset of -2px, which clears the 24×24 minimum in WCAG 2.2 (the Web Content Accessibility Guidelines, the public rulebook for making websites usable by people with disabilities).
