# LogFeed

> A short, read-only list of recent events in the data font: "01 name → detail", the newest line bright and the older ones at rest, with an optional prompt line on top.

- **Best for:** Showing the last few things that happened, such as recent sync events beside a dashboard panel.
- **Not for:** A live shell session: use Terminal. Notifications people act on: use a List of ListItems.
- Molecule. Source: `src/components/molecules/log-feed/LogFeed.tsx`
- Rendered docs page: `/components/log-feed`

## Import

```tsx
import { LogFeed } from 'src/components/molecules/log-feed/LogFeed'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file. An install has no index barrels: import each component from its own file, never from `components/molecules`.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` |  | Required. Names the log region. |
| `entries` | `{ name: ReactNode; detail?: ReactNode }[]` |  | Required. Oldest first; the last one is the newest. |
| `prompt` | `ReactNode` |  | A line above the entries, followed by a caret. |
| `start` | `number` | `1` | The number of the first entry. |
| `className` | `string` |  | Merged with the component's classes. |
| `ref` | `Ref<HTMLDivElement>` |  | Passed through to the log div. |

## Types and helpers

Exported beside the component, from the same file. Import a type with `import type { ... }`.

```ts
export type LogFeedEntry = {
  /** What happened: an agent, a tool, a note name. */
  name: ReactNode
  /** Shown after an arrow: "→ wrote research/x.md". */
  detail?: ReactNode
}
```

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Recent events

```tsx
const EVENTS = [
  { name: 'sync', detail: 'pulled 12 orders' },
  { name: 'stock', detail: 'North depot below 40' },
  { name: 'export', detail: 'wrote stock-2026-11.csv' },
  { name: 'label', detail: 'printed 8 shipping labels' },
]

<div className="w-full max-w-md">
  <LogFeed label="Recent events" entries={EVENTS} />
</div>
```

### With a prompt line, numbered from 41

```tsx
const EVENTS = [
  { name: 'sync', detail: 'pulled 12 orders' },
  { name: 'stock', detail: 'North depot below 40' },
  { name: 'export', detail: 'wrote stock-2026-11.csv' },
  { name: 'label', detail: 'printed 8 shipping labels' },
]

<div className="w-full max-w-md">
  <LogFeed label="Order watch" prompt="watch orders --site north" entries={EVENTS.slice(0, 2)} start={41} />
</div>
```

## Keyboard

Not focusable. No keyboard behaviour of its own.

## Do

- Keep it to the last 5 to 10 entries.
- Write the name as the thing that acted and the detail as what it did.

## Don't

- Don’t put actions in it: it is read-only.
- Don’t use it for prose. Long text belongs in the body font.

## Anatomy

- **Log region**: A div with role="log", named by label, so new lines are announced politely.
- **Prompt**: Optional. A ">" then the prompt text and a block caret, which pulses only without reduced motion.
- **Entries**: A numbered ordered list. The newest line is text.active; older lines text.rest; numbers text.muted.
