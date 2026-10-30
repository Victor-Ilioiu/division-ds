# Panel

> The system's framed surface: a thin border around a fill, with the crosshair corner marks and the cut corner as options. Card is a Panel with a title, body and footer; Panel is the frame alone, for a feature tile, a demo frame or a tile that is one link.

- **Best for:** Framing content that has no title, body and footer structure: a feature tile, a demo area, or a tile that is one link.
- **Not for:** Content with a title, a body and actions: use Card. A page-width layout wrapper: use a plain div with max-w-*.
- Atom. Source: `src/components/atoms/panel/Panel.tsx`
- Rendered docs page: `/components/panel`

## Import

```tsx
import { Panel } from 'src/components/atoms/panel/Panel'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file. An install has no index barrels: import each component from its own file, never from `components/molecules`.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `padding` | `'none' \| 'sm' \| 'md' \| 'lg'` | `'md'` | Inner spacing: 0, 12px, 20px or 32px. |
| `tone` | `'base' \| 'raised' \| 'signal'` | `'raised'` | base sits flush with the page, raised is one step up, signal is the brand wash for the one panel in a group that leads. |
| `crosshair` | `boolean` | `false` | Draws the crosshair marks at the corners. |
| `cut` | `boolean` | `false` | Cuts the bottom-right corner, with the border following the cut. |
| `interactive` | `boolean` | `false` | Hover and focus states for a panel that is one link or button. Use it with asChild; it adds no behaviour of its own. |
| `asChild` | `boolean` | `false` | Renders the single child element (an a, a router Link, a button) with the panel classes merged onto it, instead of a div. |
| `className` | `string` |  | Merged with the component's classes. Use it for layout (a grid span, flex, gap), not for the fill or the border. |
| `ref` | `Ref<HTMLDivElement>` |  | Passed through to the div, or to the child with asChild. |
| `...rest` | `HTMLAttributes<HTMLDivElement>` |  | Every native attribute, passed onto the element. |

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Tones

```tsx
<Panel tone="base">
  <p className="font-display font-semibold">Base</p>
  <p className="text-sm text-[var(--color-text-secondary)]">Flush with the page.</p>
</Panel>
<Panel tone="raised">
  <p className="font-display font-semibold">Raised</p>
  <p className="text-sm text-[var(--color-text-secondary)]">One step up.</p>
</Panel>
<Panel tone="signal">
  <p className="font-display font-semibold">Signal</p>
  <p className="text-sm text-[var(--color-text-secondary)]">The one that leads.</p>
</Panel>
```

### Padding

```tsx
<Panel padding="none">none</Panel>
<Panel padding="sm">sm</Panel>
<Panel padding="md">md</Panel>
<Panel padding="lg">lg</Panel>
```

### Crosshair and cut corner

```tsx
<Panel crosshair>Crosshair</Panel>
<Panel cut>Cut corner</Panel>
<Panel crosshair cut tone="signal">Both</Panel>
```

### Interactive, as a router link

```tsx
<Panel interactive cut padding="lg" asChild>
  <RouterLink to="/components/card" className="flex flex-col gap-3">
    <span className="font-display text-lg font-semibold">Card</span>
    <span className="text-sm text-[var(--color-text-secondary)]">A panel with a title, a body and a footer.</span>
    <span className="inline-flex items-center gap-2 font-semibold text-[var(--color-accent-signal-text)]">
      Open <ArrowRight aria-hidden="true" className="size-4" />
    </span>
  </RouterLink>
</Panel>
```

## Keyboard

| Keys | Result |
|---|---|
| `Tab` | With interactive and asChild on a link or button: moves focus to the panel and shows the focus ring. |
| `Enter` | Follows the link, or presses the button, that the panel was rendered as. |

## Do

- Use signal on at most one panel in a group: the one that leads.
- Give a clickable panel interactive and asChild, with a real link or button as the child.
- Leave 8px around a panel with the crosshair, so a parent that clips does not cut the marks off.

## Don't

- Don’t put a button near the bottom-right corner of a cut panel; the cut can clip it.
- Don’t set a fill or border colour with a class. Choose a tone.
- Don’t put a second link or button inside an interactive panel.

## Common mistakes

Wrong:

```tsx
<Panel className="bg-[var(--color-surface-base)] border-[var(--color-border-selection)]">
```

Right:

```tsx
<Panel tone="base">
```

The panel's fill and border come from its tone, through CSS that sits outside Tailwind's layers, so a bg- or border- class never wins. Pick the tone.

Wrong:

```tsx
<Panel interactive onClick={open}>Replicas</Panel>
```

Right:

```tsx
<Panel interactive asChild><Link to="/replicas">Replicas</Link></Panel>
```

A div with a click handler cannot be reached by keyboard and is not announced as a link. interactive styles a panel that already is a link or a button; asChild makes it one.

## Anatomy

- **Frame**: A div (or, with asChild, your element) with the .panel class: a one-pixel border and a fill, both set by the tone.
- **Tone**: base: surface.base fill, border.hairline border. raised: surface.raised fill, border.hairline border. signal: accent.signal.wash fill, border.selection border. All tokens, so each one is right in both themes.
- **Crosshair**: Optional. Short marks drawn 5px outside each corner, in text.muted. The parent must not clip its overflow.
- **Cut corner**: Optional. The bottom-right corner cut at 45 degrees (14px), with the border drawn along the cut, so the outline does not break at that corner. With the crosshair on, the bottom-right marks fall inside the cut and are not drawn.
- **Interactive state**: Optional. On hover and on keyboard focus the border, diagonal included, turns accent.signal.indicator; keyboard focus also draws the focus ring 2px outside. Nothing moves.
