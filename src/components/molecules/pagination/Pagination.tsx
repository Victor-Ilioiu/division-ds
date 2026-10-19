import { useId, useState, type ReactNode, type Ref } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { Button, IconButton, Input, Select } from '../../atoms'

/** Pure. 1-based. Always includes page 1, the last page, the current page and `siblings` pages
 *  either side of it. A gap stands for two or more hidden pages; a single hidden page is shown
 *  instead, because a gap that hides one number costs the same space as the number. */
export function paginationRange(page: number, pageCount: number, siblings = 1): (number | 'gap')[] {
  if (pageCount < 1) return []
  const current = Math.min(Math.max(1, page), pageCount)
  // First, last, current, and `siblings` either side. Five slots of context in the default case.
  const slots = siblings * 2 + 5
  if (pageCount <= slots) return Array.from({ length: pageCount }, (_, i) => i + 1)

  const left = Math.max(current - siblings, 1)
  const right = Math.min(current + siblings, pageCount)
  // A gap is only worth drawing when it hides at least two pages.
  const gapLeft = left > 3
  const gapRight = right < pageCount - 2

  if (!gapLeft) {
    const head = Array.from({ length: 3 + siblings * 2 }, (_, i) => i + 1)
    return [...head, 'gap', pageCount]
  }
  if (!gapRight) {
    const tailLength = 3 + siblings * 2
    const tail = Array.from({ length: tailLength }, (_, i) => pageCount - tailLength + 1 + i)
    return [1, 'gap', ...tail]
  }
  const middle = Array.from({ length: right - left + 1 }, (_, i) => left + i)
  return [1, 'gap', ...middle, 'gap', pageCount]
}

export type PaginationProps = {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  /** What sits between Previous and Next. Default 'numbered'. */
  variant?: 'numbered' | 'compact' | 'select'
  /** Pages shown either side of the current page, for 'numbered'. Default 1. */
  siblings?: number
  /** Adds First and Last buttons at the ends. */
  showFirstLast?: boolean
  /** Previous and Next as labelled buttons ("Previous", "Next") instead of icon-only ones. */
  showLabels?: boolean
  /** Adds a "Go to page" field that jumps on Enter or Go. */
  showJump?: boolean
  /** The number of items being paged; with pageSize, shows the range on view ("21–40 of 400"). */
  totalItems?: number
  /** Items per page, for the range text and the rows-per-page Select. */
  pageSize?: number
  /** With pageSize, shows a rows-per-page Select. */
  onPageSizeChange?: (pageSize: number) => void
  /** The rows-per-page choices. Default [10, 20, 50, 100]. */
  pageSizeOptions?: number[]
  /** The nav landmark's accessible name. Default 'Pagination'. */
  label?: string
  className?: string
  ref?: Ref<HTMLElement>
}

const MONO = 'font-mono text-xs tabular-nums text-[var(--color-text-secondary)]'

/** "Go to page": a numeric field and a Go button. Not a form element, so it can sit inside one. A typed
 *  page past either end goes to that end. */
function JumpToPage({ pageCount, onGo }: { pageCount: number; onGo: (page: number) => void }) {
  const id = useId()
  const [draft, setDraft] = useState('')
  const go = () => {
    const target = Number.parseInt(draft, 10)
    if (Number.isFinite(target)) onGo(Math.min(Math.max(1, target), pageCount))
    setDraft('')
  }
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className={MONO}>
        Go to page
      </label>
      <Input
        id={id}
        inputSize="sm"
        inputMode="numeric"
        value={draft}
        onChange={event => setDraft(event.target.value.replace(/[^0-9]/g, ''))}
        onKeyDown={event => {
          if (event.key === 'Enter') {
            event.preventDefault()
            go()
          }
        }}
        className="w-14 text-center font-mono tabular-nums"
      />
      <Button variant="secondary" size="sm" onClick={go}>
        Go
      </Button>
    </div>
  )
}

