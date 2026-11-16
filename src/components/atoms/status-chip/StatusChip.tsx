import type { Ref } from 'react'
import { cn } from '../../../lib/cn'
import { Badge, type BadgeProps } from '../badge/Badge'

export type StatusChipProps = Omit<BadgeProps, 'size' | 'emphasis' | 'dot' | 'icon' | 'children' | 'color' | 'tone' | 'severity'> & {
  /** Required. One short word: HOT, CAP, TREND. Uppercased by the Badge. */
  label: string
  /** A Badge status tone. Muted neutral by default; signal only for the one thing to act on.
   *  @default 'neutral' */
  tone?: 'neutral' | 'signal' | 'ok' | 'warning' | 'hostile' | 'info'
  ref?: Ref<HTMLSpanElement>
}

/** A small filled tag in the data face (11px, uppercase) built on Badge's solid tones, so
 *  it adds no colour of its own: every fill/ink pair is the Badge's gated one. */
export function StatusChip({ label, tone = 'neutral', className, ref, ...rest }: StatusChipProps) {
  return (
    <Badge
      ref={ref}
      tone={tone}
      emphasis="solid"
      size="sm"
      className={cn('h-[18px] px-1.5 font-data text-[11px] font-semibold uppercase', className)}
      {...rest}
    >
      {label}
    </Badge>
  )
}
