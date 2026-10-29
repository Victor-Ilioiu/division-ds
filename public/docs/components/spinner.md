# Spinner

> A busy indicator for an indeterminate wait, meaning one with no known end or percentage. It comes in two forms. The ring has a lit arc that grows and slides as it turns. The conveyor is a row of shaded blocks, for a wait that sits inside a line of text.

- **Best for:** A short wait with no known end, inside a control or a line of text.
- **Not for:** Progress with a known amount (use Progress), or a wait for a whole page (use Skeleton or LoadingAnimation).
- Atom. Source: `src/components/atoms/spinner/Spinner.tsx`
- Rendered docs page: `/components/spinner`

## Import

```tsx
import { Spinner, spinnerVariants } from 'src/components/atoms/spinner/Spinner'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `variant` | `'ring' \| 'conveyor'` | `'ring'` | The rotating ring, or the block conveyor. |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Ring: a 14px, 20px or 24px (pixel) box. Conveyor: 12px, 14px or 16px glyphs. |
| `label` | `string` |  | Status text that's hidden on screen. Passing it makes the spinner a live region, an area whose changes screen readers announce on their own. |
| `className` | `string` |  | Merged with the component's classes. Later Tailwind utilities (the small styling classes this system uses) win. |
| `ref` | `Ref<HTMLSpanElement>` |  | Forwarded to the span element. |
| `...rest` | `Omit<HTMLAttributes<HTMLSpanElement>, 'role'>` |  | Every native span prop except role, spread onto the span. role is removed from the type instead of being quietly overridden at runtime. Here's why: label is the only source of role="status", and a role in rest would silence the live region a caller asked for when they passed label. |

## Types and helpers

Exported beside the component, from the same file. Import a type with `import type { ... }`.

```ts
export const spinnerVariants = cva(
  // The arc takes `currentColor`, so a caller can recolour it with one text utility: Button does
  // exactly that, so the arc matches whatever ink the button label is set in.
  'inline-block shrink-0 text-[var(--color-accent-signal-indicator)]',
  {
    variants: {
      size: { sm: 'w-3.5 h-3.5', md: 'w-5 h-5', lg: 'w-6 h-6' },
    },
    defaultVariants: { size: 'md' },
  }
)
```

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Ring, three sizes

```tsx
<Spinner size="sm" label="Loading field kits" />
<Spinner size="md" label="Loading field kits" />
<Spinner size="lg" label="Loading field kits" />
```

### Conveyor, three sizes

```tsx
<Spinner variant="conveyor" size="sm" label="Syncing manifest" />
<Spinner variant="conveyor" size="md" label="Syncing manifest" />
<Spinner variant="conveyor" size="lg" label="Syncing manifest" />
```

### Decorative, inside a control

```tsx
<span className="inline-flex items-center gap-2 border border-[var(--color-border-hairline-strong)] px-3 py-2">
  <Spinner aria-hidden="true" />
  <span className="text-sm">Dispatching…</span>
</span>
```

## Keyboard

Not focusable. No keyboard behaviour of its own.

## Do

- Pass label whenever the spinner is the only sign that something's happening.
- Leave it decorative inside a control that already announces aria-busy, like Button. aria-busy is an ARIA (Accessible Rich Internet Applications) attribute that tells screen readers a part of the page is still loading.
- Name what's loading, not the fact of loading: ‘Loading field kits’, not ‘Loading’.

## Don't

- Don't use it for progress with a known amount. That's Progress.
- Don't rely on the rotation alone. It stops when someone has turned on reduced motion in their system settings, so the label carries the meaning.
- Don't scale it past lg. A page-level wait needs a skeleton, not a bigger spinner.
- Don't bevel it. It's the one round shape in the system. A cut corner on something that rotates would travel around the edge instead of marking one spot.

## Anatomy

- **span**: The root. It gets role="status" only when it's labelled.
- **Ring (ring)**: An SVG (Scalable Vector Graphics) track at 20% of currentColor, which is the surrounding text colour, plus an arc in currentColor. That's accent.signal.indicator by default.
- **Blocks (conveyor)**: Three block glyphs, from full to half shade, running over a ten-cell track in border.control.
- **sr-only label**: The text a screen reader announces. sr-only means it's hidden on screen but still read aloud. It's only there when label is passed.
