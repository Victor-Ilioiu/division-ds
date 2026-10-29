# Avatar

> A small square that shows who someone is. The name is required, because it's both the alt text (the description screen readers read for an image) and the source of the initials. Without one, an avatar is just an image nobody can identify.

- **Best for:** Showing who a person is, next to their name, as in a roster row, a comment or an account menu.
- **Not for:** Several people in one spot: use AvatarGroup.
- Atom. Source: `src/components/atoms/avatar/Avatar.tsx`
- Rendered docs page: `/components/avatar`

## Import

```tsx
import { Avatar, avatarVariants, initialsFrom } from 'src/components/atoms/avatar/Avatar'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `name` | `string` |  | Required. The source of the fallback initials and the announced name. |
| `src` | `string` |  | Optional image. If it can't load, the fallback takes its place without the layout jumping. |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | 24 / 36 / 48px. |
| `status` | `'online' \| 'away' \| 'busy' \| 'offline'` |  | Whether the person is around. It adds the dot and adds the word to the announced name. Leave it out when you don't know. |
| `className` | `string` |  | Merged with the component's classes. When Tailwind utility classes clash, the later one wins. |
| `ref` | `Ref<HTMLSpanElement>` |  | Passed through to the root element. |
| `...rest` | `Omit<HTMLAttributes<HTMLSpanElement>, 'aria-label' \| 'children'>` |  | Every native span prop except aria-label and children. aria-label is removed from the types rather than quietly overwritten when the page runs. The announced name comes from the sr-only span, and an aria-label on the root would override it. children is removed because the component renders its own image/fallback/sr-only children, so anything passed as children would silently disappear. |

## Types and helpers

Exported beside the component, from the same file. Import a type with `import type { ... }`.

```ts
/** First letter of the first two words, uppercased.
 *
 *  `[...word][0]`, not `word[0]`: a string index yields a UTF-16 code unit, so a name whose first
 *  character is outside the Basic Multilingual Plane (an emoji, an extended CJK ideograph, a
 *  mathematical or historic-script letter) returns a lone high surrogate — an unpaired half of a
 *  character, which renders as a replacement glyph. Spreading iterates by code point instead. */
export function initialsFrom(name: string)
```

```ts
export const avatarVariants = cva( …
```

```ts
/** Every native span prop except `aria-label` is available — a molecule composing an Avatar can
 *  attach a `data-testid` or extra `aria-*`/`data-*` attributes. `aria-label` is typed `never`
 *  rather than merely omitted: Avatar's whole guarantee is that the announced name comes from the
 *  `sr-only` span's content and is identical whether or not the image loads. An `aria-label` on
 *  the root would silently outrank that content-derived name in the accessibility tree (an
 *  element's `aria-label` always wins over its text content when the accessible name is
 *  computed), defeating the one thing this component promises. `Omit<>` alone is a no-op here —
 *  TypeScript's JSX checker never treats an `aria-*`/`data-*`-prefixed attribute as an
 *  excess/unknown property — so the key must be redeclared with type `never` to actually be
 *  enforced. Same remedy as `IconButton`'s `aria-label` exclusion (see `IconButton.tsx`).
 *
 *  `children` is excluded for a plainer reason: `HTMLAttributes` offers it, but this component
 *  renders its own image/fallback/`sr-only` children, so JSX children on the element always win
 *  and a `children` prop is silently discarded — reachable, typed, and dead. It is an ordinary
 *  key, so the `Omit` does the rejecting and the declared `never` only makes the error legible;
 *  both are shipped, matching `IconButton`. */
export type AvatarStatus = 'online' | 'away' | 'busy' | 'offline'
```

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Sizes

```tsx
<Avatar name="Dana Iverson" size="sm" />
<Avatar name="Dana Iverson" size="md" />
<Avatar name="Dana Iverson" size="lg" />
```

### With an image

```tsx
const DEMO_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">' +
      '<rect width="64" height="32" fill="#7c9c6b"/>' + // token-discipline: allow, pixels of a sample photo, not interface colour
      '<rect y="32" width="64" height="32" fill="#3f5a49"/>' +
      '</svg>'
  )

