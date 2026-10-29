# Accordion

> Sections that open and close in place, each under its own heading. You can allow one open at a time or several, and draw them as plain rows split by thin lines or as a panel per section.

- **Best for:** Sections people scan by heading and open one or two of: frequently asked questions (FAQ), grouped settings, long specifications.
- **Not for:** Steps in a sequence: use Stepper. Equal views of the same thing: use Tabs.
- Molecule. Source: `src/components/molecules/accordion/Accordion.tsx`
- Rendered docs page: `/components/accordion`

## Import

```tsx
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from 'src/components/molecules/accordion/Accordion'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file. An install has no index barrels: import each component from its own file, never from `components/molecules`.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `type` | `'single' \| 'multiple'` |  | Required on the root. single: opening one section closes the other. multiple: any number can be open. |
| `collapsible` | `boolean` | `false` | single mode only. Lets the open section be closed again by its own trigger. You'll want it almost always. |
| `variant` | `'plain' \| 'boxed'` | `'plain'` | plain: thin separator lines, for a long run of questions. boxed: a panel per section, for a few sections that each stand alone. |
| `value (Root)` | `string \| string[]` |  | The open section when the page controls it: a string in single mode, an array in multiple mode. |
| `defaultValue` | `string \| string[]` |  | The section or sections open at first, when the accordion keeps track itself (uncontrolled). Set on the root. |
| `onValueChange` | `(value: string \| string[]) => void` |  | Called when a section opens or closes (on the root). The argument has the same shape as type. |
| `value (Item)` | `string` |  | Required. The section’s own value. |
| `disabled (Item)` | `boolean` | `false` | The section can't be opened or closed. |
| `level (Trigger)` | `2 \| 3 \| 4 \| 5 \| 6` | `3` | The level of the heading the trigger sits in. Pick one below the heading the accordion appears under. |
| `forceMount (Content)` | `true` |  | Keeps a closed panel in the page's code (the DOM, the browser's live model of the page), so the browser's find-in-page search can reach its content. It then skips the closing animation. |
| `className` | `string` |  | Merged with each part’s classes. On AccordionContent it goes on the inner padded box, not the animated clipping box around it. |
| `ref` | `Ref<HTMLElement>` |  | Passed through to the DOM element. Every part has one; the trigger’s is the button. |

## Types and helpers

Exported beside the component, from the same file. Import a type with `import type { ... }`.

```ts
export type AccordionVariant = 'plain' | 'boxed'
```

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Frequently asked questions (FAQ): plain style, one answer open at a time, and the open one can be closed again

```tsx
<div className="w-full max-w-lg">
  <Accordion type="single" collapsible>
    <AccordionItem value="shipping">
      <AccordionTrigger>How long does shipping take?</AccordionTrigger>
      <AccordionContent>
        Two to four working days inside the EU. Every parcel leaves the depot with a tracking
        number, sent to you by email the same day.
      </AccordionContent>
    </AccordionItem>
    <AccordionItem value="returns">
      <AccordionTrigger>Can I return a replica?</AccordionTrigger>
      <AccordionContent>
        Within 30 days, unfired and in its original box. Open a return from your order page and
        print the label.
      </AccordionContent>
    </AccordionItem>
    <AccordionItem value="age">
      <AccordionTrigger>Do I need to prove my age?</AccordionTrigger>
      <AccordionContent>
        Yes, once. We check an ID document at the first order of a replica; accessories need no
        check.
      </AccordionContent>
    </AccordionItem>
    <AccordionItem value="custom" disabled>
      <AccordionTrigger>Custom builds (paused)</AccordionTrigger>
      <AccordionContent>The workshop takes no new builds this season.</AccordionContent>
    </AccordionItem>
  </Accordion>
</div>
```

### Settings sections: boxed style, several open at once, and each section header is a level-2 heading (h2)

```tsx
function SettingRow({ id, label, defaultChecked }: { id: string; label: string; defaultChecked?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <label htmlFor={id} className="text-sm text-[var(--color-text-primary)]">
        {label}
      </label>
      <Switch id={id} defaultChecked={defaultChecked} />
    </div>
  )
}

