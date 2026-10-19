import { describe, it, expect } from 'vitest'
import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../../../test/axe'
import { Textarea } from './Textarea'

function Labelled(props: React.ComponentProps<typeof Textarea>) {
  return (
    <label>
      Field notes
      <Textarea {...props} />
    </label>
  )
}

describe('Textarea', () => {
  it('is reachable by its label', () => {
    render(<Labelled />)
    expect(screen.getByLabelText('Field notes')).toBeInTheDocument()
  })

  it('accepts multi-line input', async () => {
    render(<Labelled />)
    const el = screen.getByLabelText('Field notes')
    await userEvent.type(el, 'Line one{enter}Line two')
    expect(el).toHaveValue('Line one\nLine two')
  })

  it('defaults to four rows', () => {
    render(<Labelled />)
    expect(screen.getByLabelText('Field notes')).toHaveAttribute('rows', '4')
  })

  it('sets aria-invalid when invalid', () => {
    render(<Labelled invalid />)
    expect(screen.getByLabelText('Field notes')).toHaveAttribute('aria-invalid', 'true')
  })

  it('has no aria-invalid when valid', () => {
    render(<Labelled />)
    expect(screen.getByLabelText('Field notes')).not.toHaveAttribute('aria-invalid')
  })

  it('gets the read-only text colour when read-only', () => {
    render(<Labelled readOnly />)
    expect(screen.getByLabelText('Field notes').className).toContain('read-only:text-[var(--color-text-secondary)]')
  })

  it('stays resizable vertically only', () => {
    render(<Labelled />)
    expect(screen.getByLabelText('Field notes').className).toContain('resize-y')
  })

  it('forwards a ref', () => {
    const ref = createRef<HTMLTextAreaElement>()
    render(<Labelled ref={ref} />)
    expect(ref.current).toBe(screen.getByLabelText('Field notes'))
  })

  it('is axe clean', async () => {
    const { container } = render(
      <div>
        <Labelled />
        <Labelled invalid />
        <Labelled disabled />
      </div>
    )
    expect(await axeClean(container)).toHaveNoViolations()
  })

  // Type-only assertion, enforced by `tsc -b` (run as part of `npm run build`), not by vitest at
  // runtime — this test is skipped so nothing actually renders, but its body still type-checks.
  // Textarea computes aria-invalid from `invalid` and spreads `{...rest}` after it, so a caller-
  // supplied `aria-invalid` in rest would silently win at runtime (JSX later attributes override
  // earlier ones) and defeat the one thing this prop promises. `aria-invalid` is hyphenated, so
  // `Omit<>` alone is a no-op — TypeScript's JSX checker never flags an aria-/data-prefixed
  // attribute as excess — so TextareaProps redeclares `'aria-invalid'` with type `never`, which
  // TypeScript does enforce. Same precedent as Input. `@ts-expect-error` fails the build if that
  // field is ever removed.
  it.skip('rejects a caller-supplied aria-invalid at the type level', () => {
    // @ts-expect-error invalid is the sole source of aria-invalid — aria-invalid itself is excluded
    ;<Textarea aria-invalid="true" />
  })
})
