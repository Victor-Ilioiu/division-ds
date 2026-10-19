import { useId, useLayoutEffect, useRef, type FormEvent, type KeyboardEvent } from 'react'
import { ArrowUp, Square } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { disabledObject } from '../../../lib/disabled'
import { Button, Textarea } from '../../atoms'

export type PromptInputProps = {
  /** Required. Names the box for a screen reader; visually hidden: "Message the assistant". */
  label: string
  /** Required. The draft. Controlled. */
  value: string
  /** Required. */
  onValueChange: (value: string) => void
  /** Required. Enter or Send; never with an empty or blank draft. The parent clears `value`. */
  onSubmit: (value: string) => void
  /** The assistant is working: Send becomes Stop, and Enter sends nothing. @default false */
  busy?: boolean
  /** Runs on Stop, and on Escape in the box while busy. */
  onStop?: () => void
  /** Ready-made prompts shown as chips above the box. A click submits that text. */
  suggestions?: readonly string[]
  placeholder?: string
  /** Nothing can be typed or sent. Say why nearby. @default false */
  disabled?: boolean
  /** The hint under the box. @default 'Enter to send, Shift+Enter for a new line' */
  hint?: string
  className?: string
}

/** About eight lines of 14px body text, plus the box's own padding: the most the box grows before
 *  it scrolls inside. */
const MAX_HEIGHT = 184

/**
 * Where a person writes to an assistant. A form that paints `surface.base` itself (the forms rule:
 * its field colours never depend on what is behind it), holding optional suggestion chips, the
 * box, the Send button and a one-line hint.
 *
 * Keys follow every chat a person has used: Enter sends, Shift+Enter is a new line. Enter during
 * IME composition (Japanese, Chinese) is the composition's own and never sends. A blank draft never
 * sends, by either path. While `busy`, Enter sends nothing, so a person can draft the next
 * message without firing it into a reply still arriving, and Escape stops the reply.
 *
 * Send and Stop are one button that changes its label, icon and action, not two buttons swapped,
 * so focus on it survives the switch in both directions; a click on either returns focus to the
 * box, where the next thing a person does happens. The box grows with its text from one line to
 * about eight, then scrolls inside, and never shrinks below one line.
 *
 * The label is visually hidden (the placeholder and the context say what the box is for), so this
 * is the one text control in the system that is not inside a FormField. The hint is the box's
 * description (`aria-describedby`), so the keys are read out the first time it takes focus.
 */
export function PromptInput({
  label,
  value,
  onValueChange,
  onSubmit,
  busy = false,
  onStop,
  suggestions,
  placeholder,
  disabled = false,
  hint = 'Enter to send, Shift+Enter for a new line',
  className,
}: PromptInputProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const boxRef = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const box = boxRef.current
    if (!box) return
    box.style.height = 'auto'
    if (box.scrollHeight > 0) box.style.height = `${Math.min(box.scrollHeight, MAX_HEIGHT)}px`
  }, [value])

  const send = (text: string) => {
    if (busy || disabled || text.trim() === '') return false
    onSubmit(text)
    return true
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (busy) onStop?.()
    else send(value)
    boxRef.current?.focus()
  }

  const keyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Escape' && busy && onStop) {
      event.preventDefault()
      onStop()
      return
    }
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
    event.preventDefault()
    send(value)
  }

  return (
    <form
      onSubmit={submit}
      className={cn('flex flex-col gap-2 bg-[var(--color-surface-base)]', className)}
    >
      {suggestions && suggestions.length > 0 ? (
        <div role="group" aria-label="Suggestions" className="flex flex-wrap gap-2">
          {suggestions.map(suggestion => (
            <button
              key={suggestion}
              type="button"
              disabled={busy || disabled}
              onClick={() => {
                send(suggestion)
                boxRef.current?.focus()
              }}
              className={cn(
                'inline-flex items-center min-h-8 px-3 py-1 text-left font-body text-sm',
                'border border-[var(--color-border-hairline-strong)] text-[var(--color-text-secondary)]',
                'hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-control)]',
                disabledObject,
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]'
              )}
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="flex items-end gap-2">
        <Textarea
          ref={boxRef}
          id={id}
          rows={1}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          aria-describedby={hintId}
          onChange={event => onValueChange(event.target.value)}
          onKeyDown={keyDown}
          className="min-h-[var(--component-control-height-md)] resize-none overflow-y-auto"
          style={{ maxHeight: MAX_HEIGHT }}
        />
        <Button
          type="submit"
          variant={busy ? 'secondary' : 'primary'}
          disabled={disabled}
          iconStart={busy ? <Square /> : <ArrowUp />}
        >
          {busy ? 'Stop' : 'Send'}
        </Button>
      </div>
      <p id={hintId} className="font-body text-sm text-[var(--color-text-secondary)]">
        {hint}
      </p>
    </form>
  )
}
