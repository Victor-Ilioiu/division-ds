import { createRef } from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { axeClean } from '../../../test/axe'
import { Divider } from './Divider'

describe('Divider', () => {
  it('is decorative and unannounced without a label', () => {
    const { container } = render(<Divider />)
    expect(screen.queryByRole('separator')).toBeNull()
    expect(container.firstElementChild).toBeInTheDocument()
  })

  it('becomes a real separator when it carries a label', () => {
    render(<Divider label="Section 02" />)
    expect(screen.getByRole('separator')).toBeInTheDocument()
    expect(screen.getByText('Section 02')).toBeInTheDocument()
  })

  it('reports its orientation when vertical and meaningful', () => {
    render(<Divider orientation="vertical" label="Section 02" />)
    expect(screen.getByRole('separator')).toHaveAttribute('aria-orientation', 'vertical')
  })

  it('is axe clean', async () => {
    const { container } = render(
      <div>
        <Divider />
        <Divider label="Section 02" />
      </div>
    )
    expect(await axeClean(container)).toHaveNoViolations()
  })

  it('forwards a ref to the root element', () => {
    const ref = createRef<HTMLDivElement>()
    render(<Divider label="Section 02" ref={ref} />)
    expect(ref.current).toBe(screen.getByRole('separator'))
  })

  // Type-only assertion, enforced by `tsc -b` (run as part of `npm run build`), not by vitest at
  // runtime — this test is skipped so nothing actually renders, but its body still type-checks.
  // `@ts-expect-error` fails the build if the error is *absent*, so removing `role?: never` from
  // DividerProps would make this line stop erroring and the build would fail with
  // "Unused '@ts-expect-error' directive."
  it.skip('rejects a caller-supplied role at the type level', () => {
    // @ts-expect-error decorative-vs-structural is exactly what label controls — a caller-supplied role is excluded
    ;<Divider role="presentation" />
  })

  // Type-only assertion, enforced by `tsc -b` (run as part of `npm run build`), not by vitest at
  // runtime — this test is skipped so nothing actually renders, but its body still type-checks.
  // `children` is an ordinary key, so the `Omit<..., 'children'>` is what does the rejecting and
  // the declared `children?: never` only makes the error legible: the mutation that proves this
  // pin load-bearing is removing the WHOLE exclusion, not just the declared never.
  // Divider is the worst of the five: with no `label` the component renders no JSX children, so
  // a caller's `children` really did render — inside a `decorative` separator. With a `label`
  // it vanished. One prop, two behaviours.
  it.skip('rejects caller-supplied children at the type level', () => {
    // @ts-expect-error a decorative separator has no content; the labelled branch discards it instead
    ;<Divider children={<span>ignored</span>} />
  })
})
