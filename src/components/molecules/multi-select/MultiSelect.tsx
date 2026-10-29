import { useId, useRef, useState, type KeyboardEvent, type Ref } from 'react'
import { Popover as RadixPopover } from 'radix-ui'
import { Check } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { useMergedRefs } from '../../../lib/refs'
import { inputVariants, Tag, type SelectOption } from '../../atoms'

/** Every part that scales with `inputSize`, in one place. Heights are the same tokens Input and
 *  Select use (32 / 40 / 48), text is Input's (xs / sm / base). The tags are a fixed 28px (Tag has
 *  one size), so the field's vertical padding is what makes the sizes differ with tags inside:
 *  sm hugs them (4 + 28 = 32), md and lg centre them in the taller minimum. The text field is
 *  28px to line up with the tags; option rows take 28 / 32 / 40px. */
const SIZES = {
  sm: { field: 'min-h-[var(--component-control-height-sm)] py-0.5 pr-2', text: 'text-xs', row: 'h-7' },
  md: { field: 'min-h-[var(--component-control-height-md)] py-1 pr-2.5', text: 'text-sm', row: 'h-8' },
  lg: { field: 'min-h-[var(--component-control-height-lg)] py-1.5 pr-3', text: 'text-base', row: 'h-10' },
} as const

export type MultiSelectProps = {
  /** Required: the field's accessible name, and the listbox's. FormField replaces it with its own. */
  label?: string
  options: SelectOption[]
  /** The controlled selection, as option values in the order they were chosen. */
  value?: string[]
  /** The uncontrolled initial selection. */
  defaultValue?: string[]
  onValueChange?: (value: string[]) => void
  /** Shown in the field while nothing is chosen. */
  placeholder?: string
  /** Shown in the panel when the typed text matches no option. */
  emptyMessage?: string
  /** @default 'md' */
  inputSize?: 'sm' | 'md' | 'lg'
  invalid?: boolean
  disabled?: boolean
  required?: boolean
  /** Submits each chosen value as its own hidden input under this name. */
  name?: string
  className?: string
  /** Forwarded to the text field inside the control. */
  ref?: Ref<HTMLInputElement>
  /** The text field's id, so a FormField's label and error text can point at it. */
  id?: string
  /** Help and error text ids, on the text field. FormField sets it. */
  'aria-describedby'?: string
}

/**
 * Several choices from a list. The chosen ones sit inside the field as removable `Tag`s, followed
 * by a text field that filters the list as you type. Built to the WAI-ARIA combobox pattern with a
 * multi-selectable listbox: focus never leaves the text field, the highlighted option is announced
 * through `aria-activedescendant`, and choosing an option keeps the list open so the next one is a
 * keystroke away.
 *
 * Positioning, outside-click and Escape come from Radix's Popover primitive anchored to the whole
 * field, not to a trigger: there is no trigger button, the field itself opens the list. The panel
 * is the same surface as Select's listbox and DropdownMenu (sunken fill, strong hairline,
 * crosshair) and moves with M7: it slides down out of the field and back up into it.
 *
 * A removed tag fades out and the tags after it slide into its place (Tag, M7); focus then returns
 * to the text field, since the button that had it is gone.
 *
 * Contrast: every pair is one Select and Tag already gate. The field reuses `inputVariants`, the
 * rows reuse Select's row colours, the tags are Tags.
 */
