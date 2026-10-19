# Button

> The main control for taking an action. It comes in five variants (one of them a button that looks like a text link) and four sizes, with optional icons on either side of the label. It also draws its own focus ring, the outline that shows which control the keyboard is on. The component places that ring for you, because the bevel (the cut corners) would clip one placed anywhere else.

- **Best for:** An action on this page, like submit, save or open a dialog.
- **Not for:** Going somewhere (use Link, or Button asChild around an anchor), or an action with no visible word (use IconButton).
- Atom. Source: `src/components/atoms/button/Button.tsx`
- Rendered docs page: `/components/button`

## Import

```tsx
import { Button, buttonVariants } from 'src/components/atoms/button/Button'
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `variant` | `'primary' \| 'secondary' \| 'danger' \| 'ghost' \| 'link'` | `'primary'` | Which fill/border treatment to use. link looks like a Link (signal text, underline, no fill, no bevel, no fixed height) but it's still a button. Use it for an action inside a sentence, not for going to another page. |
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg'` | `'md'` | 24 / 32 / 40 / 48px (pixels). xs is exactly the 24px minimum target, the smallest area people can reliably click or tap. It isn't a token step (there is no xs control-height token) and it's meant for dense toolbars and table rows. Size has no effect on the link variant, which takes the size of the text around it. |
| `fullWidth` | `boolean` | `false` | Stretches the wrapper as well as the button. |
| `loading` | `boolean` | `false` | Sets aria-busy and aria-disabled, blocks the click and the form submit, and shows the spinner. The button stays focusable. |
| `loadingLabel` | `string` | `'Working'` | Text that's hidden on screen but read aloud while loading. |
| `iconStart` | `ReactNode` |  | An icon before the label, rendered aria-hidden and sized to the button. The spinner replaces it while loading. It isn't available with asChild: put the icon inside the child element instead. |
| `iconEnd` | `ReactNode` |  | An icon after the label, rendered aria-hidden. It stays while loading. Not available with asChild. |
| `asChild` | `boolean` | `false` | Renders the child element with the button's classes. Use it for links that look like buttons. Combining it with disabled, loading or loadingLabel is a type error, so the code won't compile, instead of quietly doing nothing. A link can't really be disabled or made busy, so those props are removed from the types rather than ignored when the page runs. |
| `wrapperClassName` | `string` |  | Classes for the focus wrapper, not the button. |
| `className` | `string` |  | Merged with the component's classes. When Tailwind utility classes clash, the later one wins. |
| `ref` | `Ref<HTMLButtonElement>` |  | Passed through to the button element. |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | A Button never submits a form by accident. Ask for submit on the one that should. |
| `...rest` | `Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-busy' \| 'children'>` |  | Every native button prop except aria-busy. aria-busy is removed from the types rather than quietly overwritten when the page runs. loading is the only thing that sets it, and a loading button saying aria-busy="false" would be a spinning, aria-disabled control telling assistive tech (screen readers and other tools people with disabilities use) that it's idle. children is its own declared prop above, not part of rest. |

## Types and helpers

Exported beside the component, from the same file. Import a type with `import type { ... }`.

```ts
export const buttonVariants = cva( …
```

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Variants

```tsx
<Button variant="primary">Dispatch team</Button>
<Button variant="secondary">Save draft</Button>
<Button variant="danger">Abort</Button>
<Button variant="ghost">Cancel</Button>
```

### Sizes

```tsx
<Button size="xs">Dispatch team</Button>
<Button size="sm">Dispatch team</Button>
<Button size="md">Dispatch team</Button>
<Button size="lg">Dispatch team</Button>
```

### States

```tsx
<Button>Dispatch team</Button>
<Button loading loadingLabel="Dispatching">
  Dispatch team
</Button>
<Button disabled>Dispatch team</Button>
```

### With icons

```tsx
<Button iconStart={<Plus />}>Add to loadout</Button>
<Button variant="secondary" iconEnd={<ArrowRight />}>
  Continue
</Button>
<Button variant="ghost" size="sm" iconStart={<Download />}>
  Export
</Button>
<Button loading loadingLabel="Adding" iconStart={<Plus />}>
  Add to loadout
</Button>
```

### Link variant

