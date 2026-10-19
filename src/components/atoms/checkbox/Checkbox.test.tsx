import { createRef } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../../../test/axe'
import { Checkbox } from './Checkbox'

// The brief's `Labelled` hard-codes id="kit"; the axe test below renders four instances of it,
// which trips axe's duplicate-id-active rule (wcag2a). Distinct ids per instance are correct
// regardless of whether axe would flag it, so `id` is a prop here rather than a constant.
function Labelled({ id = 'kit', ...rest }: React.ComponentProps<typeof Checkbox>) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox id={id} {...rest} />
      <label htmlFor={id}>Include speed loader</label>
    </div>
  )
}

describe('Checkbox', () => {
  it('is reachable by its label and starts unchecked', () => {
    render(<Labelled />)
    expect(screen.getByRole('checkbox', { name: 'Include speed loader' })).not.toBeChecked()
  })

  it('toggles on click', async () => {
    const onCheckedChange = vi.fn()
    render(<Labelled onCheckedChange={onCheckedChange} />)
    await userEvent.click(screen.getByRole('checkbox'))
    expect(onCheckedChange).toHaveBeenCalledWith(true)
  })

  it('toggles with the Space key', async () => {
    const onCheckedChange = vi.fn()
    render(<Labelled onCheckedChange={onCheckedChange} />)
    await userEvent.tab()
    expect(screen.getByRole('checkbox')).toHaveFocus()
    await userEvent.keyboard(' ')
    expect(onCheckedChange).toHaveBeenCalledWith(true)
  })

  it('reports the mixed state when indeterminate', () => {
    render(<Labelled checked="indeterminate" />)
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'mixed')
  })

  it('shows a dash rather than a tick when indeterminate, so the glyph carries the state', () => {
    const { container } = render(<Labelled checked="indeterminate" />)
    expect(container.querySelector('[data-glyph="indeterminate"]')).toBeInTheDocument()
    expect(container.querySelector('[data-glyph="checked"]')).toBeNull()
  })

  it('sets aria-invalid when invalid', () => {
    render(<Labelled invalid />)
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-invalid', 'true')
  })

  it('does not toggle when disabled', async () => {
    const onCheckedChange = vi.fn()
    render(<Labelled disabled onCheckedChange={onCheckedChange} />)
    await userEvent.click(screen.getByRole('checkbox'))
    expect(onCheckedChange).not.toHaveBeenCalled()
  })

  it('does not toggle on Enter — correct native checkbox behaviour, not a bug', async () => {
    const onCheckedChange = vi.fn()
    render(<Labelled onCheckedChange={onCheckedChange} />)
    await userEvent.tab()
    expect(screen.getByRole('checkbox')).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    expect(onCheckedChange).not.toHaveBeenCalled()
  })

  it('sets a fixed vertical-align rather than the inline-flex default', () => {
    // An empty inline-flex box's CSS baseline is its own bottom edge, but once the indicator
    // mounts (checked/indeterminate) the baseline becomes the indicator's own line-box baseline
    // -- a few px higher. Left at the default `baseline`, that difference shifts the whole 20px
    // box in any non-flex parent (e.g. a bare table cell, like DataTable's checkbox column).
    // align-middle centers on the box's own height instead, which content never changes. jsdom
    // has no layout engine to assert the pixel position itself, so this pins the class that
    // prevents the regression.
    render(<Labelled />)
    expect(screen.getByRole('checkbox').className).toContain('align-middle')
  })

  it('forwards a ref to the root element', () => {
    const ref = createRef<HTMLButtonElement>()
    render(<Labelled ref={ref} />)
    expect(ref.current).toBe(screen.getByRole('checkbox'))
  })

  it('is axe clean', async () => {
    const { container } = render(
      <div>
        <Labelled id="kit-unchecked" />
        <Labelled id="kit-checked" checked />
        <Labelled id="kit-indeterminate" checked="indeterminate" />
        <Labelled id="kit-disabled" disabled />
      </div>
    )
    expect(await axeClean(container)).toHaveNoViolations()
  })

  // Type-only assertion, enforced by `tsc -b` (run as part of `npm run build`), not by vitest at
  // runtime — this test is skipped so nothing actually renders, but its body still type-checks.
  // Checkbox computes aria-invalid from `invalid` and spreads `{...rest}` after it, so a caller-
  // supplied `aria-invalid` in rest would silently win at runtime (JSX later attributes override
  // earlier ones) and defeat the one thing this prop promises. `aria-invalid` is hyphenated, so
  // `Omit<>` alone is a no-op — TypeScript's JSX checker never flags an aria-/data-prefixed
  // attribute as excess — so CheckboxProps redeclares `'aria-invalid'` with type `never`, which
  // TypeScript does enforce. Same precedent as Input's and Textarea's `aria-invalid` exclusion.
  // `@ts-expect-error` fails the build if that field is ever removed.
  it.skip('rejects a caller-supplied aria-invalid at the type level', () => {
    // @ts-expect-error invalid is the sole source of aria-invalid — aria-invalid itself is excluded
    ;<Checkbox aria-invalid="true" />
  })

  // Type-only assertion, same mechanism as above. Radix's own `CheckedState` allows
  // `defaultChecked="indeterminate"`, but this component's glyph ternary can only read a
  // `checked` value the caller itself controls (see the comment on Checkbox's glyph branch) —
  // Radix resolves the uncontrolled case internally and publishes it only as the `data-state`
  // DOM attribute, which the glyph ternary can't read back. `defaultChecked` is narrowed to
  // `boolean` so this unrepresentable state is a compile error instead of a checkbox that mounts
  // mixed but renders a tick. `@ts-expect-error` fails the build if that narrowing is ever
  // widened back to Radix's own `CheckedState`.
  it.skip('rejects defaultChecked="indeterminate" at the type level', () => {
    // @ts-expect-error defaultChecked is narrowed to boolean — the uncontrolled indeterminate case can't render the right glyph, so it isn't offered
    ;<Checkbox defaultChecked="indeterminate" />
  })
})