/**
 * Moves through a long list a page at a time. Buttons, not links: the molecule reports a page
 * number, and the organism decides whether that is a route change or a fetch.
 *
 * The current page is a primary Button (signal fill with ink, this system's selection grammar)
 * with aria-current="page", not `disabled` — a disabled button is skipped by screen readers' tab
 * navigation, and the current page would vanish from the sequence it is meant to mark.
 *
 * Page buttons are named "Page 3", not "3", so the element list is not a column of bare numbers.
 * `tabular-nums` keeps the row from shifting width between pages 9 and 10.
 *
 * The nav and the page list both wrap rather than scroll sideways: a scroll container would
 * clip a focused button's ring at the edge, and `siblings={2}` overflows a 320px viewport without
 * it. Wrapping to a second row costs nothing worse than a taller control.
 *
 * Previous/Next at the ends use `aria-disabled`, not `disabled`. A native
 * `disabled` button is pulled out of the tab order entirely, so the moment Next disables itself at
 * the last page, keyboard focus falls out of the control and lands on `document.body` with nowhere
 * to go — a real focus-loss defect, not a cosmetic one. `aria-disabled` keeps the button a real tab
 * stop (Button.tsx already styles `aria-disabled:` the same as `disabled:`, cursor and opacity, and
 * IconButton shares `buttonVariants` so it gets that for free), and `go()` below already no-ops
 * outside `[1, pageCount]`, so a click on an inert end button does nothing rather than needing a
 * second guard. This is one of two patterns in this system for an inert-at-a-bound control:
 * `aria-disabled` here, because Previous/Next are real tab stops a keyboard user reaches directly;
 * QuantityStepper's buttons take the other one (`tabIndex={-1}`, focus moves to the field itself
 * when a bound is hit) because those buttons were never independent tab stops to begin with — they
 * sit beside a spinbutton field that already owns the value. Same problem, different starting
 * shape, so a different fix. First and Last follow the same rule.
 *
 * Variants come from one component rather than five (compared against reui.io's fifteen pagination
 * examples, 2026-10-14). `variant` picks what sits between Previous and Next: the numbered pages, a
 * "Page 3 of 20" readout, or a page Select. The rest compose with any of the three:
 * `showFirstLast`, `showLabels`, `showJump`, and the table-footer pair, `totalItems` with
 * `pageSize` (a "21–40 of 400" range at the start) and `onPageSizeChange` (a rows-per-page
 * Select). No circle or pill buttons: the square and the cut corner are this system's shape.
 */
