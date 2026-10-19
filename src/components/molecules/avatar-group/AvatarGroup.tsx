import type { HTMLAttributes, Ref } from 'react'
import { Avatar, avatarVariants, type AvatarStatus } from '../../atoms/avatar/Avatar'
import { Tooltip } from '../../atoms/tooltip/Tooltip'
import { cn } from '../../../lib/cn'

export type AvatarGroupPerson = { name: string; src?: string; status?: AvatarStatus }

type Size = 'sm' | 'md' | 'lg'

/** How far each item slides under the one before it. Net of the two 2px frames, the avatar itself
 *  loses about a sixth of its edge (4, 6 and 8px), which is as far as it goes before the first
 *  initial of a centred pair starts to disappear under its neighbour (measured in the docs page). */
const OVERLAP: Record<Size, string> = { sm: '-ml-2', md: '-ml-2.5', lg: '-ml-3' }

/** The keyline that separates one avatar from the one it overlaps. A 2px `surface.base` frame on
 *  the list item, cut to the same corner as the avatar inside it, so a stack reads as separate
 *  squares rather than one smeared shape. sm has no cut, matching Avatar. */
const FRAME: Record<Size, string> = { sm: '', md: 'bevel-sm', lg: 'bevel-sm' }

export type AvatarGroupProps = Omit<HTMLAttributes<HTMLUListElement>, 'children' | 'aria-label'> & {
  /** Everyone in the group, in the order they should appear. */
  people: AvatarGroupPerson[]
  /** The most avatars drawn; the rest become a "+N" chip. */
  max?: number
  size?: Size
  /** What the group is. The count is always appended: "Alpha squad, 6 members". Without it the
   *  list is named by the count alone. */
  label?: string
  /** Puts the hidden names in a Tooltip on the "+N" chip, and makes the chip focusable so a
   *  keyboard user can open it. Needs the root TooltipProvider. */
  overflowTooltip?: boolean
  className?: string
  ref?: Ref<HTMLUListElement>
  'aria-label'?: never
  children?: never
}

/**
 * Overlapping avatars with a "+N" for the rest.
 *
 * A list, not a `role="group"` with a long label: each Avatar already announces its own name (and
 * status), so a list lets a screen reader say "list, 6 members" and then read the people one by
 * one, where a label listing everyone would say every name twice.
 *
 * The "+N" is never only a number. Beside the aria-hidden "+2" sits a visually hidden
 * "and 2 more: Dana Iverson, Lin Moreau", so the people the stack leaves out are still announced.
 * The tooltip shows the same names to a sighted user; it is optional because it makes the chip a
 * tab stop, and a roster of twenty groups should not add twenty of them.
 */
export function AvatarGroup({
  people,
  max = 4,
  size = 'md',
  label,
  overflowTooltip = false,
  className,
  ref,
  ...rest
}: AvatarGroupProps) {
  const limit = Math.max(1, Math.floor(max))
  const shown = people.slice(0, limit)
  const hidden = people.slice(limit)
  const count = `${people.length} ${people.length === 1 ? 'member' : 'members'}`
  const hiddenNames = hidden.map(person => person.name).join(', ')

  const item = (index: number, framed = true) =>
    cn('relative inline-flex p-0.5 bg-[var(--color-surface-base)]', framed && FRAME[size], index > 0 && OVERLAP[size])

  // The chip is an Avatar-shaped square with the same border, fill and cut. When it takes the
  // tooltip it becomes a tab stop, and its focus ring goes on an unclipped `.bevel-focus-wrap`
  // around it: the chip's own clip-path would cut an outline drawn on the chip clean off.
  // `no-reticle`: the hover brackets belong to controls that act, and this one only reveals.
  const chip = hidden.length > 0 && (
    <span
      tabIndex={overflowTooltip ? 0 : undefined}
      className={cn(avatarVariants({ size }), 'font-mono text-[var(--color-text-secondary)] outline-none')}
    >
      <span aria-hidden="true">+{hidden.length}</span>
      <span className="sr-only">
        and {hidden.length} more: {hiddenNames}
      </span>
    </span>
  )

  return (
    <ul
      ref={ref}
      aria-label={label ? `${label}, ${count}` : count}
      className={cn('isolate flex items-center', className)}
      {...rest}
    >
      {shown.map((person, index) => (
        // Earlier avatars sit on top. The status dot is in the top-right corner, which is exactly
        // the part the next avatar would otherwise slide over.
        <li key={`${person.name}-${index}`} className={item(index)} style={{ zIndex: shown.length - index + 1 }}>
          <Avatar name={person.name} src={person.src} status={person.status} size={size} />
        </li>
      ))}
      {chip ? (
        // The chip's frame is never bevelled: when the chip is focusable, a clip-path on its parent
        // would cut the focus ring off the corner. The frame only has to cover the overlap.
        <li className={cn(item(shown.length, false), 'focus-within:z-50')}>
          {overflowTooltip ? (
            <span className="bevel-focus-wrap no-reticle">
              <Tooltip content={hiddenNames}>{chip}</Tooltip>
            </span>
          ) : (
            chip
          )}
        </li>
      ) : null}
    </ul>
  )
}
