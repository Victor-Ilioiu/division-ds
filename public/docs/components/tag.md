# Tag

> A removable chip for filters and selections. Its dismiss button is named after the thing it removes, so a row of them doesn't sound like six identical 'Remove' buttons to a screen reader.

- **Best for:** A removable chip, such as an active filter or a selected value.
- **Not for:** A status. Use Badge.
- Atom. Source: `src/components/atoms/tag/Tag.tsx`
- Rendered docs page: `/components/tag`

## Import

```tsx
import { Tag } from 'src/components/atoms/tag/Tag'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `string` |  | The tag text. Required. |
| `onDismiss` | `() => void` |  | Adds the dismiss button. It runs once the tag has faded out, not on the click. Remove the tag from your list here, and the tags after it slide into its place (M7, a motion token). With reduced motion turned on, it runs at once. |
| `dismissLabel` | `(text: string) => string` | `t => `Remove ${t}`` | Replaces the built dismiss name, for example with another verb or another language. |
| `className` | `string` |  | Merged with the component's classes. Later Tailwind utilities (the small styling classes this system uses) win. |
| `ref` | `Ref<HTMLSpanElement>` |  | Forwarded to the span element. |
| `...rest` | `Omit<HTMLAttributes<HTMLSpanElement>, 'children'>` |  | Every native span attribute except children, spread onto the root span. |

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Static tags

```tsx
<Tag>Holo sight</Tag>
<Tag>Spare magazine</Tag>
<Tag>Speed loader</Tag>
```

### Removable

```tsx
const FIELD_KIT = ['Holo sight', 'Spare magazine', 'Speed loader', 'Field goggles']

function RemovableExample() {
  const [tags, setTags] = useState(FIELD_KIT)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {tags.length === 0 ? (
          <span className="text-sm text-[var(--color-text-secondary)]">No filters applied.</span>
        ) : (
          tags.map(tag => (
            <Tag key={tag} onDismiss={() => setTags(current => current.filter(t => t !== tag))}>
              {tag}
            </Tag>
          ))
        )}
      </div>
      {/* The Button atom, not a bare <button>: a hand-rolled one here had no system focus ring
          at all, only the UA default. `ghost` is the existing variant for a text-weight action. */}
      <Button variant="ghost" size="sm" wrapperClassName="self-start" onClick={() => setTags(FIELD_KIT)}>
        Reset
      </Button>
    </div>
  )
}

<RemovableExample />
```

### Long text

```tsx
<Tag onDismiss={() => {}}>Stick battery 11.1 V, 1300 mAh, lithium polymer</Tag>
```

## Keyboard

| Keys | Result |
|---|---|
| `Tab` | Moves focus to the dismiss button, if there is one. The chip itself can't take focus. |
| `Enter` | Dismisses the tag. |
| `Space` | Dismisses the tag. |

## Do

- Keep the text short enough to read as a chip.
- Move focus somewhere sensible after a dismissal: to the next tag, or to the container if the row is now empty.
- Override dismissLabel when 'Remove' is the wrong verb, for example 'Clear filter'.

## Don't

- Don't make the whole chip clickable as well as its dismiss button. Two targets in one chip leaves people guessing.
- Don't shrink the dismiss button below 24×24.
- Don't use a Tag for status. That's a Badge.
- Don't move the bevel from the backing layer onto the chip. A Tag can hold a dismiss button that takes focus, and clip-path (the CSS, or Cascading Style Sheets, property that cuts the corner) on the chip would clip that button's focus ring, the outline that shows keyboard focus, off the corner it sits in.

## Anatomy

- **Chip**: 28px (pixels) tall. The cut corner, the border.hairline-strong edge and the sunken fill sit on a backing layer, not on the chip itself. That layer is aria-hidden, a setting that hides it from screen readers.
- **Text**: Required, and a plain string, because the dismiss name is built from it.
- **Dismiss button**: A ghost IconButton at 24×24. That's the minimum target size in WCAG 2.2 (the Web Content Accessibility Guidelines, the public rulebook for making websites usable by people with disabilities). It only appears when onDismiss is given.
