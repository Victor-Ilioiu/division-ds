import type { ComponentPropsWithoutRef, ReactNode, Ref } from 'react'
import { DropdownMenu as RadixMenu } from 'radix-ui'
import { Check, ChevronRight } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { disabledText } from '../../../lib/disabled'

/**
 * A menu of actions behind a trigger. Radix supplies roles, aria-haspopup/aria-expanded on the
 * trigger, roving highlight, typeahead, Home/End and Escape-returns-focus. Nothing here
 * re-implements any of that.
 *
 * The trigger is always a Button or IconButton through asChild, so it carries the bevelled focus
 * wrapper and reticle for free (see Global Constraints, "the focus ring is never clipped").
 */
export const DropdownMenu = RadixMenu.Root
export const DropdownMenuTrigger = RadixMenu.Trigger

// Same surface as Select's listbox (Select.tsx, RadixSelect.Content ~140-152), so the system's
// two popups read as one family: sunken fill, strong hairline, backdrop blur, the crosshair motif
// (a surface framing several items, not a single cut object), M7 slide (down in, up out). Never `panel`: it sits
// outside Tailwind's layers and would override these utilities.
const CONTENT_CLASSES =
  'crosshair z-50 min-w-[12rem] p-1 bg-[var(--color-surface-sunken)] border border-[var(--color-border-hairline-strong)] backdrop-blur-md anim-popover'

const ITEM_CLASSES = cn(
  'group relative flex items-center gap-2 min-h-[36px] px-2.5 font-body text-sm select-none outline-none cursor-default',
  'text-[var(--color-text-primary)]',
  // Selection is fill, as on Select's highlighted row.
  'data-[highlighted]:bg-[var(--color-accent-signal-indicator)] data-[highlighted]:text-[var(--color-accent-signal-indicator-ink)]',
  disabledText
)

export function DropdownMenuContent({
  className,
  sideOffset = 4,
  ref,
  ...rest
}: ComponentPropsWithoutRef<typeof RadixMenu.Content> & { ref?: Ref<HTMLDivElement> }) {
  return (
    <RadixMenu.Portal>
      <RadixMenu.Content ref={ref} sideOffset={sideOffset} className={cn(CONTENT_CLASSES, className)} {...rest} />
    </RadixMenu.Portal>
  )
}

export type DropdownMenuItemProps = Omit<
  ComponentPropsWithoutRef<typeof RadixMenu.Item>,
  'aria-keyshortcuts'
> & {
  /** 'hostile' for a destructive action: hostile text at rest, hostile fill with ink when
   *  highlighted, so a destructive action never borrows the signal fill. */
  tone?: 'default' | 'hostile'
  icon?: ReactNode
  /** Shown on the right and exposed as aria-keyshortcuts. The menu does not bind the shortcut;
   *  the page that owns the action does. */
  shortcut?: string
  ref?: Ref<HTMLDivElement>
  /** Renders the one child (a link) as the item, for a menu of links. `icon` and `shortcut` are
   *  ignored then: put the content inside the child. */
  asChild?: boolean
  /** The hyphenated-key rule (design.md): this component computes aria-keyshortcuts from
   *  `shortcut` and then spreads `{...rest}` after it, so `Omit<>` alone cannot stop a caller
   *  overriding it — TypeScript's JSX checker exempts hyphenated (`aria-*`, `data-*`) attribute
   *  names from excess-property checking. Redeclaring the key `never` here closes that hole, the way
   *  Select's `aria-label`/`aria-invalid` and IconButton's `aria-label` already do. */
  'aria-keyshortcuts'?: never
}

