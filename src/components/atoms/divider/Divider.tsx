import type { HTMLAttributes, Ref } from 'react'
import { Separator } from 'radix-ui'
import { cn } from '../../../lib/cn'

/** Every native div prop except `role` is available — a molecule composing a Divider can attach
 *  a `data-testid` or extra `aria-*`/`data-*` attributes. `role` is typed `never` rather than
 *  merely omitted: the component's whole guarantee is that `label` (via `decorative={!label}`)
 *  decides between `role="none"` and `role="separator"`, and Radix's own `Primitive.div` spreads
 *  `domProps` *after* its computed `semanticProps` — so a caller-supplied `role` surviving into
 *  the rest spread would silently win at runtime, not just look wrong in the type. Same remedy as
 *  Button's asChild/disabled union, IconButton's aria-label exclusion, and Link's target/rel
 *  exclusion on `external`.
 *
 *  `children` is excluded too, and Divider is the worst case of the five atoms that offered it:
 *  in the `!label` branch there are no JSX children, so a caller's `children` DOES render —
 *  inside a `decorative` separator, where nothing should be. In the `label` branch the JSX
 *  children win and it vanishes. One prop, two behaviours, neither of them the one a caller
 *  would expect. It is an ordinary key, so the `Omit` does the rejecting and the declared
 *  `never` only makes the error legible; both are shipped, matching `IconButton`. */
export type DividerProps = Omit<HTMLAttributes<HTMLDivElement>, 'role' | 'children'> & {
  orientation?: 'horizontal' | 'vertical'
  /** A legend set into the rule. A labelled divider is structure, so it stops being decorative. */
  label?: string
  className?: string
  ref?: Ref<HTMLDivElement>
  role?: never
  children?: never
}

const RULE = 'bg-[var(--color-border-hairline)] shrink-0'

export function Divider({ orientation = 'horizontal', label, className, ref, ...rest }: DividerProps) {
  if (!label) {
    return (
      <Separator.Root
        ref={ref}
        decorative
        orientation={orientation}
        className={cn(RULE, orientation === 'horizontal' ? 'h-px w-full' : 'w-px self-stretch', className)}
        {...rest}
      />
    )
  }

  return (
    <Separator.Root
      ref={ref}
      orientation={orientation}
      className={cn(
        'flex items-center gap-3',
        orientation === 'horizontal' ? 'w-full' : 'flex-col self-stretch',
        className
      )}
      {...rest}
    >
      <span className={cn(RULE, orientation === 'horizontal' ? 'h-px flex-1' : 'w-px flex-1')} />
      <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-muted)]">
        {label}
      </span>
      <span className={cn(RULE, orientation === 'horizontal' ? 'h-px flex-1' : 'w-px flex-1')} />
    </Separator.Root>
  )
}
