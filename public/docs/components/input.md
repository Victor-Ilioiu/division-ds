# Input

> A single-line text field. It doesn't label itself. The label, help text, error text and the wiring between them are FormField's job. On its own, Input handles the box, its states and the focus ring (the outline that shows which element the keyboard is on). It also has three optional extras inside its right edge: a password reveal, a character counter and a clear button.

- **Best for:** Single-line text, inside a FormField.
- **Not for:** Several lines of text: use Textarea. Searching the page: use Search.
- Atom. Source: `src/components/atoms/input/Input.tsx`
- Rendered docs page: `/components/input`

## Import

```tsx
import { Input, inputVariants } from 'src/components/atoms/input/Input'
```

## Requires

- A <FormField> around it. On its own the control has no label. FormField adds the label, the help text and the error, and connects their ids.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `inputSize` | `'sm' \| 'md' \| 'lg'` | `'md'` | Called inputSize because size is already a real HTML attribute on input. |
| `invalid` | `boolean` | `false` | Sets aria-invalid (an ARIA attribute, from Accessible Rich Internet Applications, that tells screen readers the field has an error) and shows the invalid border. It doesn't show any error text. |
| `size` | `number` |  | The browser's own attribute, still available. |
| `revealable` | `boolean` | `false` | On type="password", adds a Show password toggle with aria-pressed. The name stays the same, and the pressed state says whether the password is showing. It goes back to hidden when the form submits. Other types ignore it. |
| `showCount` | `boolean` | `false` | Works with maxLength. It shows 12/80 in mono inside the field and adds it to aria-describedby, the attribute that links extra description to a field. It's merged with any describedby you pass in, which is how FormField keeps its help and error text. It only announces the characters left near the limit (the last tenth, and at least the last three), through a polite live region, an area screen readers read out without interrupting. |
| `clearable` | `boolean` | `false` | Shows a clear button while the field has a value (never when it's disabled or read-only). Clearing fires onChange with an empty value, so a controlled field clears through its own handler. Then it calls onClear, then puts focus back in the input. |
| `onClear` | `() => void` |  | Called after the clear button empties the field. |
| `clearLabel` | `string` | `'Clear'` | The clear button’s name. If the page has more than one, say what it clears: ‘Clear call sign’. |
| `wrapperClassName` | `string` |  | Classes for the wrapper a field with extras renders. Put width classes here when an extra is on. It does nothing on a bare input. |
| `className` | `string` |  | Merged with the input’s classes. If two clash, the later Tailwind utility wins (Tailwind is the CSS framework this system styles with). |
| `ref` | `Ref<HTMLInputElement>` |  | Passed through to the input element. |
| `...rest` | `Omit<InputHTMLAttributes<HTMLInputElement>, 'aria-invalid' \| 'size'>` |  | Every native input prop except aria-invalid, spread onto the element. aria-invalid is removed from the type, so you can't pass it, instead of being quietly overwritten while the page runs. invalid is the only thing that sets both the attribute and the border. If a caller could set one directly, what you see and what screen readers hear could drift apart. size is declared again above as the native number attribute, because inputSize controls the variant. |

## Types and helpers

Exported beside the component, from the same file. Import a type with `import type { ... }`.

```ts
export const inputVariants = cva( …
```

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Sizes

```tsx
<label className="flex flex-col gap-1 text-sm">
  Small
  <Input inputSize="sm" placeholder="Call sign" />
</label>
<label className="flex flex-col gap-1 text-sm">
  Medium
  <Input inputSize="md" placeholder="Call sign" />
</label>
<label className="flex flex-col gap-1 text-sm">
  Large
  <Input inputSize="lg" placeholder="Call sign" />
</label>
```

### States

```tsx
<label className="flex flex-col gap-1 text-sm">
  Rest
  <Input placeholder="Call sign" />
</label>
<label className="flex flex-col gap-1 text-sm">
  Hover (try it)
  <Input placeholder="Call sign" />
</label>
<label className="flex flex-col gap-1 text-sm">
  Invalid
  <Input invalid defaultValue="Anvil-3" />
</label>
<label className="flex flex-col gap-1 text-sm">
  Disabled
  <Input disabled defaultValue="Anvil-3" />
</label>
<label className="flex flex-col gap-1 text-sm">
  Read only
  <Input readOnly defaultValue="Anvil-3" />
</label>
```

### Types

```tsx
<label className="flex flex-col gap-1 text-sm">
  Text
  <Input type="text" placeholder="Site name" />
</label>
<label className="flex flex-col gap-1 text-sm">
  Email
  <Input type="email" placeholder="scout@fieldops.example" />
</label>
<label className="flex flex-col gap-1 text-sm">
  Number
  <Input type="number" placeholder="0" className="[font-variant-numeric:tabular-nums]" />
</label>
<label className="flex flex-col gap-1 text-sm">
  Password
  <Input type="password" placeholder="Team radio passphrase" />
</label>
```

### Password reveal

```tsx
<div className="w-full max-w-xs">
  <FormField label="Team radio passphrase">
    <Input type="password" revealable autoComplete="current-password" defaultValue="anvil-north-3" />
  </FormField>
</div>
```

### Character counter

```tsx
<div className="w-full max-w-xs">
  <FormField label="Loadout name" help="Shown on your public profile.">
    <Input maxLength={40} showCount defaultValue="Night recon, woodland" />
  </FormField>
</div>
```

### Clear button

```tsx
<div className="w-full max-w-xs">
  <FormField label="Call sign">
    <Input clearable clearLabel="Clear call sign" defaultValue="Anvil-3" />
  </FormField>
</div>
```

### Labelled the manual way

```tsx
<div className="flex flex-col gap-1 text-sm max-w-xs">
  <label htmlFor="input-docs-callsign">Call sign</label>
  <Input id="input-docs-callsign" aria-describedby="input-docs-callsign-help" />
  <p id="input-docs-callsign-help" className="text-xs text-[var(--color-text-secondary)]">
    Letters, numbers and a hyphen. FormField will set this pattern up for you.
  </p>
</div>
```

## Keyboard

| Keys | Result |
|---|---|
| `Tab` | Moves focus to the input, then to its clear button and reveal toggle if they are there. |
| `Esc` | Nothing by default, even with clearable. Clearing on Escape is a search behaviour, and it lives in the Search molecule. |
| `Space` | On the reveal toggle, shows or hides the password. On the clear button, empties the field and puts focus back in it. |

## Do

- Label it: with a real <label> today, and with FormField once that ships.
- Set the right type and autocomplete. They do more for usability than any styling here.
- Pair invalid with visible error text that the input points to through aria-describedby.
- Size the field to the expected input. A four-digit code doesn't need a full-width box.
- Use showCount with maxLength instead of building a counter next to the field. You get the describedby wiring and the near-limit announcement for free.
- Label a field with extras through FormField or a label htmlFor, never a label wrapped around it. A wrapping label pulls the clear and reveal buttons into the field’s name.

## Don't

- Don't use the placeholder as the label. It disappears the moment someone types.
- Don't bevel it. A cut corner on a 40px box looks like damage, and it would clip the focus ring.
- Don't set invalid without saying what's wrong.
- Don't disable a field to make it read-only. Use readOnly, which you can still focus and copy from.
- Don't add clearable to a search field. Search already has its own clear button and the Escape key.
- Don't build your own show-password button next to a revealable field. You'll end up with two.

## Anatomy

- **Input**: 40px (pixels) tall by default. The height comes from the control token, not a hand-picked number.
- **Border**: border.control at rest, text.muted on hover and hostile.text when invalid. A control's edge tells you something, it isn't decoration, so it doesn't use a hairline token.
- **Focus ring**: Drawn on the input itself. Form controls aren't bevelled (given a cut corner), so nothing clips it.
- **Adornments**: Optional extras inside the right edge, in this order: the count in mono (a fixed-width typeface), the clear button and the reveal toggle. Turning on any of them wraps the input in a relative box (wrapperClassName styles it) and sizes the right padding to fit them, so text never runs underneath. With none on, the input is bare, with no wrapper.
- **Placeholder**: text.placeholder, with contrast measured against the control fill it sits on, not the page. It's never a stand-in for a label.
