import type { HTMLAttributes, Ref } from 'react'
import { Avatar as RadixAvatar } from 'radix-ui'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../../lib/cn'

/** First letter of the first two words, uppercased.
 *
 *  `[...word][0]`, not `word[0]`: a string index yields a UTF-16 code unit, so a name whose first
 *  character is outside the Basic Multilingual Plane (an emoji, an extended CJK ideograph, a
 *  mathematical or historic-script letter) returns a lone high surrogate — an unpaired half of a
 *  character, which renders as a replacement glyph. Spreading iterates by code point instead. */
export function initialsFrom(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(word => [...word][0]!.toUpperCase())
    .join('')
}

/** The cut corner, with the diagonal its border is otherwise missing: clip-path trims the corner
 *  off the border box, border included, so a bordered bevel shows a bare cut. `.bevel-edge`
 *  (src/styles/bevel.css) paints that stretch in the border's own colour, as it does for the
 *  secondary Button, Tag and Tooltip. It needs a positioned element; the root is `relative`. */
const BEVELLED = 'bevel-sm bevel-edge [--bevel-edge-color:var(--color-border-hairline-strong)]'

export const avatarVariants = cva(
  cn(
    'relative inline-flex shrink-0 items-center justify-center overflow-hidden select-none',
    'border border-[var(--color-border-hairline-strong)] bg-[var(--color-surface-sunken)]'
  ),
  {
    variants: {
      // The cut corner lands on md and lg and deliberately not on sm. Kbd's page already states
      // the rule the omission follows -- cut corners are for surfaces and controls, not 24px
      // chrome -- and sm IS 24px, the same footprint as a keycap. An 8px cut on a 24px square
      // takes a third of its edge and reads as a broken square rather than a shaped one.
      // Nothing inside an Avatar is focusable, so the cut needs no unclipped focus wrapper.
      size: {
        sm: 'w-6 h-6 text-[10px]',
        md: cn('w-9 h-9 text-xs', BEVELLED),
        lg: cn('w-12 h-12 text-sm', BEVELLED),
      },
    },
    defaultVariants: { size: 'md' },
  }
)

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

/** The status tones from AGENTS.md: ok is healthy, warning needs attention, hostile is the one
 *  that blocks (do not disturb), and neutral is inactive. Neutral has no accent of its own, so
 *  offline takes `text.muted`, the same grey a neutral Badge leans on. Each is a `.text` token, the
 *  role made for colour on a surface, because the dot sits on the avatar's sunken fill or image. */
const STATUS_TONE: Record<AvatarStatus, string> = {
  online: 'bg-[var(--color-accent-ok-text)]',
  away: 'bg-[var(--color-accent-warning-text)]',
  busy: 'bg-[var(--color-accent-hostile-text)]',
  offline: 'bg-[var(--color-text-muted)]',
}

/** Roughly a quarter of the edge at every size, never below 6px, so the dot stays a mark rather
 *  than a speck at sm and does not crowd the initials at lg. */
const STATUS_SIZE = { sm: 'w-1.5 h-1.5', md: 'w-2 h-2', lg: 'w-2.5 h-2.5' } as const

export type AvatarProps = Omit<HTMLAttributes<HTMLSpanElement>, 'aria-label' | 'children'> &
  VariantProps<typeof avatarVariants> & {
    /** Required. The alt text when the image loads, the initials when it does not. */
    name: string
    src?: string
    /** Presence. Drawn as a square dot in the top-right corner and announced as part of the
     *  name ("Ilse Varga, online"), so the colour is never the only carrier. */
    status?: AvatarStatus
    className?: string
    ref?: Ref<HTMLSpanElement>
    'aria-label'?: never
    children?: never
  }

/** The status dot sits top-right, inside the root, for two reasons. The bottom-right corner is
 *  the cut, so a dot there would be sliced by the clip-path; and the root clips its overflow, so a
 *  dot hung outside the edge, the usual place, would be cut off on every side. Inside, it takes a
 *  2px `surface.base` keyline on its two inner edges so it separates from an image of any colour.
 *  It is a square, like everything else here. aria-hidden: the words travel in the hidden name. */
export function Avatar({ name, src, size, status, className, ref, ...rest }: AvatarProps) {
  return (
    <RadixAvatar.Root ref={ref} className={cn(avatarVariants({ size }), className)} {...rest}>
      {src ? (
        <RadixAvatar.Image src={src} alt="" className="w-full h-full object-cover" />
      ) : null}
      <RadixAvatar.Fallback
        aria-hidden="true"
        className="font-mono uppercase tracking-wider text-[var(--color-text-secondary)]"
      >
        {initialsFrom(name)}
      </RadixAvatar.Fallback>
      {status ? (
        <span
          aria-hidden="true"
          data-avatar-status={status}
          className={cn(
            'absolute top-0 right-0 box-content',
            'border-l-2 border-b-2 border-[var(--color-surface-base)]',
            STATUS_SIZE[size ?? 'md'],
            STATUS_TONE[status]
          )}
        />
      ) : null}
      {/* The name is announced identically whether the image loaded or not, and carries the
          status in words when there is one. */}
      <span className="sr-only">{status ? `${name}, ${status}` : name}</span>
    </RadixAvatar.Root>
  )
}
