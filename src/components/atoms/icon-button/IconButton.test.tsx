import { describe, it, expect, vi } from 'vitest'
import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { X } from 'lucide-react'
import { axeClean } from '../../../test/axe'
import { IconButton } from './IconButton'

describe('IconButton', () => {
  it('takes its accessible name from label', () => {
    render(<IconButton label="Dismiss alert"><X aria-hidden="true" /></IconButton>)
    expect(screen.getByRole('button', { name: 'Dismiss alert' })).toBeInTheDocument()
  })

  it('is square at every size, at or above the 24px minimum target', () => {
    render(<IconButton label="Dismiss alert" size="sm"><X aria-hidden="true" /></IconButton>)
    const cls = screen.getByRole('button').className
    expect(cls).toContain('--component-control-height-sm')
    expect(cls).toContain('w-[var(--component-control-height-sm)]')
    expect(cls).toContain('p-0')
  })

  it('wraps the clipped button in an unclipped focus wrapper', () => {
    render(<IconButton label="Dismiss alert"><X aria-hidden="true" /></IconButton>)
    expect(screen.getByRole('button').parentElement).toHaveClass('bevel-focus-wrap')
  })

  it('calls onClick', async () => {
    const onClick = vi.fn()
    render(<IconButton label="Dismiss alert" onClick={onClick}><X aria-hidden="true" /></IconButton>)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('forwards a ref', () => {
    const ref = createRef<HTMLButtonElement>()
    render(<IconButton label="Dismiss alert" ref={ref}><X aria-hidden="true" /></IconButton>)
    expect(ref.current?.tagName).toBe('BUTTON')
  })

  describe('count', () => {
    it('folds the count into the accessible name', () => {
      render(<IconButton label="Cart" count={3}><X aria-hidden="true" /></IconButton>)
      expect(screen.getByRole('button', { name: 'Cart, 3' })).toBeInTheDocument()
    })

    it('takes a countLabel formatter for the spoken half of the name', () => {
      render(
        <IconButton label="Notifications" count={3} countLabel={n => `${n} unread`}>
          <X aria-hidden="true" />
        </IconButton>
      )
      expect(screen.getByRole('button', { name: 'Notifications, 3 unread' })).toBeInTheDocument()
    })

    it('shows the count in a badge that is aria-hidden, since the name already says it', () => {
      render(<IconButton label="Cart" count={3}><X aria-hidden="true" /></IconButton>)
      const badge = screen.getByText('3')
      expect(badge).toHaveAttribute('aria-hidden', 'true')
      expect(badge.className).toContain('--color-accent-signal-fill')
      expect(badge.className).toContain('--color-accent-signal-ink')
      // Square, like everything else here: no rounded-full pill.
      expect(badge.className).not.toMatch(/rounded/)
      // It sits on the unclipped wrapper, never inside the bevel-clipped button, so the corner
      // cut cannot slice it.
      expect(badge.parentElement).toHaveClass('bevel-focus-wrap')
    })

    it('caps the visible count at 99+ but speaks the real number', () => {
      render(<IconButton label="Notifications" count={150}><X aria-hidden="true" /></IconButton>)
      expect(screen.getByText('99+')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Notifications, 150' })).toBeInTheDocument()
    })

    it('hides at zero, and the name is the bare label', () => {
      render(<IconButton label="Cart" count={0}><X aria-hidden="true" /></IconButton>)
      expect(screen.queryByText('0')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cart' })).toBeInTheDocument()
    })

    it('shows zero with showZero', () => {
      render(<IconButton label="Cart" count={0} showZero><X aria-hidden="true" /></IconButton>)
      expect(screen.getByText('0')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cart, 0' })).toBeInTheDocument()
    })

    it('renders no badge without a count (the default render is unchanged)', () => {
      render(<IconButton label="Dismiss alert"><X aria-hidden="true" /></IconButton>)
      expect(screen.getByRole('button').parentElement!.children).toHaveLength(1)
    })
  })

  it('is axe clean', async () => {
    const { container } = render(
      <div className="flex flex-wrap gap-3">
        <IconButton label="Dismiss alert"><X aria-hidden="true" /></IconButton>
        <IconButton label="Close panel" variant="ghost"><X aria-hidden="true" /></IconButton>
        <IconButton label="Notifications" variant="secondary" count={120} countLabel={n => `${n} unread`}>
          <X aria-hidden="true" />
        </IconButton>
      </div>
    )
    expect(await axeClean(container)).toHaveNoViolations()
  })

  // Type-only assertion, enforced by `tsc -b` (run as part of `npm run build`), not by vitest at
  // runtime — this test is skipped so nothing actually renders, but its body still type-checks.
  // `@ts-expect-error` fails the build if the error is *absent*, so removing the asChild/native
  // discriminated union in IconButtonProps would make this line stop erroring and the build
  // would fail with "Unused '@ts-expect-error' directive."
  it.skip('rejects disabled combined with asChild at the type level', () => {
    // @ts-expect-error a link can't be meaningfully disabled — asChild excludes `disabled`
    ;<IconButton asChild disabled label="Dismiss alert">
      <a href="/kits">Browse kits</a>
    </IconButton>
  })

  // Type-only: SQUARE has no xs width and an icon cannot read as an underlined text link, so
  // Button's xs size and link variant are typed away here rather than rendering a broken shape.
  it.skip('rejects the link variant and the xs size at the type level', () => {
    // @ts-expect-error an icon-only link-look button has no text to underline
    ;<IconButton label="Cart" variant="link"><X aria-hidden="true" /></IconButton>
    // @ts-expect-error 24px is below the icon button's 32px floor
    ;<IconButton label="Cart" size="xs"><X aria-hidden="true" /></IconButton>
  })

  // Type-only assertion, same reasoning as above: `label` is required so it is the sole source
  // of the accessible name. A caller-supplied `aria-label` must not be a valid prop at all — if
  // it were, it would win at runtime (it lands in `{...rest}`, spread after `aria-label={label}`)
  // and silently override `label`. Note this can't be enforced by `Omit` alone: TypeScript's JSX
  // checker never flags an aria-/data-prefixed attribute as excess, so `aria-label` would compile
  // even though it isn't a declared key. IconButtonSharedProps instead redeclares `'aria-label'`
  // with type `never`, which TypeScript does enforce. `@ts-expect-error` fails the build if that
  // field is ever removed.
  it.skip('rejects a caller-supplied aria-label at the type level', () => {
    // @ts-expect-error label is the sole source of the accessible name — aria-label is excluded
    ;<IconButton label="Dismiss alert" aria-label="Override">
      <X aria-hidden="true" />
    </IconButton>
  })
})
