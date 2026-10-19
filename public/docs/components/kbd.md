# Kbd

> A small keycap that shows a key's name. Making shortcuts easy to find was one of the motifs from the G1 mood board (the project's first approval step) worth keeping: if a surface has a shortcut, the surface says so.

- **Best for:** Showing a keyboard shortcut next to the action it triggers, with one Kbd per key.
- **Not for:** Anything that isn't a key, such as a status: use Badge.
- Atom. Source: `src/components/atoms/kbd/Kbd.tsx`
- Rendered docs page: `/components/kbd`

## Import

```tsx
import { Kbd } from 'src/components/atoms/kbd/Kbd'
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `ReactNode` |  | The key's name, for example "Esc" or "⌘". |
| `className` | `string` |  | Merged with the component's classes. When Tailwind utility classes clash, the later one wins. |
| `ref` | `Ref<HTMLElement>` |  | Passed through to the kbd element. |
| `...rest` | `HTMLAttributes<HTMLElement>` |  | Every native attribute, passed onto the kbd element, such as a title, or an aria-label for a symbol key (aria-label is the name screen readers read out). |

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Single keys

```tsx
<Kbd>Esc</Kbd>
<Kbd>Tab</Kbd>
<Kbd>Enter</Kbd>
<Kbd>Space</Kbd>
<Kbd>/</Kbd>
```

### A chord: one cap per key

```tsx
<span className="flex items-center gap-1">
  <Kbd>Ctrl</Kbd>
  <span className="text-[var(--color-text-muted)] text-sm">+</span>
  <Kbd>K</Kbd>
</span>
<span className="text-sm text-[var(--color-text-secondary)]">Open the command palette</span>
```

## Keyboard

Not focusable. No keyboard behaviour of its own.

## Do

- Use one Kbd per physical key, and put them side by side for a chord (keys pressed together).
- Put it next to the action it triggers, in the same row or the same tooltip.
- Write the key name the way the keyboard prints it.

## Don't

- Don’t bevel it. Cut corners are for surfaces and controls, not 24px chrome.
- Don’t put a whole chord inside one Kbd ("Ctrl+K" in a single cap).
- Don’t use it for anything that isn’t a key. It’s not a badge.

## Anatomy

- **kbd element**: The HTML element made for keys. Screen readers announce it as keyboard input.
- **Hairline border**: A one-pixel border in border.hairline-strong, with no bevel (cut corners).
- **Mono legend**: JetBrains Mono, uppercase, 11px (pixels): the tertiary type role.
