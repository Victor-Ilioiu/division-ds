import { describe, it, expect, vi } from 'vitest'
import { createRef } from 'react'
import type { FormEvent } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { VariantProps } from 'class-variance-authority'
import { axeClean } from '../../../test/axe'
import { Button, buttonVariants } from './Button'

describe('Button', () => {
  it('renders a button with its label as the accessible name', () => {
    render(<Button>Dispatch team</Button>)
    expect(screen.getByRole('button', { name: 'Dispatch team' })).toBeInTheDocument()
  })

  it('defaults to type="button" so it never submits a form by accident', () => {
    render(<Button>Dispatch team</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
  })

  it('calls onClick when activated', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Dispatch team</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('does not call onClick when disabled', async () => {
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Dispatch team
      </Button>
    )
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('marks itself busy while loading, and stays focusable instead of disabling itself', () => {
    render(
      <Button loading loadingLabel="Dispatching">
        Dispatch team
      </Button>
    )
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button).toHaveAttribute('aria-disabled', 'true')
    expect(button).not.toBeDisabled()
    expect(screen.getByText('Dispatching')).toHaveClass('sr-only')
  })

  it('neither runs onClick nor submits its form while loading', async () => {
    const onClick = vi.fn()
    const onSubmit = vi.fn((event: FormEvent) => event.preventDefault())
    render(
      <form onSubmit={onSubmit}>
        <input aria-label="Callsign" />
        <Button type="submit" loading onClick={onClick}>
          Dispatch team
        </Button>
      </form>
    )
    await userEvent.click(screen.getByRole('button'))
    await userEvent.type(screen.getByRole('textbox', { name: 'Callsign' }), '{Enter}')
    expect(onClick).not.toHaveBeenCalled()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('keeps the visible label while loading', () => {
    render(<Button loading>Dispatch team</Button>)
    expect(screen.getByRole('button')).toHaveTextContent('Dispatch team')
  })

  it('always wraps the clipped button in an unclipped focus wrapper', () => {
    render(<Button>Dispatch team</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('bevel-sm')
    expect(button.parentElement).toHaveClass('bevel-focus-wrap')
    expect(button.parentElement).not.toHaveClass('bevel-sm')
  })

  it('renders the child element with asChild, keeping the wrapper', () => {
    render(
      <Button asChild>
        <a href="/kits">Browse kits</a>
      </Button>
    )
    const link = screen.getByRole('link', { name: 'Browse kits' })
    expect(link).toHaveClass('bevel-sm')
    expect(link).not.toHaveAttribute('type')
    expect(link.parentElement).toHaveClass('bevel-focus-wrap')
  })

  it('applies variant and size classes', () => {
    render(
      <Button variant="danger" size="lg">
        Abort
      </Button>
    )
    const button = screen.getByRole('button')
    expect(button.className).toContain('--component-button-danger-fill')
    expect(button.className).toContain('--component-control-height-lg')
  })

  it('forwards a ref to the button element', () => {
    const ref = createRef<HTMLButtonElement>()
    render(<Button ref={ref}>Dispatch team</Button>)
    expect(ref.current?.tagName).toBe('BUTTON')
  })

  describe('iconStart and iconEnd', () => {
    it('renders both icons aria-hidden around the label, which stays the name', () => {
      render(
        <Button iconStart={<svg data-testid="start" />} iconEnd={<svg data-testid="end" />}>
          Add to loadout
        </Button>
      )
      const button = screen.getByRole('button', { name: 'Add to loadout' })
      const start = screen.getByTestId('start').parentElement!
      const end = screen.getByTestId('end').parentElement!
      expect(start).toHaveAttribute('aria-hidden', 'true')
      expect(end).toHaveAttribute('aria-hidden', 'true')
      // Order in the DOM is order on screen: start, label, end.
      expect(button.firstElementChild).toBe(start)
      expect(button.lastElementChild).toBe(end)
    })

    it('swaps iconStart for the spinner while loading, so the button never shows two leading glyphs', () => {
      render(
        <Button loading iconStart={<svg data-testid="start" />} iconEnd={<svg data-testid="end" />}>
          Add to loadout
        </Button>
      )
      expect(screen.queryByTestId('start')).not.toBeInTheDocument()
      expect(screen.getByTestId('end')).toBeInTheDocument()
      // The spinner takes the leading slot the icon held.
      const first = screen.getByRole('button').firstElementChild!
      expect(first).toHaveAttribute('aria-hidden', 'true')
      expect(first.className).toContain('w-3.5')
    })

    it('renders no icon slot when neither prop is given (the default render is unchanged)', () => {
      render(<Button>Dispatch team</Button>)
      expect(screen.getByRole('button').children).toHaveLength(0)
    })
  })

  describe('link variant', () => {
    it('looks like a text link but stays a button', () => {
      render(<Button variant="link">View field manual</Button>)
      const button = screen.getByRole('button', { name: 'View field manual' })
      expect(button.tagName).toBe('BUTTON')
      expect(button).toHaveClass('underline')
      expect(button.className).toContain('--color-accent-signal-text')
      // No fill, no bevel, no fixed control height: it sits in a line of text.
      expect(button).not.toHaveClass('bevel-sm')
      expect(button.className).not.toMatch(/\bbg-\[var\(--component-button/)
      expect(button.className).not.toContain('--component-control-height')
      // It takes the size of the sentence it sits in.
      expect(button).toHaveClass('text-[length:inherit]')
    })

    it('opts its wrapper out of the reticle, which would bracket a line of text', () => {
      render(<Button variant="link">View field manual</Button>)
      expect(screen.getByRole('button').parentElement).toHaveClass('bevel-focus-wrap', 'no-reticle')
    })

    it('keeps the bevel on every other variant', () => {
      render(
        <>
          {(['primary', 'secondary', 'danger', 'ghost'] as const).map(variant => (
            <Button key={variant} variant={variant}>
              {variant}
            </Button>
          ))}
        </>
      )
      for (const button of screen.getAllByRole('button')) expect(button).toHaveClass('bevel-sm')
    })
  })

  it('has an xs size, 24px: the minimum target, never below it', () => {
    render(<Button size="xs">Reset</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('h-6')
    expect(button).toHaveClass('px-2')
  })

  it('is axe clean across every variant', async () => {
    const { container } = render(
      <div className="flex flex-wrap gap-3">
        <Button variant="primary">Dispatch team</Button>
        <Button variant="secondary">Save draft</Button>
        <Button variant="danger">Abort</Button>
        <Button variant="ghost">Cancel</Button>
        <Button variant="link">View field manual</Button>
        <Button size="xs" iconStart={<svg />} iconEnd={<svg />}>
          Reset
        </Button>
        <Button loading loadingLabel="Dispatching">
          Dispatch team
        </Button>
        <Button disabled>Unavailable</Button>
      </div>
    )
    expect(await axeClean(container)).toHaveNoViolations()
  })

  // PRODUCT.md Principle 3, "restraint is the signal", reserves the glitch for failure, and the
  // Anti-references section names "constant glitch" as the failure mode to guard hardest. Hover is
  // the highest-frequency interaction in the system, so it is the single worst place to spend it:
  // M5 gives the discrete, switched quality with a stepped transition instead, and the glitch
  // keeps meaning "this broke". A sentence in two documents is what the vocabulary gate was built
  // because of, so this one is a gate.
  //
  // Coverage is pinned by tsc rather than by a hand-kept list. Adding a fifth variant to
  // buttonVariants without adding it here is a compile error ("property is missing"), so this
  // cannot silently stop covering the thing it claims to cover.
  type DeclaredVariant = NonNullable<VariantProps<typeof buttonVariants>['variant']>
  type DeclaredSize = NonNullable<VariantProps<typeof buttonVariants>['size']>
  const VARIANT_COVERAGE: Record<DeclaredVariant, true> = {
    primary: true,
    secondary: true,
    danger: true,
    ghost: true,
    link: true,
  }
  const SIZE_COVERAGE: Record<DeclaredSize, true> = { xs: true, sm: true, md: true, lg: true }
  const VARIANTS = Object.keys(VARIANT_COVERAGE) as DeclaredVariant[]
  const SIZES = Object.keys(SIZE_COVERAGE) as DeclaredSize[]

  it('spends no reserved glitch on hover, in any variant, size or width', () => {
    for (const variant of VARIANTS) {
      for (const size of SIZES) {
        for (const fullWidth of [true, false]) {
          const classes = buttonVariants({ variant, size, fullWidth })
          expect(
            classes,
            `buttonVariants({ variant: '${variant}', size: '${size}', fullWidth: ${fullWidth} }) ` +
              `produced "${classes}". The glitch is reserved for failure states; hover is the ` +
              `highest-frequency interaction there is. Use M5's stepped transition instead.`
          ).not.toMatch(/anim-glitch/)
        }
      }
    }
  })

  it('carries the stepped arrival on the rendered element, not a keyframe animation', () => {
    render(
      <>
        {VARIANTS.map(variant => (
          <Button key={variant} variant={variant}>
            {variant}
          </Button>
        ))}
      </>
    )
    for (const variant of VARIANTS) {
      const classes = screen.getByRole('button', { name: variant }).className
      // The class string is not evidence that the arrival steps: that is measured in a real
      // browser by e2e/button-hover.spec.ts. What it IS evidence of is which mechanism was
      // reached for, and this half of the rule is a prohibition, which a class string can carry.
      expect(classes, `${variant} carries the M5 transition`).toContain('transition-stepped')
      expect(classes, `${variant} spends no reserved animation on hover`).not.toMatch(
        /\banim-glitch\b|\banimate-/
      )
    }
  })

  // Type-only assertions, enforced by `tsc -b` (run as part of `npm run build`), not by vitest
  // at runtime — this test is skipped so nothing actually renders, but its body still
  // type-checks. `@ts-expect-error` fails the build if the error is *absent*, so removing the
  // asChild/native discriminated union in ButtonProps would make these two lines stop erroring
  // and the build would fail with "Unused '@ts-expect-error' directive."
  it.skip('rejects disabled/loading combined with asChild at the type level', () => {
    // @ts-expect-error a link can't be meaningfully disabled — asChild excludes `disabled`
    ;<Button asChild disabled>
      <a href="/kits">Browse kits</a>
    </Button>
    // @ts-expect-error a link can't announce "busy" — asChild excludes `loading`
    ;<Button asChild loading>
      <a href="/kits">Browse kits</a>
    </Button>
    // @ts-expect-error Slot takes exactly one child, so asChild cannot add icon slots: put the
    // icon inside the link instead
    ;<Button asChild iconStart={<svg />}>
      <a href="/kits">Browse kits</a>
    </Button>
  })

  // Type-only assertion, same mechanism as above. Button computes `aria-busy` from `loading` and
  // spreads `{...rest}` after it, so a caller-supplied `aria-busy` would silently win at runtime
  // (JSX later attributes override earlier ones) — a control that is aria-disabled, spinning, and
  // announcing "not busy". `aria-busy` is hyphenated, so this MUST be passed as a JSX attribute,
  // not an inline object literal: excess-property checking already rejects a fresh literal on
  // its own, which would make the pin pass even with the declared `never` removed (see design.md,
  // "Four assertion shapes that cannot fail").
  it.skip('rejects a caller-supplied aria-busy at the type level', () => {
    // @ts-expect-error aria-busy is computed from `loading`; passing it directly would silently
    // override that computed value at runtime
    ;<Button loading aria-busy="false">Dispatch team</Button>
  })
})
