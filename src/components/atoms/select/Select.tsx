import { Fragment, type AriaAttributes, type ComponentPropsWithoutRef, type ReactNode, type Ref } from 'react'
import { Select as RadixSelect } from 'radix-ui'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { disabledText } from '../../../lib/disabled'
import { inputVariants } from '../input/Input'

export type SelectOption = { value: string; label: string; disabled?: boolean }

/** A Select row: a `SelectOption` plus an optional leading icon. Kept as its own type rather than
 *  an `icon` field on `SelectOption`, because MultiSelect takes `SelectOption[]` too and renders
 *  no icons: widening the shared type would let an icon compile there and vanish. */
export type SelectOptionWithIcon = SelectOption & {
  /** Leading glyph, aria-hidden: the label names the row. Not repeated in the trigger. */
  icon?: ReactNode
}

/** A titled run of rows. The heading is not selectable; it names the group for screen readers. */
export type SelectGroup = { label: string; options: SelectOptionWithIcon[] }

/** The list comes in one of two shapes, never both: flat `options`, or `groups` with headings. */
type SelectList =
  | { options: SelectOptionWithIcon[]; groups?: never }
  | { groups: SelectGroup[]; options?: never }

/** `RadixSelect.Root`'s own prop type (`SelectSharedProps & { value, defaultValue,
 *  onValueChange }`, read from `@radix-ui/react-select`'s `.d.mts`) has no index signature and no
 *  `aria-*`/`data-*`/`className`. Passing anything outside that closed set as a *top-level* prop
 *  to `<Select>` used to just vanish: TypeScript's JSX checker exempts hyphenated names
 *  (`aria-*`, `data-*`) from excess-property checking on ANY element, so e.g.
 *  `<Select data-testid="x" />` compiled cleanly, `data-testid` was destructured into `rest`,
 *  spread onto `RadixSelect.Root` (a context provider with no DOM node of its own), and never
 *  reached any element in the render tree — silently, with no type error and no runtime error.
 *  That is worse than a same-element override (Input/Textarea/Checkbox/Radio's shape): there, a
 *  caller-supplied prop at least *lands somewhere*, just not where it's supposed to win; here it
 *  landed nowhere at all. Same root cause as `IconButton`'s original `aria-label` `Omit`
 *  and Avatar's — the hyphenated-key exemption — but a new failure mode: silent disappearance,
 *  not silent override.
 *
 *  Fix: a second, explicit rest path — `triggerProps` — typed against
 *  `RadixSelect.Trigger`'s own props and spread onto that element, which is the actual visible,
 *  interactive DOM node. `SelectTriggerRestProps` excludes `'aria-label'`, `'aria-invalid'`,
 *  `'id'` and `'aria-describedby'` by redeclaring each `never` rather than `Omit`-ing them alone.
 *  `aria-describedby` needs the redeclaration because `Omit` alone is inert against a hyphenated
 *  key. `id` is an ordinary key, so a caller passing a literal `triggerProps={{ id: 'x' }}` is
 *  already rejected by `Omit` alone, through ordinary excess-property checking — but that checking
 *  only fires on a fresh literal, and this file's own tests prove a guard load-bearing with a
 *  non-literal value instead (assigned to a `const` first, which bypasses excess-property checking
 *  regardless of the key's shape — see the comment on the `aria-label`/`aria-invalid` tests in
 *  `Select.test.tsx`). Against that shape the `Omit` entry for `id` does nothing; `id?: never` is
 *  what actually rejects it, and is the one doing real work here. Do not delete it on the reasoning
 *  that `Omit` already covers `id` — it only covers the literal case nothing here tests for. The
 *  `id`/`aria-describedby` tests also give their non-literal object a second, genuinely valid prop
 *  (`onClick`) alongside the banned key. That is not a guard against TypeScript's "no properties in
 *  common" weak-type check (TS2559) — `SelectTriggerRestProps`'s own `` [key: `data-${string}`]:
 *  unknown `` index signature (below) already makes the type non-weak, so TS2559 never runs against
 *  it today. The extra prop is insurance against that index signature being removed later: without
 *  it, a single-key object would put TS2559 back in play and a passing test would prove nothing
 *  about the `never` guard.
 *  `RadixSelect.Trigger` itself computes `aria-controls`/`aria-expanded`/`data-state`/
 *  `data-placeholder` and THEN spreads whatever it receives on top (verified by reading
 *  `@radix-ui/react-select/dist/index.mjs`)
 *  — the same compute-then-spread ordering also present on Switch/Checkbox/Radio's triggers. This
 *  component passes `aria-label={label}`/`aria-invalid={...}` first and `{...triggerProps}`
 *  after, so without the `never` guard a caller's `triggerProps['aria-label']` would win over
 *  `label` at runtime exactly the way IconButton's did before its fix. `id` and
 *  `aria-describedby` are spread again, after `triggerProps`, from `Select`'s own top-level `id`/
 *  `aria-describedby` props — the ones FormField wires up — so without this guard a
 *  `triggerProps.id` would compile, lose silently to FormField's `id` when both are given, and
 *  win silently when FormField gives neither: reachable, and exactly the shape this component's
 *  own guarantee rule (`design.md`) exists to close. */
