# StatusChip

> A small filled tag with one short uppercase word in the data font, beside a row or a value: NEW, CAP, TREND. It is a solid Badge with a fixed size and type, so it adds no colour of its own.

- **Best for:** Tagging a row or a value with one short state word in a dense panel, such as NEW beside a list row.
- **Not for:** A status that needs a sentence or an icon: use Badge.
- Atom. Source: `src/components/atoms/status-chip/StatusChip.tsx`
- Rendered docs page: `/components/status-chip`

## Import

```tsx
import { StatusChip } from 'src/components/atoms/status-chip/StatusChip'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file. An install has no index barrels: import each component from its own file, never from `components/molecules`.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` |  | Required. One short word. |
| `tone` | `'neutral' \| 'signal' \| 'ok' \| 'warning' \| 'hostile' \| 'info'` | `'neutral'` | A Badge status tone. neutral by default; signal only for the one thing to act on. |
| `className` | `string` |  | Merged with the component's classes. |
| `ref` | `Ref<HTMLSpanElement>` |  | Passed through to the Badge. |
| `...rest` | `HTMLAttributes<HTMLSpanElement>` |  | Every native attribute, except the Badge props it fixes (size, emphasis, dot, icon, color, severity). |

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Tones

```tsx
<StatusChip label="Idle" />
<StatusChip tone="signal" label="New" />
<StatusChip tone="ok" label="Done" />
<StatusChip tone="warning" label="Cap" />
<StatusChip tone="hostile" label="Fail" />
<StatusChip tone="info" label="Trend" />
```

### Beside a value

```tsx
<span className="font-data text-sm text-[var(--color-text-primary)]">12.4K</span>
<StatusChip tone="warning" label="Cap" />
```

## Keyboard

Not focusable. No keyboard behaviour of its own.

## Do

- Keep it to one word of up to about six letters.
- Use the tone for meaning (ok, warning, hostile), not for decoration.

## Don't

- Don’t put more than one signal chip on a screen.
- Don’t make it the only place a status lives in a column people sort or filter by.

## Anatomy

- **Badge**: A solid Badge at size sm, 18px tall. Every fill and ink pair is the Badge’s gated one.
- **Word**: JetBrains Mono, 11px, uppercase, semibold.
