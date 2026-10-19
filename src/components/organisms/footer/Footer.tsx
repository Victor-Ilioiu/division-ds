import { useId, useState, type ReactNode, type Ref } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { renderAnchor, type LinkRenderProps } from '../../../lib/render-link'
import { Link, linkVariants } from '../../atoms'

export type FooterLink = { label: string; href: string; external?: boolean }
export type FooterColumn = {
  title: string
  links: FooterLink[]
  /** Whether this group starts open where the groups are an accordion. Ignored where they are a
   *  grid, because nothing collapses there. @default false */
  defaultOpen?: boolean
}
export type FooterAside = {
  /** The section's heading, drawn like a group title: the footer adds the slash. */
  title: string
  /** Anything: a sign-up form, an address, opening hours. */
  content: ReactNode
}

export type FooterProps = {
  /** Required: the nav landmark's name. */
  label: string
  /** A small brand mark above the link groups. Leave it out when `wordmark` is set: the wordmark
   *  is the brand, and a second copy of the name would be announced twice. */
  brand?: ReactNode
  tagline?: string
  /** The link groups, on the left. The grid is drawn for up to six: four across at the widest. */
  columns: FooterColumn[]
  /** A second section, to the right of the link groups from 64rem and under them below that. */
  aside?: FooterAside
  /** The small print: a copyright line, a legal link. Under the two sections, above the wordmark. */
  legal?: ReactNode
  /**
   * The brand's name, set across the whole width of the footer with its foot cut off by the
   * footer's bottom edge. Nothing is drawn under it. It is the footer's one statement of the
   * name: an image named by this string, announced once.
   */
  wordmark?: string
  /**
   * Decoration behind the wordmark: a layer the full width of the footer, from under the small
   * print to the bottom edge. Position what you pass with `absolute inset-0`. The layer is
   * `aria-hidden` and takes no pointer input, so it must hold nothing a reader needs and nothing
   * focusable.
   */
  backdrop?: ReactNode
  /** The level of the group headings and of the aside's heading, to fit the page outline.
   *  @default 2 */
  headingLevel?: 2 | 3 | 4
  /** Draws internal links. External ones are always the Link atom, which announces the new tab. */
  renderLink?: (props: LinkRenderProps) => ReactNode
  /**
   * Merged with the root classes. The horizontal inset of everything but the wordmark and the
   * backdrop is the page gutter, `--page-gutter` (src/styles/tailwind.css): 1rem when nothing
   * sets it, and whatever the shell around the footer sets it to otherwise.
   */
  className?: string
  ref?: Ref<HTMLElement>
}

const LINK_TARGET = 'inline-flex items-center min-h-6 font-body text-sm'

const TITLE = 'font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-primary)]'

/** The inset the two sections and the small print share: the page gutter, 1rem unless a shell
 *  sets `--page-gutter`. The wordmark and the backdrop ignore it: they run edge to edge. */
const GUTTER = 'px-gutter'

/**
 * The width switch, in one place. Below the `md` step (28rem) of the link section a group is a
 * disclosure; from it up, a heading and a list. Both forms of the title are always in the DOM and
 * CSS shows exactly one, with `display: none` on the other, which also takes it out of the
 * accessibility tree and the tab order. No JavaScript measures anything, so nothing is wrong for
 * a frame after a resize and nothing swaps under a focused element on render.
 *
 * The container these two measure is the link section, not the footer: beside an aside the
 * groups have less room than the footer does, and it is their own room that decides.
 */
const NARROW_ONLY = '@md:hidden'
const WIDE_ONLY = '@max-md:hidden'

/** The slash after a title. Decoration: `aria-hidden`, and a sibling of the text that names the
 *  list, never inside it, so no accessible name carries it. */
function Slash() {
  return (
    <span aria-hidden="true" className="ml-1 text-[var(--color-text-muted)]">
      /
    </span>
  )
}

/**
 * The corner mark before a link: one corner of the system's crosshair. Its weight and resting
 * colour are the crosshair's (1px, text.muted); on the link's hover it takes the reticle's
 * colour (accent.signal.fill), keyed to the link itself the way the reticle is keyed to its
 * control, so the row's empty space does not trigger it. Its bottom edge is its baseline, so in
 * an `items-baseline` row the corner sits on the text's baseline.
 */
function CornerMark() {
  return (
    <span
      aria-hidden="true"
      data-footer-mark
      className="shrink-0 w-[7px] h-[7px] border-l border-b border-[var(--color-text-muted)] transition-control group-has-[a:hover]/link:border-[var(--color-accent-signal-fill)]"
    />
  )
}

type GroupProps = {
  column: FooterColumn
  headingLevel: 2 | 3 | 4
  renderLink: (props: LinkRenderProps) => ReactNode
}