export function DropdownMenuItem({
  tone = 'default',
  icon,
  shortcut,
  className,
  children,
  ref,
  asChild = false,
  ...rest
}: DropdownMenuItemProps) {
  const classes = cn(
    ITEM_CLASSES,
    tone === 'hostile' &&
      'text-[var(--color-accent-hostile-text)] data-[highlighted]:bg-[var(--color-accent-hostile-fill)] data-[highlighted]:text-[var(--color-accent-hostile-ink)]',
    className
  )
  if (asChild)
    return (
      <RadixMenu.Item ref={ref} asChild className={cn(classes, 'cursor-pointer')} {...rest}>
        {children}
      </RadixMenu.Item>
    )
  return (
    <RadixMenu.Item
      ref={ref}
      aria-keyshortcuts={shortcut}
      className={cn(
        ITEM_CLASSES,
        tone === 'hostile' &&
          'text-[var(--color-accent-hostile-text)] data-[highlighted]:bg-[var(--color-accent-hostile-fill)] data-[highlighted]:text-[var(--color-accent-hostile-ink)]',
        className
      )}
      {...rest}
    >
      {icon ? (
        <span aria-hidden="true" className="w-4 h-4 shrink-0 [&>svg]:w-4 [&>svg]:h-4">
          {icon}
        </span>
      ) : null}
      <span className="grow">{children}</span>
      {shortcut ? (
        // aria-hidden exempts the span from the accessibility tree, never from being a visible
        // pixel a sighted reader has to read, so it carries a real colour at rest rather than a
        // faded one: `text.secondary` for a default item (the same pair `DropdownMenuLabel` above
        // already gates as "dropdown menu label (text.secondary) on surface.sunken"),
        // `accent.hostile.text` for a hostile item (the same pair already gated as "dropdown
        // hostile item text on surface.sunken", chosen over text.secondary so the shortcut still
        // reads as hostile, not neutral). `group-data-[highlighted]:text-inherit` (the Item itself
        // carries `group` and is what `data-[highlighted]` toggles) then picks up whatever ink
        // colour the highlighted row already painted the Item text with — `accent.signal.indicator-ink on
        // accent.signal.indicator` or `accent.hostile.ink on accent.hostile.fill`, both already gated
        // at 4.5:1 above — rather than a third, separately-measured colour.
        <span
          aria-hidden="true"
          className={cn(
            'font-mono text-[11px] group-data-[highlighted]:text-inherit',
            tone === 'hostile' ? 'text-[var(--color-accent-hostile-text)]' : 'text-[var(--color-text-secondary)]',
            'group-data-[disabled]:text-[var(--component-control-text-disabled)]'
          )}
        >
          {shortcut}
        </span>
      ) : null}
    </RadixMenu.Item>
  )
}

export function DropdownMenuCheckboxItem({
  className,
  children,
  ref,
  ...rest
}: ComponentPropsWithoutRef<typeof RadixMenu.CheckboxItem> & { ref?: Ref<HTMLDivElement> }) {
  return (
    <RadixMenu.CheckboxItem ref={ref} className={cn(ITEM_CLASSES, 'pl-8', className)} {...rest}>
      <RadixMenu.ItemIndicator className="absolute left-2.5 inline-flex">
        <Check aria-hidden="true" className="w-4 h-4" />
      </RadixMenu.ItemIndicator>
      {children}
    </RadixMenu.CheckboxItem>
  )
}

/** A set of mutually exclusive choices inside the menu: a sort order, a density. Radix gives it
 *  `role="group"` and each item `menuitemradio` with `aria-checked`. */
export const DropdownMenuRadioGroup = RadixMenu.RadioGroup

/**
 * One choice in a `DropdownMenuRadioGroup`. The mark is a small filled square, not a dot: the
 * avatar is the system's only circle, and the square is still unmistakably not the checkbox
 * item's tick. It paints in `currentColor`, so it follows the row from `text.primary` to the ink
 * on the highlight, the two pairs the row's text already holds.
 */
