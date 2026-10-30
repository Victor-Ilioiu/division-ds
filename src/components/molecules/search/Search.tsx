import { useEffect, useRef, useState, type Ref } from 'react'
import { Search as SearchIcon, X } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { useMergedRefs } from '../../../lib/refs'
import { IconButton, Input, Kbd } from '../../atoms'

export type SearchProps = {
  /** Required: the field's accessible name, and the search landmark's. */
  label: string
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** Called on Enter with the trimmed value. Not called for an empty query. */
  onSearch?: (query: string) => void
  placeholder?: string
  /** One printable key, e.g. "/". Focuses the field from anywhere on the page, except while
   *  another text field has focus. Shown as a Kbd hint while the field is empty. */
  shortcut?: string
  inputSize?: 'sm' | 'md' | 'lg'
  className?: string
  ref?: Ref<HTMLInputElement>
}

const TYPING_TARGET = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]'

/**
 * A search field inside a named search landmark. Enter submits the trimmed query, Escape and the
 * clear button empty it, and an optional single-key shortcut focuses the field from anywhere on
 * the page unless another text field already has focus. No suggestions: that is the command
 * palette's job, with a listbox built for it.
 */
export function Search({
  label,
  value,
  defaultValue = '',
  onValueChange,
  onSearch,
  placeholder = 'Search',
  shortcut,
  inputSize = 'md',
  className,
  ref,
}: SearchProps) {
  const [internal, setInternal] = useState(defaultValue)
  const current = value ?? internal
  const inputRef = useRef<HTMLInputElement | null>(null)
  const setInputRef = useMergedRefs(inputRef, ref)

  const setValue = (next: string) => {
    if (value === undefined) setInternal(next)
    onValueChange?.(next)
  }

  useEffect(() => {
    if (!shortcut) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== shortcut || event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as Element | null
      if (target?.closest?.(TYPING_TARGET)) return
      event.preventDefault()
      inputRef.current?.focus()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [shortcut])

  return (
    <form
      role="search"
      aria-label={label}
      className={cn('relative flex items-center', className)}
      onSubmit={event => {
        event.preventDefault()
        const query = current.trim()
        if (query) onSearch?.(query)
      }}
    >
      <SearchIcon
        aria-hidden="true"
        className="pointer-events-none absolute left-3 w-4 h-4 text-[var(--color-text-muted)]"
      />
      <Input
        ref={setInputRef}
        type="search"
        aria-label={label}
        aria-keyshortcuts={shortcut}
        inputSize={inputSize}
        placeholder={placeholder}
        value={current}
        onChange={event => setValue(event.target.value)}
        onKeyDown={event => {
          if (event.key === 'Escape' && current) {
            event.preventDefault()
            setValue('')
          }
        }}
        className="pl-9 pr-10 [&::-webkit-search-cancel-button]:appearance-none"
      />
      <span className="absolute right-1.5 flex items-center">
        {current ? (
          <IconButton
            label="Clear search"
            variant="ghost"
            size="sm"
            className="h-7 w-7"
            wrapperClassName="no-reticle"
            onClick={() => {
              setValue('')
              inputRef.current?.focus()
            }}
          >
            <X aria-hidden="true" className="w-3.5 h-3.5" />
          </IconButton>
        ) : shortcut ? (
          <Kbd aria-hidden="true" size="sm" className="mr-1">
            {shortcut}
          </Kbd>
        ) : null}
      </span>
    </form>
  )
}
