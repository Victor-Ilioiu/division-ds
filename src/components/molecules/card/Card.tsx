import {
  createContext,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useState,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
} from 'react'
import { cn } from '../../../lib/cn'

/** The title's id and a way for a CardTitle to announce it actually mounted, so an article or
 *  section Card only claims `aria-labelledby` once something is really there to point at.
 *  `undefined` (a `div` Card, or no Card ancestor at all) means CardTitle renders no id either --
 *  see CardTitle below. */
type TitleRegistration = { titleId: string; registerTitle: () => () => void }
const TitleIdContext = createContext<TitleRegistration | undefined>(undefined)

export type CardProps = HTMLAttributes<HTMLElement> & {
  as?: 'article' | 'section' | 'div'
  ref?: Ref<HTMLElement>
  /**
   * Says the whole card is one click target: it holds a link (or a button) stretched over it.
   * The card then answers a pointer and the keyboard: its border takes the signal accent and the
   * whole card slides up 4px on hover and while anything inside it has keyboard focus. A card
   * that is not a click target must not set this: the border and the lift are a promise that a
   * click anywhere does something.
   *
   * It adds no role, no tab stop and no handler that acts on a click. The link inside is still
   * the control, with its own name and its own focus ring.
   * @default false
   */
  interactive?: boolean
  /** Typed away. Card computes this itself from its CardTitle (through context) and a
   *  spread `{...rest}` after that computation could otherwise let a caller override it. */
  'aria-labelledby'?: never
}

/**
 * A surface that groups related content: a product, a depot, a summary. Compound parts, so a
 * card can hold anything without a prop for every slot.
 *
 * `.panel .crosshair`, the frame-around-several motif -- a card frames several pieces of content,
 * the same reason Panel uses it. Never the cut corner (bevel-*): a card routinely holds buttons
 * and links, and Global Constraints bans bevel-* on any element containing something focusable.
 *
 * `as` defaults to `article` (a self-contained item, like one product); `section` names a
 * grouping inside a page; `div` is for neither. An article or section is named by its own title
 * automatically -- `CardTitle` registers itself through `TitleIdContext` (in a layout effect, so
 * the registration lands before paint) and `Card` sets `aria-labelledby` only once a title has
 * actually registered. A plain `div` card carries no such name because it is not a landmark or
 * region needing one; a titleless article or section card renders no `aria-labelledby` either.
 * Pointing it at an id nothing ever renders would be an invalid IDREF, which assistive tech
 * simply ignores -- there is no content-based name fallback for an article or section the way
 * there is for, say, a button, so an invalid IDREF and no attribute at all land in the exact same
 * place: an unnamed region. So the attribute stays unset until a title actually registers, at
 * which point it is set to that title's id.
 *
 * The crosshair corner marks (`--color-text-muted` on `surface.raised`) are the only visible
 * corner cue on a card -- there is no cut-corner alternative rendered alongside them to
 * distinguish -- so they carry no state or meaning of their own and stay decorative chrome: CSS
 * background images on an empty, unnamed `::before` (never exposed to the accessibility tree),
 * not measured in scripts/lib/contrast-pairs.mjs. Same treatment as Panel's crosshair, which this
 * shares a class with.
 *
 * `interactive` is the system's one way to say "this whole card is a click target" (ProductCard,
 * a category tile). It adds `.card-interactive` (src/styles/elevation.css: the accent border and
 * a 4px lift on hover and on keyboard focus inside). The border is `accent.signal.fill`, a state
 * boundary, gated on the page as "sidebar active item fill on surface.base". See "Interactive
 * cards" in design.md.
 */
export function Card({
  as: Tag = 'article',
  interactive = false,
  className,
  ref,
  ...rest
}: CardProps) {
  const titleId = useId()
  const named = Tag !== 'div'
  const [hasTitle, setHasTitle] = useState(false)
  // Stable across renders (the titleId never changes for a mounted Card), so CardTitle's own
  // effect only re-runs on real mount/unmount, not on every Card render.
  const registerTitle = useCallback(() => {
    setHasTitle(true)
    return () => setHasTitle(false)
  }, [])
  const registration = useMemo<TitleRegistration | undefined>(
    () => (named ? { titleId, registerTitle } : undefined),
    [named, titleId, registerTitle]
  )
  return (
    <TitleIdContext.Provider value={registration}>
      <Tag
        // Tag is a union of three intrinsic elements whose refs differ; they all extend HTMLElement.
        ref={ref as Ref<HTMLDivElement>}
        aria-labelledby={named && hasTitle ? titleId : undefined}
        className={cn('panel crosshair flex flex-col', interactive && 'card-interactive', className)}
        {...rest}
      />
    </TitleIdContext.Provider>
  )
}

const MEDIA_ASPECT = {
  '16/9': 'aspect-[16/9]',
  '4/3': 'aspect-[4/3]',
  '1/1': 'aspect-square',
} as const

export type CardMediaProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  /** The picture. Without it, `children` fill the box (a placeholder, a custom stage). */
  src?: string
  /** Empty by default: the picture is decorative because the card's title already names what it
   *  shows (ProductCard's policy). Write real text only when the picture says something the
   *  title and copy do not. */
  alt?: string
  /** @default '16/9' */
  aspect?: keyof typeof MEDIA_ASPECT
  /** Shown instead of the image when there is no `src`, centred in the same box. */
  children?: ReactNode
}

