import { createRef } from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { axeClean } from '../../../test/axe'
import { Avatar, initialsFrom } from './Avatar'

describe('initialsFrom', () => {
  it('takes the first letter of the first two words', () => {
    expect(initialsFrom('Dana Iverson')).toBe('DI')
  })

  it('handles a single word', () => {
    expect(initialsFrom('Dana')).toBe('D')
  })

  it('ignores extra whitespace', () => {
    expect(initialsFrom('  Dana   Iverson  ')).toBe('DI')
  })

  it('returns an empty string for an empty name', () => {
    expect(initialsFrom('   ')).toBe('')
  })

  it('keeps an astral-plane first character whole instead of splitting the surrogate pair', () => {
    // U+20BB7 is outside the BMP, so `word[0]` returns a lone high surrogate — half a character,
    // which renders as a replacement glyph. Iterating by code point returns the whole thing.
    const name = '\u{20BB7}\u{91CE} Tanaka'
    expect(initialsFrom(name)).toBe('\u{20BB7}T')
    // Two UTF-16 code units, i.e. the pair survived intact.
    expect(initialsFrom(name)).toHaveLength(3)
  })
})

describe('Avatar', () => {
  it('announces the name whether or not the image loaded', () => {
    render(<Avatar name="Dana Iverson" />)
    expect(screen.getByText('Dana Iverson')).toHaveClass('sr-only')
  })

  it('hides the decorative initials from assistive tech', () => {
    const { container } = render(<Avatar name="Dana Iverson" />)
    const initials = container.querySelector('[aria-hidden="true"]')
    expect(initials).toHaveTextContent('DI')
  })

  it('applies the size variant', () => {
    const { container } = render(<Avatar name="Dana Iverson" size="lg" />)
    expect(container.firstElementChild?.className).toContain('w-12')
  })

  // jsdom has no layout or paint, so the diagonal itself cannot be seen here. What can be held is
  // that every size with a cut corner also carries the edge and its colour, and that sm has neither.
  it('draws the diagonal edge on every size that has a cut corner', () => {
    for (const size of ['md', 'lg'] as const) {
      const { container, unmount } = render(<Avatar name="Dana Iverson" size={size} />)
      expect(container.firstElementChild).toHaveClass(
        'relative',
        'bevel-sm',
        'bevel-edge',
        '[--bevel-edge-color:var(--color-border-hairline-strong)]'
      )
      unmount()
    }
    const { container } = render(<Avatar name="Dana Iverson" size="sm" />)
    expect(container.firstElementChild).not.toHaveClass('bevel-sm')
    expect(container.firstElementChild).not.toHaveClass('bevel-edge')
  })

  describe('status', () => {
    it('folds the status into the announced name, so it is never colour alone', () => {
      render(<Avatar name="Ilse Varga" status="online" />)
      expect(screen.getByText('Ilse Varga, online')).toHaveClass('sr-only')
    })

    it('draws a decorative dot in the status tone', () => {
      const tones = {
        online: 'bg-[var(--color-accent-ok-text)]',
        away: 'bg-[var(--color-accent-warning-text)]',
        busy: 'bg-[var(--color-accent-hostile-text)]',
        offline: 'bg-[var(--color-text-muted)]',
      } as const
      for (const [status, tone] of Object.entries(tones)) {
        const { container, unmount } = render(
          <Avatar name="Ilse Varga" status={status as keyof typeof tones} />
        )
        const dot = container.querySelector('[data-avatar-status]')
        expect(dot).toHaveAttribute('aria-hidden', 'true')
        expect(dot).toHaveAttribute('data-avatar-status', status)
        expect(dot).toHaveClass(tone)
        unmount()
      }
    })

    it('draws no dot and adds nothing to the name without a status', () => {
      const { container } = render(<Avatar name="Ilse Varga" />)
      expect(container.querySelector('[data-avatar-status]')).toBeNull()
      expect(screen.getByText('Ilse Varga')).toHaveClass('sr-only')
    })

    it('is axe clean with every status', async () => {
      const { container } = render(
        <div>
          <Avatar name="Ilse Varga" size="sm" status="online" />
          <Avatar name="Ravi Okonkwo" status="away" />
          <Avatar name="Mei Tanaka" size="lg" status="busy" />
          <Avatar name="Lin" status="offline" />
        </div>
      )
      expect(await axeClean(container)).toHaveNoViolations()
    })
  })

  it('is axe clean', async () => {
    const { container } = render(
      <div>
        <Avatar name="Dana Iverson" size="sm" />
        <Avatar name="Ravi Okonkwo" size="md" />
        <Avatar name="Lin" size="lg" />
      </div>
    )
    expect(await axeClean(container)).toHaveNoViolations()
  })

  it('passes rest props through to the root element', () => {
    const { container } = render(<Avatar name="Dana Iverson" data-testid="avatar-chip" />)
    expect(container.querySelector('[data-testid="avatar-chip"]')).toBeInTheDocument()
  })

  it('forwards a ref to the root element', () => {
    const ref = createRef<HTMLSpanElement>()
    const { container } = render(<Avatar name="Dana Iverson" ref={ref} />)
    // `toBe(container.firstElementChild)` passes when BOTH sides are null — a ref that was never
    // attached and an element that never rendered look identical to it. Assert non-null first.
    expect(ref.current).not.toBeNull()
    expect(ref.current).toBe(container.firstElementChild)
  })

  // Type-only assertion, enforced by `tsc -b` (run as part of `npm run build`), not by vitest at
  // runtime — this test is skipped so nothing actually renders, but its body still type-checks.
  // `@ts-expect-error` fails the build if the error is *absent*, so removing the declared
  // `'aria-label'?: never` from AvatarProps would make this line stop erroring and the build
  // would fail with "Unused '@ts-expect-error' directive."
  it.skip('rejects a caller-supplied aria-label at the type level', () => {
    // @ts-expect-error the announced name comes from the sr-only span's content — aria-label would silently outrank it
    ;<Avatar name="Dana Iverson" aria-label="Override" />
  })

  // Type-only assertion, enforced by `tsc -b` (run as part of `npm run build`), not by vitest at
  // runtime — this test is skipped so nothing actually renders, but its body still type-checks.
  // `children` is an ordinary key, so the `Omit<..., 'children'>` is what does the rejecting and
  // the declared `children?: never` only makes the error legible: the mutation that proves this
  // pin load-bearing is removing the WHOLE exclusion, not just the declared never.
  it.skip('rejects caller-supplied children at the type level', () => {
    // @ts-expect-error Avatar renders its own image/fallback/sr-only children; a children prop is silently discarded
    ;<Avatar name="Dana Iverson" children={<span>ignored</span>} />
  })
})
