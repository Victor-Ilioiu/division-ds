import { createRef } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../../../test/axe'
import { Footer, type FooterColumn } from './Footer'

const COLUMNS: FooterColumn[] = [
  { title: 'Shop', links: [{ label: 'Replicas', href: '#replicas' }, { label: 'Optics', href: '#optics' }] },
  { title: 'Support', links: [{ label: 'Returns', href: '#returns' }] },
  { title: 'Elsewhere', links: [{ label: 'Site rules', href: 'https://example.com/rules', external: true }] },
]

/**
 * jsdom applies no Tailwind and evaluates no container query, so by default it sees BOTH forms of
 * a group title at once: the text and the button. The component marks each form with the width it
 * belongs to (`data-footer-at`) and marks a closed list (`data-open="false"`); these two sheets
 * are what its container-query classes resolve to on either side of 28rem. They stand in for the
 * CSS so the tree under each can be read. That the real classes do this at real widths is proved
 * in a browser, by e2e/organisms.spec.ts; this file proves the tree is right once they do.
 */
const AT = {
  wide: '[data-footer-at="narrow"] { display: none }',
  narrow: '[data-footer-at="wide"] { display: none } ul[data-open="false"] { display: none }',
}

let sheet: HTMLStyleElement | null = null
function at(width: keyof typeof AT) {
  sheet = document.createElement('style')
  sheet.textContent = AT[width]
  document.head.appendChild(sheet)
}

afterEach(() => {
  sheet?.remove()
  sheet = null
})

