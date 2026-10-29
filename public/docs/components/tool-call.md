# ToolCall

> A tool the assistant ran, shown right where it ran. It has the status as a word and a small symbol, a title, the tool name and how long it took, with the input and output folded away behind a button.

- **Best for:** An assistant reply that ran a tool, such as a query, a lookup or a calculation.
- **Not for:** An action with side effects that needs a yes first: use ApprovalRequest.
- Molecule. Source: `src/components/molecules/tool-call/ToolCall.tsx`
- Rendered docs page: `/components/tool-call`

## Import

```tsx
import { ToolCall } from 'src/components/molecules/tool-call/ToolCall'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file. An install has no index barrels: import each component from its own file, never from `components/molecules`.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `name` | `string` |  | Required. The tool's own name, shown in a monospaced font. |
| `title` | `string` |  | A plain-language description of the call, shown above the name. |
| `status` | `'running' \| 'done' \| 'failed'` |  | Required. Shown as a word, a symbol and a colour. |
| `duration` | `string` |  | How long it took, for example "1.2 s". |
| `input` | `ReactNode` |  | What the assistant sent the tool. Folded away by default. |
| `output` | `ReactNode` |  | What came back. Folded away by default. |
| `defaultOpen` | `boolean` | `false` | Starts with the details showing. |
| `className` | `string` |  | Added to the panel. |

## Types and helpers

Exported beside the component, from the same file. Import a type with `import type { ... }`.

```ts
export type ToolCallStatus = 'running' | 'done' | 'failed'
```

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Running, done and failed

```tsx
<div className="flex w-full max-w-xl flex-col gap-3">
  <ToolCall name="query_stock_levels" title="Read stock levels at Depot 4" status="running" />
  <ToolCall
    name="query_stock_levels"
    title="Read stock levels at Depot 4"
    status="done"
    duration="1.2 s"
    input={'{ "depot": 4, "below_reorder_point": true }'}
    output={'[\n  { "sku": "K-41", "on_hand": 6, "reorder_at": 10 },\n  { "sku": "TP-08", "on_hand": 3, "reorder_at": 8 }\n]'}
  />
  <ToolCall
    name="fetch_supplier_lead_times"
    title="Check supplier lead times"
    status="failed"
    duration="4.0 s"
    output="Timed out after 4 s. The supplier feed did not answer."
  />
</div>
```

### Without a title, details open

```tsx
<div className="flex w-full max-w-xl flex-col gap-3">
  <ToolCall
    name="count_pallets"
    status="done"
    duration="0.3 s"
    input={'{ "depot": 4, "bay": 2 }'}
    output="14 pallets"
    defaultOpen
  />
</div>
```

## Keyboard

| Keys | Result |
|---|---|
| `Tab` | Moves to "Show details". |
| `Enter` `Space` | Shows or hides the input and output. |

## Do

- Give each call a title a person understands: "Read stock levels at Depot 4", not just the function name.
- Show the call even when it's boring. Seeing the work is how a reader learns to trust it, or to catch a mistake.
- Mention a failure in the reply text too, along with what the assistant did instead.

## Don't

- Don't give a call its own live region (an area screen readers announce on change). The thread's busy status speaks for the whole turn.
- Don't open the details by default for long payloads. The reply is what matters, and the payload is the evidence.
- Don't use a ToolCall for something with a side effect the person hasn't agreed to. Ask with ApprovalRequest first.

## Anatomy

- **Panel**: A thin frame on surface.raised. It's marked as a separate block, so the message's screen reader announcement skips it.
- **Status glyph**: A Spinner while running, a check when done, an alert circle when failed. Decoration only.
- **Title and name**: The title written for people, then the tool's own name in a monospaced font. With no title, the name comes first.
- **Status badge**: Running, Done or Failed as a word in the tone's colour. Colour is never the only signal.
- **Duration**: In a monospaced font with equal-width digits, for example "1.2 s".
- **Details**: A "Show details" button (with aria-expanded, which tells screen readers whether it's open) above Input and Output. Those wrap onto new lines instead of scrolling sideways.
