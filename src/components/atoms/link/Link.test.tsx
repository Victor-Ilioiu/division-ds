import { describe, it, expect } from 'vitest'
import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import { axeClean } from '../../../test/axe'
import { Link } from './Link'

describe('Link', () => {
  it('renders an anchor with its href', () => {
    render(<Link href="/kits">Field kits</Link>)
    expect(screen.getByRole('link', { name: 'Field kits' })).toHaveAttribute('href', '/kits')
  })

  it('is underlined by default so colour is not the only signal', () => {
    render(<Link href="/kits">Field kits</Link>)
    expect(screen.getByRole('link')).toHaveClass('underline')
  })

  it('warns that an external link opens a new tab', () => {
    const { container } = render(<Link href="https://example.com" external>Supplier</Link>)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(link).toHaveAccessibleName('Supplier (opens in a new tab)')
    // aria-hidden means the icon contributes nothing to the accessible-name assertion above, so
    // without this the icon could be deleted from the component and every other test would still
    // pass. Scoped assertion that the icon itself actually renders.
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('does not set target on an internal link', () => {
    render(<Link href="/kits">Field kits</Link>)
    expect(screen.getByRole('link')).not.toHaveAttribute('target')
  })

  it('forwards a ref', () => {
    const ref = createRef<HTMLAnchorElement>()
    render(<Link href="/kits" ref={ref}>Field kits</Link>)
    expect(ref.current?.tagName).toBe('A')
  })

  it('is axe clean', async () => {
    const { container } = render(
      <p>
        Read the <Link href="/kits">field kit index</Link> or the{' '}
        <Link href="https://example.com" external>supplier notes</Link>.
      </p>
    )
    expect(await axeClean(container)).toHaveNoViolations()
  })

  // Type-only assertion, enforced by `tsc -b` (run as part of `npm run build`), not by vitest at
  // runtime — this test is skipped so nothing actually renders, but its body still type-checks.
  // `@ts-expect-error` fails the build if the error is *absent*, so removing the discriminated
  // union in LinkProps (the `external: true` branch's `target?: never; rel?: never`) would make
  // this line stop erroring and the build would fail with "Unused '@ts-expect-error' directive."
  it.skip('rejects a caller-supplied rel on an external link at the type level', () => {
    // @ts-expect-error external already guarantees rel="noopener noreferrer" — a caller-supplied rel is excluded
    ;<Link href="https://example.com" external rel="opener">Supplier</Link>
  })
})
