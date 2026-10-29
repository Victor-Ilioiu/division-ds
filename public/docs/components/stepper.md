# Stepper

> Shows where someone is in a flow of several steps. Finished steps get a check mark, the current one is filled with the signal colour, and the rest wait as outlines.

- **Best for:** Showing where someone is in a flow of two to five steps.
- **Not for:** Sections that are equally important: use Tabs. Also not for a single step.
- Molecule. Source: `src/components/molecules/stepper/Stepper.tsx`
- Rendered docs page: `/components/stepper`

## Import

```tsx
import { Stepper } from 'src/components/molecules/stepper/Stepper'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file. An install has no index barrels: import each component from its own file, never from `components/molecules`.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `steps` | `Step[]` |  | Required. { label: string; description?: string }. |
| `current` | `number` |  | Counts from 0. steps.length means every step is complete. |
| `label` | `string` | `'Progress'` | The list's accessible name, the name screen readers announce. |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Horizontal runs in a row from sm up and stacks below it. Vertical is a column at every width, with connectors. |
| `className` | `string` |  | Merged with the root classes. If two Tailwind utilities clash, the later one wins. |
| `ref` | `Ref<HTMLOListElement>` |  | Passed through to the root ol. |

## Types and helpers

Exported beside the component, from the same file. Import a type with `import type { ... }`.

```ts
export type Step = { label: string; description?: string }
```

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Checkout

```tsx
const CHECKOUT_STEPS: Step[] = [
  { label: 'Shipping' },
  { label: 'Payment' },
  { label: 'Review', description: 'Check the manifest' },
]

<div className="w-full">
  <Stepper steps={CHECKOUT_STEPS} current={1} label="Checkout progress" />
</div>
```

### Complete

```tsx
const CHECKOUT_STEPS: Step[] = [
  { label: 'Shipping' },
  { label: 'Payment' },
  { label: 'Review', description: 'Check the manifest' },
]

<div className="w-full">
  <Stepper steps={CHECKOUT_STEPS} current={3} label="Checkout progress" />
</div>
```

### Vertical, with descriptions

```tsx
const SHIPMENT_STEPS: Step[] = [
  { label: 'Ordered', description: 'Paid on 12 October' },
  { label: 'Packed', description: 'At the Brasov depot' },
  { label: 'Shipped', description: 'With the courier' },
  { label: 'Delivered' },
]

<div className="w-full max-w-xs">
  <Stepper steps={SHIPMENT_STEPS} current={2} orientation="vertical" label="Shipment progress" />
</div>
```

### Live: move through the steps with Back and Continue

```tsx
const CHECKOUT_STEPS: Step[] = [
  { label: 'Shipping' },
  { label: 'Payment' },
  { label: 'Review', description: 'Check the manifest' },
]

function LiveStepper() {
  const [current, setCurrent] = useState(0)
  return (
    <div className="flex flex-col gap-6 w-full">
      <Stepper steps={CHECKOUT_STEPS} current={current} label="Checkout progress" />
      <div className="flex gap-3">
        <Button
          variant="secondary"
          size="sm"
          disabled={current === 0}
          onClick={() => setCurrent(c => Math.max(0, c - 1))}
        >
          Back
        </Button>
        <Button
          size="sm"
          disabled={current >= CHECKOUT_STEPS.length}
          onClick={() => setCurrent(c => Math.min(CHECKOUT_STEPS.length, c + 1))}
        >
          Continue
        </Button>
      </div>
    </div>
  )
}

<LiveStepper />
```

## Keyboard

| Keys | Result |
|---|---|
|  | Not interactive. Put Back and Continue buttons in the flow itself. |

## Do

- Keep it to five steps or fewer.
- Name steps for what happens in them: 'Shipping', not 'Step 1'.
- Label the list after the flow: 'Checkout progress'.
- Use vertical beside other content, or when steps have descriptions, like a shipment on an order page.

## Don't

- Don't make steps clickable so people can skip ahead.
- Don't use a Stepper for equally important sections. That's what Tabs is for.
- Don't show a Stepper for a single step.

## Anatomy

- **List**: An ol (numbered list element) named by label.
- **Marker**: A 28px (pixel) square. Done: signal fill with a check. Current: signal fill with its number, without leading zeros, because dimmed zeros can't keep enough contrast against the fill. Upcoming: an outline with the two-digit number, leading zero included.
- **Connector**: A 2px line that turns the signal colour once the step before it is done. Horizontal: hidden when the steps stack, below the sm breakpoint (the small-screen width). Vertical: always shown, running down between the markers.
- **Label**: In a monospaced font, with its status spelled out in words for screen readers.
- **Description**: Optional, under the label. The vertical layout gives it the most room.