export type SelectTriggerRestProps = Omit<
  ComponentPropsWithoutRef<typeof RadixSelect.Trigger>,
  'aria-label' | 'aria-invalid' | 'aria-describedby' | 'id' | 'className'
> & {
  'aria-label'?: never
  'aria-invalid'?: never
  'aria-describedby'?: never
  id?: never
  /** `ComponentPropsWithoutRef<typeof RadixSelect.Trigger>` (this @types/react version) has no
   *  `data-*` index signature of its own, so a plain object literal assigned to `triggerProps`
   *  gets ordinary excess-property checking — NOT the JSX-attribute hyphenated exemption this
   *  whole type exists to route around (that exemption is specific to a JSX opening element's
   *  attribute list, never to a nested object literal). Without this signature, something like
   *  `triggerProps={{ 'data-testid': 'x' }}` would fail to compile even though it's exactly the
   *  legitimate use this prop is for. Scoped to `data-*` only — `aria-*` beyond the two banned
   *  keys already comes through the `Omit<...>` above via Trigger's real prop type. */
  [key: `data-${string}`]: unknown
}

/** Every standard `aria-*` attribute, each one DECLARED (not matched by a pattern) with type
 *  `never`. That distinction is load-bearing and is not what it looks like: an index signature
 *  over a template-literal pattern — `` { [key: `aria-${string}`]: never } `` — is **inert
 *  against a JSX attribute**, even though it correctly rejects the same key in an ordinary
 *  object literal. TypeScript's JSX checker looks the attribute up as a *property* of the target
 *  type; an index signature is not a property, the lookup misses, and the hyphenated-name
 *  exemption then waves the attribute through unchecked. (Probed against this repo's own
 *  TypeScript 6.0, 2026-09-21: the pattern form compiled `<C aria-describedby="y" />` with zero
 *  errors while a declared `'aria-describedby'?: never` produced TS2322 on the same line. An
 *  optional index signature is not even syntactically legal — `?:` is rejected outright.)
 *  Mapping over `keyof AriaAttributes` produces real declared properties for the finite set React
 *  knows about, which is what actually enforces this. `aria-describedby` is the one exception: it
 *  is declared on SelectProps and routed to the trigger, because FormField points it at help and
 *  error text. */
type NoTopLevelAriaProps = { [K in Exclude<keyof AriaAttributes, 'aria-describedby'>]?: never }

/** The top-level rest goes to `RadixSelect.Root`, which renders no DOM node — so `aria-*` keys
 *  are declared `never` here, not merely omitted. `triggerProps` fixed the symptom for a caller
 *  who knows that prop exists; this closes the route a caller reaches for first.
 *  `<Select label="x" options={[]} aria-labelledby="err-1" />` used to compile (TypeScript's
 *  JSX checker exempts hyphenated attribute names from excess-property checking, so `Omit<>` is
 *  inert against them), land in `rest`, spread onto a context provider, and vanish with no type
 *  error, no runtime error, and no element anywhere in the tree carrying it. `aria-describedby`
 *  is what FormField reaches for, so it is declared and routed to the trigger instead of banned.
 *
 *  **Known residual gap, stated rather than papered over:** `data-*` has no finite declared key
 *  set to map over, so only `data-testid` can be declared. An arbitrary `<Select data-foo="x" />`
 *  still compiles and still vanishes. There is no type-level construct that closes it: the
 *  pattern index signature is inert in JSX (above), and React declares no `data-*` properties.
 *  Closing it for real means changing where the top-level rest lands, not the type — out of
 *  scope here.
 *
 *  `children` is excluded for a different reason: `RadixSelect.Root`'s own prop type offers it,
 *  but this component renders its own Trigger/Portal children, so JSX children on the element
 *  always win and a `children` prop is silently discarded. `children` is an ordinary key, so the
 *  `Omit` does the rejecting and the declared `never` only makes the error legible — both are
 *  shipped, matching `IconButton`. */
