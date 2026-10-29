# Search

> A search field inside a search landmark (a region of the page that screen readers can jump straight to). Enter submits, Escape clears, and a one-key shortcut can move focus to it from anywhere on the page.

- **Best for:** Searching the content of the page that shows the results, inside a search landmark.
- **Not for:** Suggestions that appear as you type, or jumping to an action: use CommandPalette.
- Molecule. Source: `src/components/molecules/search/Search.tsx`
- Rendered docs page: `/components/search`

## Import

```tsx
import { Search } from 'src/components/molecules/search/Search'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` |  | Required. The name screen readers use for the field, and for the search landmark. |
| `value` | `string` |  | The value, when your page holds it (controlled). |
| `defaultValue` | `string` | `''` | Starting value when the component holds it itself (uncontrolled). |
| `onValueChange` | `(value: string) => void` |  | Called whenever the value changes, clearing included. |
| `onSearch` | `(query: string) => void` |  | Called on Enter with the value, spaces trimmed from both ends. It isn't called for an empty query. |
| `placeholder` | `string` | `'Search'` |  |
| `shortcut` | `string` |  | One printable key, for example "/". It moves focus to the field from anywhere on the page, except while someone is typing in another text field. While the field is empty, it shows as a Kbd hint. |
| `inputSize` | `'sm' \| 'md' \| 'lg'` | `'md'` |  |
| `className` | `string` |  | Combined with the root classes. Where Tailwind utility classes clash, the later one wins. |
| `ref` | `Ref<HTMLInputElement>` |  | Passed through to the input element. |

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Default

```tsx
<div className="max-w-xs w-full">
  <Search label="Search the catalogue" />
</div>
```

### With a shortcut

```tsx
<div className="max-w-xs w-full">
  <Search label="Search the manifest" shortcut="/" />
  <p className="font-body text-xs text-[var(--color-text-secondary)] mt-3">
    Press / anywhere on this page to focus it.
  </p>
</div>
```

### Submitting

```tsx
function SubmittingExample() {
  const [result, setResult] = useState<string | null>(null)

  return (
    <div className="max-w-xs w-full">
      <Search label="Search the depot list" onSearch={query => setResult(query)} />
      <p className="font-body text-xs text-[var(--color-text-secondary)] mt-3">
        {result ? `Searched for: ${result}` : 'Press Enter to search.'}
      </p>
    </div>
  )
}

<SubmittingExample />
```

### Sizes

```tsx
<div className="max-w-xs w-full">
  <Search label="Search, small" placeholder="Small" inputSize="sm" />
</div>
<div className="max-w-xs w-full">
  <Search label="Search, medium" placeholder="Medium" inputSize="md" />
</div>
<div className="max-w-xs w-full">
  <Search label="Search, large" placeholder="Large" inputSize="lg" />
</div>
```

## Keyboard

| Keys | Result |
|---|---|
| `Enter` | Submits the query, spaces trimmed. |
| `Escape` | Clears the field. |
| `/` | Moves focus to the field, unless another text field has focus. It works for whichever key the shortcut prop names. |
| `Tab` | Moves between the field and the clear button. |

## Do

- Name what's being searched: 'Search the catalogue', not 'Search'.
- Pick a shortcut that isn't a letter people type in forms; '/' is the usual one.
- Keep results on the page that owns the search, not in a popup under the field.

## Don't

- Don't add suggestions that appear as you type. That's the command palette's job, and it has a listbox built for it.
- Don't search on every keystroke without saying so. Results that shift while someone types are hard to follow with a screen reader.
- Don't put two search landmarks on one page without giving them different labels.

## Anatomy

- **Landmark**: A form with role=search, named by label, so people using a screen reader can jump to it.
- **Icon**: Decoration only. It's aria-hidden, so screen readers skip it.
- **Field**: An Input of type search. The browser's own clear button is hidden, because you can't reach it with the keyboard.
- **Clear button**: Only shows while there's text. It puts focus back in the field.
- **Shortcut hint**: A Kbd (the keyboard-key badge), aria-hidden, and only shown while the field is empty. Screen readers get the shortcut from aria-keyshortcuts on the field instead.