export function Pagination({
  page,
  pageCount,
  onPageChange,
  variant = 'numbered',
  siblings = 1,
  showFirstLast = false,
  showLabels = false,
  showJump = false,
  totalItems,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  label = 'Pagination',
  className,
  ref,
}: PaginationProps) {
  if (pageCount < 1) return null
  const current = Math.min(Math.max(1, page), pageCount)
  const go = (next: number) => {
    if (next !== current && next >= 1 && next <= pageCount) onPageChange(next)
  }
  const atStart = current === 1
  const atEnd = current === pageCount

  const step = (direction: 'previous' | 'next') => {
    const isPrevious = direction === 'previous'
    const inert = (isPrevious ? atStart : atEnd) || undefined
    const target = isPrevious ? current - 1 : current + 1
    const Icon = isPrevious ? ChevronLeft : ChevronRight
    if (showLabels) {
      return (
        <Button variant="ghost" size="sm" aria-disabled={inert} onClick={() => go(target)} className="px-2">
          {isPrevious ? <Icon aria-hidden="true" className="w-4 h-4" /> : null}
          {isPrevious ? 'Previous' : 'Next'}
          {isPrevious ? null : <Icon aria-hidden="true" className="w-4 h-4" />}
        </Button>
      )
    }
    return (
      <IconButton
        label={isPrevious ? 'Previous page' : 'Next page'}
        variant="ghost"
        size="sm"
        aria-disabled={inert}
        onClick={() => go(target)}
      >
        <Icon aria-hidden="true" className="w-4 h-4" />
      </IconButton>
    )
  }

  const edge = (which: 'first' | 'last') => {
    const Icon = which === 'first' ? ChevronsLeft : ChevronsRight
    return (
      <IconButton
        label={which === 'first' ? 'First page' : 'Last page'}
        variant="ghost"
        size="sm"
        aria-disabled={(which === 'first' ? atStart : atEnd) || undefined}
        onClick={() => go(which === 'first' ? 1 : pageCount)}
      >
        <Icon aria-hidden="true" className="w-4 h-4" />
      </IconButton>
    )
  }

  let middle: ReactNode
  if (variant === 'compact') {
    // Polite live text: the buttons around it never change, so this is the only thing that says
    // the page moved.
    middle = (
      <span aria-live="polite" className={cn(MONO, 'px-2')}>
        Page {current} of {pageCount}
      </span>
    )
  } else if (variant === 'select') {
    middle = (
      <span className={cn(MONO, 'flex items-center gap-2 px-1')}>
        <span aria-hidden="true">Page</span>
        <Select
          label="Page"
          inputSize="sm"
          className="w-auto min-w-16 font-mono tabular-nums"
          value={String(current)}
          onValueChange={next => go(Number(next))}
          options={Array.from({ length: pageCount }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))}
        />
        <span>of {pageCount}</span>
      </span>
    )
  } else {
    middle = (
      // role="list": list-none removes list semantics from VoiceOver/Safari, not just the bullet
      // (the same pattern Breadcrumbs already carries).
      <ul role="list" className="flex flex-wrap items-center gap-1 list-none">
        {paginationRange(current, pageCount, siblings).map((item, index) =>
          item === 'gap' ? (
            <li
              key={`gap-${index}`}
              aria-hidden="true"
              className="px-1 font-mono text-xs text-[var(--color-text-muted)]"
            >
              …
            </li>
          ) : (
            <li key={item}>
              <Button
                variant={item === current ? 'primary' : 'ghost'}
                size="sm"
                aria-label={`Page ${item}`}
                aria-current={item === current ? 'page' : undefined}
                className="min-w-8 px-2 font-mono tabular-nums"
                onClick={() => go(item)}
              >
                {item}
              </Button>
            </li>
          )
        )}
      </ul>
    )
  }

  const controls = (
    <div className="flex flex-wrap items-center gap-1">
      {showFirstLast ? edge('first') : null}
      {step('previous')}
      {middle}
      {step('next')}
      {showFirstLast ? edge('last') : null}
    </div>
  )
  const jump = showJump ? <JumpToPage pageCount={pageCount} onGo={go} /> : null

  const range =
    totalItems !== undefined && pageSize !== undefined ? (
      <p className={MONO}>
        {totalItems === 0
          ? '0 of 0'
          : `${(current - 1) * pageSize + 1}–${Math.min(current * pageSize, totalItems)} of ${totalItems}`}
      </p>
    ) : null

  const sizer =
    pageSize !== undefined && onPageSizeChange ? (
      <span className={cn(MONO, 'flex items-center gap-2')}>
        <span aria-hidden="true">Rows per page</span>
        <Select
          label="Rows per page"
          inputSize="sm"
          className="w-auto min-w-16 font-mono tabular-nums"
          value={String(pageSize)}
          onValueChange={next => onPageSizeChange(Number(next))}
          options={pageSizeOptions.map(size => ({ value: String(size), label: String(size) }))}
        />
      </span>
    ) : null

  // With a range or a rows-per-page Select, it is a table footer: the range at the start, the
  // controls pushed to the end.
  const footer = range !== null || sizer !== null

  return (
    <nav
      ref={ref}
      aria-label={label}
      className={cn(
        'flex flex-wrap items-center',
        footer ? 'justify-between gap-x-6 gap-y-3' : 'gap-x-4 gap-y-2',
        className
      )}
    >
      {range}
      {footer ? (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          {sizer}
          {controls}
          {jump}
        </div>
      ) : (
        <>
          {controls}
          {jump}
        </>
      )}
    </nav>
  )
}
