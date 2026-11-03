import type { HTMLAttributes, ReactNode, Ref } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../../lib/cn'

export const badgeVariants = cva(
  'inline-flex items-center shrink-0 whitespace-nowrap font-mono uppercase tracking-wider rounded-[var(--shape-radius,0px)]',
  {
    variants: {
      // Two steps, both from values the system already has. `sm` is the chip every badge was
      // before the prop existed: 22px of chrome at the 11px label role. `md` is for a badge that
      // sits beside display-size type (a price, a hero numeral): the small control height and the
      // 14px text step, so it reads as a peer of a small Button and not as a caption.
      size: {
        sm: 'h-[22px] gap-1.5 px-2 text-[11px]',
        md: 'h-[var(--component-control-height-sm)] gap-2 px-3 text-sm',
      },
      tone: {
        neutral: '',
        signal: '',
        ok: '',
        warning: '',
        hostile: '',
        info: '',
      },
      // `subtle` is the outline treatment: a 1px border and text in the tone's text token, no fill.
      // There is no separate `outline` emphasis because it would be this exact look under a
      // second name.
      emphasis: { solid: '', subtle: 'border' },
    },
    compoundVariants: [
      // Solid: theme-invariant fill with its matching ink token. Never a literal white on a fill.
      { tone: 'neutral', emphasis: 'solid', class: 'bg-[var(--color-text-secondary)] text-[var(--color-surface-base)]' },
      { tone: 'signal', emphasis: 'solid', class: 'bg-[var(--color-accent-signal-fill)] text-[var(--color-accent-signal-ink)]' },
      { tone: 'ok', emphasis: 'solid', class: 'bg-[var(--color-accent-ok-fill)] text-[var(--color-accent-ok-ink)]' },
      { tone: 'warning', emphasis: 'solid', class: 'bg-[var(--color-accent-warning-fill)] text-[var(--color-accent-warning-ink)]' },
      { tone: 'hostile', emphasis: 'solid', class: 'bg-[var(--color-accent-hostile-fill)] text-[var(--color-accent-hostile-ink)]' },
      { tone: 'info', emphasis: 'solid', class: 'bg-[var(--color-accent-info-fill)] text-[var(--color-accent-info-ink)]' },
      // Subtle: theme-adaptive text token on the page surface, hairline border.
      { tone: 'neutral', emphasis: 'subtle', class: 'text-[var(--color-text-secondary)] border-[var(--color-border-hairline-strong)]' },
      { tone: 'signal', emphasis: 'subtle', class: 'text-[var(--color-accent-signal-text)] border-[var(--color-accent-signal-text)]' },
      { tone: 'ok', emphasis: 'subtle', class: 'text-[var(--color-accent-ok-text)] border-[var(--color-accent-ok-text)]' },
      { tone: 'warning', emphasis: 'subtle', class: 'text-[var(--color-accent-warning-text)] border-[var(--color-accent-warning-text)]' },
      { tone: 'hostile', emphasis: 'subtle', class: 'text-[var(--color-accent-hostile-text)] border-[var(--color-accent-hostile-text)]' },
      { tone: 'info', emphasis: 'subtle', class: 'text-[var(--color-accent-info-text)] border-[var(--color-accent-info-text)]' },
    ],
    defaultVariants: { tone: 'neutral', emphasis: 'subtle', size: 'sm' },
  }
)

/** Categorical colours for labels people make (a project tag, a topic), in the order a picker
 *  shows them. Not statuses: a category colour says "same group", never good or bad. Exported so
 *  an app can give each new label one, for example
 *  `CATEGORY_COLORS[Math.floor(Math.random() * CATEGORY_COLORS.length)]`. */
export const CATEGORY_COLORS = ['gray', 'brown', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'pink', 'red'] as const
export type CategoryColor = (typeof CATEGORY_COLORS)[number]

/** Full class strings, written out so Tailwind's scanner sees every one. Subtle borders reuse the
 *  text token, the same shape as the status tones; the contrast gate measures every pair. */
