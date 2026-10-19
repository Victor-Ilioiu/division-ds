import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../../../test/axe'
import { Carousel } from './Carousel'

const NAMES = ['Halo', 'Prism', 'Mute', 'Camo', 'Beam', 'Smoke', 'Amber', 'Stick']

function linkItems(count = NAMES.length) {
  return NAMES.slice(0, count).map(name => (
    <a key={name} href={`#${name.toLowerCase()}`}>
      {name}
    </a>
  ))
}

function plainItems(count = NAMES.length) {
  return NAMES.slice(0, count).map(name => <span key={name}>{name}</span>)
}

function rect(left: number, width: number): DOMRect {
  return { left, right: left + width, width, top: 0, bottom: 100, height: 100, x: left, y: 0, toJSON: () => ({}) }
}

/**
 * jsdom lays nothing out: every rectangle is zero and nothing scrolls. This gives the track the
 * geometry a browser would, so the component's own arithmetic runs against real numbers: a track
 * `viewport` wide with a `gutter` of padding either side, and items `itemWidth` wide, `gap`
 * apart, that move left as `scrollLeft` grows. `scrollLeft` clamps the way a browser clamps it.
 * Then one scroll event, which is what makes the component measure again.
 */
function layOut(
  track: HTMLElement,
  { viewport = 600, itemWidth = 180, gap = 16, gutter = 8 }: { viewport?: number; itemWidth?: number; gap?: number; gutter?: number } = {}
) {
  const count = track.children.length
  const scrollWidth = gutter * 2 + count * itemWidth + Math.max(0, count - 1) * gap
  let scrollLeft = 0
  track.style.paddingLeft = `${gutter}px`
  track.style.paddingRight = `${gutter}px`
  Object.defineProperty(track, 'clientWidth', { configurable: true, get: () => viewport })
  Object.defineProperty(track, 'scrollWidth', { configurable: true, get: () => scrollWidth })
  Object.defineProperty(track, 'scrollLeft', {
    configurable: true,
    get: () => scrollLeft,
    set: (value: number) => {
      scrollLeft = Math.min(Math.max(0, value), Math.max(0, scrollWidth - viewport))
    },
  })
  track.getBoundingClientRect = () => rect(0, viewport)
  Array.from(track.children).forEach((item, index) => {
    item.getBoundingClientRect = () => rect(gutter + index * (itemWidth + gap) - scrollLeft, itemWidth)
  })
  fireEvent.scroll(track)
}

