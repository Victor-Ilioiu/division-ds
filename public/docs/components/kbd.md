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

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file. An install has no index barrels: import each component from its own file, never from `components/molecules`.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `ReactNode` |  | The key's name, for example "Esc" or "⌘". |
| `size` | `'md' \| 'sm'` | `'md'` | md is 24px tall, for a cap beside text or in a menu row. sm is 20px tall, for a cap inside a 32px control: a small Button or a search field. |
| `cut` | `boolean` | `false` | Cuts the bottom-right corner (5px at sm, 8px at md) so the cap nests in the corner of a bevelled control, its diagonal parallel to the control's. Only for a cap inside such a control. |
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

### Sizes

```tsx
<Kbd>Esc</Kbd>
<Kbd size="sm">Esc</Kbd>
```

### Small and cut, inside a small button

```tsx
<Button variant="secondary" size="sm" iconStart={<Search />} aria-keyshortcuts="Control+K">
  Search
  <Kbd aria-hidden="true" size="sm" cut className="-mr-1.5 ml-2 -translate-y-[var(--cap-shift,0px)]">
    Ctrl K
  </Kbd>
</Button>
```

## Keyboard

Not focusable. No keyboard behaviour of its own.

## Do

- Use one Kbd per physical key, and put them side by side for a chord (keys pressed together).
- Put it next to the action it triggers, in the same row or the same tooltip.
- Write the key name the way the keyboard prints it.
- Inside a 32px control, use size="sm"; inside a bevelled one (a Button), add cut and place the cap at the end, near the cut corner.

## Don't

- Don’t set cut on a cap that stands alone in text or a menu row. The cut answers a bevelled corner around it; without one it reads as a button.
- Don’t put a whole chord inside one Kbd ("Ctrl+K" in a single cap).
- Don’t use it for anything that isn’t a key. It’s not a badge.

## Anatomy

- **kbd element**: The HTML element made for keys. Screen readers announce it as keyboard input.
- **Hairline border**: A one-pixel border in border.hairline-strong. Square corners by default; with cut, the bottom-right corner is cut at 45 degrees and the border follows the diagonal.
- **Mono legend**: JetBrains Mono, uppercase, 11px (pixels): the tertiary type role, at both sizes.