export function DropdownMenuRadioItem({
  className,
  children,
  ref,
  ...rest
}: ComponentPropsWithoutRef<typeof RadixMenu.RadioItem> & { ref?: Ref<HTMLDivElement> }) {
  return (
    <RadixMenu.RadioItem ref={ref} className={cn(ITEM_CLASSES, 'pl-8', className)} {...rest}>
      <RadixMenu.ItemIndicator className="absolute left-2.5 inline-flex w-4 h-4 items-center justify-center">
        <span aria-hidden="true" className="w-2 h-2 bg-current" />
      </RadixMenu.ItemIndicator>
      {children}
    </RadixMenu.RadioItem>
  )
}

/**
 * A nested menu. Radix supplies aria-haspopup/aria-expanded on the trigger, ArrowRight to open
 * (highlighting the first item), ArrowLeft or Escape to come back, and the pointer grace area
 * that keeps the submenu open while the cursor crosses to it. One level only: a second level
 * at menu sizes is a hunt, not a choice.
 */
export const DropdownMenuSub = RadixMenu.Sub

export function DropdownMenuSubTrigger({
  className,
  children,
  icon,
  ref,
  ...rest
}: ComponentPropsWithoutRef<typeof RadixMenu.SubTrigger> & { icon?: ReactNode; ref?: Ref<HTMLDivElement> }) {
  return (
    <RadixMenu.SubTrigger
      ref={ref}
      className={cn(
        ITEM_CLASSES,
        // While its submenu is open and the highlight has moved into it, the trigger keeps a 1px
        // strong hairline inside its edge, so it still reads as where the submenu came from.
        // A border, not the signal wash: the wash has no gated text pair on surface.sunken.
        'data-[state=open]:not-data-[highlighted]:shadow-[inset_0_0_0_1px_var(--color-border-hairline-strong)]',
        className
      )}
      {...rest}
    >
      {icon ? (
        <span aria-hidden="true" className="w-4 h-4 shrink-0 [&>svg]:w-4 [&>svg]:h-4">
          {icon}
        </span>
      ) : null}
      <span className="grow">{children}</span>
      <ChevronRight aria-hidden="true" className="w-4 h-4 shrink-0" />
    </RadixMenu.SubTrigger>
  )
}

/** The submenu surface: the same classes as `DropdownMenuContent`, so a submenu is the same
 *  object one level in, and the same M7 slide. */
export function DropdownMenuSubContent({
  className,
  sideOffset = 4,
  // Minus the content's padding and border, so the submenu's first row lines up with its trigger.
  alignOffset = -5,
  ref,
  ...rest
}: ComponentPropsWithoutRef<typeof RadixMenu.SubContent> & { ref?: Ref<HTMLDivElement> }) {
  return (
    <RadixMenu.Portal>
      <RadixMenu.SubContent
        ref={ref}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        className={cn(CONTENT_CLASSES, className)}
        {...rest}
      />
    </RadixMenu.Portal>
  )
}

export function DropdownMenuLabel({ className, ...rest }: ComponentPropsWithoutRef<typeof RadixMenu.Label>) {
  return (
    <RadixMenu.Label
      className={cn(
        // text.label was the token made for exactly this job -- a label over a list of items
        // that must not itself read as one of them -- but on this component's own sunken
        // surface (not surface.base, which is all the base gate ever measured against) it fails
        // SC 1.4.3 in dark theme: #6f7a88 on #0d1016 measures 4.37:1, below the 4.5:1 floor.
        // (Light theme's 4.506:1 narrowly clears it -- a single shared token still needed to
        // move, since both themes have to pass, not just one.) text.secondary is gated on
        // surface.sunken instead (see scripts/lib/contrast-pairs.mjs, "dropdown menu label
        // (text.secondary) on surface.sunken") and reads close enough to a label at this size
        // and tracking.
        'px-2.5 pt-2 pb-1 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-secondary)]',
        className
      )}
      {...rest}
    />
  )
}

export function DropdownMenuSeparator({ className, ...rest }: ComponentPropsWithoutRef<typeof RadixMenu.Separator>) {
  return <RadixMenu.Separator className={cn('my-1 h-px bg-[var(--color-border-hairline)]', className)} {...rest} />
}
