# Skeleton

> A loading placeholder shaped like the content it stands in for: lines of text, a cut-corner block, or an Avatar’s footprint. The shapes themselves are silent. SkeletonGroup is what tells people the region is loading.

- **Best for:** A region whose content is loading, shown as placeholders in its shape inside one SkeletonGroup.
- **Not for:** A busy button: use Button loading. A wait under a few hundred milliseconds: show nothing.
- Atom. Source: `src/components/atoms/skeleton/Skeleton.tsx`
- Rendered docs page: `/components/skeleton`

## Import

```tsx
import { Skeleton, SkeletonGroup } from 'src/components/atoms/skeleton/Skeleton'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `shape` | `'text' \| 'block' \| 'avatar'` | `'text'` | What the placeholder stands in for. |
| `lines` | `number` | `1` | Text only. The number of lines. Anything below 1 counts as 1. |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Avatar only. Matches Avatar’s size prop. |
| `className` | `string` |  | Merged with the component classes. A block takes its width and height from here. |
| `ref` | `Ref<HTMLDivElement>` |  | Passed through to the root element. |
| `...rest` | `Omit<HTMLAttributes<HTMLDivElement>, 'children'>` |  | Every native div prop except children, because a skeleton draws its own shapes. |
| `label (SkeletonGroup)` | `string` | `'Loading…'` | The hidden words a screen reader hears instead of the shapes. |
| `className (SkeletonGroup)` | `string` |  | Lay the placeholders out here, the way the real content will be laid out. |
| `ref (SkeletonGroup)` | `Ref<HTMLDivElement>` |  | Passed through to the container. |
| `...rest (SkeletonGroup)` | `HTMLAttributes<HTMLDivElement>` |  | Every native div prop. |

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Shapes: text lines, a block, the Avatar footprints

```tsx
<div className="flex w-full flex-col gap-6">
  <Skeleton shape="text" lines={3} className="max-w-md" />
  <Skeleton shape="block" className="h-24 w-full max-w-md" />
  <div className="flex items-center gap-3">
    <Skeleton shape="avatar" size="sm" />
    <Skeleton shape="avatar" size="md" />
    <Skeleton shape="avatar" size="lg" />
  </div>
</div>
```

### A card loading: image, title, two lines of copy

```tsx
<SkeletonGroup label="Loading replicas" className="grid w-full max-w-md gap-4 sm:grid-cols-2">
  {[0, 1].map(i => (
    <Card key={i}>
      <CardBody className="flex flex-col gap-4">
        <Skeleton shape="block" className="aspect-[4/3] w-full" />
        <Skeleton shape="text" className="w-2/3" />
        <Skeleton shape="text" lines={2} />
      </CardBody>
    </Card>
  ))}
</SkeletonGroup>
```

### Table rows loading

```tsx
<SkeletonGroup label="Loading orders" className="w-full max-w-xl">
  <div className="flex flex-col divide-y divide-[var(--color-border-hairline)]">
    {[0, 1, 2].map(i => (
      <div key={i} className="grid grid-cols-[1fr_2fr_1fr] items-center gap-4 py-3">
        <Skeleton shape="text" />
        <Skeleton shape="text" className="w-4/5" />
        <Skeleton shape="text" className="w-1/2 justify-self-end" />
      </div>
    ))}
  </div>
</SkeletonGroup>
```

### A profile row loading

```tsx
<SkeletonGroup label="Loading the squad roster" className="flex w-full max-w-sm items-center gap-3">
  <Skeleton shape="avatar" size="md" />
  <div className="flex flex-1 flex-col gap-2">
    <Skeleton shape="text" className="w-1/2" />
    <Skeleton shape="text" className="w-1/3" />
  </div>
</SkeletonGroup>
```

## Keyboard

Not focusable. No keyboard behaviour of its own.

## Do

- Wrap one region’s placeholders in one SkeletonGroup, and remove it when the content arrives.
- Name what’s loading in the group label: Loading orders, not just Loading.
- Match the layout of the real content, so nothing jumps when it replaces the placeholder.
- Use shape="avatar" with the size the real Avatar will have.

## Don't

- Don't round a skeleton or draw a circle. The system has square corners, and Avatar is a square too.
- Don't put a skeleton on a busy button or control. A busy Button takes loading.
- Don't nest one SkeletonGroup inside another. One busy region gets one announcement.
- Don't show a skeleton for a wait under a few hundred milliseconds. The flash is worse than the wait.

## Common mistakes

Wrong:

```tsx
<div><Skeleton lines={3} /></div>
```

Right:

```tsx
<SkeletonGroup label="Loading orders"><Skeleton lines={3} /></SkeletonGroup>
```

Every shape is aria-hidden, an ARIA (Accessible Rich Internet Applications) attribute that hides it from assistive tech. So without the group, a screen reader, the software that reads the page aloud, hears nothing at all while the region loads.

## Anatomy

- **Shape**: A border.hairline fill with a border.hairline-strong band sweeping across it every 1.6s. It’s see-through, so it reads on the page, a Card or an overlay. aria-hidden.
- **Text lines**: 12px (pixel) bars, 8px apart, full width. When there are several, the last one is three fifths wide.
- **Block**: Any rectangle, sized with className, with the 8px cut corner.
- **Avatar**: An Avatar’s exact footprint: 24, 36 or 48px, with the corner cut at md and lg only.
- **SkeletonGroup**: The container. It has aria-busy="true", which tells assistive tech the region is busy, and a visually hidden label that reads Loading… unless you name what’s loading.