describe('Footer', () => {
  it('holds every group in one named nav, each list named by its title', () => {
    at('wide')
    render(<Footer label="Store footer" columns={COLUMNS} />)
    const nav = screen.getByRole('navigation', { name: 'Store footer' })
    expect(within(nav).getByRole('list', { name: 'Shop' })).toBeInTheDocument()
    expect(within(nav).getByRole('list', { name: 'Support' })).toBeInTheDocument()
  })

  it('puts the group headings at the level asked for, named without the slash', () => {
    at('wide')
    render(<Footer label="Store footer" columns={COLUMNS} headingLevel={4} />)
    const headings = screen.getAllByRole('heading', { level: 4 })
    expect(headings).toHaveLength(3)
    // The slash is drawn and is in no name.
    expect(headings[0]).toHaveTextContent('/')
    expect(headings.map(h => h.getAttribute('aria-label'))).toEqual([null, null, null])
    expect(screen.getByRole('heading', { level: 4, name: 'Shop' })).toBe(headings[0])
    expect(screen.getByRole('heading', { level: 4, name: 'Elsewhere' })).toBe(headings[2])
  })

  it('opens an external link in a new tab and says so', () => {
    at('wide')
    render(<Footer label="Store footer" columns={COLUMNS} />)
    const link = screen.getByRole('link', { name: /Site rules/ })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAccessibleName('Site rules (opens in a new tab)')
  })

  it('renders internal links through renderLink', () => {
    at('wide')
    render(<Footer label="Store footer" columns={COLUMNS} renderLink={props => <a {...props} data-router="true" />} />)
    expect(screen.getByRole('link', { name: 'Replicas' })).toHaveAttribute('data-router', 'true')
    expect(screen.getByRole('link', { name: /Site rules/ })).not.toHaveAttribute('data-router')
  })

  // The mark is a sibling of the link, never inside it: a link's name and its scramble both read
  // the link's own text and nothing else.
  it('draws one decorative corner mark before each link, outside the link', () => {
    at('wide')
    const { container } = render(<Footer label="Store footer" columns={COLUMNS} />)
    const marks = container.querySelectorAll('[data-footer-mark]')
    expect(marks).toHaveLength(4)
    for (const mark of marks) {
      expect(mark).toHaveAttribute('aria-hidden', 'true')
      expect(mark.nextElementSibling?.tagName).toBe('A')
      expect(mark.closest('a')).toBeNull()
    }
  })

  it('shows the brand, the tagline and the small print', () => {
    render(
      <Footer
        label="Store footer"
        columns={COLUMNS}
        brand={<span>Hexline</span>}
        tagline="Airsoft replicas, optics and parts."
        legal="© 2026 Hexline."
      />
    )
    expect(screen.getByText('Hexline')).toBeInTheDocument()
    expect(screen.getByText('Airsoft replicas, optics and parts.')).toBeInTheDocument()
    expect(screen.getByText('© 2026 Hexline.')).toBeInTheDocument()
  })

  it('forwards a ref to the footer element', () => {
    const ref = createRef<HTMLElement>()
    const { container } = render(<Footer ref={ref} label="Store footer" columns={COLUMNS} />)
    expect(ref.current).toBe(container.querySelector('footer'))
  })

  describe('from 28rem up: a grid of plain lists', () => {
    // Mutation: drop `data-footer-at="narrow"` (and its class) from the button in Footer.tsx ->
    // the button is in the tree at this width and the first assertion fails.
    it('has no button at all, and every link is reachable whatever a group`s open state', () => {
      at('wide')
      render(<Footer label="Store footer" columns={COLUMNS} />)
      expect(screen.queryAllByRole('button')).toHaveLength(0)
      expect(screen.getAllByRole('link')).toHaveLength(4)
      expect(screen.getAllByRole('list')).toHaveLength(3)
    })

    it('is axe clean', async () => {
      at('wide')
      const { container } = render(
        <Footer label="Store footer" columns={COLUMNS} tagline="Airsoft replicas, optics and parts." legal="© 2026 Hexline." />
      )
      expect(await axeClean(container)).toHaveNoViolations()
    })
  })

  describe('below 28rem: an accordion', () => {
    it('starts with every group closed: a button per group inside its heading, and no link in the tree', () => {
      at('narrow')
      render(<Footer label="Store footer" columns={COLUMNS} headingLevel={3} />)
      const buttons = screen.getAllByRole('button')
      expect(buttons.map(button => button.getAttribute('aria-expanded'))).toEqual(['false', 'false', 'false'])
      // The name is the title alone: the slash and the chevron are hidden from it.
      expect(screen.getByRole('button', { name: 'Shop' })).toBe(buttons[0])
      // The accordion pattern: the button is the heading's content, and the heading has one name.
      expect(screen.getByRole('heading', { level: 3, name: 'Shop' })).toContainElement(buttons[0])
      expect(screen.queryAllByRole('link')).toHaveLength(0)
      expect(screen.queryAllByRole('list')).toHaveLength(0)
    })

    // Mutation: change `setOpen(value => !value)` to `setOpen(true)` -> the second press leaves
    // the group open and the last two assertions fail.
    it('a button opens the list it controls, and only that one, and closes it again', async () => {
      at('narrow')
      const user = userEvent.setup()
      render(<Footer label="Store footer" columns={COLUMNS} />)
      const shop = screen.getByRole('button', { name: 'Shop' })
      await user.click(shop)
      expect(shop).toHaveAttribute('aria-expanded', 'true')
      const list = screen.getByRole('list', { name: 'Shop' })
      expect(list).toHaveAttribute('id', shop.getAttribute('aria-controls'))
      expect(within(list).getAllByRole('link').map(link => link.textContent)).toEqual(['Replicas', 'Optics'])
      expect(screen.getByRole('button', { name: 'Support' })).toHaveAttribute('aria-expanded', 'false')
      expect(screen.getAllByRole('list')).toHaveLength(1)

      await user.click(shop)
      expect(shop).toHaveAttribute('aria-expanded', 'false')
      expect(screen.queryAllByRole('link')).toHaveLength(0)
    })

    it('works from the keyboard: Tab reaches each button, Enter and Space toggle, focus stays put', async () => {
      at('narrow')
      const user = userEvent.setup()
      render(<Footer label="Store footer" columns={COLUMNS} />)
      await user.tab()
      const shop = screen.getByRole('button', { name: 'Shop' })
      expect(shop).toHaveFocus()
      await user.keyboard('{Enter}')
      expect(shop).toHaveAttribute('aria-expanded', 'true')
      expect(shop).toHaveFocus()
      await user.tab()
      expect(screen.getByRole('link', { name: 'Replicas' })).toHaveFocus()
      await user.tab({ shift: true })
      await user.keyboard(' ')
      expect(shop).toHaveAttribute('aria-expanded', 'false')
      await user.tab()
      expect(screen.getByRole('button', { name: 'Support' })).toHaveFocus()
    })

    it('a group with defaultOpen starts open', () => {
      at('narrow')
      render(<Footer label="Store footer" columns={[{ ...COLUMNS[0], defaultOpen: true }, COLUMNS[1]]} />)
      expect(screen.getByRole('button', { name: 'Shop' })).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByRole('button', { name: 'Support' })).toHaveAttribute('aria-expanded', 'false')
      expect(screen.getAllByRole('link')).toHaveLength(2)
    })

    it('is axe clean, closed and with a group open', async () => {
      at('narrow')
      const user = userEvent.setup()
      const { container } = render(
        <Footer label="Store footer" columns={COLUMNS} tagline="Airsoft replicas, optics and parts." legal="© 2026 Hexline." />
      )
      expect(await axeClean(container)).toHaveNoViolations()
      await user.click(screen.getByRole('button', { name: 'Shop' }))
      expect(await axeClean(container)).toHaveNoViolations()
    })
  })

  describe('the two sections', () => {
    const ASIDE = { title: 'Field notes by email', content: <form aria-label="Sign-up" /> }

    // Mutation: render the aside before the link section in Footer.tsx -> the order assertion fails.
    it('puts the link groups first and the aside second, in one row of two', () => {
      at('wide')
      const { container } = render(<Footer label="Store footer" columns={COLUMNS} aside={ASIDE} />)
      const upper = container.querySelector('[data-footer-upper]')!
      expect([...upper.children].map(child => Object.keys((child as HTMLElement).dataset)[0])).toEqual([
        'footerLinks',
        'footerAside',
      ])
      // Every group is in the link section, and the aside's content is in the aside.
      const links = upper.querySelector<HTMLElement>('[data-footer-links]')!
      expect(within(links).getByRole('navigation', { name: 'Store footer' })).toBeInTheDocument()
      expect(links.querySelectorAll('[data-footer-group]')).toHaveLength(3)
      const aside = upper.querySelector<HTMLElement>('[data-footer-aside]')!
      expect(within(aside).getByRole('form', { name: 'Sign-up' })).toBeInTheDocument()
    })

    it('heads the aside like a group: the same level, named without the slash', () => {
      at('wide')
      render(<Footer label="Store footer" columns={COLUMNS} aside={ASIDE} headingLevel={3} />)
      const heading = screen.getByRole('heading', { level: 3, name: 'Field notes by email' })
      expect(heading).toHaveTextContent('/')
      expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(4)
    })

    // The aside is a heading and whatever it is given. It is not a second landmark around a form
    // that already is one.
    it('adds no landmark of its own', () => {
      at('wide')
      render(<Footer label="Store footer" columns={COLUMNS} aside={ASIDE} />)
      expect(screen.queryByRole('region')).toBeNull()
      expect(screen.queryByRole('complementary')).toBeNull()
      expect(screen.getAllByRole('navigation')).toHaveLength(1)
    })

    it('has no aside without one', () => {
      const { container } = render(<Footer label="Store footer" columns={COLUMNS} />)
      expect(container.querySelector('[data-footer-aside]')).toBeNull()
    })

    it.each(['wide', 'narrow'] as const)('is axe clean with an aside, small print and a wordmark, %s', async width => {
      at(width)
      const { container } = render(
        <Footer
          label="Store footer"
          columns={COLUMNS}
          aside={{ title: 'Opening hours', content: <p>Weekdays, nine to five.</p> }}
          legal="© 2026 Hexline."
          wordmark="Hexline"
        />
      )
      expect(await axeClean(container)).toHaveNoViolations()
    })
  })

  describe('the wordmark', () => {
    // The decision: the wordmark is the footer's one statement of the name. An image named by
    // the string, so the name is announced once however large it is drawn.
    // Mutation: drop `role="img"` from the svg in Footer.tsx -> no image is found and this fails.
    it('is one image named by the string, and the name is nowhere else in the footer', () => {
      render(<Footer label="Store footer" columns={COLUMNS} wordmark="Hexline" />)
      const mark = screen.getByRole('img', { name: 'Hexline' })
      expect(mark).toHaveAttribute('data-footer-wordmark')
      expect(screen.getAllByRole('img')).toHaveLength(1)
      // Drawn in capitals, named as written.
      expect(mark).toHaveTextContent('HEXLINE')
      expect(screen.queryByRole('link', { name: 'Hexline' })).toBeNull()
      expect(screen.getAllByText(/hexline/i)).toHaveLength(1)
    })

    it('is the last thing in the footer: nothing under it', () => {
      const { container } = render(<Footer label="Store footer" columns={COLUMNS} legal="© 2026." wordmark="Hexline" />)
      const footer = container.querySelector('footer')!
      const closing = container.querySelector('[data-footer-closing]')!
      expect(closing).toBe(footer.lastElementChild)
      expect(closing.lastElementChild).toBe(screen.getByRole('img', { name: 'Hexline' }))
      // The small print is above it.
      expect(screen.getByText('© 2026.').compareDocumentPosition(closing) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })

    // The box is sized from the characters alone, before any font: the viewBox is the sum of the
    // display face's advances, less a side bearing each side, by the cap height less the crop.
    // Mutation: use one advance for every letter in Footer.tsx -> the HEXLINE width fails.
    it('sizes its box from the letters of the name, and holds the line to that width', () => {
      const measure = (name: string) => {
        const { unmount } = render(<Footer label="Store footer" columns={COLUMNS} wordmark={name} />)
        const svg = screen.getByRole('img', { name })
        const text = svg.querySelector('text')!
        expect(text).toHaveAttribute('lengthAdjust', 'spacing')
        const result = { box: svg.getAttribute('viewBox')!.split(' ').map(Number), length: Number(text.getAttribute('textLength')) }
        unmount()
        return result
      }
      const hexline = measure('Hexline')
      // 708 + 604 + 646 + 548 + 308 + 738 + 604 thousandths of an em, at 100 units to the em.
      expect(hexline.length).toBeCloseTo(415.6, 5)
      expect(hexline.box[0]).toBeCloseTo(7, 5)
      expect(hexline.box[2]).toBeCloseTo(415.6 - 7 - 4.4, 5)
      expect(hexline.box[3]).toBeCloseTo(60.5, 5)
      // A longer name is a wider box of the same height: it is drawn smaller, still edge to edge.
      const longer = measure('Hexline Supply')
      expect(longer.box[2]).toBeGreaterThan(hexline.box[2])
      expect(longer.box[3]).toBe(hexline.box[3])
      // A character the table does not hold still has a width.
      expect(measure('Héx').length).toBeGreaterThan(measure('Hx').length)
    })

    it('reserves nothing without a wordmark or a backdrop', () => {
      const { container } = render(<Footer label="Store footer" columns={COLUMNS} />)
      expect(container.querySelector('[data-footer-closing]')).toBeNull()
      expect(container.querySelector('[data-footer-wordmark]')).toBeNull()
    })
  })

  describe('the backdrop', () => {
    it('has no layer without one', () => {
      const { container } = render(<Footer label="Store footer" columns={COLUMNS} wordmark="Hexline" />)
      expect(container.querySelector('[data-footer-backdrop]')).toBeNull()
    })

    // Mutation: take `aria-hidden="true"` off the layer in Footer.tsx -> the image is in the tree
    // and the count fails.
    it('is a layer behind the wordmark, hidden from assistive technology and closed to the pointer', () => {
      const { container } = render(
        <Footer label="Store footer" columns={COLUMNS} wordmark="Hexline" backdrop={<img alt="A field of dots" src="data:," />} />
      )
      const layer = container.querySelector('[data-footer-backdrop]')!
      expect(layer.parentElement).toBe(container.querySelector('[data-footer-closing]'))
      expect(layer).toHaveAttribute('aria-hidden', 'true')
      expect(layer).toHaveClass('pointer-events-none', 'absolute', 'inset-0')
      // In the document before the wordmark, and stacked under it.
      const mark = screen.getByRole('img', { name: 'Hexline' })
      expect(layer.compareDocumentPosition(mark) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      // Only the wordmark is an image a reader is told about.
      expect(screen.getAllByRole('img')).toHaveLength(1)
      expect(screen.getAllByRole('img', { hidden: true })).toHaveLength(2)
    })

    it('still closes the footer when there is no wordmark', () => {
      const { container } = render(<Footer label="Store footer" columns={COLUMNS} backdrop={<span data-testid="field" />} />)
      const closing = container.querySelector('[data-footer-closing]')!
      expect(closing).toBe(container.querySelector('footer')?.lastElementChild)
      expect(closing).toContainElement(screen.getByTestId('field'))
    })

    // That a control put in the backdrop fails axe (`aria-hidden-focus`) is checked in a browser,
    // in e2e/organisms.spec.ts: jsdom has no layout, so axe cannot decide focusability here and
    // files the rule under "incomplete" instead of failing it.
  })
})
