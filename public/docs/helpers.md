# Division DS: helpers

> The functions and types under `src/lib` that components and screens share. Read from the source: types are whole, functions are signatures. Import each from its own file.

## src/lib/cn

```tsx
import { cn } from 'src/lib/cn'
```

```ts
/** Joins class names and lets the last conflicting Tailwind utility win. */
export function cn(...inputs: ClassValue[])
```

## src/lib/disabled

```tsx
import { disabledText, disabledObject } from 'src/lib/disabled'
```

```ts
/**
 * The system's one disabled-state rule, in two halves (design.md, "Disabled state").
 *
 * TEXT: a control whose point is a line of words on a neutral surface (a field, a listbox option, a
 * menu item, a tab) keeps its surface and turns its text to `component.control.text.disabled`.
 * OBJECT: a control whose point is a shape (a button, a checkbox, radio or switch, a star, a
 * slider) dims as a whole to 50% opacity.
 *
 * Both carry cursor-not-allowed, and each covers the three ways a disabled state reaches the DOM:
 * the native `disabled` attribute, `aria-disabled="true"` (a control that stays a tab stop) and
 * Radix's `data-disabled`. Tailwind reads these class strings out of this file, so they stay
 * literal. Disabled controls carry no contrast obligation (SC 1.4.3 and 1.4.11 exempt them), so
 * neither half is gated.
 */
export const disabledText = [ …
```

```ts
export const disabledObject = [
  'disabled:cursor-not-allowed disabled:opacity-50',
  'aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
  'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
].join(' ')
```

## src/lib/exit

```tsx
import { prefersReducedMotion, slideIntoPlace, exitTag, exitAlert } from 'src/lib/exit'
```

```ts
/**
 * The JavaScript half of M7 (motion.css, "M7 exits"): the exits whose second act is layout, which
 * a CSS keyframe on the leaving element cannot do on its own.
 *
 * - `exitTag`: the tag fades and shrinks in place; once it is gone, its neighbours slide from
 *   where they stood into the space it left (`slideIntoPlace`, a FLIP run by each neighbour).
 * - `exitAlert`: the alert fades, then its height collapses so the content below rises into its
 *   place instead of jumping.
 *
 * Both run on the Web Animations API and read the motion tokens at the moment they run, so a
 * changed token changes them too. Where nothing can animate -- reduced motion, or an environment
 * with no `Element.animate` (jsdom) -- `onDone` runs at once, so a dismiss never waits on a
 * motion that will not play.
 */

export function prefersReducedMotion(): boolean
```

```ts
/**
 * FLIP for a sibling of an element that just left: called from the sibling's own layout effect,
 * after the render that removed the leaver. If the sibling moved, it is put back where it stood and
 * slid to where it now is. Offsets, not client rects, so a page scroll in between is not a move.
 */
export function slideIntoPlace(el: HTMLElement | null)
```

```ts
export function exitTag(el: HTMLElement | null, onDone: () => void)
```

```ts
export function exitAlert(el: HTMLElement | null, onDone: () => void)
```

## src/lib/field-errors

```tsx
import { hasErrors, summarize, useFieldErrors } from 'src/lib/field-errors'
import type { FieldErrors, Validate, FieldErrorsApi } from 'src/lib/field-errors'
```

```ts
/** Each field's current error message. A field with no entry has no error. */
export type FieldErrors<F extends string> = Partial<Record<F, string>>
```

```ts
/** The message for a value, or undefined when the value is fine. */
export type Validate<F extends string> = (field: F, value: string) => string | undefined
```

```ts
export function hasErrors<F extends string>(errors: FieldErrors<F>): boolean
```

```ts
/** The errors in `order`, each with the id of the control an ErrorSummary entry should focus. */
export function summarize<F extends string>(
  errors: FieldErrors<F>,
  order: readonly F[],
  idOf: (field: F) => string
): { fieldId: string; message: string }[]
```

