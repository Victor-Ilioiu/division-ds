# Divider

> A thin line, with an optional legend (a short text label). When it's only decoration, screen readers skip it. When it marks where a section starts, it's a real separator they announce.

- **Best for:** A thin line between groups of content, labelled when it starts a new section.
- **Not for:** Making space (use the spacing scale), or going between items that already have their own borders.
- Atom. Source: `src/components/atoms/divider/Divider.tsx`
- Rendered docs page: `/components/divider`

## Import

```tsx
import { Divider } from 'src/components/atoms/divider/Divider'
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Which way the line runs. |
| `label` | `string` |  | Adds a legend and makes the divider more than decoration. |
| `className` | `string` |  | Merged with the component's classes. When Tailwind utility classes clash, the later one wins. |
| `ref` | `Ref<HTMLDivElement>` |  | Passed through to the root element. |
| `...rest` | `Omit<HTMLAttributes<HTMLDivElement>, 'role' \| 'children'>` |  | Every native div prop except role and children. role is removed from the types rather than quietly overwritten when the page runs, because label already decides whether the divider is decorative or structural. children is removed because it behaved two different ways: with no label it rendered inside a decorative separator, and with one it disappeared. |

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Plain rule

```tsx
<div className="w-full max-w-sm">
  <Divider />
</div>
```

### With a legend

```tsx
<div className="w-full max-w-sm">
  <Divider label="Section 02" />
</div>
```

### Vertical, between inline items

```tsx
<span className="flex items-center gap-3 h-6">
  <span className="text-sm">Kit list</span>
  <Divider orientation="vertical" />
  <span className="text-sm">Load-out</span>
</span>
```

### Drawing on

```tsx
<div className="flex flex-col gap-4 w-full max-w-sm">
  {/* The Button atom, not a bare <button>: a hand-rolled one here had no system focus
      ring at all (the UA default, rgb(16, 16, 16) auto 1px) and no type, so it defaulted
      to submit. */}
  <Button variant="secondary" size="sm" wrapperClassName="w-fit" onClick={() => setReplayKey(k => k + 1)}>
    Replay
  </Button>
  <Divider key={replayKey} className="anim-draw-on" />
  <p className="text-xs text-[var(--color-text-muted)]">
    This animation is switched off completely when someone has asked their device for
    less motion (the prefers-reduced-motion: reduce setting).
  </p>
</div>
```

## Keyboard

Not focusable. No keyboard behaviour of its own.

## Do

- Leave it decorative when it's only there for visual rhythm.
- Label it when it really starts a new section, so screen readers announce the structure.
- Add anim-draw-on when a section animates in. The line drawing itself is motion token M2.

## Don't

- Don't stack dividers to make space. That's what the spacing scale is for.
- Don't label every divider. If everything is a landmark, nothing is.
- Don't use a vertical divider between items that already have their own borders.
- Don't pass role. It's removed from the types so nothing can override it, and label already decides none vs separator.

## Anatomy

- **Rule**: 1px (one pixel) in border.hairline.
- **Legend**: JetBrains Mono, 10px, muted. Optional.
- **role**: none when decorative, separator when labelled. role tells screen readers what an element is.