<Avatar name="Dana Iverson" src={DEMO_IMAGE} size="lg" />
```

### Fallback initials

```tsx
<Avatar name="Dana Iverson" size="lg" />
<Avatar name="Ravi Okonkwo" size="lg" />
<Avatar name="Lin" size="lg" />
```

### Status: the dot is decoration, and the status word is part of the avatar's name

```tsx
const STATUS_TEAM = [
  { name: 'Ilse Varga', status: 'online' },
  { name: 'Ravi Okonkwo', status: 'away' },
  { name: 'Mei Tanaka', status: 'busy' },
  { name: 'Sana Idrissi', status: 'offline' },
] as const

<div className="flex flex-col gap-3">
  {STATUS_TEAM.map(member => (
    <div key={member.name} className="flex items-center gap-3">
      <Avatar name={member.name} status={member.status} size="md" />
      <div>
        <p className="text-sm">{member.name}</p>
        {/* Shown as text too, so a sighted user never has to decode the colour. Hidden
            from assistive tech, which already heard it in the avatar's name. */}
        <p aria-hidden="true" className="text-sm text-[var(--color-text-secondary)] capitalize">
          {member.status}
        </p>
      </div>
    </div>
  ))}
</div>
```

### A row

```tsx
const FIELD_TEAM = [
  { name: 'Dana Iverson', role: 'Route Lead' },
  { name: 'Ravi Okonkwo', role: 'Comms' },
  { name: 'Mei Tanaka', role: 'Medic' },
  { name: 'Sana Idrissi', role: 'Logistics' },
]

<div className="flex flex-col gap-3">
  {FIELD_TEAM.map(member => (
    <div key={member.name} className="flex items-center gap-3">
      <Avatar name={member.name} size="md" />
      <div>
        <p className="text-sm">{member.name}</p>
        <p className="text-xs text-[var(--color-text-muted)]">{member.role}</p>
      </div>
    </div>
  ))}
</div>
```

## Keyboard

Not focusable. No keyboard behaviour of its own.

## Do

- Pass the full name, not the initials. The component works those out itself.
- Let it fall back. The fallback is part of the design, not an error state.
- Use sm inside dense rows and tables.
- Set status only where presence is live and matters (a roster, a chat). A dot that's out of date is worse than no dot.

## Don't

- Don't round it. The system has no round corners, and an avatar isn't the place to start.
- Don't add the cut corner to the sm avatar. It's 24px, the same size Kbd leaves out by name. An 8px cut takes a third of that edge, and it looks like a broken square instead of a shaped one.
- Don't build an overlapping stack by hand. AvatarGroup does it, with a '+N' that's real text.
- Don't explain the dot colours only in a legend. The status word is already in the name, so show it as text where sighted users need it too.
- Don't use an avatar as the only label for a person. Put the name next to it in dense UI (user interface).
- Don't pass aria-label. It's removed from the types so nothing can override it, and name already decides the one label that gets announced.

## Anatomy

- **Root**: A border.hairline-strong edge on the sunken surface, with overflow clipped and a cut bottom-right corner at md and lg.
- **Image**: alt is empty on purpose, because the hidden name already does the announcing.
- **Fallback**: Initials worked out from the name, aria-hidden, shown when there's no image or it fails to load. aria-hidden is an ARIA attribute (Accessible Rich Internet Applications, the labels that tell screen readers what things are) that hides something from screen readers.
- **Hidden name**: sr-only (visible to screen readers only) and always there, so the announcement is the same either way. With a status it reads "Ilse Varga, online".
- **Status dot**: Optional. A square in the top-right corner (the bottom-right is the cut), in accent.ok.text, accent.warning.text, accent.hostile.text or text.muted, with a 2px (pixel) surface.base keyline around it. It's aria-hidden because the status is announced in the name.
