# Link

> A link inside text. It's underlined, because in a paragraph colour alone isn't enough to show that something is a link.

- **Best for:** Text that takes you somewhere: another page, a section or another site.
- **Not for:** Something that does an action. Use Button for that (its link variant if it's inside running text).
- Atom. Source: `src/components/atoms/link/Link.tsx`
- Rendered docs page: `/components/link`

## Import

```tsx
import { Link, linkVariants } from 'src/components/atoms/link/Link'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file. An install has no index barrels: import each component from its own file, never from `components/molecules`.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `tone` | `'signal' \| 'quiet'` | `'signal'` | Which colour treatment to use. |
| `external` | `boolean` | `false` | Opens the link in a new tab. It adds target="_blank", the rel hardening (attributes that stop the new page reaching back into yours), a trailing icon and the hidden "(opens in a new tab)" warning. Using it together with target or rel is a type error, so it can't fail silently. external already sets those values, so those props are removed from the type instead of being quietly overwritten while the page runs. |
| `href` | `string` |  | Where the link goes. |
| `className` | `string` |  | Merged with the component classes. If two clash, the later Tailwind utility wins (Tailwind is the CSS framework this system styles with). |
| `ref` | `Ref<HTMLAnchorElement>` |  | Passed through to the anchor element. |
| `...rest` | `AnchorHTMLAttributes<HTMLAnchorElement>` |  | Every native anchor prop. |

## Types and helpers

Exported beside the component, from the same file. Import a type with `import type { ... }`.

```ts
export const linkVariants = cva( …
```

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### In running text

```tsx
<p className="text-sm text-[var(--color-text-secondary)] max-w-md">
  Check the <Link href="/kits">field kit index</Link> before you head out, and read the{' '}
  <Link href="https://example.com" external tone="quiet">
    supplier notes
  </Link>{' '}
  if the hop-up looks off.
</p>
```

### Tones

```tsx
<Link href="/kits" tone="signal">
  Field kits
</Link>
<Link href="/kits" tone="quiet">
  Field kits
</Link>
```

### External

```tsx
<Link href="https://example.com" external>
  Supplier
</Link>
```

## Keyboard

| Keys | Result |
|---|---|
| `Tab` | Moves focus to it. The focus ring (the outline that shows which element the keyboard is on) is drawn on the link itself, and nothing clips it here. |
| `Enter` | Follows the link. |

## Do

- Keep the underline on links inside running text.
- Put the destination in the link text: 'the field kit index', not 'click here'.
- Set external on anything that leaves the app, so screen readers announce the new tab.
- Use quiet in dense lists where every row is a link anyway.

## Don't

- Don't use a link for something that does an action. That's a Button.
- Don't open a new tab without external. The rel hardening and the warning both come with it.
- Don't remove the underline to make a paragraph look tidier.
- Don't pass target or rel together with external. Those props are removed from the type, so you can't override them. If you need different values, render a plain anchor yourself.

## Anatomy

- **Anchor**: The browser's own <a> element. You can focus it and use it from the keyboard without any extra work.
- **Underline**: 1px (pixel) thick, sitting 2px below the text. It gets thicker on hover in the signal tone.
- **External icon**: Hidden from screen readers with aria-hidden (an ARIA attribute, from Accessible Rich Internet Applications). It only shows when external is set.
- **Hidden warning**: ‘(opens in a new tab)’, added to the accessible name, which is what screen readers announce for the link.
