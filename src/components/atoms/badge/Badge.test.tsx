import { describe, it, expect } from 'vitest'
import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import { axeClean } from '../../../test/axe'
import darkTheme from '../../../../tokens/semantic/color.dark.json'
import lightTheme from '../../../../tokens/semantic/color.light.json'
import { Badge, CATEGORY_COLORS } from './Badge'

const TONES = ['neutral', 'signal', 'ok', 'warning', 'hostile', 'info'] as const

// neutral is the odd one out — it pairs text.secondary/surface.base, not an accent triple.
// Handled explicitly below rather than bent into the loop.
const ACCENT_TONES = TONES.filter(tone => tone !== 'neutral')

describe('Badge', () => {
  it('renders its text', () => {
    render(<Badge>Deployed</Badge>)
    expect(screen.getByText('Deployed')).toBeInTheDocument()
  })

  it('pairs neutral solid with text.secondary on surface.base, never white', () => {
    render(<Badge tone="neutral" emphasis="solid">Idle</Badge>)
    const cls = screen.getByText('Idle').className
    expect(cls).toContain('--color-text-secondary')
    expect(cls).toContain('--color-surface-base')
    expect(cls).not.toContain('text-white')
  })

  it('uses the theme-adaptive text token for neutral subtle', () => {
    render(<Badge tone="neutral" emphasis="subtle">Idle</Badge>)
    expect(screen.getByText('Idle').className).toContain('--color-text-secondary')
  })

  it.each(ACCENT_TONES)('pairs %s solid with its own fill and ink, never white', tone => {
    render(<Badge tone={tone} emphasis="solid">{tone}</Badge>)
    const cls = screen.getByText(tone).className
    expect(cls).toContain(`--color-accent-${tone}-fill`)
    expect(cls).toContain(`--color-accent-${tone}-ink`)
    expect(cls).not.toContain('text-white')
  })

  it.each(ACCENT_TONES)('uses %s theme-adaptive text token when subtle', tone => {
    render(<Badge tone={tone} emphasis="subtle">{tone}</Badge>)
    expect(screen.getByText(tone).className).toContain(`--color-accent-${tone}-text`)
  })

  it('marks the optional dot aria-hidden so the text carries the meaning', () => {
    const { container } = render(<Badge tone="ok" dot>Nominal</Badge>)
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument()
    expect(screen.getByText('Nominal')).toBeInTheDocument()
  })

  // `sm` is the default and is the badge as it was before the prop existed: the same height and
  // text step, so no badge already on a page changes size.
  it('is the 22px chip at the 11px label step by default, and when size is sm', () => {
    render(
      <>
        <Badge>Default</Badge>
        <Badge size="sm">Small</Badge>
      </>
    )
    for (const text of ['Default', 'Small']) {
      const badge = screen.getByText(text)
      expect(badge).toHaveClass('h-[22px]', 'px-2', 'text-[11px]')
      expect(badge).not.toHaveClass('text-sm')
    }
  })

  it('takes the small control height and the 14px text step at size md', () => {
    render(<Badge size="md">Raised</Badge>)
    const badge = screen.getByText('Raised')
    expect(badge).toHaveClass('h-[var(--component-control-height-sm)]', 'px-3', 'text-sm')
    expect(badge).not.toHaveClass('h-[22px]')
    expect(badge).not.toHaveClass('text-[11px]')
  })

  it('scales the dot with the size', () => {
    const { container } = render(
      <>
        <Badge dot>Small</Badge>
        <Badge dot size="md">
          Raised
        </Badge>
      </>
    )
    const [small, raised] = container.querySelectorAll('[aria-hidden="true"]')
    expect(small).toHaveClass('w-1.5', 'h-1.5')
    expect(raised).toHaveClass('w-2', 'h-2')
  })

  // The gap plan asked for an `outline` emphasis: a border in the tone's text token on a
  // transparent fill. That is exactly what `subtle` already is, so a second name for the same
  // look is not added; this pins subtle to that definition so the two can never drift apart.
  it('is the outline treatment at emphasis subtle: tone-text border and text, no fill', () => {
    for (const tone of ['signal', 'ok', 'warning', 'hostile', 'info'] as const) {
      const { unmount } = render(<Badge tone={tone} emphasis="subtle">{tone}</Badge>)
      const badge = screen.getByText(tone)
      expect(badge).toHaveClass('border')
      expect(badge.className).toContain(`border-[var(--color-accent-${tone}-text)]`)
      expect(badge.className).toContain(`text-[var(--color-accent-${tone}-text)]`)
      expect(badge.className).not.toMatch(/\bbg-/)
      unmount()
    }
  })

  describe('icon', () => {
    it('renders a leading icon, aria-hidden, before the text', () => {
      render(
        <Badge tone="ok" icon={<svg data-testid="icon" />}>
          In stock
        </Badge>
      )
      const slot = screen.getByTestId('icon').parentElement!
      expect(slot).toHaveAttribute('aria-hidden', 'true')
      expect(screen.getByText('In stock').firstElementChild).toBe(slot)
    })

    it('sizes the icon with the badge', () => {
      render(
        <>
          <Badge icon={<svg data-testid="sm" />}>Small</Badge>
          <Badge size="md" icon={<svg data-testid="md" />}>Medium</Badge>
        </>
      )
      expect(screen.getByTestId('sm').parentElement!.className).toContain('[&_svg]:w-3')
      expect(screen.getByTestId('md').parentElement!.className).toContain('[&_svg]:w-3.5')
    })

    it('renders the icon before the dot when both are given', () => {
      render(
        <Badge dot icon={<svg data-testid="icon" />}>
          Live
        </Badge>
      )
      const badge = screen.getByText('Live')
      expect(badge.children[0]).toBe(screen.getByTestId('icon').parentElement)
    })
  })

  describe('category colour', () => {
    it.each(CATEGORY_COLORS)('pairs %s solid with its own fill and ink, and no status tone', color => {
      render(<Badge color={color} emphasis="solid">{color}</Badge>)
      const cls = screen.getByText(color).className
      expect(cls).toContain(`--color-category-${color}-fill`)
      expect(cls).toContain(`--color-category-${color}-ink`)
      expect(cls).not.toContain('--color-accent-')
      expect(cls).not.toContain('--color-text-secondary')
    })

    it.each(CATEGORY_COLORS)('uses %s text token for text and border when subtle', color => {
      render(<Badge color={color}>{color}</Badge>)
      const cls = screen.getByText(color).className
      expect(cls).toContain(`text-[var(--color-category-${color}-text)]`)
      expect(cls).toContain(`border-[var(--color-category-${color}-text)]`)
      expect(cls).not.toContain('--color-border-hairline-strong')
    })

    it('rejects tone and color together in the types', () => {
      // @ts-expect-error a badge is a status or a category, never both
      render(<Badge tone="ok" color="blue">Both</Badge>)
    })

    it('lists exactly the colours the theme files define, in both themes', () => {
      for (const theme of [darkTheme, lightTheme]) {
        expect(Object.keys(theme.color.semantic.category).filter(k => !k.startsWith('$'))).toEqual([...CATEGORY_COLORS])
      }
    })

    it('is axe clean in every colour and emphasis', async () => {
      const { container } = render(
        <div>
          {CATEGORY_COLORS.map(color => (
            <span key={color}>
              <Badge color={color}>{color}</Badge>
              <Badge color={color} emphasis="solid" size="md" dot>{color}</Badge>
            </span>
          ))}
        </div>
      )
      expect(await axeClean(container)).toHaveNoViolations()
    })
  })

  it('forwards a ref', () => {
    const ref = createRef<HTMLSpanElement>()
    render(<Badge ref={ref}>Deployed</Badge>)
    expect(ref.current?.tagName).toBe('SPAN')
  })

  it('is axe clean in every tone, emphasis and size', async () => {
    const { container } = render(
      <div>
        {TONES.map(tone => (
          <span key={tone}>
            <Badge tone={tone} emphasis="solid">{tone}</Badge>
            <Badge tone={tone} emphasis="subtle">{tone}</Badge>
            <Badge tone={tone} emphasis="solid" size="md">{tone}</Badge>
            <Badge tone={tone} emphasis="subtle" size="md" dot>{tone}</Badge>
            <Badge tone={tone} icon={<svg />}>{tone}</Badge>
          </span>
        ))}
      </div>
    )
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
