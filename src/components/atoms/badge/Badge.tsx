import type { HTMLAttributes, ReactNode, Ref } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../../lib/cn'

export const badgeVariants = cva(
  'inline-flex items-center shrink-0 whitespace-nowrap font-mono uppercase tracking-wider',
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
      // Solid: theme-invariant fill with its matching ink. Never white text on a fill.
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

export type BadgeProps = HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants> & {
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

export function Badge({ tone, emphasis, size, dot = false, icon, className, children, ref, ...rest }: BadgeProps) {
  return (
    <span ref={ref} className={cn(badgeVariants({ tone, emphasis, size }), className)} {...rest}>
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
