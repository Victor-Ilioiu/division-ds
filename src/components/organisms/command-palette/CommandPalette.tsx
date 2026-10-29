import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react'
import { Dialog as RadixDialog } from 'radix-ui'
import { Search as SearchIcon } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { Kbd } from '../../atoms'
import { Dialog } from '../dialog/Dialog'
import { OverlayFrame } from '../dialog/OverlayFrame'

export type Command = {
  id: string
  label: string
  /** Commands with the same group are drawn together under its heading. */
  group?: string
  /** Extra words a search matches on. */
  keywords?: string[]
  /** A hint shown on the option, e.g. "N". Display only: the palette does not bind it. */
  shortcut?: string
  /** Drawn aria-hidden; the label carries the meaning. */
  icon?: ReactNode
  onSelect: () => void
}

export type CommandGroup = { group?: string; commands: Command[] }

/** Every whitespace-separated term must appear in the label, the group or a keyword, ignoring case.
 *  A label that starts with the first term ranks first; otherwise the given order holds. */
export function filterCommands(commands: readonly Command[], query: string): Command[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return [...commands]
  const matches = commands.filter(command => {
    const haystack = [command.label, command.group ?? '', ...(command.keywords ?? [])].join(' ').toLowerCase()
    return terms.every(term => haystack.includes(term))
  })
  const leads = (command: Command) => command.label.toLowerCase().startsWith(terms[0])
  return [...matches.filter(leads), ...matches.filter(command => !leads(command))]
}

/** Groups in the order each group first appears; order within a group is kept. */
export function groupCommands(commands: readonly Command[]): CommandGroup[] {
  const groups: CommandGroup[] = []
  for (const command of commands) {
    let bucket = groups.find(group => group.group === command.group)
    if (!bucket) {
      bucket = { group: command.group, commands: [] }
      groups.push(bucket)
    }
    bucket.commands.push(command)
  }
  return groups
}

export type CommandPaletteProps = {
  commands: Command[]
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** Ctrl+K, or Cmd+K on macOS, toggles the palette from anywhere on the page. @default true */
  shortcut?: boolean
  /** The dialog's accessible name, visually hidden. @default 'Command palette' */
  label?: string
  /** The search field's accessible name. @default 'Search commands' */
  searchLabel?: string
  /** @default 'Type a command or search' */
  placeholder?: string
  /** @default 'No matching commands' */
  emptyMessage?: string
  /** The search field, while the palette is open. */
  ref?: Ref<HTMLInputElement>
}

/**
 * Contrast rows, by exact name. Field text and option labels: "text.primary on surface.base". The active
 * option: "accent.signal.indicator-ink on accent.signal.indicator", its fill "sidebar active item fill on
 * surface.base". Group headings: "text.label on surface.base" (the palette is always surface.base,
 * the one surface text.label holds on). The search glyph: "text.muted on surface.base". The empty
 * message: "text.secondary on surface.base". Shortcut hints: "dropdown menu label (text.secondary) on
 * surface.sunken". The field's ring: "focus.ring on surface.base". The placeholder: "command palette
 * placeholder (text.placeholder) on surface.base".
 */

type BodyProps = {
  commands: readonly Command[]
  searchLabel: string
  placeholder: string
  emptyMessage: string
  inputRef?: Ref<HTMLInputElement>
  /** A keydown in the field -- other than one that's part of an IME composition -- means the user
   *  moved on from whatever was selected before. */
  onUserAction: () => void
  onRun: (command: Command) => void
}

