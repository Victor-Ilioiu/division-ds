import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { hasErrors, summarize, useFieldErrors } from '../../../lib/field-errors'
import { Button } from '../../atoms/button/Button'
import { Input } from '../../atoms/input/Input'
import { Select, type SelectOptionWithIcon } from '../../atoms/select/Select'
import { CATEGORY_COLORS, type CategoryColor } from '../../atoms/badge/Badge'
import { FormField } from '../../molecules/form-field/FormField'
import { ErrorSummary } from '../../molecules/form-field/ErrorSummary'
import { Dialog, DialogClose, DialogContent, DialogFooter } from '../dialog/Dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter } from '../alert-dialog/AlertDialog'

/** What the column dialog hands back: a new column's fields, or an edited column's. */
export type KanbanColumnDraft = {
  title: string
  /** No colour is `undefined`. */
  color?: CategoryColor
  /** A work-in-progress limit: the most cards the column should hold. No limit is `undefined`. */
  limit?: number
}

/** The picker's names for the category colours, in the order the Select lists them. */
export const KANBAN_COLOR_NAMES: Record<CategoryColor, string> = {
  gray: 'Grey',
  brown: 'Brown',
  orange: 'Orange',
  yellow: 'Yellow',
  green: 'Green',
  teal: 'Teal',
  blue: 'Blue',
  purple: 'Purple',
  pink: 'Pink',
  red: 'Red',
}

const NO_COLOR = 'none'

/** A 12px square of the colour's fill. Decorative: the option's name says which colour it is. */
export function ColorSwatch({ color }: { color?: CategoryColor }) {
  return (
    <span
      aria-hidden="true"
      className="block w-3 h-3 shrink-0 border border-[var(--color-border-hairline-strong)]"
      style={color ? { backgroundColor: `var(--color-category-${color}-fill)` } : undefined}
    />
  )
}

const COLOR_OPTIONS: SelectOptionWithIcon[] = [
  { value: NO_COLOR, label: 'No colour', icon: <ColorSwatch /> },
  ...CATEGORY_COLORS.map(color => ({ value: color, label: KANBAN_COLOR_NAMES[color], icon: <ColorSwatch color={color} /> })),
]

type Field = 'title' | 'limit'
const FIELDS: readonly Field[] = ['title', 'limit']

const validate = (field: Field, value: string) => {
  if (field === 'title') return value.trim() === '' ? 'Enter a name for the column.' : undefined
  const text = value.trim()
  if (text === '') return undefined
  return /^\d+$/.test(text) && Number(text) > 0 ? undefined : 'Enter a whole number above 0, or leave it empty for no limit.'
}

/**
 * The New column and Edit column dialog: a name, a colour and an optional card limit. A failed
 * Save fills an ErrorSummary at the top and moves focus to it, as every form in the system does.
 * Mounted fresh for each opening (the board keys it), so it starts from `initial` every time.
 */
export function KanbanColumnFormDialog({
  open,
  onOpenChange,
  title,
  submitLabel,
  initial,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  submitLabel: string
  initial: KanbanColumnDraft
  onSubmit: (draft: KanbanColumnDraft) => void
}) {
  const uid = useId()
  const idOf = (field: Field) => `${uid}-${field}`
  const [name, setName] = useState(initial.title)
  const [color, setColor] = useState<string>(initial.color ?? NO_COLOR)
  const [limit, setLimit] = useState(initial.limit === undefined ? '' : String(initial.limit))
  const [attempt, setAttempt] = useState(0)
  const errors = useFieldErrors<Field>(validate)
  const summary = useRef<HTMLDivElement>(null)
  const valueOf = (field: Field) => (field === 'title' ? name : limit)

  useEffect(() => {
    if (attempt > 0) summary.current?.focus()
  }, [attempt])

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (hasErrors(errors.validateAll(FIELDS, valueOf))) {
      setAttempt(count => count + 1)
      return
    }
    onSubmit({
      title: name.trim(),
      color: color === NO_COLOR ? undefined : (color as CategoryColor),
      limit: limit.trim() === '' ? undefined : Number(limit.trim()),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title} size="sm">
        <form noValidate onSubmit={submit} className="flex flex-col gap-4">
          <ErrorSummary ref={summary} headingLevel={3} errors={attempt > 0 ? summarize(errors.errors, FIELDS, idOf) : []} />
          <FormField label="Name" error={errors.errors.title} required>
            <Input
              id={idOf('title')}
              value={name}
              autoComplete="off"
              onChange={event => {
                setName(event.target.value)
                errors.change('title', event.target.value)
              }}
              onBlur={event => errors.blur('title', event.target.value, event.relatedTarget)}
            />
          </FormField>
          <FormField label="Colour" help="Tints the column and its cards.">
            <Select options={COLOR_OPTIONS} value={color} onValueChange={setColor} iconInTrigger />
          </FormField>
          <FormField label="Card limit" help="The most cards this column should hold. Leave it empty for no limit." error={errors.errors.limit}>
            <Input
              id={idOf('limit')}
              value={limit}
              inputMode="numeric"
              autoComplete="off"
              className="max-w-32"
              onChange={event => {
                setLimit(event.target.value)
                errors.change('limit', event.target.value)
              }}
              onBlur={event => errors.blur('limit', event.target.value, event.relatedTarget)}
            />
          </FormField>
          <DialogFooter className="mt-2">
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button type="submit">{submitLabel}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const DELETE_CARDS = '__delete__'

/**
 * Confirms deleting a column. An empty one goes on a plain confirm; one with cards asks where
 * they go first (the next column by default, or deleted with it), the way Jira does, so deleting
 * a column never deletes work by surprise.
 */
export function KanbanColumnDeleteDialog({
  open,
  onOpenChange,
  columnTitle,
  cardCount,
  others,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  columnTitle: string
  cardCount: number
  /** The columns its cards can move to, nearest first. */
  others: readonly { id: string; title: string }[]
  onConfirm: (moveCardsTo: string | null) => void
}) {
  const [target, setTarget] = useState(others[0]?.id ?? DELETE_CARDS)
  const cards = cardCount === 1 ? '1 card' : `${cardCount} cards`
  const description =
    cardCount === 0
      ? 'The column is removed from the board. It has no cards.'
      : `Its ${cards} move to the column you choose below, or are deleted with it.`
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent title={`Delete ${columnTitle}?`} description={description} size="sm">
        {cardCount === 0 ? null : (
          <FormField label={cardCount === 1 ? 'Move its card to' : 'Move its cards to'}>
            <Select
              value={target}
              onValueChange={setTarget}
              options={[
                ...others.map(other => ({ value: other.id, label: other.title })),
                { value: DELETE_CARDS, label: cardCount === 1 ? 'Delete the card too' : 'Delete the cards too' },
              ]}
            />
          </FormField>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Keep column</AlertDialogCancel>
          <AlertDialogAction onClick={() => onConfirm(cardCount === 0 || target === DELETE_CARDS ? null : target)}>
            Delete column
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