function Group({ column, headingLevel, renderLink }: GroupProps) {
  const id = useId()
  const labelId = `${id}-label`
  const listId = `${id}-list`
  const [open, setOpen] = useState(column.defaultOpen ?? false)
  const Heading = `h${headingLevel}` as const

  return (
    <div data-footer-group className="border-t border-[var(--color-border-hairline)] @md:pt-4">
      <Heading className={TITLE}>
        {/* From 28rem up: the title is text, and there is no button to announce. */}
        <span data-footer-at="wide" className={WIDE_ONLY}>
          <span id={labelId}>{column.title}</span>
          <Slash />
        </span>
        {/* Below 28rem: the title is a button inside the heading, the accordion pattern.
            `uppercase` again because a button does not inherit text-transform. */}
        <button
          type="button"
          data-footer-at="narrow"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen(value => !value)}
          className={cn(
            NARROW_ONLY,
            'flex w-full items-center justify-between gap-3 min-h-11 text-left uppercase',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]'
          )}
        >
          <span>
            {column.title}
            <Slash />
          </span>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'w-3.5 h-3.5 shrink-0 text-[var(--color-text-secondary)] transition-transform motion-reduce:transition-none',
              open && 'rotate-180'
            )}
          />
        </button>
      </Heading>
      {/* Named by the title text alone. A closed group's list is `display: none` below 28rem
          only; from 28rem up `open` decides nothing. */}
      <ul
        role="list"
        id={listId}
        aria-labelledby={labelId}
        data-open={open}
        className={cn('flex flex-col gap-1 list-none pb-4 @md:mt-3 @md:pb-0', !open && WIDE_ONLY)}
      >
        {column.links.map((link, linkIndex) => (
          <li key={linkIndex} className="group/link flex items-baseline gap-2">
            <CornerMark />
            {link.external ? (
              <Link external href={link.href} tone="quiet" className={LINK_TARGET}>
                {link.label}
              </Link>
            ) : (
              renderLink({
                href: link.href,
                className: cn(linkVariants({ tone: 'quiet' }), LINK_TARGET),
                children: link.label,
              })
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * The display face's capitals, bold: each character's advance in thousandths of an em, read in a
 * browser from Oxanium 700 (`measureText`, 2026-10-02). The face has no kerning between
 * capitals, so a name's width is the sum. A character not listed takes `OTHER`, the mean.
 */
const ADVANCE: Record<string, number> = {
  A: 666, B: 652, C: 624, D: 688, E: 604, F: 584, G: 678, H: 708, I: 308, J: 612, K: 672, L: 548, M: 896,
  N: 738, O: 708, P: 638, Q: 708, R: 648, S: 588, T: 612, U: 696, V: 656, W: 956, X: 646, Y: 616, Z: 608,
  0: 578, 1: 578, 2: 578, 3: 578, 4: 578, 5: 578, 6: 578, 7: 578, 8: 578, 9: 578,
  ' ': 240, '&': 676, '-': 380, '.': 278,
}
const OTHER = 656
/** In ems: the height of a capital, the blank before a capital that starts on a stem and after
 *  one that ends on a stem or an arm, and how much of the capital the footer's edge cuts off. */
const CAP_HEIGHT = 0.69
const BEARING = { left: 0.07, right: 0.044 }
const CROP = 0.085
/** The wordmark's font size, in the SVG's own units. Any number: the SVG scales to its width. */
const UNIT = 100

/**
 * The wordmark: one line of capitals exactly as wide as the footer, at any width and for any
 * name, with no script and no measuring at run time.
 *
 * It is an SVG whose viewBox is computed from the name's characters alone (the table above), so
 * the box has its final size before any font has loaded and does not change when the web font
 * swaps in: there is nothing to shift. `textLength` then holds the line to that width by
 * adjusting the space between letters, never their shapes: in the display face that adjustment
 * is zero, and in the fallback font, whose letters are a little different, the line still runs
 * edge to edge. The viewBox starts one side bearing in and ends one short, which puts the first
 * and last strokes on the footer's edges, and it stops above the baseline, which is what cuts
 * the letters' feet off at the bottom edge.
 *
 * `role="img"` with the name as its label: one named image, announced once. The letters inside
 * are still text, so find-in-page and selection work.
 *
 * Contrast: "text.primary on surface.base" (and on surface.raised, in the docs). A logotype is
 * exempt from 1.4.3; it is drawn in a text token anyway.
 */
function Wordmark({ text }: { text: string }) {
  const capitals = text.toUpperCase()
  const width = (Array.from(capitals).reduce((sum, letter) => sum + (ADVANCE[letter] ?? OTHER), 0) / 1000) * UNIT
  const left = BEARING.left * UNIT
  const height = (CAP_HEIGHT - CROP) * UNIT
  return (
    <svg
      role="img"
      aria-label={text}
      data-footer-wordmark
      viewBox={`${left} 0 ${width - left - BEARING.right * UNIT} ${height}`}
      className="relative block h-auto w-full overflow-hidden text-[var(--color-text-primary)]"
    >
      <text
        x={0}
        y={CAP_HEIGHT * UNIT}
        textLength={width}
        lengthAdjust="spacing"
        fill="currentColor"
        fontSize={UNIT}
        className="font-display font-bold"
      >
        {capitals}
      </text>
    </svg>
  )
}

/**
 * Contrast rows, by exact name. Titles and the wordmark: "text.primary on surface.base" and
 * "text.primary on surface.raised (over surface.base)". Tagline and links: "text.secondary on
 * surface.base" and "alert body and ghost dismiss (text.secondary) on surface.raised (over
 * surface.base)"; hovered links the two text.primary rows. Small print: "text.muted on
 * surface.base" and "text.muted on surface.raised (over surface.base)". Focus: "focus.ring on
 * surface.base" and "focus ring (focus.ring) on surface.raised (over surface.base)". The slash,
 * the corner mark and the accordion's chevron are decoration beside a text label and owe no
 * ratio; the two greys they use are text tokens with rows of their own.
 */
export function Footer({
  label,
  brand,
  tagline,
  columns,
  aside,
  legal,
  wordmark,
  backdrop,
  headingLevel = 2,
  renderLink = renderAnchor,
  className,
  ref,
}: FooterProps) {
  const Heading = `h${headingLevel}` as const
  const closing = Boolean(wordmark || backdrop)
  return (
    <footer
      ref={ref}
      className={cn(
        '@container border-t border-[var(--color-border-hairline)] pt-10',
        // With a wordmark or a backdrop the footer ends on it, flush: nothing below, no padding.
        !closing && 'pb-6',
        className
      )}
    >
      {/* The two sections: stacked, then side by side from 64rem of footer. */}
      <div data-footer-upper className={cn(GUTTER, 'flex flex-col gap-10 @5xl:flex-row @5xl:gap-12')}>
        {/* Its own container: the groups' grid and their accordion switch measure this section. */}
        <div data-footer-links className="@container flex min-w-0 flex-1 flex-col gap-8">
          {brand || tagline ? (
            <div className="flex max-w-xs flex-col gap-3">
              {brand}
              {tagline ? <p className="font-body text-sm text-[var(--color-text-secondary)]">{tagline}</p> : null}
            </div>
          ) : null}
          {/* One column of disclosures, then 2, 3 and 4 columns. The disclosures need a rule
              under the last one, which is this nav's own bottom border. */}
          <nav
            aria-label={label}
            className="grid grid-cols-1 border-[var(--color-border-hairline)] @max-md:border-b @md:grid-cols-2 @md:gap-x-8 @md:gap-y-10 @2xl:grid-cols-3 @3xl:grid-cols-4"
          >
            {columns.map((column, index) => (
              <Group key={index} column={column} headingLevel={headingLevel} renderLink={renderLink} />
            ))}
          </nav>
        </div>
        {aside ? (
          // Opens with the same hairline and title as a group, so the two sections share a top
          // line. Under 28rem of footer the accordion above has just closed on a rule of its own,
          // and a second one a gap below it is one too many. Not a landmark: what it holds (a
          // form, say) brings its own.
          <div
            data-footer-aside
            className="flex flex-col gap-3 border-[var(--color-border-hairline)] @md:border-t @md:pt-4 @5xl:w-[21rem] @5xl:shrink-0"
          >
            <Heading className={TITLE}>
              {aside.title}
              <Slash />
            </Heading>
            {aside.content}
          </div>
        ) : null}
      </div>
      {legal ? (
        <div className={cn(GUTTER, 'mt-10')}>
          <div className="border-t border-[var(--color-border-hairline)] pt-6 font-body text-xs text-[var(--color-text-muted)]">
            {legal}
          </div>
        </div>
      ) : null}
      {closing ? (
        // The closing image. Its height comes from the footer's width alone (the wordmark's box
        // is a ratio, the headroom over it is container units), so the space is reserved before
        // a font or a backdrop has drawn anything. `isolate`: the backdrop and the wordmark
        // stack against each other and nothing outside.
        <div data-footer-closing className="relative isolate mt-6 flex flex-col justify-end overflow-hidden">
          {backdrop ? (
            <div aria-hidden="true" data-footer-backdrop className="pointer-events-none absolute inset-0 -z-10">
              {backdrop}
            </div>
          ) : null}
          {/* Headroom over the wordmark, for the backdrop to be seen in. */}
          {backdrop ? <div aria-hidden="true" className="h-[max(6rem,12cqw)]" /> : null}
          {wordmark ? <Wordmark text={wordmark} /> : backdrop ? <div aria-hidden="true" className="h-[max(4.5rem,13cqw)]" /> : null}
        </div>
      ) : null}
    </footer>
  )
}