```tsx
<p className="text-sm text-[var(--color-text-secondary)] max-w-md">
  No replicas match these filters.{' '}
  <Button variant="link">
    Reset filters
  </Button>{' '}
  to see the full catalogue.
</p>
```

### Full width

```tsx
<div className="w-80">
  <Button fullWidth>Dispatch team</Button>
</div>
```

### As a link

```tsx
<Button asChild>
  <a href="/kits">Browse kits</a>
</Button>
```

### Focus ring is never clipped

```tsx
<div className="flex flex-col gap-4">
  <p className="text-sm text-[var(--color-text-secondary)] max-w-md">
    Press Tab to focus the button below, in either theme. The focus ring (the outline
    that shows which element the keyboard is on) draws a clean rectangle around the whole
    bevelled shape. You'll never see it cut off, because the component draws it on the
    outer wrapper, which isn't clipped, and not on the bevelled button itself.
  </p>
  <Button variant="primary">Dispatch team</Button>
</div>
```

## Keyboard

| Keys | Result |
|---|---|
| `Tab` | Moves focus to the button. The ring appears on the wrapper. |
| `Enter` | Activates it. While loading it does nothing, and the caller's onClick doesn't run. |
| `Space` | Activates it. While loading it does nothing, and the caller's onClick doesn't run. |

## Do

- One primary button per view. The signal colour only means something if it's rare.
- Use asChild for a link that should look like a button, so it stays a real link.
- Say what the button does: ‘Dispatch team’, not ‘Submit’.
- Use loading instead of disabling the button and swapping the label yourself.
- Use loading on a submit button. It keeps focus while the form works, so a keyboard user is never thrown back to the top of the page.
- Pass icons through iconStart and iconEnd, not as children. That way they stay hidden from assistive tech and get sized with the button.
- Use the link variant for an action that sits in running text or next to a heading (‘Reset filters’). Use Link for anything that goes somewhere.

## Don't

- Don't add bevel-* or an outline class yourself. You'll clip the ring off.
- Don't use danger for anything that can be undone.
- Don't put a ghost button next to a secondary one. People can't tell which matters more any more.
- Don't disable a button without saying somewhere why it's disabled.
- Don't use the link variant to go to another page. A control that goes somewhere is a Link, or a Button with asChild around an anchor.
- Don't make an icon-only button by passing iconStart with no label. That's IconButton, which requires a name.
- Don't use xs for a page's main actions. It's the minimum target size, for dense rows only.
- Don't try to disable a link (asChild) or give it a loading state. Render the state you want directly instead (a plain span, or a real disabled button) rather than fighting the type error.

## Common mistakes

Wrong:

```tsx
<div>
  <Button variant="secondary">Cancel</Button>
  <Button>Save</Button>
</div>
```

Right:

```tsx
<div className="flex flex-wrap gap-3">
  <Button variant="secondary">Cancel</Button>
  <Button>Save</Button>
</div>
```

Buttons render inline-flex, and JSX (the HTML-like syntax React components are written in) drops the whitespace between them, so buttons placed side by side touch. The parent sets the gap. npm run check:button-spacing fails if there isn't one.

Wrong:

```tsx
<Button disabled={saving}>Save</Button>
```

Right:

```tsx
<Button loading={saving}>Save</Button>
```

A busy button stays focusable and tells people it's busy through loading. Native disabled is for an action that isn't available, and it takes the button out of the tab order, so the Tab key skips it.

## Anatomy

- **Focus wrapper**: A span that isn't clipped, carrying .bevel-focus-wrap. It draws the ring on :has(:focus-visible), so a mouse click doesn't show it, plus the reticle brackets (corner marks like a targeting sight) that close in on hover. It's always there and never optional.
- **Button**: The clipped, bevelled control. It never carries its own outline.
- **Spinner**: Decoration only, shown while loading. The hidden label is what screen readers announce.
- **Label**: Oxanium semibold, uppercase: the display type role. The link variant switches to the body role, in the signal text colour, underlined.
- **Icons**: Optional, before and after the label. Each sits in an aria-hidden slot sized to the button (14px at xs and sm, 16px at md, 20px at lg). aria-hidden is an ARIA attribute (Accessible Rich Internet Applications, the labels that tell screen readers what things are) that hides the icon from screen readers. While loading, the spinner takes the leading slot.
