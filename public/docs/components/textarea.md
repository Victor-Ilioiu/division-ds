# Textarea

> A text box for several lines. It has the same chrome (border, fill and states) as Input, resizes vertically and shows four rows by default. Like Input, it doesn't label itself.

- **Best for:** Free text over several lines, inside a FormField.
- **Not for:** A single line. Use Input.
- Atom. Source: `src/components/atoms/textarea/Textarea.tsx`
- Rendered docs page: `/components/textarea`

## Import

```tsx
import { Textarea, textareaVariants } from 'src/components/atoms/textarea/Textarea'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file. An install has no index barrels: import each component from its own file, never from `components/molecules`.

## Requires

- A <FormField> around it. On its own the control has no label. FormField supplies the label, the help text and the error, and links up their ids.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `invalid` | `boolean` | `false` | Sets aria-invalid and the invalid border. aria-invalid is an ARIA (Accessible Rich Internet Applications) attribute that tells screen readers the value has a problem. It doesn't render error text. |
| `rows` | `number` | `4` | The browser's own rows attribute. Size it to the answer you expect. |
| `aiValue` | `string` |  | The value an AI proposed, with the same contract as Input. The mark and the revert button sit in the top right corner. While the field holds exactly this value it shows the AI-filled state: an ai.border edge, a faint ai.wash tint and a sparkle mark that describes the field as Filled by AI. Once the person changes it, the field looks normal again and a Revert to suggestion button puts the value back through onChange (no button on a disabled or read-only field). An invalid field keeps its invalid border. |
| `className` | `string` |  | Merged with the control's classes. Later Tailwind utilities (the small styling classes this system uses) win. |
| `ref` | `Ref<HTMLTextAreaElement>` |  | Forwarded to the textarea element. |
| `...rest` | `Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'aria-invalid'>` |  | Every native textarea prop except aria-invalid, spread onto the element. aria-invalid is removed from the type instead of being quietly overridden at runtime. invalid is the only source of both the attribute and the border, so letting a caller set one directly would let what people see and what screen readers hear drift apart. |

## Types and helpers

Exported beside the component, from the same file. Import a type with `import type { ... }`.

```ts
export const textareaVariants = cva( …
```

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Default

```tsx
<label className="flex flex-col gap-1 text-sm w-full max-w-xs">
  Field notes
  <Textarea placeholder="What did you observe on site?" />
</label>
```

### Rows

```tsx
<label className="flex flex-col gap-1 text-sm w-full max-w-xs">
  Short (2 rows)
  <Textarea rows={2} placeholder="One-line summary, wraps if needed" />
</label>
<label className="flex flex-col gap-1 text-sm w-full max-w-xs">
  Tall (8 rows)
  <Textarea rows={8} placeholder="Full incident report" />
</label>
```

### States

```tsx
<label className="flex flex-col gap-1 text-sm w-full max-w-xs">
  Invalid
  <Textarea invalid defaultValue="Site coordinates unclear" />
</label>
<label className="flex flex-col gap-1 text-sm w-full max-w-xs">
  Disabled
  <Textarea disabled defaultValue="Locked until review closes" />
</label>
{/* read-only is a different state from disabled and looks different — the text stays
    selectable and the control stays in the tab order, so `read-only:text-[...]` dims the
    text without the disabled fill. It was styled but never demonstrated. */}
<label className="flex flex-col gap-1 text-sm w-full max-w-xs">
  Read-only
  <Textarea readOnly defaultValue="Submitted 14:02, no further edits" />
</label>
```

### Filled by AI, with a revert

```tsx
const AI_NOTES = 'Ships with two midcaps and a sling. Ask for the 1.2 J spring if you play indoors.'

<div className="flex flex-col gap-2 w-full max-w-sm">
  <label htmlFor="ai-notes" className="text-sm">Order notes</label>
  <AiLabel explanation="Drafted from the replica's listing. Check the details before you send it." />
  <Textarea id="ai-notes" aiValue={AI_NOTES} defaultValue={AI_NOTES} />
</div>
```

### With a counter

```tsx
function CounterExample() {
  const max = 140
  const [value, setValue] = useState('')
  return (
    <label className="flex flex-col gap-1 text-sm w-full max-w-xs">
      Field day summary
      <Textarea
        value={value}
        onChange={e => setValue(e.target.value)}
        maxLength={max}
        aria-describedby="textarea-docs-counter"
      />
      <span id="textarea-docs-counter" className="text-xs text-[var(--color-text-secondary)]">
        {value.length} / {max}
      </span>
    </label>
  )
}

<CounterExample />
```

## Keyboard

| Keys | Result |
|---|---|
| `Tab` | Moves focus to it. |
| `Enter` | Starts a new line. It doesn't submit the form. |

## Do

- Size rows to the answer you expect.
- Leave vertical resize on. Taking it away doesn't help anyone.
- Show a character counter as text the field points to with aria-describedby, not as a colour change.

## Don't

- Don't allow horizontal resize. It breaks the layout around it.
- Don't bevel it. The cut would land exactly where the resize grip is, and clip-path (the CSS, or Cascading Style Sheets, property that cuts the corner) would take the focus ring with it. Input's page states the general rule.
- Don't reach for inputVariants here. The shared heights are wrong for a box with several lines, and the small duplication is on purpose.
- Don't trap Enter to submit unless there's another way to add a line.

## Anatomy

- **Textarea**: Four rows, never shorter than 88px (pixels), vertical resize only.
- **Border**: The same three states as Input.
- **Focus ring**: The outline that shows keyboard focus. It sits on the control itself.