const CATEGORY_CLASSES: Record<CategoryColor, { solid: string; subtle: string }> = {
  gray: { solid: 'bg-[var(--color-category-gray-fill)] text-[var(--color-category-gray-ink)]', subtle: 'text-[var(--color-category-gray-text)] border-[var(--color-category-gray-text)]' },
  brown: { solid: 'bg-[var(--color-category-brown-fill)] text-[var(--color-category-brown-ink)]', subtle: 'text-[var(--color-category-brown-text)] border-[var(--color-category-brown-text)]' },
  orange: { solid: 'bg-[var(--color-category-orange-fill)] text-[var(--color-category-orange-ink)]', subtle: 'text-[var(--color-category-orange-text)] border-[var(--color-category-orange-text)]' },
  yellow: { solid: 'bg-[var(--color-category-yellow-fill)] text-[var(--color-category-yellow-ink)]', subtle: 'text-[var(--color-category-yellow-text)] border-[var(--color-category-yellow-text)]' },
  green: { solid: 'bg-[var(--color-category-green-fill)] text-[var(--color-category-green-ink)]', subtle: 'text-[var(--color-category-green-text)] border-[var(--color-category-green-text)]' },
  teal: { solid: 'bg-[var(--color-category-teal-fill)] text-[var(--color-category-teal-ink)]', subtle: 'text-[var(--color-category-teal-text)] border-[var(--color-category-teal-text)]' },
  blue: { solid: 'bg-[var(--color-category-blue-fill)] text-[var(--color-category-blue-ink)]', subtle: 'text-[var(--color-category-blue-text)] border-[var(--color-category-blue-text)]' },
  purple: { solid: 'bg-[var(--color-category-purple-fill)] text-[var(--color-category-purple-ink)]', subtle: 'text-[var(--color-category-purple-text)] border-[var(--color-category-purple-text)]' },
  pink: { solid: 'bg-[var(--color-category-pink-fill)] text-[var(--color-category-pink-ink)]', subtle: 'text-[var(--color-category-pink-text)] border-[var(--color-category-pink-text)]' },
  red: { solid: 'bg-[var(--color-category-red-fill)] text-[var(--color-category-red-ink)]', subtle: 'text-[var(--color-category-red-text)] border-[var(--color-category-red-text)]' },
}

type BadgeTone = VariantProps<typeof badgeVariants>['tone']

/** `tone` is a status; `color` is a category. A badge is one or the other, never both, so the
 *  types reject passing the two together. */
type BadgeColorProps =
  | { tone?: BadgeTone; color?: never }
  | { /** A categorical colour for a label someone made. Replaces tone. */ color: CategoryColor; tone?: never }

export type BadgeProps = Omit<HTMLAttributes<HTMLSpanElement>, 'color'> &
  Omit<VariantProps<typeof badgeVariants>, 'tone'> &
  BadgeColorProps & {
    /** An extra marker beside the text. Never a replacement for it — colour alone is not a status. */
    dot?: boolean
    /** A leading icon, aria-hidden and in the badge's own colour. Like the dot, it adds to the
     *  word and never replaces it. */
    icon?: ReactNode
    ref?: Ref<HTMLSpanElement>
  }

/** The icon box per size: 12px on the 22px chip, 14px on the 32px one, the same proportion the
 *  dot keeps. The icon takes currentColor, so it is measured by the same contrast pair as the
 *  badge's text. */
const ICON_SIZE = { sm: '[&_svg]:w-3 [&_svg]:h-3', md: '[&_svg]:w-3.5 [&_svg]:h-3.5' } as const

export function Badge({ tone, color, emphasis, size, dot = false, icon, className, children, ref, ...rest }: BadgeProps) {
  // A category colour replaces the tone: `tone: null` switches off cva's neutral default, so no
  // status colour is emitted beside it.
  const category = color ? CATEGORY_CLASSES[color] : undefined
  const classes = category
    ? cn(badgeVariants({ tone: null, emphasis, size }), category[emphasis ?? 'subtle'])
    : badgeVariants({ tone, emphasis, size })
  return (
    <span ref={ref} className={cn(classes, className)} {...rest}>
      {icon ? (
        <span aria-hidden="true" className={cn('inline-flex shrink-0', ICON_SIZE[size ?? 'sm'])}>
          {icon}
        </span>
      ) : null}
      {dot ? (
        <span aria-hidden="true" className={cn('bg-current shrink-0', size === 'md' ? 'w-2 h-2' : 'w-1.5 h-1.5')} />
      ) : null}
      {children}
    </span>
  )
}