```ts
/** What `useFieldErrors` returns. Written out, not inferred, so the generated helpers page prints it. */
export type FieldErrorsApi<F extends string> = {
  /** Each field's current error, for `FormField`'s `error` and for `summarize`. */
  errors: FieldErrors<F>
  /** Call from the control's onBlur with its current value and `event.relatedTarget`, where focus
   *  is going. A blur caused by pressing a submit button shows nothing: submit validates every
   *  field. */
  blur: (field: F, value: string, to?: EventTarget | null) => void
  /** Call from the control's onChange with its new value. */
  change: (field: F, value: string) => void
  /** Call on submit with every field and a way to read its value; returns the errors found. */
  validateAll: (fields: readonly F[], valueOf: (field: F) => string) => FieldErrors<F>
  /** Replace every error, with a server's or with `{}`. */
  replace: (next: FieldErrors<F>) => void
}
```

```ts
/**
 * When a form's field errors may appear, change or clear, in one place (SC 3.3.1, and the rule
 * this system's forms share: never on a keystroke).
 *
 * - `blur`: show whatever is wrong with the value now, or clear the error when nothing is. Not
 *   when the pointer is pressing a submit button: the error line would push the button down
 *   under it mid-click, the click would miss, and submit validates every field anyway.
 * - `change`: never raises an error. Clears one as soon as its message no longer describes the
 *   value, so a stale "required" does not sit under a field that has text in it; the next blur
 *   says what, if anything, is wrong instead.
 * - `validateAll`: on submit, every given field at once, replacing what was shown. Returns what it
 *   found, so the caller can decide whether to submit.
 * - `replace`: errors from elsewhere (a server), or none.
 */
export function useFieldErrors<F extends string>(validate: Validate<F>): FieldErrorsApi<F>
```

## src/lib/money

```tsx
import { formatMoney, formatMoneyCompact } from 'src/lib/money'
```

```ts
/** Formats an amount held in the currency's own minor unit -- cents for EUR, fils for KWD, whole
 *  yen for JPY, which has none. Amounts are integers everywhere else in this system, so a sum of
 *  prices never picks up floating-point error; this is the one place they become text. A
 *  non-integer amount is rounded to the nearest whole minor unit rather than thrown on: a caller
 *  passing one is a bug upstream, not a reason to crash the page. */
export function formatMoney(
  minorUnits: number,
  { currency = 'EUR', locale = 'en-IE' }: { currency?: string; locale?: string } = {}
): string
```

```ts
/** The same conversion as `formatMoney`, abbreviated for a tight space -- a chart's y-axis tick,
 *  never a table cell or a total someone is meant to read exactly. Intl's own `notation:
 *  'compact'` only abbreviates once the value reaches four digits, so a typical monthly total
 *  under 1,000 reads as plain, un-rounded euros with no decimals ("€600"); above that it reads
 *  "€1.2K" rather than clipping the panel's fixed-width axis with "€1,200.00". */
export function formatMoneyCompact(
  minorUnits: number,
  { currency = 'EUR', locale = 'en-IE' }: { currency?: string; locale?: string } = {}
): string
```

## src/lib/refs

```tsx
import { assignRef, useMergedRefs } from 'src/lib/refs'
```

```ts
/** Writes `node` into one ref, whichever kind it is. */
export function assignRef<T>(ref: Ref<T> | undefined, node: T | null): void
```

```ts
/**
 * One ref callback that feeds every ref it is given: a component's own (for focus management) and
 * the caller's. Its identity is stable while the refs are. React re-runs a ref callback whose
 * identity changes, detaching with null and reattaching with the node, so an inline
 * `node => { ... }` does that on every render. The refs are the dependency list, so the number of
 * refs passed must not change between renders of one component, the rule every hook's deps follow.
 *
 * Returns a cleanup, so React 19 detaches through it rather than by calling this callback again
 * with `null`. Each ref's own cleanup runs on detach: a callback ref's returned cleanup, if it gave
 * one; otherwise that callback called with `null`. An object ref's cleanup clears `.current`.
 */
export function useMergedRefs<T>(...refs: Array<Ref<T> | undefined>): RefCallback<T>
```

