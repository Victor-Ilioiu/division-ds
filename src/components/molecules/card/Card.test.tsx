import { createRef } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { axeClean } from '../../../test/axe'
import { Button } from '../../atoms'
import { Card, CardActions, CardBody, CardDescription, CardFooter, CardHeader, CardMedia, CardTitle } from './Card'

function Depot() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>North field depot</CardTitle>
        <CardDescription>Open until 18:00.</CardDescription>
      </CardHeader>
      <CardBody>Twelve kits ready for collection.</CardBody>
      <CardFooter>
        <Button size="sm">Collect</Button>
      </CardFooter>
    </Card>
  )
}

describe('Card', () => {
  it('is an article named by its title', () => {
    render(<Depot />)
    expect(screen.getByRole('article', { name: 'North field depot' })).toBeInTheDocument()
  })

  it('renders its title at level 3 by default, and at the level asked for', () => {
    const { rerender } = render(<Depot />)
    expect(screen.getByRole('heading', { level: 3, name: 'North field depot' })).toBeInTheDocument()
    rerender(
      <Card>
        <CardTitle level={2}>Summary</CardTitle>
      </Card>
    )
    expect(screen.getByRole('heading', { level: 2, name: 'Summary' })).toBeInTheDocument()
  })

  it('can be a section or a plain div', () => {
    const { rerender } = render(
      <Card as="section">
        <CardTitle>Totals</CardTitle>
      </Card>
    )
    expect(screen.getByRole('region', { name: 'Totals' })).toBeInTheDocument()
    rerender(
      <Card as="div" data-testid="plain">
        <CardTitle>Totals</CardTitle>
      </Card>
    )
    expect(screen.getByTestId('plain').tagName).toBe('DIV')
    expect(screen.getByTestId('plain')).not.toHaveAttribute('aria-labelledby')
  })

  it('does not label an article with no title (pointing aria-labelledby at an id nothing renders is an invalid IDREF, worth no more than no attribute)', () => {
    render(<Card data-testid="untitled" />)
    expect(screen.getByTestId('untitled')).not.toHaveAttribute('aria-labelledby')
  })

  it('types aria-labelledby away on Card, so only a CardTitle can name it', () => {
    // @ts-expect-error aria-labelledby is typed away on Card; only a CardTitle may name it.
    const el = <Card aria-labelledby="x" />
    expect(el).toBeTruthy()
  })

  // `id` sits before `{...rest}` in CardTitle's JSX, so without the `never` guard a
  // caller-supplied `id` (via a spread) would win over the one Card actually registers and
  // expects `aria-labelledby` to point at -- the card's name would silently break.
  // `@ts-expect-error` fails the build if this ever regresses, so removing the guard is a compile
  // error, not a test failure that someone has to notice.
  it('types id away on CardTitle, so the id the Card registered always lands', () => {
    // @ts-expect-error id is typed away on CardTitle; the id the Card registered must always land.
    const el = <CardTitle id="x">Title</CardTitle>
    expect(el).toBeTruthy()
  })

  it('carries the crosshair motif and no bevel', () => {
    render(<Depot />)
    const card = screen.getByRole('article')
    expect(card).toHaveClass('panel', 'crosshair')
    expect(card.className).not.toMatch(/bevel-/)
  })

  it('forwards a ref to the root', () => {
    const ref = createRef<HTMLElement>()
    render(
      <Card ref={ref}>
        <CardTitle>x</CardTitle>
      </Card>
    )
    expect(ref.current?.tagName).toBe('ARTICLE')
  })

  it('is axe clean', async () => {
    const { container } = render(<Depot />)
    expect(await axeClean(container)).toHaveNoViolations()
  })

  describe('CardActions (buttons inside the content, no action bar)', () => {
    function Inline() {
      return (
        <Card>
          <CardHeader>
            <CardTitle>North field depot</CardTitle>
          </CardHeader>
          <CardBody>
            <p>Twelve kits ready for collection.</p>
            <CardActions data-testid="actions" className="extra">
              <Button size="sm">Collect</Button>
              <Button size="sm" variant="secondary">
                Details
              </Button>
            </CardActions>
          </CardBody>
        </Card>
      )
    }

    it('is a left-aligned wrapping row: no justify-end, no border, no padding band', () => {
      render(<Inline />)
      const row = screen.getByTestId('actions')
      expect(row).toHaveClass('flex', 'flex-wrap', 'gap-3', 'mt-4', 'extra')
      expect(row.className).not.toMatch(/justify-end|border|(^|\s)p[xy]?-\d/)
    })

    it('keeps the author order: primary first, secondary after', () => {
      render(<Inline />)
      const names = screen.getAllByRole('button').map(b => b.textContent)
      expect(names).toEqual(['Collect', 'Details'])
    })

    it('differs from CardFooter, which is right-aligned over a hairline', () => {
      render(<Depot />)
      const footer = screen.getByRole('button', { name: 'Collect' }).closest('.border-t') as HTMLElement
      expect(footer).toHaveClass('justify-end', 'border-t')
    })

    it('is axe clean', async () => {
      const { container } = render(<Inline />)
      expect(await axeClean(container)).toHaveNoViolations()
    })
  })

  // `interactive` is the one way to say "this whole card is a click target". The border and the
  // 4px lift are CSS on `.card-interactive`, measured in e2e/organisms.spec.ts.
  describe('interactive', () => {
    /** A card with a link stretched over it, the shape ProductCard has. */
    function Linked({ interactive }: { interactive?: boolean }) {
      return (
        <Card interactive={interactive}>
          <CardBody>
            <CardTitle>
              <a href="/depots/north">North field depot</a>
            </CardTitle>
          </CardBody>
        </Card>
      )
    }

    it('carries the class the border and lift hang on, and only when asked', () => {
      const { rerender } = render(<Linked interactive />)
      expect(screen.getByRole('article')).toHaveClass('card-interactive', 'panel', 'crosshair')
      rerender(<Linked />)
      expect(screen.getByRole('article')).not.toHaveClass('card-interactive')
    })

    // The card is a surface, not a control: the link inside stays the one thing to click and to
    // focus, under its own name. Mutation: add `tabIndex={0}` or `role="link"` to the interactive
    // Card -> fails here.
    it('adds no role, no tab stop and no second name: the link inside is still the control', () => {
      render(<Linked interactive />)
      const card = screen.getByRole('article', { name: 'North field depot' })
      expect(card).not.toHaveAttribute('tabindex')
      expect(card).not.toHaveAttribute('role')
      expect(screen.getAllByRole('link')).toHaveLength(1)
      expect(screen.getByRole('link', { name: 'North field depot' })).toHaveAttribute('href', '/depots/north')
    })

    it('still calls the pointer handlers a caller passes, interactive or not', () => {
      const onPointerMove = vi.fn()
      const onPointerLeave = vi.fn()
      const { rerender } = render(<Card interactive onPointerMove={onPointerMove} onPointerLeave={onPointerLeave} data-testid="card" />)
      fireEvent.pointerMove(screen.getByTestId('card'), { pointerType: 'mouse' })
      fireEvent.pointerLeave(screen.getByTestId('card'), { pointerType: 'mouse' })
      rerender(<Card onPointerMove={onPointerMove} onPointerLeave={onPointerLeave} data-testid="card" />)
      fireEvent.pointerMove(screen.getByTestId('card'), { pointerType: 'mouse' })
      fireEvent.pointerLeave(screen.getByTestId('card'), { pointerType: 'mouse' })
      expect(onPointerMove).toHaveBeenCalledTimes(2)
      expect(onPointerLeave).toHaveBeenCalledTimes(2)
    })

    it('is axe clean', async () => {
      const { container } = render(<Linked interactive />)
      expect(await axeClean(container)).toHaveNoViolations()
    })
  })

  describe('CardMedia', () => {
    it('renders a decorative image by default, cropped to 16/9, with no padding of its own', () => {
      const { container } = render(
        <Card>
          <CardMedia src="/a.webp" data-testid="media" />
          <CardTitle>Depot</CardTitle>
        </Card>
      )
      const media = screen.getByTestId('media')
      expect(media).toHaveClass('w-full', 'overflow-hidden', 'aspect-[16/9]')
      expect(media.className).not.toMatch(/(^|\s)-?[pm][xytrbl]?-\d/)
      const img = container.querySelector('img') as HTMLImageElement
      expect(img).toHaveAttribute('src', '/a.webp')
      expect(img).toHaveAttribute('alt', '')
      expect(img).toHaveClass('object-cover')
    })

    it('takes an alt and an aspect', () => {
      render(
        <Card>
          <CardMedia src="/a.webp" alt="A depot at dusk" aspect="1/1" data-testid="media" />
        </Card>
      )
      expect(screen.getByRole('img', { name: 'A depot at dusk' })).toBeInTheDocument()
      expect(screen.getByTestId('media')).toHaveClass('aspect-square')
    })

    it('shows its children instead when there is no src', () => {
      const { container } = render(
        <Card>
          <CardMedia aspect="4/3">
            <span>placeholder</span>
          </CardMedia>
        </Card>
      )
      expect(container.querySelector('img')).toBeNull()
      expect(screen.getByText('placeholder')).toBeInTheDocument()
    })

    it('is a direct child of the card, which clips nothing itself', () => {
      render(
        <Card interactive>
          <CardMedia src="/a.webp" data-testid="media" />
          <CardTitle>
            <a href="/x">Depot</a>
          </CardTitle>
        </Card>
      )
      const card = screen.getByRole('article')
      expect(screen.getByTestId('media').parentElement).toBe(card)
      expect(card.className).not.toMatch(/overflow/)
      expect(card).toHaveClass('card-interactive', 'crosshair')
    })

    it('is axe clean', async () => {
      const { container } = render(
        <Card>
          <CardMedia src="/a.webp" />
          <CardTitle>Depot</CardTitle>
        </Card>
      )
      expect(await axeClean(container)).toHaveNoViolations()
    })
  })
})