export function MultiSelect({
  label,
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder = 'Select…',
  emptyMessage = 'No matches',
  inputSize = 'md',
  invalid = false,
  disabled = false,
  required = false,
  name,
  className,
  ref,
  id,
  'aria-describedby': describedBy,
}: MultiSelectProps) {
  const [internal, setInternal] = useState<string[]>(defaultValue ?? [])
  const selected = value ?? internal
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const fieldRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const setInputRefs = useMergedRefs(inputRef, ref)
  const listboxId = useId()
  const optionId = (index: number) => `${listboxId}-option-${index}`

  const visible = options.filter(option =>
    option.label.toLowerCase().includes(query.trim().toLowerCase())
  )
  const byValue = new Map(options.map(option => [option.value, option]))

  const commit = (next: string[]) => {
    if (value === undefined) setInternal(next)
    onValueChange?.(next)
  }

  const toggle = (option: SelectOption) => {
    if (option.disabled) return
    commit(
      selected.includes(option.value)
        ? selected.filter(v => v !== option.value)
        : [...selected, option.value]
    )
    setQuery('')
  }

  // The next enabled option from `from` in direction `step`, wrapping; `from` itself when none is.
  const nextEnabled = (from: number, step: 1 | -1) => {
    for (let i = 1; i <= visible.length; i++) {
      const index = (from + step * i + visible.length) % visible.length
      if (!visible[index].disabled) return index
    }
    return from
  }

  const openList = () => {
    if (disabled || open) return
    setOpen(true)
    setActive(visible[0]?.disabled ? nextEnabled(0, 1) : 0)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault()
        if (!open) return openList()
        if (visible.length) setActive(nextEnabled(active, event.key === 'ArrowDown' ? 1 : -1))
        return
      }
      case 'Enter': {
        if (!open || !visible[active]) return
        event.preventDefault()
        toggle(visible[active])
        return
      }
      case 'Escape': {
        if (open) {
          event.preventDefault()
          setOpen(false)
        } else if (query) {
          setQuery('')
        }
        return
      }
      case 'Backspace': {
        if (query === '' && selected.length > 0) commit(selected.slice(0, -1))
        return
      }
    }
  }

  return (
    <RadixPopover.Root open={open && !disabled} onOpenChange={setOpen}>
      <RadixPopover.Anchor asChild>
        <div
          ref={fieldRef}
          data-disabled={disabled ? '' : undefined}
          onMouseDown={event => {
            // A press on the field's own padding focuses the text field and opens the list; a press
            // on a tag's remove button is left alone.
            if (event.target === event.currentTarget) {
              event.preventDefault()
              inputRef.current?.focus()
              openList()
            }
          }}
          className={cn(
            inputVariants({ inputSize, invalid }),
            SIZES[inputSize].field,
            'h-auto flex flex-wrap items-center gap-1 pl-1 cursor-text',
            // The ring belongs to the field, drawn when its text field has keyboard focus. A tag's
            // remove button draws its own.
            'has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-[var(--color-focus-ring)]',
            className
          )}
        >
          {selected.map(v => {
            const option = byValue.get(v)
            const text = option?.label ?? v
            return disabled ? (
              <Tag key={v}>{text}</Tag>
            ) : (
              <Tag
                key={v}
                onDismiss={() => {
                  commit(selected.filter(s => s !== v))
                  inputRef.current?.focus()
                }}
              >
                {text}
              </Tag>
            )
          })}
          <input
            ref={setInputRefs}
            id={id}
            type="text"
            role="combobox"
            aria-label={label}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            aria-required={required || undefined}
            aria-expanded={open && !disabled}
            aria-controls={open ? listboxId : undefined}
            aria-autocomplete="list"
            aria-activedescendant={open && visible[active] ? optionId(active) : undefined}
            autoComplete="off"
            disabled={disabled}
            value={query}
            placeholder={selected.length === 0 ? placeholder : undefined}
            onChange={event => {
              setQuery(event.target.value)
              setActive(0)
              setOpen(true)
            }}
            onClick={openList}
            onKeyDown={onKeyDown}
            onBlur={event => {
              // Leaving for the panel never happens (its rows do not take focus), so a blur to
              // anywhere outside the field closes the list.
              if (!fieldRef.current?.contains(event.relatedTarget as Node | null)) setOpen(false)
            }}
            className={cn(
              'flex-1 min-w-[4ch] h-[28px] px-1.5 bg-transparent border-0 outline-none',
              SIZES[inputSize].text,
              'text-[var(--component-control-text-rest)] placeholder:text-[var(--component-control-text-placeholder)]',
              'disabled:cursor-not-allowed'
            )}
          />
        </div>
      </RadixPopover.Anchor>

      {name
        ? selected.map(v => <input key={v} type="hidden" name={name} value={v} />)
        : null}

      <RadixPopover.Portal>
        <RadixPopover.Content
          side="bottom"
          align="start"
          sideOffset={4}
          // Focus stays in the text field, open and closed: that is the combobox pattern.
          onOpenAutoFocus={event => event.preventDefault()}
          onCloseAutoFocus={event => event.preventDefault()}
          onInteractOutside={event => {
            if (fieldRef.current?.contains(event.target as Node)) event.preventDefault()
          }}
          className={cn(
            // No overflow here: the crosshair's arms sit 5px outside this box, and on a box that
            // scrolls they count as overflowing content and add a horizontal scrollbar. The list
            // scrolls in the child below instead.
            'z-50 w-[var(--radix-popper-anchor-width)] p-1',
            'border border-[var(--color-border-hairline-strong)]',
            'bg-[var(--color-surface-sunken)] backdrop-blur-md crosshair anim-popover'
          )}
        >
          <div className="max-h-72 overflow-y-auto overflow-x-hidden">
          {visible.length === 0 ? (
            <p className="px-2 py-2 font-body text-sm text-[var(--color-text-secondary)]">{emptyMessage}</p>
          ) : null}
          <ul id={listboxId} role="listbox" aria-label={label} aria-multiselectable="true">
            {visible.map((option, index) => {
              const isSelected = selected.includes(option.value)
              return (
                <li
                  key={option.value}
                  id={optionId(index)}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={option.disabled || undefined}
                  data-highlighted={index === active ? '' : undefined}
                  onMouseDown={event => event.preventDefault()}
                  onMouseMove={() => {
                    if (!option.disabled) setActive(index)
                  }}
                  onClick={() => toggle(option)}
                  className={cn(
                    'relative flex items-center gap-2 px-2 pr-8 select-none cursor-default',
                    SIZES[inputSize].row,
                    'font-body text-[var(--color-text-primary)]',
                    SIZES[inputSize].text,
                    'data-[highlighted]:bg-[var(--color-accent-signal-indicator)]',
                    'data-[highlighted]:text-[var(--color-accent-signal-indicator-ink)]',
                    'aria-disabled:cursor-not-allowed aria-disabled:text-[var(--component-control-text-disabled)]'
                  )}
                >
                  <span className="min-w-0 truncate">{option.label}</span>
                  {isSelected ? (
                    <Check aria-hidden="true" className="absolute right-2 w-4 h-4" />
                  ) : null}
                </li>
              )
            })}
          </ul>
          </div>
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  )
}

// FormField passes its own label in. With the marker it does so even when none was written
// here, so a MultiSelect inside a FormField needs no label of its own.
MultiSelect.namedByFormField = true
