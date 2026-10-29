# FormField

> The label, help text and error text for one form control. They're connected so a screen reader reads all three, in that order, when the control gets focus. The atoms (the smallest components) never label themselves. This is where it happens.

- **Best for:** The label, help and error for an Input, Textarea, Select, MultiSelect or QuantityStepper.
- **Not for:** Search or RatingInput, which name themselves. Switch, Checkbox and Radio take an id and a label with htmlFor instead.
- **Also on this page:** `ErrorSummary`
- Molecule. Source: `src/components/molecules/form-field/FormField.tsx`
- Rendered docs page: `/components/form-field`

## Import

```tsx
import { FormField } from 'src/components/molecules/form-field/FormField'
import { ErrorSummary } from 'src/components/molecules/form-field/ErrorSummary'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` |  | The field label. Required. |
| `help` | `string` |  | Instruction text, read out before any error. |
| `error` | `string` |  | Sets invalid on the control and adds the error line. |
| `required` | `boolean` | `false` | Adds the asterisk (hidden from screen readers) and the built-in required attribute on the control. That attribute is what assistive technology actually announces. |
| `children` | `ReactElement` |  | Exactly one control: Input, Textarea, Select or QuantityStepper. A label set on a Select or QuantityStepper child is replaced by the FormField label. An id you give the control is kept (point an ErrorSummary entry at it); without one, FormField makes one up. |
| `className` | `string` |  | Extra CSS classes, merged with the outer element's own. When two Tailwind classes clash, the later one wins. |
| `ref` | `Ref<HTMLDivElement>` |  | Passed through to the outer element. |
| `errors (ErrorSummary)` | `{ fieldId: string; message: string }[]` |  | What stopped the form from submitting, in the order of the fields. Each entry links to its field and moves focus there. An empty list shows nothing. |
| `title (ErrorSummary)` | `string` | `'There is a problem'` | The heading. It's what a screen reader reads first when the form moves focus to the summary. |
| `headingLevel (ErrorSummary)` | `2 \| 3 \| 4` | `2` | The heading level, so the summary fits the outline of headings on its page. |
| `className (ErrorSummary)` | `string` |  | Extra CSS classes, merged with the outer element's own. When two Tailwind classes clash, the later one wins. |
| `ref (ErrorSummary)` | `Ref<HTMLDivElement>` |  | The summary itself. A form moves focus to it after a submit that failed. |

## Types and helpers

Exported beside the component, from the same file. Import a type with `import type { ... }`.

```ts
export type FormError = {
  /** The id of the control to focus, the one its FormField labels. */
  fieldId: string
  message: string
}
```

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Label only

```tsx
<div className="max-w-xs w-full">
  <FormField label="Callsign">
    <Input placeholder="Anvil" />
  </FormField>
</div>
```

### With help

```tsx
<div className="max-w-xs w-full">
  <FormField label="Callsign" help="Four to eight letters.">
    <Input placeholder="Anvil" />
  </FormField>
</div>
```

### Required, with an error

```tsx
function RequiredWithErrorExample() {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string>()

  const validate = (next: string) => {
    if (next.length === 0) return 'Callsign is required.'
    if (next.length < 4) return 'Use four to eight letters.'
    return undefined
  }

  return (
    // Field errors sit on a form's own opaque surface.base, as every form in this system does.
    // Contrast: "accent.hostile.text on surface.base".
    <div className="max-w-xs p-4 bg-[var(--color-surface-base)]">
      <FormField label="Callsign" help="Four to eight letters." error={error} required>
        <Input
          value={value}
          onChange={event => {
            const next = event.target.value
            setValue(next)
            if (!error) return
            if (validate(next) === undefined) setError(undefined)
            else if (error === 'Callsign is required.' && next.length > 0) setError(undefined)
          }}
          onBlur={() => setError(validate(value))}
        />
      </FormField>
    </div>
  )
}

<RequiredWithErrorExample />
```

### Wrapping a Textarea

