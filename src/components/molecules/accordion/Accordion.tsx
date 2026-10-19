import { createContext, useContext, type ComponentPropsWithoutRef, type Ref } from 'react'
import { Accordion as RadixAccordion } from 'radix-ui'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { disabledText } from '../../../lib/disabled'

export type AccordionVariant = 'plain' | 'boxed'

const VariantContext = createContext<AccordionVariant>('plain')

export type AccordionProps = ComponentPropsWithoutRef<typeof RadixAccordion.Root> & {
  /**
   * `plain` separates the items with hairlines and nothing else: for a long run of questions
   * on a page that already has its own surface. `boxed` gives every item its own panel with the
   * cut corner: for a few sections that each stand alone, such as settings groups.
   * @default 'plain'
   */
  variant?: AccordionVariant
  ref?: Ref<HTMLDivElement>
}
export type AccordionItemProps = ComponentPropsWithoutRef<typeof RadixAccordion.Item> & {
  ref?: Ref<HTMLDivElement>
}
export type AccordionTriggerProps = ComponentPropsWithoutRef<typeof RadixAccordion.Trigger> & {
  /**
   * The level of the heading the trigger sits in. The page decides its own outline, the same as
   * CardTitle: a FAQ under an h2 takes 3, a top-level list of sections takes 2.
   * @default 3
   */
  level?: 2 | 3 | 4 | 5 | 6
  ref?: Ref<HTMLButtonElement>
}
export type AccordionContentProps = ComponentPropsWithoutRef<typeof RadixAccordion.Content> & {
  ref?: Ref<HTMLDivElement>
}

/**
 * Sections that open and close in place. Radix supplies the button-in-a-heading structure,
 * aria-expanded and aria-controls, the region role on the content, arrow-key movement between
 * triggers, Home/End, single or multiple mode and `collapsible`. Nothing here re-implements any of
 * that; this file is shape, motion and the heading level.
 *
 * The variant travels to the items through context, so a consumer sets it once on the root and the
 * items, triggers and panels all agree.
 */
export function Accordion({ variant = 'plain', className, ref, ...rest }: AccordionProps) {
  return (
    <VariantContext.Provider value={variant}>
      <RadixAccordion.Root
        ref={ref}
        data-variant={variant}
        className={cn(
          'flex flex-col',
          variant === 'plain' ? 'border-t border-[var(--color-border-hairline)]' : 'gap-3',
          className
        )}
        {...rest}
      />
    </VariantContext.Provider>
  )
}

/**
 * One section. In `boxed`, the panel is an `aria-hidden` backing layer, never the item itself:
 * the cut corner is a `clip-path`, and a clip-path on the item would clip the trigger's focus ring
 * and anything focusable inside the open content. The same split Tag makes (design.md, "Cut
 * corners"). The layer holds shape, fill and border; the item stays unclipped, and its children
 * are positioned so they paint above the layer.
 *
 * The fill is `surface.raised`, so the text pairs are the ones Card already gates: text.primary
 * and text.secondary on surface.raised (over surface.base).
 */
export function AccordionItem({ className, children, ref, ...rest }: AccordionItemProps) {
  const variant = useContext(VariantContext)
  return (
    <RadixAccordion.Item
      ref={ref}
      data-accordion-item=""
      className={cn(
        variant === 'plain' ? 'border-b border-[var(--color-border-hairline)]' : 'relative',
        className
      )}
      {...rest}
    >
      {variant === 'boxed' ? (
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute inset-0 bevel-md bevel-edge',
            'bg-[var(--color-surface-raised)] border border-[var(--color-border-hairline)]',
            '[--bevel-edge-color:var(--color-border-hairline)]'
          )}
        />
      ) : null}
      {children}
    </RadixAccordion.Item>
  )
}

/**
 * The button, inside a heading of the consumer's level (Radix's Header renders an h3 unless told
 * otherwise; `asChild` hands it ours). The chevron turns half a revolution on `--duration-base`,
 * the same clock as the panel opening, and holds still under reduced motion.
 *
 * Focus ring: outside the trigger in `plain`, the house default. Inset in `boxed`, because a
 * rectangle drawn round a panel with a cut corner misses the corner it is meant to outline.
 */
export function AccordionTrigger({ level = 3, className, children, ref, ...rest }: AccordionTriggerProps) {
  const variant = useContext(VariantContext)
  const Heading = `h${level}` as const
  return (
    <RadixAccordion.Header asChild>
      <Heading className="relative flex">
        <RadixAccordion.Trigger
          ref={ref}
          className={cn(
            'group flex flex-1 items-center justify-between gap-4 text-left',
            'font-display font-semibold text-base leading-snug text-[var(--color-text-primary)]',
            'hover:underline underline-offset-4 decoration-[var(--color-border-hairline-strong)]',
            'focus-visible:outline-2 focus-visible:outline-[var(--color-focus-ring)]',
            variant === 'plain'
              ? 'px-1 py-4 focus-visible:outline-offset-2'
              : 'px-5 py-4 focus-visible:-outline-offset-2',
            disabledText,
            'disabled:hover:no-underline',
            className
          )}
          {...rest}
        >
          {children}
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'size-4 shrink-0 text-[var(--color-text-secondary)]',
              'transition-transform duration-[var(--duration-base)] ease-[var(--ease-snap)] motion-reduce:transition-none',
              'group-data-[state=open]:rotate-180'
            )}
          />
        </RadixAccordion.Trigger>
      </Heading>
    </RadixAccordion.Header>
  )
}

/**
 * The panel. `.anim-accordion` (src/styles/motion.css) animates its height between 0 and Radix's
 * measured `--radix-accordion-content-height`, opening and closing on the same `--duration-base`/`--ease-snap` clock (a faster close overshoots the
 * root height in single mode, where one panel closes as another opens). Radix's Presence keeps a
 * closing panel mounted until that animation ends. The
 * clip is on the outer element; the padding is on an inner one, so a collapsed panel is truly 0px
 * tall rather than its padding tall.
 */
export function AccordionContent({ className, children, ref, ...rest }: AccordionContentProps) {
  const variant = useContext(VariantContext)
  return (
    <RadixAccordion.Content
      ref={ref}
      className="anim-accordion relative overflow-hidden font-body text-sm text-[var(--color-text-secondary)]"
      {...rest}
    >
      <div className={cn(variant === 'plain' ? 'px-1 pb-5' : 'px-5 pb-5', className)}>{children}</div>
    </RadixAccordion.Content>
  )
}