function parts(label = 'Offers') {
  const region = screen.getByRole('region', { name: label })
  return {
    region,
    track: within(region).getByRole('list'),
    previous: within(region).getByRole('button', { name: 'Previous items' }),
    next: within(region).getByRole('button', { name: 'Next items' }),
  }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('Carousel', () => {
  it('is a region named by its label, described as a carousel', () => {
    render(<Carousel label="Offers">{linkItems()}</Carousel>)
    const { region } = parts()
    expect(region.tagName).toBe('SECTION')
    expect(region).toHaveAttribute('aria-roledescription', 'carousel')
  })

  // Only the type-check matters, so the test is skipped: a carousel without a name has to fail
  // `tsc -b`, and with it `npm run build`.
  it.skip('requires a label at compile time', () => {
    // @ts-expect-error label is required: an unnamed carousel is an unnamed landmark
    render(<Carousel>{linkItems()}</Carousel>)
  })

  it('renders every child as one item of a list', () => {
    render(<Carousel label="Offers">{linkItems()}</Carousel>)
    const items = within(parts().track).getAllByRole('listitem')
    expect(items).toHaveLength(NAMES.length)
    expect(items.map(item => item.textContent)).toEqual(NAMES)
  })

  // The WAI-ARIA carousel pattern's order: the controls come before the slides, so a screen
  // reader meets them first.
  it('puts Previous and Next ahead of the items, in that order', () => {
    render(<Carousel label="Offers">{linkItems()}</Carousel>)
    const { previous, next, track } = parts()
    expect(previous.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(next.compareDocumentPosition(track) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  describe('with eight items in a track that shows three', () => {
    it('starts with Previous inert but focusable, Next live, and the position in words', () => {
      render(<Carousel label="Offers">{linkItems()}</Carousel>)
      const { previous, next, track, region } = parts()
      layOut(track)
      // aria-disabled, never `disabled`: a native disabled button leaves the tab order.
      expect(previous).toHaveAttribute('aria-disabled', 'true')
      expect(previous).not.toBeDisabled()
      expect(next).not.toHaveAttribute('aria-disabled')
      expect(within(region).getByText('1 to 3 of 8')).toBeInTheDocument()
    })

    // Mutation: make Next scroll by the track's width (`scrollLeft + clientWidth`) -> it lands on
    // 600 and not on the fourth item's start (588), and the fourth item's left edge is cut.
    it('Next brings the first item that was not fully in view to the start', async () => {
      render(<Carousel label="Offers">{linkItems()}</Carousel>)
      const { previous, next, track, region } = parts()
      layOut(track)
      await userEvent.click(next)
      // Item four starts at 8 + 3 * 196 = 596; aligned to the 8px gutter that is scrollLeft 588.
      expect(track.scrollLeft).toBe(588)
      expect(within(region).getByText('4 to 6 of 8')).toBeInTheDocument()
      expect(previous).not.toHaveAttribute('aria-disabled')
      expect(next).not.toHaveAttribute('aria-disabled')
    })

    it('Next goes inert at the end, keeps focus, and a further press moves nothing', async () => {
      render(<Carousel label="Offers">{linkItems()}</Carousel>)
      const { next, track, region } = parts()
      layOut(track)
      next.focus()
      await userEvent.click(next)
      await userEvent.click(next)
      // 8 items: 16 + 8 * 180 + 7 * 16 = 1568 wide, less the 600 showing.
      expect(track.scrollLeft).toBe(968)
      expect(next).toHaveAttribute('aria-disabled', 'true')
      expect(next).not.toBeDisabled()
      expect(next).toHaveFocus()
      expect(within(region).getByText('6 to 8 of 8')).toBeInTheDocument()
      await userEvent.click(next)
      expect(track.scrollLeft).toBe(968)
      expect(next).toHaveFocus()
    })

    // Mutation: make Previous go back by the track's width -> from the end (968) it lands on 368,
    // between two items, and the assertion on 392 fails.
    it('Previous goes back a page without skipping an item, then goes inert at the start', async () => {
      render(<Carousel label="Offers">{linkItems()}</Carousel>)
      const { previous, next, track, region } = parts()
      layOut(track)
      await userEvent.click(next)
      await userEvent.click(next)
      await userEvent.click(previous)
      // From the end, items six to eight are showing. A page back keeps item five in view as the
      // last one, so items three to five show: item three starts at 400, scrollLeft 392.
      expect(track.scrollLeft).toBe(392)
      expect(within(region).getByText('3 to 5 of 8')).toBeInTheDocument()
      await userEvent.click(previous)
      expect(track.scrollLeft).toBe(0)
      expect(previous).toHaveAttribute('aria-disabled', 'true')
      expect(within(region).getByText('1 to 3 of 8')).toBeInTheDocument()
    })

    it('works from the keyboard: Enter and Space on the buttons page the track', async () => {
      render(<Carousel label="Offers">{linkItems()}</Carousel>)
      const { previous, next, track } = parts()
      layOut(track)
      next.focus()
      await userEvent.keyboard('{Enter}')
      expect(track.scrollLeft).toBe(588)
      previous.focus()
      await userEvent.keyboard(' ')
      expect(track.scrollLeft).toBe(0)
    })

    it('follows a scroll made by hand: the position and both buttons track scrollLeft', () => {
      render(<Carousel label="Offers">{linkItems()}</Carousel>)
      const { previous, next, track, region } = parts()
      layOut(track)
      track.scrollLeft = 968
      fireEvent.scroll(track)
      expect(within(region).getByText('6 to 8 of 8')).toBeInTheDocument()
      expect(previous).not.toHaveAttribute('aria-disabled')
      expect(next).toHaveAttribute('aria-disabled', 'true')
    })
  })

  it('makes both buttons inert, and still focusable, when everything fits', () => {
    render(<Carousel label="Offers">{linkItems(3)}</Carousel>)
    const { previous, next, track, region } = parts()
    layOut(track)
    expect(previous).toHaveAttribute('aria-disabled', 'true')
    expect(next).toHaveAttribute('aria-disabled', 'true')
    expect(previous).not.toBeDisabled()
    expect(next).not.toBeDisabled()
    expect(within(region).getByText('1 to 3 of 3')).toBeInTheDocument()
  })

  it('says "n of m" when one item shows at a time', () => {
    render(<Carousel label="Offers">{linkItems()}</Carousel>)
    const { track, region } = parts()
    layOut(track, { viewport: 240 })
    expect(within(region).getByText('1 of 8')).toBeInTheDocument()
  })

  describe('announcements', () => {
    // Mutation: write the announcement in the scroll handler unconditionally -> the hand-scroll
    // test below hears "6 to 8 of 8".
    it('announces where the track came to rest after a press, once it has been still', () => {
      vi.useFakeTimers()
      render(<Carousel label="Offers">{linkItems()}</Carousel>)
      const { next, track, region } = parts()
      layOut(track)
      const status = within(region).getByRole('status')
      expect(status).toBeEmptyDOMElement()
      fireEvent.click(next)
      expect(status).toBeEmptyDOMElement()
      act(() => {
        vi.advanceTimersByTime(200)
      })
      expect(status).toHaveTextContent(/^4 to 6 of 8$/)
    })

    it('does not announce a scroll made by hand', () => {
      vi.useFakeTimers()
      render(<Carousel label="Offers">{linkItems()}</Carousel>)
      const { track, region } = parts()
      layOut(track)
      track.scrollLeft = 968
      fireEvent.scroll(track)
      act(() => {
        vi.advanceTimersByTime(1000)
      })
      expect(within(region).getByRole('status')).toBeEmptyDOMElement()
    })
  })

  // No autoplay, ever. A minute with nobody touching it: the track has not moved, no timer is
  // waiting, nothing was announced. Mutation: add a `setInterval` that pages the track -> the
  // timer count is not zero and scrollLeft has moved.
  it('never moves on its own', () => {
    vi.useFakeTimers()
    render(<Carousel label="Offers">{linkItems()}</Carousel>)
    const { track, region } = parts()
    layOut(track)
    expect(vi.getTimerCount()).toBe(0)
    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    expect(track.scrollLeft).toBe(0)
    expect(within(region).getByText('1 to 3 of 8')).toBeInTheDocument()
    expect(within(region).getByRole('status')).toBeEmptyDOMElement()
    expect(vi.getTimerCount()).toBe(0)
  })

  describe('the track as a tab stop', () => {
    it('stays out of the tab order when its items can take focus', async () => {
      render(<Carousel label="Offers">{linkItems()}</Carousel>)
      const { previous, next, track } = parts()
      expect(track).not.toHaveAttribute('tabindex')
      expect(track).not.toHaveAttribute('aria-label')
      await userEvent.tab()
      expect(previous).toHaveFocus()
      await userEvent.tab()
      expect(next).toHaveFocus()
      await userEvent.tab()
      expect(screen.getByRole('link', { name: 'Halo' })).toHaveFocus()
    })

    // A scroll container nothing inside can be focused in has to be reachable itself, or the
    // keyboard cannot scroll it (SC 2.1.1).
    it('becomes one, with a name, when nothing inside it can take focus', async () => {
      render(<Carousel label="Photos">{plainItems()}</Carousel>)
      const { next, track } = parts('Photos')
      expect(track).toHaveAttribute('tabindex', '0')
      expect(track).toHaveAccessibleName('Photos')
      next.focus()
      await userEvent.tab()
      expect(track).toHaveFocus()
    })

    it('follows its children: a track whose items gain a link stops being a tab stop', () => {
      const { rerender } = render(<Carousel label="Offers">{plainItems()}</Carousel>)
      expect(parts().track).toHaveAttribute('tabindex', '0')
      rerender(<Carousel label="Offers">{linkItems()}</Carousel>)
      expect(parts().track).not.toHaveAttribute('tabindex')
    })
  })

  it('takes the item width and the gutter from props, and never lets the gutter under 0.5rem', () => {
    const { rerender } = render(<Carousel label="Offers">{linkItems()}</Carousel>)
    const { region } = parts()
    expect(region.style.getPropertyValue('--carousel-item-width')).toBe('min(18rem, 80%)')
    expect(region.style.getPropertyValue('--carousel-gutter')).toBe('max(0.5rem, 0.5rem)')
    rerender(
      <Carousel label="Offers" itemWidth="20rem" gutter="0px">
        {linkItems()}
      </Carousel>
    )
    expect(region.style.getPropertyValue('--carousel-item-width')).toBe('20rem')
    // 0px is asked for; the floor still wins, because the gutter is where an edge ring is drawn.
    expect(region.style.getPropertyValue('--carousel-gutter')).toBe('max(0.5rem, 0px)')
  })

  // jsdom applies no stylesheet, so this pins the classes that state the mechanism: a native
  // scroll container with snap points, padded so an edge item's ring is inside it, gliding only
  // where motion is allowed. e2e/organisms.spec.ts measures the real thing.
  it('is a native scroll container with snap points, an inset and a reduced-motion switch', () => {
    render(<Carousel label="Offers">{linkItems()}</Carousel>)
    const { track } = parts()
    expect(track).toHaveClass('overflow-x-auto', 'snap-x', 'snap-mandatory')
    expect(track).toHaveClass('scroll-smooth', 'motion-reduce:scroll-auto')
    expect(track).toHaveClass('px-[var(--carousel-gutter)]', 'scroll-px-[var(--carousel-gutter)]')
    // 1.5rem of clip room above and below for a card's lift and crosshair arms, 1rem of it taken back by
    // the margin, so the layout is 0.5rem. Mutation: `py-2` and no margin -> a hovered card's
    // crosshair arms are cut off in a straight line (e2e/organisms.spec.ts measures the room).
    expect(track).toHaveClass('py-6', '-my-4')
    expect(track).toHaveClass('[scrollbar-width:none]')
    expect(within(track).getAllByRole('listitem')[0]).toHaveClass('snap-start', 'shrink-0')
  })

  it('forwards a ref to the section, and merges a className onto it', () => {
    const ref = createRef<HTMLElement>()
    render(
      <Carousel ref={ref} label="Offers" className="mt-8">
        {linkItems()}
      </Carousel>
    )
    expect(ref.current).toBe(parts().region)
    expect(ref.current).toHaveClass('mt-8', 'min-w-0')
  })

  it('is axe clean with focusable items, and with a focusable track', async () => {
    const { container } = render(
      <main>
        <h1>Hexline</h1>
        <Carousel label="Offers">{linkItems()}</Carousel>
        <Carousel label="Photos">{plainItems()}</Carousel>
      </main>
    )
    layOut(parts('Offers').track)
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
