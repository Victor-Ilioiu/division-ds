# Badge

> A small chip that shows a status. It comes in six tones and two emphases, and it always carries a word. A colour on its own isn't a status anyone can read.

- **Best for:** You need to label a status with a word and a tone, like an order state or a sync result.
- **Not for:** A filter or selection someone can remove. Use Tag for that.
- Atom. Source: `src/components/atoms/badge/Badge.tsx`
- Rendered docs page: `/components/badge`

## Import

```tsx
import { Badge, badgeVariants } from 'src/components/atoms/badge/Badge'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `tone` | `'neutral' \| 'signal' \| 'ok' \| 'warning' \| 'hostile' \| 'info'` | `'neutral'` | The status the badge shows. |
| `emphasis` | `'solid' \| 'subtle'` | `'subtle'` | Solid uses the invariant fill (the same in light and dark themes) with its matching ink. Subtle is the outline badge: a 1px border and text in the tone’s theme-adaptive text token, with no fill. There's no separate outline emphasis, because it would be this same look under a second name. |
| `size` | `'sm' \| 'md'` | `'sm'` | sm (small) is the chip for everyday interface: rows, cards, tables. md (medium) takes the small control height (32px) and the 14px text step. Use it for a badge next to display-size type, like a price. |
| `dot` | `boolean` | `false` | Adds a marker next to the text. |
| `icon` | `ReactNode` |  | An icon before the text, hidden from screen readers with aria-hidden and sized to the badge. It takes the badge’s colour, so the same contrast pair that covers the text covers it too. It adds to the word. It never replaces it. |
| `className` | `string` |  | Merged with the component classes. If two clash, the later Tailwind utility wins (Tailwind is the CSS framework this system styles with). |
| `ref` | `Ref<HTMLSpanElement>` |  | Passed through to the span element. |
| `...rest` | `HTMLAttributes<HTMLSpanElement>` |  | Any other span attribute. For example, aria-hidden on a count that a label next to it already reads out. |

## Types and helpers

Exported beside the component, from the same file. Import a type with `import type { ... }`.

```ts
export const badgeVariants = cva( …
```

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Tones, subtle (the outline badge)

```tsx
const TONES = ['neutral', 'signal', 'ok', 'warning', 'hostile', 'info'] as const

{TONES.map(tone => (
  <Badge key={tone} tone={tone} emphasis="subtle">
    {tone}
  </Badge>
))}
```

### Tones, solid

```tsx
const TONES = ['neutral', 'signal', 'ok', 'warning', 'hostile', 'info'] as const

{TONES.map(tone => (
  <Badge key={tone} tone={tone} emphasis="solid">
    {tone}
  </Badge>
))}
```

### With a dot

```tsx
<Badge tone="ok" dot>
  Nominal
</Badge>
<Badge tone="warning" dot>
  Degraded
</Badge>
<Badge tone="hostile" dot>
  Offline
</Badge>
```

### With an icon

```tsx
<Badge tone="ok" icon={<Check />}>
  In stock
</Badge>
<Badge tone="warning" icon={<Clock />}>
  Backorder
</Badge>
<Badge tone="signal" emphasis="solid" icon={<Zap />}>
  New
</Badge>
<Badge tone="info" size="md" icon={<Truck />}>
  Ships today
</Badge>
```

### Sizes

```tsx
<Badge tone="signal" emphasis="solid">
  Sale
</Badge>
<Badge tone="signal" emphasis="solid" size="md">
  Sale
</Badge>
<Badge tone="ok" dot>
  In stock
</Badge>
<Badge tone="ok" dot size="md">
  In stock
</Badge>
```

### Size md, beside a price

```tsx
<p className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-4xl tabular-nums text-[var(--color-text-primary)]">
  <span>€189.00</span>
  <Badge tone="signal" emphasis="solid" size="md">
    −39%
  </Badge>
</p>
```

### In a row

```tsx
<div className="flex flex-col gap-2 w-full max-w-xs">
  <div className="flex items-center justify-between">
    <span className="text-sm">Depot Relay</span>
    <Badge tone="ok" emphasis="subtle">
      Nominal
    </Badge>
  </div>
  <div className="flex items-center justify-between">
    <span className="text-sm">North Sensor Array</span>
    <Badge tone="warning" emphasis="subtle">
      Degraded
    </Badge>
  </div>
  <div className="flex items-center justify-between">
    <span className="text-sm">Northgate Beacon</span>
    <Badge tone="hostile" emphasis="solid">
      Offline
    </Badge>
  </div>
</div>
```

## Keyboard

Not focusable. No keyboard behaviour of its own.

## Do

- Give every badge a word.
- Go easy on solid. One solid badge in a row reads as the exception. Six read as noise.
- Keep the tone mapping the same across the product. ok is never ‘in progress’ on one screen and ‘done’ on another.
- Use size md when the badge sits next to a headline figure, so the two read as one statement.

## Don't

- Don't build a badge that's colour only, even with a tooltip.
- Don't put a badge inside a button. It muddies what the clickable target is.
- Don't use hostile for something that's only pending.
- Don't bevel it (give it a cut corner). At 22px a badge is chrome, the frame around content, not an object with its own footprint. Kbd follows the same rule for the same reason.
- Don't resize a badge with height or text classes. The two sizes are the prop. A third size is a change to the system.
- Don't use size md in a table row or on a card. It's as tall as a small button, so it starts to look like one.
- Don't give one badge both an icon and a dot. Pick one marker. Two say the same thing twice.
- Don't colour the icon yourself. It inherits the badge’s tone, and that's the pair the contrast gate (the automated colour-contrast check) measures.

## Anatomy

- **Chip**: Set in mono (a fixed-width typeface), uppercase. That's the tertiary type role. By default it's 22px tall with 11px text (px means pixels); at size md it's 32px tall with 14px text.
- **Icon**: Optional, and placed before the text. It's aria-hidden (an ARIA attribute, from Accessible Rich Internet Applications, that hides it from screen readers) and uses the current text colour. It's 12px, or 14px at size md.
- **Dot**: An optional square, also aria-hidden, in the current text colour. It's 6px, or 8px at size md.
- **Label**: Required. The word is what makes the badge accessible.
