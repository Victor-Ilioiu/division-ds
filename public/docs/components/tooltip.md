# Tooltip

> Extra text that shows on hover or focus. It never holds information people can only get there. It doesn't appear on touch screens, it goes away, and someone may never trigger it.

- **Best for:** Extra detail on hover or focus for an element that can take focus, such as an IconButton.
- **Not for:** The only label, or the only explanation of an error. Use the label prop or visible text.
- Atom. Source: `src/components/atoms/tooltip/Tooltip.tsx`
- Rendered docs page: `/components/tooltip`

## Import

```tsx
import { Tooltip, TooltipProvider } from 'src/components/atoms/tooltip/Tooltip'
```

## Requires

- One <TooltipProvider> near the root of the app. AppShell and the demo layout each mount one, so a screen doesn't add its own.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `content` | `string` |  | Required. The extra text. |
| `children` | `ReactElement` |  | A single element that can take focus. |
| `side` | `'top' \| 'right' \| 'bottom' \| 'left'` | `'top'` | Which side of the trigger the content opens on. |
| `className` | `string` |  | Merged with the content’s classes. Later Tailwind utilities (the small styling classes this system uses) win. |

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### On a button

```tsx
<Tooltip content="Sends the manifest to the depot; can't be undone once confirmed.">
  <Button>Dispatch</Button>
</Tooltip>
```

### On an icon button

```tsx
<Tooltip content="Uses the last known GPS fix, not live signal.">
  <IconButton label="Recalculate route">
    <Compass aria-hidden="true" className="w-4 h-4" />
  </IconButton>
</Tooltip>
```

### Sides

```tsx
<Tooltip content="Opens above the trigger." side="top">
  <Button variant="secondary">Top</Button>
</Tooltip>
<Tooltip content="Opens right of the trigger." side="right">
  <Button variant="secondary">Right</Button>
</Tooltip>
<Tooltip content="Opens below the trigger." side="bottom">
  <Button variant="secondary">Bottom</Button>
</Tooltip>
<Tooltip content="Opens left of the trigger." side="left">
  <Button variant="secondary">Left</Button>
</Tooltip>
```

### Keyboard

```tsx
<p className="text-sm text-[var(--color-text-secondary)] max-w-md">
  Press Tab to move to the trigger and the tooltip appears. Press Escape and it goes away,
  without you moving the pointer. That's a rule in WCAG 2.2 (the Web Content Accessibility
  Guidelines, the public rulebook for making websites usable by people with disabilities).
  Its success criterion (SC) 1.4.13 says this kind of content has to stay dismissible (you
  can close it), hoverable (you can move the pointer onto it) and persistent (it stays
  until you do).
</p>
```

## Keyboard

| Keys | Result |
|---|---|
| `Tab` | Moves focus to the trigger and shows the tooltip. Tabbing on to the next element hides it again. |
| `Esc` | Dismisses it without moving the pointer. That's required by SC 1.4.13, a success criterion (one numbered rule) in WCAG, the Web Content Accessibility Guidelines. |

## Do

- Use it for the extra detail, never the essential one.
- Put it on an element that can take focus. A tooltip on a <div> doesn't reach anyone using a keyboard.
- Keep it to one sentence.
- Pair it with an IconButton whose label already names the action. Then the tooltip adds detail instead of repeating the name.

## Don't

- Don't put a tooltip on a disabled control. It can't take focus, so nobody can reach the tooltip.
- Don't put interactive content inside one. A tooltip is text only and never takes focus.
- Don't use it as the only label for an icon button. label does that job.
- Don't make it the only place an error is explained.

## Anatomy

- **Provider**: Mounted once in AppShell. It sets the 300ms (millisecond) delay, and the 150ms skip window for moving between triggers.
- **Trigger**: Uses asChild, so no wrapper element is added and the focus order stays as it was.
- **Content**: Portalled, meaning it's rendered in a separate layer of the page, outside its trigger. It enters with motion token M1, is capped at 260px (pixels) wide and has the cut bottom-right corner. It's a single object with its own fill and holds nothing that takes focus, so the cut doesn't need an unclipped wrapper. The trigger, not the panel, is what takes focus.
