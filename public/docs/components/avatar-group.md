# AvatarGroup

> Overlapping avatars (small profile pictures) with a “+N” for the rest. It’s a list named by its count, so a screen reader hears “6 members” and then each person. The people behind the “+N” are named in words, never only counted.

- **Best for:** Several people in one place, with a count: a squad, the people on an order, who’s viewing.
- **Not for:** Picking people: use MultiSelect.
- Molecule. Source: `src/components/molecules/avatar-group/AvatarGroup.tsx`
- Rendered docs page: `/components/avatar-group`

## Import

```tsx
import { AvatarGroup } from 'src/components/molecules/avatar-group/AvatarGroup'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file. An install has no index barrels: import each component from its own file, never from `components/molecules`.

## Requires

- With overflowTooltip, the root <TooltipProvider>. AppShell and the demo layout each include one.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `people` | `AvatarGroupPerson[]` |  | Required. Everyone in the group, in the order shown. |
| `max` | `number` | `4` | The most avatars drawn. The rest go into the +N chip. |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Passed to every Avatar and to the chip. |
| `label` | `string` |  | What the group is. The count is added on the end: “Alpha squad, 6 members”. |
| `overflowTooltip` | `boolean` | `false` | Shows the hidden names in a Tooltip on the chip and lets the chip take keyboard focus. |
| `className` | `string` |  | Merged with the list classes. Later Tailwind utility classes win. |
| `ref` | `Ref<HTMLUListElement>` |  | Passed through to the list. |
| `...rest` | `Omit<HTMLAttributes<HTMLUListElement>, 'children' \| 'aria-label'>` |  | Every standard ul prop except children (the people are the content) and aria-label (label builds it, with the count). |
| `name (AvatarGroupPerson)` | `string` |  | Required. Passed to Avatar. |
| `src (AvatarGroupPerson)` | `string` |  | Optional image, passed to Avatar. |
| `status (AvatarGroupPerson)` | `'online' \| 'away' \| 'busy' \| 'offline'` |  | Optional presence (whether they’re online), passed to Avatar, which includes it in the name screen readers hear. |

## Types and helpers

Exported beside the component, from the same file. Import a type with `import type { ... }`.

```ts
export type AvatarGroupPerson = { name: string; src?: string; status?: AvatarStatus }
```

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Sizes: four people shown, and the rest counted in a small chip

```tsx
const ALPHA: AvatarGroupPerson[] = [
  { name: 'Ilse Varga', status: 'online' },
  { name: 'Ravi Okonkwo', status: 'away' },
  { name: 'Mei Tanaka', status: 'busy' },
  { name: 'Sana Idrissi', status: 'online' },
  { name: 'Dana Iverson', status: 'offline' },
  { name: 'Lin Moreau', status: 'online' },
  { name: 'Tomas Reyes', status: 'offline' },
]

<div className="flex flex-col gap-4">
  <AvatarGroup people={ALPHA} size="sm" label="Alpha squad" />
  <AvatarGroup people={ALPHA} size="md" label="Alpha squad" />
  <AvatarGroup people={ALPHA} size="lg" label="Alpha squad" />
</div>
```

### Everyone fits: no chip

```tsx
const BRAVO: AvatarGroupPerson[] = [{ name: 'Noor Haddad' }, { name: 'Kai Lindqvist' }, { name: 'Ada Brennan' }]

<AvatarGroup people={BRAVO} label="Bravo squad" />
```

### The hidden names in a tooltip (press Tab to reach the chip)

```tsx
const ALPHA: AvatarGroupPerson[] = [
  { name: 'Ilse Varga', status: 'online' },
  { name: 'Ravi Okonkwo', status: 'away' },
  { name: 'Mei Tanaka', status: 'busy' },
  { name: 'Sana Idrissi', status: 'online' },
  { name: 'Dana Iverson', status: 'offline' },
  { name: 'Lin Moreau', status: 'online' },
  { name: 'Tomas Reyes', status: 'offline' },
]

<AvatarGroup people={ALPHA} max={3} label="Alpha squad" overflowTooltip />
```

### In a row, beside the words it summarises

```tsx
const ALPHA: AvatarGroupPerson[] = [
  { name: 'Ilse Varga', status: 'online' },
  { name: 'Ravi Okonkwo', status: 'away' },
  { name: 'Mei Tanaka', status: 'busy' },
  { name: 'Sana Idrissi', status: 'online' },
  { name: 'Dana Iverson', status: 'offline' },
  { name: 'Lin Moreau', status: 'online' },
  { name: 'Tomas Reyes', status: 'offline' },
]

<div className="flex items-center gap-3">
  <AvatarGroup people={ALPHA} max={3} size="sm" label="Watching this replica" />
  <p className="text-sm text-[var(--color-text-secondary)]">7 people are watching this replica</p>
</div>
```

## Keyboard

| Keys | Result |
|---|---|
| `Tab` | With overflowTooltip, focuses the +N chip and opens the tooltip. Otherwise nothing in the group can take focus. |

## Do

- Give it a label that says who the people are: a squad, the people on an order, who’s viewing.
- Keep max at four or fewer in dense rows. The chip covers the rest.
- Put the full list somewhere people can reach (a dialog, a roster page) when they need to act on it.

## Don't

- Don't use it as a control. To pick people, use MultiSelect. To open the list, put a Button next to it.
- Don't set overflowTooltip on every row of a long table, because each chip becomes a Tab stop.
- Don't pass aria-label. The label plus the count is the name.

## Common mistakes

Wrong:

```tsx
<div className="flex -space-x-2">{people.map(p => <Avatar name={p.name} />)}</div>
```

Right:

```tsx
<AvatarGroup people={people} label="Alpha squad" />
```

A hand-built stack has no count, no thin outline between the faces, and no words for the people a +N leaves out.

## Anatomy

- **List**: A ul (a bulleted list element) named “<label>, N members”, or just “N members” when there’s no label.
- **Item**: One Avatar in a 2px (two pixel) frame in surface.base, cut to the same corner. Each one slides a quarter of its width under the one before.
- **+N chip**: Shaped like an avatar, in monospaced text in text.secondary. The “+2” is aria-hidden (screen readers skip it), and hidden text reading “and 2 more: …” names the people it stands for.
- **Tooltip**: Optional. Shows the hidden names on hover and on keyboard focus. The chip then becomes a Tab stop, with its focus ring drawn on an outer box that isn’t clipped.
