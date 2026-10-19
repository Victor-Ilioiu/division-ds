import { describe, it, expect } from 'vitest'
import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import { axeClean } from '../../../test/axe'
import { Spinner } from './Spinner'

describe('Spinner', () => {
  it('announces as a live status when given a label', () => {
    render(<Spinner label="Loading field kits" />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading field kits')
  })

  it('is silent and role-less when decorative', () => {
    render(<Spinner aria-hidden="true" data-testid="s" />)
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.getByTestId('s')).toHaveAttribute('aria-hidden', 'true')
  })

  it('applies the size variant class', () => {
    render(<Spinner label="x" size="lg" />)
    expect(screen.getByRole('status')).toHaveClass('w-6')
  })

  it('forwards a ref', () => {
    const ref = createRef<HTMLSpanElement>()
    render(<Spinner ref={ref} label="x" />)
    expect(ref.current?.tagName).toBe('SPAN')
  })

  it('is axe clean', async () => {
    const { container } = render(<Spinner label="Loading field kits" />)
    expect(await axeClean(container)).toHaveNoViolations()
  })

  // Type-only assertion, enforced by `tsc -b` (run as part of `npm run build`), not by vitest at
  // runtime — this test is skipped so nothing actually renders, but its body still type-checks.
  // `@ts-expect-error` fails the build if the error is *absent*, so removing the `role`
  // exclusion (both the `Omit` entry AND `role?: never`) from SpinnerProps would make this line
  // stop erroring and the build would fail with "Unused '@ts-expect-error' directive." Unlike
  // aria-busy/aria-label/aria-invalid elsewhere in this codebase, `role` is not hyphenated, so
  // the `Omit` alone is what rejects it here — removing only the declared `never` would NOT
  // reproduce the failure, only removing the whole exclusion does. See design.md, "The
  // hyphenated-key rule, both halves."
  it.skip('rejects a caller-supplied role at the type level', () => {
    // @ts-expect-error label decides between role="status" and no role at all — a caller-supplied
    // role would silently win over that computed value and could silence the live region
    ;<Spinner label="Loading" role="presentation" />
  })
})