export type SelectProps = Omit<ComponentPropsWithoutRef<typeof RadixSelect.Root>, 'children'> &
  NoTopLevelAriaProps &
  SelectList & {
  'data-testid'?: never
  children?: never
  /** Required: the trigger's accessible name. */
  label: string
  placeholder?: string
  inputSize?: 'sm' | 'md' | 'lg'
  invalid?: boolean
  className?: string
  ref?: Ref<HTMLButtonElement>
  /** The trigger's id, so a FormField's label and error text can point at it. */
  id?: string
  /** Routed to the trigger, after `triggerProps`, so FormField's value wins. */
  'aria-describedby'?: string
  /** Extra props for the visible trigger button (e.g. `data-testid`) — NOT the same as the
   *  top-level rest, which goes to `RadixSelect.Root`'s control props instead. See the type
   *  comment on `SelectTriggerRestProps` for why this exists as a separate path. */
  triggerProps?: SelectTriggerRestProps
}

const ITEM_CLASSES = cn(
  'relative flex items-center gap-2 h-8 px-2 pr-8 select-none outline-none',
  'font-body text-sm text-[var(--color-text-primary)]',
  'data-[highlighted]:bg-[var(--color-accent-signal-fill)]',
  'data-[highlighted]:text-[var(--color-accent-signal-ink)]',
  disabledText,
  'data-[disabled]:pointer-events-none'
)

function SelectRow({ option }: { option: SelectOptionWithIcon }) {
  return (
    <RadixSelect.Item value={option.value} disabled={option.disabled} className={ITEM_CLASSES}>
      {option.icon !== undefined ? (
        // Outside ItemText on purpose: Radix copies ItemText into the trigger, and the trigger
        // shows the chosen label only. The icon inherits the row colour, so it follows the
        // highlight to ink with no pair of its own.
        <span aria-hidden="true" className="inline-flex shrink-0 [&>svg]:w-4 [&>svg]:h-4">
          {option.icon}
        </span>
      ) : null}
      <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
      <RadixSelect.ItemIndicator className="absolute right-2">
        <Check aria-hidden="true" className="w-4 h-4" />
      </RadixSelect.ItemIndicator>
    </RadixSelect.Item>
  )
}

/**
 * A single choice from a list, on Radix Select. `options` is a flat list; `groups` puts the rows
 * under headings (Radix `Group` + `Label`, so each group is a `role="group"` named by its
 * heading). The heading is the mono label style in `text.secondary`, the pair DropdownMenu's own
 * label already gates on this surface ("dropdown menu label (text.secondary) on
 * surface.sunken"), and groups are split by the same `border.hairline` rule DropdownMenu's
 * separator paints.
 */
export function Select({
  label,
  options,
  groups,
  placeholder = 'Select…',
  inputSize = 'md',
  invalid = false,
  className,
  ref,
  triggerProps,
  id,
  'aria-describedby': describedBy,
  ...rest
}: SelectProps) {
  return (
    <RadixSelect.Root {...rest}>
      <RadixSelect.Trigger
        ref={ref}
        aria-label={label}
        aria-invalid={invalid ? true : undefined}
        className={cn(
          inputVariants({ inputSize, invalid }),
          'inline-flex items-center justify-between gap-2 text-left',
          'data-[placeholder]:text-[var(--component-control-text-placeholder)]',
          'data-[disabled]:data-[placeholder]:text-[var(--component-control-text-disabled)]',
          className
        )}
        {...triggerProps}
        {...(id !== undefined ? { id } : {})}
        {...(describedBy !== undefined ? { 'aria-describedby': describedBy } : {})}
      >
        <RadixSelect.Value placeholder={placeholder} />
        <RadixSelect.Icon>
          <ChevronDown aria-hidden="true" className="w-4 h-4 shrink-0" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>

      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={4}
          className={cn(
            'z-50 min-w-[var(--radix-select-trigger-width)]',
            'border border-[var(--color-border-hairline-strong)]',
            'bg-[var(--color-surface-sunken)] backdrop-blur-md',
            // The listbox is the one atom that is a SURFACE framing other content, so it takes
            // the crosshair rather than the cut corner: in this system the cut is the shape of a
            // single object and the crosshair is the frame around several. It is also the shape
            // that cannot be cut — clip-path would clip the crosshair's arms, which are drawn
            // 5px outside the element, and would cut the last row's selection fill on the
            // corner. `overflow-hidden` came off with it for the same reason.
            'crosshair',
            'anim-popover'
          )}
        >
          <RadixSelect.Viewport className="p-1">
            {groups
              ? groups.map((group, index) => (
                  <Fragment key={group.label}>
                    {index > 0 ? (
                      <RadixSelect.Separator className="my-1 h-px bg-[var(--color-border-hairline)]" />
                    ) : null}
                    <RadixSelect.Group>
                      <RadixSelect.Label className="px-2 pt-2 pb-1 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">
                        {group.label}
                      </RadixSelect.Label>
                      {group.options.map(option => (
                        <SelectRow key={option.value} option={option} />
                      ))}
                    </RadixSelect.Group>
                  </Fragment>
                ))
              : options.map(option => <SelectRow key={option.value} option={option} />)}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  )
}