<div className="w-full max-w-lg">
  <Accordion type="multiple" variant="boxed" defaultValue={['notifications']}>
    <AccordionItem value="notifications">
      <AccordionTrigger level={2}>Notifications</AccordionTrigger>
      <AccordionContent>
        <SettingRow id="acc-set-shipping" label="Shipping updates" defaultChecked />
        <SettingRow id="acc-set-restock" label="Restock alerts" />
        <SettingRow id="acc-set-news" label="Monthly newsletter" />
      </AccordionContent>
    </AccordionItem>
    <AccordionItem value="privacy">
      <AccordionTrigger level={2}>Privacy</AccordionTrigger>
      <AccordionContent>
        <SettingRow id="acc-set-profile" label="Show my squad profile" defaultChecked />
        <SettingRow id="acc-set-history" label="Keep order history" defaultChecked />
      </AccordionContent>
    </AccordionItem>
    <AccordionItem value="display">
      <AccordionTrigger level={2}>Display</AccordionTrigger>
      <AccordionContent>
        <SettingRow id="acc-set-motion" label="Reduce motion" />
      </AccordionContent>
    </AccordionItem>
  </Accordion>
</div>
```

### Controlled: the page keeps track of which sections are open

```tsx
function ControlledExample() {
  const [open, setOpen] = useState<string[]>(['battery'])
  return (
    <div className="w-full max-w-lg">
      <p className="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">
        Open: {open.length ? open.join(', ') : 'none'}
      </p>
      <Accordion type="multiple" value={open} onValueChange={setOpen}>
        <AccordionItem value="battery">
          <AccordionTrigger>Battery</AccordionTrigger>
          <AccordionContent>11.1V LiPo, 1450mAh, with a deans connector.</AccordionContent>
        </AccordionItem>
        <AccordionItem value="hop-up">
          <AccordionTrigger>Hop-up</AccordionTrigger>
          <AccordionContent>Rotary adjustment, 60 degree bucking.</AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}

<ControlledExample />
```

## Keyboard

| Keys | Result |
|---|---|
| `Tab` | Moves between triggers, and into an open section’s content. |
| `Enter` `Space` | Opens or closes the focused section. |
| `↓` `↑` | Goes to the next or previous trigger, wrapping round at the ends and skipping disabled ones. |
| `Home` `End` | Goes to the first or last trigger. |

## Do

- Use it for content people scan by its headings and open one or two of: an FAQ, a group of settings, long specifications.
- Write each trigger as the question or the section name, so the closed list reads like a table of contents.
- Set collapsible in single mode.
- Use boxed for a few sections that each hold controls, and plain for a long list of text answers.

## Don't

- Don't hide the one thing everyone needs inside a closed section. Show it.
- Don't use it for steps in a sequence. That's Stepper.
- Don't use it to switch between equal views of the same thing. That's Tabs.
- Don't nest an accordion inside another accordion's content.

## Common mistakes

Wrong:

```tsx
<Accordion type="single">
```

Right:

```tsx
<Accordion type="single" collapsible>
```

Without collapsible, a single-mode accordion can never be fully closed again once a section is open. That surprises people.

Wrong:

```tsx
<AccordionTrigger>Shipping</AccordionTrigger> // under an h3 section title
```

Right:

```tsx
<AccordionTrigger level={4}>Shipping</AccordionTrigger>
```

Every trigger (the clickable section header) sits inside a heading, h3 (a level-3 heading) by default. Set level so the triggers nest one level below the heading they appear under.

## Anatomy

- **Accordion**: The root. It holds which sections are open and the variant, and every part below reads both.
- **AccordionItem**: One section. plain: a thin line under it. boxed: its own raised panel with the cut corner. The panel is drawn on a backing layer marked aria-hidden (hidden from screen readers), so the item itself is never clipped.
- **AccordionTrigger**: A button inside a heading of the level you choose. It uses the display typeface, has a chevron that turns half a revolution when the section is open, and is underlined on hover.
- **AccordionContent**: A region labelled by its trigger, in secondary text. It grows open over the base duration and shrinks shut faster (M7). When someone has asked their device for reduced motion, it snaps open and shut instead.