/**
 * A picture across the full width of the card, flush to its top edge and both side edges, inside
 * the card's border. Put it first, before CardHeader or CardBody.
 *
 * Needs no negative margins: the Card root carries no padding (CardHeader, CardBody and
 * CardFooter each pad themselves), so a part that pads nothing sits edge to edge by itself.
 * `overflow-hidden` is on this box, never on the Card, because the crosshair arms are drawn
 * outside the root and an interactive card lifts as a whole. The crosshair is a positioned pseudo
 * element, so it paints over the picture and its corner marks stay visible. The picture is
 * `object-cover`, cropped to the aspect ratio, and loads lazily.
 */
export function CardMedia({ src, alt = '', aspect = '16/9', className, children, ...rest }: CardMediaProps) {
  return (
    <div
      data-card-media
      className={cn(
        'relative w-full overflow-hidden bg-[var(--color-surface-sunken)] flex items-center justify-center',
        MEDIA_ASPECT[aspect],
        className
      )}
      {...rest}
    >
      {src ? <img src={src} alt={alt} loading="lazy" className="absolute inset-0 h-full w-full object-cover" /> : children}
    </div>
  )
}

export function CardHeader({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1 p-5 pb-0', className)} {...rest} />
}

/** Heading level is a prop, not fixed: the page decides its own outline. Text colour is
 *  `text.primary` on `surface.raised` (the card's own `.panel` fill) -- gated in
 *  scripts/lib/contrast-pairs.mjs as "text.primary on surface.raised (over surface.base)".
 *
 *  Registers with the nearest named Card in a layout effect (fires synchronously before paint,
 *  so there is no visible flash of a card announced with no name) rather than during render,
 *  because during Card's own render its children -- this component among them -- have not run
 *  yet, so Card cannot know a title exists until after the fact. The cleanup un-registers on
 *  unmount, so a Card that starts titled and later loses its title stops claiming one. */
export type CardTitleProps = Omit<HTMLAttributes<HTMLHeadingElement>, 'id'> & {
  level?: 2 | 3 | 4
  /** Typed away, not merely omitted. `CardTitle` computes `id` itself
   *  from the nearest `Card`'s registration and then spreads `{...rest}` after it -- the same
   *  "compute a value, then let rest win" shape the hyphenated-key rule (design.md) names, except
   *  `id` isn't hyphenated, so the usual excess-property check would normally already reject a
   *  literal `<CardTitle id="x" />`. It would NOT reject `<CardTitle {...someProps} />` where
   *  `someProps` happens to carry an `id` -- a spread object is never checked for excess
   *  properties -- and that id would win over the registered one, silently breaking the Card's
   *  name. Redeclaring the key `never` here closes that hole too. */
  id?: never
}

export function CardTitle({
  level = 3,
  className,
  ...rest
}: CardTitleProps) {
  const registration = useContext(TitleIdContext)
  useLayoutEffect(() => {
    return registration?.registerTitle()
  }, [registration])
  const Heading = `h${level}` as const
  return (
    <Heading
      id={registration?.titleId}
      className={cn(
        'font-display font-semibold text-lg leading-snug text-[var(--color-text-primary)]',
        className
      )}
      {...rest}
    />
  )
}

/** `text.secondary` on `surface.raised` -- gated as "alert body and ghost dismiss (text.secondary)
 *  on surface.raised (over surface.base)"; the pair is the token combination, not the
 *  component, so Card reuses it rather than adding a duplicate row. */
export function CardDescription({ className, ...rest }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('font-body text-sm text-[var(--color-text-secondary)]', className)} {...rest} />
}

/** `text.primary` on `surface.raised` -- same gated pair as CardTitle. `grow` so a row of cards
 *  with uneven body length still lines up its footers. */
export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('p-5 font-body text-sm text-[var(--color-text-primary)] grow', className)}
      {...rest}
    />
  )
}

/** Actions that live INSIDE the content: place it in `CardBody`, after the copy it acts on. A
 *  wrapping flex row with a top margin and nothing else -- no hairline, no padding band, no
 *  own surface -- so the buttons read as part of the text block, not as a bar.
 *
 *  Alignment is deliberate and differs from `CardFooter`. Here the row is LEFT-aligned and the
 *  primary goes FIRST (leftmost), the secondary after it: a card body is read down its left edge
 *  (F-pattern), so the button stays attached to the copy it acts on, at a fixed position whatever
 *  the card's width. Right-aligned buttons drift away from short text in a wide card. (A
 *  Z-pattern argument for right-aligning was considered and declined for exactly that reason.)
 *  `CardFooter` is the opposite on purpose: the "end of the task" position, right-aligned with
 *  the primary last, the same as `DialogFooter`. One card uses one or the other, never both.
 *  The order is the author's: nothing here reorders children. */
export function CardActions({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-wrap items-center gap-3 mt-4', className)} {...rest} />
}

/** A flex row, right-aligned, for actions, separated from the body by a hairline that runs edge
 *  to edge -- the reason Card does not use `Panel`'s uniform `p-5` (Panel pads the whole surface;
 *  the footer needs its own horizontal padding but a border that is not inset by it). The
 *  hairline is `border.hairline`, a decorative divider, not a state-bearing boundary, so it is
 *  not a contrast-gate candidate (consistent with the rest of the gate: hairlines are never
 *  gated). */
export function CardFooter({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-end gap-3 px-5 py-4 border-t border-[var(--color-border-hairline)]',
        className
      )}
      {...rest}
    />
  )
}