```tsx
<div className="max-w-sm w-full">
  <FormField label="Dispatch notes" help="Visible to the whole depot.">
    <Textarea placeholder="Depot code, and anything the next shift needs to know." />
  </FormField>
</div>
```

### A form with an error summary

```tsx
const RESERVE_COUNTRIES = [
  { value: 'ro', label: 'Romania' },
  { value: 'ie', label: 'Ireland' },
  { value: 'de', label: 'Germany' },
]

function ReserveExample() {
  const [country, setCountry] = useState('')
  const [magazines, setMagazines] = useState(0)
  const [errors, setErrors] = useState<FormError[]>([])
  const [attempt, setAttempt] = useState(0)
  const summary = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (attempt > 0) summary.current?.focus()
  }, [attempt])

  const countryError = errors.find(current => current.fieldId === 'reserve-country')?.message
  const magazinesError = errors.find(current => current.fieldId === 'reserve-magazines')?.message

  return (
    <form
      noValidate
      onSubmit={event => {
        event.preventDefault()
        const next: FormError[] = []
        if (!country) next.push({ fieldId: 'reserve-country', message: 'Choose a country.' })
        if (magazines < 4) next.push({ fieldId: 'reserve-magazines', message: 'Order at least 4 spare magazines.' })
        setErrors(next)
        if (next.length > 0) setAttempt(value => value + 1)
      }}
      className="flex flex-col gap-4 w-full max-w-sm p-5 bg-[var(--color-surface-base)]"
    >
      <ErrorSummary ref={summary} errors={errors} headingLevel={4} />
      <FormField label="Country" required error={countryError}>
        <Select
          id="reserve-country"
          label="Country"
          options={RESERVE_COUNTRIES}
          value={country}
          onValueChange={value => {
            setCountry(value)
            if (value) setErrors(current => current.filter(item => item.fieldId !== 'reserve-country'))
          }}
        />
      </FormField>
      <FormField label="Spare magazines" help="Four per replica." error={magazinesError}>
        <QuantityStepper
          id="reserve-magazines"
          label="Spare magazines"
          max={40}
          value={magazines}
          onValueChange={value => {
            setMagazines(value)
            if (value >= 4) setErrors(current => current.filter(item => item.fieldId !== 'reserve-magazines'))
          }}
        />
      </FormField>
      <Button type="submit">Reserve</Button>
    </form>
  )
}

<ReserveExample />
```

## Keyboard

| Keys | Result |
|---|---|
| `Tab` | Moves to the control. FormField adds no keyboard stops of its own. |

## Do

- Pass an id to the control when something else has to point at it (an ErrorSummary entry, a link). FormField keeps an id you give it and only makes one up when you don't.
- Keep help text to the one thing people get wrong.
- Write the error as what to do next: 'Use four to eight letters', not 'Invalid'.
- Check the value when someone leaves the field (on blur) or submits, not on every keystroke.
- Wrap a Select or a QuantityStepper: FormField hands it the id, the description, the invalid state and its own label.

## Don't

- Don't wrap Search or RatingInput. Each is named by its own label and takes no help or error text.
- Don't hide the help text when an error appears. That's when people need the instruction most.
- Don't use placeholder text as the label. It disappears the moment someone types.
- Don't show a field error on a raised panel. Field errors sit on surface.base.

## Anatomy

- **Label**: A real label element that points at the control's id. Monospaced, 11px (pixels), uppercase.
- **Required mark**: A signal-orange asterisk that screen readers skip (aria-hidden). Assistive technology, such as screen readers, announces the built-in HTML required attribute instead.
- **Control**: The single child, copied with id, aria-describedby, invalid and required added. aria-describedby is an ARIA (Accessible Rich Internet Applications) attribute that links the control to its help and error text.
- **Help**: Optional. Read out first.
- **Error**: Optional. Read out after the help, with an icon so the error isn't shown by colour alone. It isn't a live region, so it isn't announced the moment it appears.
