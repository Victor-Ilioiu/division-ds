# IconButton

> A square button with one icon. It uses exactly the same variants as Button (same source code, so the two can't drift apart). It requires a label, because an icon on its own tells a screen reader nothing.

- **Best for:** An action shown as a single icon, with a label that names the action.
- **Not for:** An action with a visible word (use Button), or a status (use Badge).
- Atom. Source: `src/components/atoms/icon-button/IconButton.tsx`
- Rendered docs page: `/components/icon-button`

## Import

```tsx
import { IconButton } from 'src/components/atoms/icon-button/IconButton'
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` |  | Required. It becomes aria-label. It's required in the types, so an icon button with no name won't compile. |
| `variant` | `'primary' \| 'secondary' \| 'danger' \| 'ghost'` | `'primary'` | Which fill/border treatment to use. These are Button’s variants minus link, since an icon has no text to underline. |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | 32 / 40 / 48px (pixels), all above the 24px minimum target size, the smallest area people can reliably click or tap. Button’s xs isn't offered: 32px is the smallest this control goes. |
| `count` | `number` |  | A number in a corner badge, like items in a cart or unread notifications. It's added to the accessible name, the name screen readers announce (‘Notifications, 3 unread’). It shows as 99+ past 99 and is hidden at 0 unless showZero is set. |
| `countLabel` | `(count: number) => string` | `String` | Formats the spoken part of the name that comes after the label and a comma: count => `${count} unread`. It always gets the real number, never 99+. |
| `showZero` | `boolean` | `false` | Shows the badge when the count is 0. |
| `asChild` | `boolean` | `false` | Renders the child element with the button's classes. Use it for links that look like icon buttons. Combining it with disabled is a type error, so the code won't compile, instead of quietly doing nothing. A link can't really be disabled, so the prop is removed from the types rather than ignored when the page runs. |
| `fullWidth` | `—` |  | Left out on purpose. An icon button is always square, and stretching it would break that. |
| `wrapperClassName` | `string` |  | Classes for the focus wrapper, not the button. |
| `className` | `string` |  | Merged with the component's classes. When Tailwind utility classes clash, the later one wins. |
| `ref` | `Ref<HTMLButtonElement>` |  | Passed through to the button element. |
| `...rest` | `Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' \| 'children'>` |  | Every native button prop except aria-label. aria-label is removed from the types rather than quietly overwritten when the page runs. label is the only source of the accessible name, and an aria-label in rest would beat it. children is its own declared prop above, not part of rest. |

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Variants

```tsx
<IconButton label="Dismiss" variant="primary"><X aria-hidden="true" /></IconButton>
<IconButton label="Save" variant="secondary"><Settings aria-hidden="true" /></IconButton>
<IconButton label="Delete" variant="danger"><Trash2 aria-hidden="true" /></IconButton>
<IconButton label="Search" variant="ghost"><Search aria-hidden="true" /></IconButton>
```

### Sizes

```tsx
<IconButton label="Dismiss" size="sm"><X aria-hidden="true" /></IconButton>
<IconButton label="Dismiss" size="md"><X aria-hidden="true" /></IconButton>
<IconButton label="Dismiss" size="lg"><X aria-hidden="true" /></IconButton>
```

### In context

```tsx
<div className="flex items-center justify-between w-full max-w-sm">
  <p className="font-display text-sm font-semibold uppercase tracking-wide">
    Field kit checklist
  </p>
  <IconButton label="Dismiss panel" variant="ghost" size="sm">
    <X aria-hidden="true" />
  </IconButton>
</div>
```

### With a count

```tsx
<div className="flex flex-wrap items-center gap-6">
  <IconButton label="Cart" variant="secondary" count={3} countLabel={n => `${n} replicas`}>
    <ShoppingCart aria-hidden="true" />
  </IconButton>
  <IconButton label="Notifications" variant="ghost" count={128} countLabel={n => `${n} unread`}>
    <Bell aria-hidden="true" />
  </IconButton>
  <IconButton label="Notifications" variant="primary" count={7} countLabel={n => `${n} unread`}>
    <Bell aria-hidden="true" />
  </IconButton>
  <IconButton label="Cart" variant="secondary" count={0} showZero>
    <ShoppingCart aria-hidden="true" />
  </IconButton>
</div>
```

### Disabled

```tsx
<IconButton label="Next step" disabled>
  <ChevronRight aria-hidden="true" />
</IconButton>
```

## Keyboard

| Keys | Result |
|---|---|
| `Tab` | Moves focus to the button. The ring appears on the wrapper. |
| `Enter` | Activates it. |
| `Space` | Activates it. |

## Do

- Make the label describe the action, not the icon: ‘Dismiss alert’, not ‘X’.
- Mark the icon aria-hidden so it's never announced twice.
- Pair it with a Tooltip when the icon's meaning isn't obvious.
- Stick to one icon. Two icons in a square is a dropdown, not a button.
- Give a count a countLabel that says what's being counted, so the name reads ‘Notifications, 3 unread’ and not just a number.

## Don't

- Don't ship an icon button that only regular users understand.
- Don't go smaller than sm. 32px is already close to the 24px floor.
- Don't use danger for a dismiss. Dismissing can be undone.
- Don't put the count in the label yourself. Pass count, so the badge and the name always match.
- Don't use a count for a status (online, error). A count is a number. A status is a Badge with a word.
- Don't try to disable a link (asChild). Render the state you want directly instead (a plain span, or a real disabled icon button) rather than fighting the type error.

## Anatomy

- **Focus wrapper**: A span that isn't clipped, carrying .bevel-focus-wrap. It draws the focus ring (the outline that shows which control the keyboard is on) on :has(:focus-visible), so a mouse click doesn't show it, plus the reticle brackets (corner marks like a targeting sight) that close in on hover. It's always there and never optional.
- **Square button**: Its width is pinned to the height token, and the padding is removed.
- **Icon**: Always aria-hidden, an ARIA attribute (Accessible Rich Internet Applications, the labels that tell screen readers what things are) that hides it from screen readers. The label gives the button its name.
- **aria-label**: Comes from the required label prop, with the count added when there is one.
- **Count badge**: Optional. It sits on the unclipped wrapper at the top-right corner, so the bevel (the cut corners) can't slice it. Square, mono, accent.signal.fill with its ink, and ringed in the page colour so it stays visible on a primary button. It's aria-hidden because the name already says the number. Past 99 it reads 99+.