## src/lib/render-link

```tsx
import { renderAnchor } from 'src/lib/render-link'
import type { LinkRenderProps } from 'src/lib/render-link'
```

```ts
/** What an organism hands to its `renderLink` prop for each link it draws. */
export type LinkRenderProps = {
  href: string
  className: string
  children: ReactNode
  'aria-current'?: 'page'
  onClick?: () => void
}
```

```ts
/**
 * The default `renderLink`: a plain anchor. An app with a router passes its own link component
 * instead, mapping `href` to that component's prop, e.g. for React Router:
 * `renderLink={({ href, ...rest }) => <RouterLink to={href} {...rest} />}`. Whatever replaces the
 * anchor must still pass `className`, `aria-current` and `onClick` through to the rendered
 * element: the organism computes each one (the resting/current styling, the current-page state,
 * and, inside a menu sheet, the close-on-choose handler) and relies on it landing on the DOM node.
 */
export function renderAnchor(props: LinkRenderProps): ReactNode
```

## src/lib/stream-text

```tsx
import { useStreamedText } from 'src/lib/stream-text'
import type { StreamedTextOptions, StreamedText } from 'src/lib/stream-text'
```

```ts
export type StreamedTextOptions = {
  /** Words revealed per second. @default 14 */
  speed?: number
  /** Starts the reveal; set it back to false and the text is empty again. @default true */
  active?: boolean
}
```

```ts
export type StreamedText = {
  /** What has arrived so far. */
  text: string
  /** Still arriving: pass it to ChatMessage's `streaming`. */
  streaming: boolean
  /** Everything has arrived, or the reveal was stopped. */
  done: boolean
  /** Stopped before the end, by `stop()`. */
  stopped: boolean
  /** Freezes the text where it is, the way a Stop button ends a real stream. */
  stop: () => void
}
```

```ts
/**
 * A scripted reply for a demo or a docs example: reveals `text` a word at a time while `active`, so
 * a ChatThread can be shown streaming without a model behind it. Changing `text` or turning
 * `active` on again starts over.
 *
 * Under `prefers-reduced-motion` the whole text arrives at once: words appearing one by one are
 * motion, and a reader who asked for less of it gets the reply the moment it exists.
 */
export function useStreamedText(text: string, { speed = 14, active = true }: StreamedTextOptions = {}): StreamedText
```

## src/lib/theme

```tsx
import { getStoredTheme, setTheme } from 'src/lib/theme'
import type { Theme } from 'src/lib/theme'
```

```ts
export type Theme = 'dark' | 'light'
```

```ts
export function getStoredTheme(): Theme
```

```ts
export function setTheme(theme: Theme)
```

## src/lib/tokens-runtime

```tsx
import { readCssVar } from 'src/lib/tokens-runtime'
```

```ts
export function readCssVar(name: string): string
```

## src/lib/tone

```tsx
import { TONES } from 'src/lib/tone'
import type { Tone } from 'src/lib/tone'
```

```ts
export type Tone = 'info' | 'ok' | 'warning' | 'hostile'
```

```ts
/** How each status tone shows itself, in one place, for Alert and Toast.
 *
 *  Every tone has an icon and a word as well as a colour, because SC 1.4.1 forbids colour as the
 *  only cue. Colour comes from the `.text` step, the theme-adaptive one gated at 4.5:1 on the
 *  page in both themes, never from `.fill`, which is theme-invariant and fails on the light page.
 *
 *  The class strings are written out in full rather than built from the tone name, because
 *  Tailwind finds classes by scanning source text and cannot see a template literal's result. */
export const TONES: Record<Tone, { icon: LucideIcon; word: string; text: string; border: string }> = { …
```
