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
export const disabledText = [
  'disabled:cursor-not-allowed disabled:text-[var(--component-control-text-disabled)]',
  'aria-disabled:cursor-not-allowed aria-disabled:text-[var(--component-control-text-disabled)]',
  'data-[disabled]:cursor-not-allowed data-[disabled]:text-[var(--component-control-text-disabled)]',
].join(' ')

export const disabledObject = [
  'disabled:cursor-not-allowed disabled:opacity-50',
  'aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
  'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
].join(' ')
