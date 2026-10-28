import { Sparkles, Undo2 } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { IconButton } from '../icon-button/IconButton'

/** The AI-filled look, shared by Input and Textarea. ai.wash is laid over the control fill as a
 *  background image rather than replacing the fill, so the pixel under the text is the composite
 *  the contrast gate measures (`scripts/lib/contrast-pairs.mjs`, "AI presence"). */
export const AI_FILLED_CLASS = cn(
  'border-[var(--color-ai-border)] hover:border-[var(--color-ai-border)]',
  '[background-image:linear-gradient(var(--color-ai-wash),var(--color-ai-wash))]'
)

/**
 * Where a field stands against the value an AI proposed, after Carbon for AI: the field looks AI
 * while its value is the AI's, and returns to normal the moment the person changes it, offering
 * the AI's value back. One comparison, so there is no "touched" flag to keep in sync: typing the
 * AI's value back by hand makes the field AI again, which is true.
 */
export function aiFieldState(aiValue: string | undefined, current: string, locked: boolean) {
  if (aiValue === undefined) return { filled: false, canRevert: false }
  const filled = current === aiValue
  return { filled, canRevert: !filled && !locked }
}

/** Sets a field's value through React's change detection, so the caller's onChange fires for a
 *  controlled and an uncontrolled field alike (see Input's clear button). */
export function setNativeValue(node: HTMLInputElement | HTMLTextAreaElement, next: string) {
  const proto = node instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(node, next)
  node.dispatchEvent(new Event('input', { bubbles: true }))
}

/** The glyph inside an AI-filled field. The words are what a screen reader hears, through the
 *  field's aria-describedby; the icon is the visible mark, in ai.text. */
export function AiFieldMark({ id }: { id: string }) {
  return (
    <span id={id} className="flex h-7 w-7 items-center justify-center text-[var(--color-ai-text)]">
      <Sparkles aria-hidden="true" className="w-3.5 h-3.5" />
      <span className="sr-only">Filled by AI</span>
    </span>
  )
}

/** Puts the AI's value back. The same ghost 28px button as Input's clear button. */
export function AiRevertButton({ onRevert }: { onRevert: () => void }) {
  return (
    <IconButton variant="ghost" size="sm" className="h-7 w-7" wrapperClassName="no-reticle" label="Revert to suggestion" onClick={onRevert}>
      <Undo2 aria-hidden="true" className="w-3.5 h-3.5" />
    </IconButton>
  )
}