/** Mounts with the dialog content, so every open starts with an empty query. */
function PaletteBody({ commands, searchLabel, placeholder, emptyMessage, inputRef, onUserAction, onRun }: BodyProps) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const groups = useMemo(() => groupCommands(filterCommands(commands, query)), [commands, query])
  // The order the options are drawn in, which is the order the arrow keys walk.
  const ordered = useMemo(() => groups.flatMap(group => group.commands), [groups])
  const id = useId()
  const listId = `${id}-list`
  const optionId = (index: number) => `${id}-option-${index}`
  const active = ordered.length === 0 ? -1 : Math.min(activeIndex, ordered.length - 1)

  useEffect(() => {
    if (active < 0) return
    document.getElementById(`${id}-option-${active}`)?.scrollIntoView({ block: 'nearest' })
  }, [id, active])

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    // The key that commits or navigates a CJK IME composition (Enter to accept it, the arrows to
    // move between candidates) arrives here under the same key names as ordinary input.
    // `isComposing` catches it where the browser sets it; `keyCode === 229` is the legacy signal
    // Safari and older Android/Windows IMEs still use instead.
    if (event.nativeEvent.isComposing || event.keyCode === 229) return
    onUserAction()
    if (ordered.length === 0) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((active + 1) % ordered.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((active - 1 + ordered.length) % ordered.length)
    } else if (event.key === 'Home') {
      event.preventDefault()
      setActiveIndex(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      setActiveIndex(ordered.length - 1)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      onRun(ordered[active])
    }
  }

  // Where each group's options start in `ordered`, so an option knows its own index.
  const starts = groups.map((_, g) => groups.slice(0, g).reduce((sum, group) => sum + group.commands.length, 0))

  return (
    // The scroll container holds the field as well as the list: axe's scrollable-region-focusable
    // counts only tab stops, and options are not tab stops. The padding keeps the active option from
    // sliding under the sticky field.
    <div className="max-h-[min(28rem,70dvh)] overflow-y-auto scroll-pt-16">
      <div
        className={cn(
          'sticky top-0 z-10 flex items-center gap-3 px-4 bg-[var(--color-surface-base)] border-b border-[var(--color-border-hairline)]',
          // The bare field has no border to carry a ring, so the bar draws it, inset.
          'has-[input:focus-visible]:outline-2 has-[input:focus-visible]:-outline-offset-2 has-[input:focus-visible]:outline-[var(--color-focus-ring)]'
        )}
      >
        <SearchIcon aria-hidden="true" className="w-4 h-4 shrink-0 text-[var(--color-text-muted)]" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label={searchLabel}
          aria-expanded={ordered.length > 0}
          aria-controls={ordered.length > 0 ? listId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? optionId(active) : undefined}
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          value={query}
          onChange={event => {
            setQuery(event.target.value)
            setActiveIndex(0)
          }}
          onKeyDown={onKeyDown}
          className="h-14 w-full min-w-0 bg-transparent font-body text-base text-[var(--color-text-primary)] placeholder:text-[var(--color-text-placeholder)] outline-none"
        />
      </div>
      <p role="status" className="sr-only">
        {ordered.length === 1 ? '1 command' : `${ordered.length} commands`}
      </p>
      {ordered.length === 0 ? (
        <p className="px-4 py-8 text-center font-body text-sm text-[var(--color-text-secondary)]">{emptyMessage}</p>
      ) : (
        <div id={listId} role="listbox" aria-label="Commands" className="flex flex-col p-2">
          {groups.map((group, g) => {
            const headingId = `${id}-group-${g}`
            return (
              <Fragment key={group.group ?? `ungrouped-${g}`}>
                {group.group ? (
                  <div
                    id={headingId}
                    aria-hidden="true"
                    className="px-2 pt-2 pb-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-label)]"
                  >
                    {group.group}
                  </div>
                ) : null}
                <div role="group" aria-labelledby={group.group ? headingId : undefined} className="flex flex-col">
                  {group.commands.map((command, offset) => {
                    const index = starts[g] + offset
                    const isActive = index === active
                    return (
                      <div
                        key={command.id}
                        id={optionId(index)}
                        role="option"
                        aria-selected={isActive}
                        // Keeps focus in the field: an option is never a focus target.
                        onMouseDown={event => event.preventDefault()}
                        onMouseMove={() => {
                          if (!isActive) setActiveIndex(index)
                        }}
                        onClick={() => onRun(command)}
                        className={cn(
                          'flex items-center gap-3 min-h-10 px-2 font-body text-sm cursor-default select-none',
                          isActive
                            ? 'bg-[var(--color-accent-signal-indicator)] text-[var(--color-accent-signal-indicator-ink)]'
                            : 'text-[var(--color-text-primary)]'
                        )}
                      >
                        {command.icon ? (
                          <span aria-hidden="true" className="shrink-0 [&>svg]:w-4 [&>svg]:h-4">
                            {command.icon}
                          </span>
                        ) : null}
                        <span className="truncate">{command.label}</span>
                        {command.shortcut ? (
                          <Kbd aria-hidden="true" className="ml-auto">
                            {command.shortcut}
                          </Kbd>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </Fragment>
            )
          })}
        </div>
      )}
    </div>
  )
}

type SurfaceProps = Omit<BodyProps, 'onRun' | 'onUserAction'> & {
  label: string
  pending: RefObject<Command | null>
  close: () => void
}

function PaletteSurface({ label, pending, close, ...body }: SurfaceProps) {
  // A selection whose close is declined stays armed -- there is no way to tell "declined for
  // good" apart from "will be accepted asynchronously, once something else settles first", so
  // this treats them as the same thing rather than guessing: the palette closing later, by
  // whatever route, counts as accepting it. What clears it instead is the user visibly moving on
  // inside the still-open palette: typing or an arrow key in the field (onUserAction, from
  // PaletteBody), a pointer-down anywhere in the content, Escape, an outside click, or a Ctrl+K
  // toggle-close (the last one clears it directly in CommandPalette, which owns this ref).
  const onUserAction = () => {
    pending.current = null
  }

  return (
    <OverlayFrame
      overlayClassName="justify-center overflow-y-auto p-4 pt-[12vh]"
      onPointerDown={onUserAction}
      onEscapeKeyDown={onUserAction}
      onPointerDownOutside={onUserAction}
      // The frame has already handed focus back, so a command that moves focus on purpose keeps it.
      onCloseAutoFocus={() => {
        const command = pending.current
        pending.current = null
        command?.onSelect()
      }}
      className="crosshair self-start w-full max-w-xl border"
    >
      <RadixDialog.Title className="sr-only">{label}</RadixDialog.Title>
      <PaletteBody
        {...body}
        onUserAction={onUserAction}
        onRun={command => {
          pending.current = command
          close()
        }}
      />
    </OverlayFrame>
  )
}

export function CommandPalette({
  commands,
  open,
  defaultOpen = false,
  onOpenChange,
  shortcut = true,
  label = 'Command palette',
  searchLabel = 'Search commands',
  placeholder = 'Type a command or search',
  emptyMessage = 'No matching commands',
  ref,
}: CommandPaletteProps) {
  const [internal, setInternal] = useState(defaultOpen)
  const current = open ?? internal
  const setOpen = useCallback(
    (next: boolean) => {
      if (open === undefined) setInternal(next)
      onOpenChange?.(next)
    },
    [open, onOpenChange]
  )

  // Held until the palette has closed and handed focus back, then run: a command that moves focus
  // on purpose is not undone by the palette's own focus return. Owned here, not inside
  // PaletteSurface, so the Ctrl+K toggle below -- outside the palette's own DOM -- can clear it
  // too.
  const pending = useRef<Command | null>(null)

  useEffect(() => {
    if (!shortcut) return
    const onKeyDown = (event: KeyboardEvent) => {
      // A held Ctrl/Cmd already excludes ordinary typing in any other field. An IME mid-composition
      // (entering Japanese, Chinese or Korean text) can still dispatch a native keydown for the key
      // that confirms it, and that keystroke names no command here.
      if (event.isComposing) return
      // A held key auto-repeats as more keydowns with the same key, which would otherwise toggle
      // the palette open and shut on every repeat.
      if (event.repeat) return
      // Chrome's autofill dropdown dispatches a keydown with no `key` at all, so `.toLowerCase()`
      // on it throws -- optional-chain it rather than assume every keydown names a key.
      if (event.key?.toLowerCase() !== 'k' || !(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return
      // A field that already claimed this combination (its own keydown handler called
      // preventDefault) keeps it; the palette only takes a Ctrl+K nothing else wanted.
      if (event.defaultPrevented) return
      event.preventDefault()
      // Toggling the palette from here is the user moving on too, same as any other action inside
      // it: a selection still armed from a declined close is dropped, not carried into whatever
      // this keystroke opens or closes next.
      pending.current = null
      setOpen(!current)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [shortcut, current, setOpen])

  return (
    <Dialog open={current} onOpenChange={setOpen}>
      <PaletteSurface
        label={label}
        pending={pending}
        commands={commands}
        searchLabel={searchLabel}
        placeholder={placeholder}
        emptyMessage={emptyMessage}
        inputRef={ref}
        close={() => setOpen(false)}
      />
    </Dialog>
  )
}
