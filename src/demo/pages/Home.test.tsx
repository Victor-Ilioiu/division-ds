import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, it, expect } from 'vitest'
import { axeClean } from '../../test/axe'
import { Toaster } from '../../components/molecules'
import { DISCLAIMER, HOME } from '../content'
import { CartProvider, useCart } from '../store/cart'
import { CATEGORIES, KIT, findProduct } from '../store/catalog'
import { categoryTiles, otherOffers, topRatedAccessories, topRatedReplicas } from '../store/selections'
import { Home } from './Home'

/**
 * jsdom has no WebGL (src/test/setup.ts stubs `getContext` to null), so every render here takes
 * the hero's fallback: the still, no preloader, a link in place of Assemble. That is the path
 * these tests cover, on purpose. The live scene (the canvas, the preloader, Assemble toggling)
 * only exists in a real browser and is covered by e2e/hero.spec.ts.
 */

/** Reads the cart the hero itself just wrote to. */
function CartProbe() {
  const { lines } = useCart()
  return <output data-testid="lines">{lines.map(line => `${line.id}:${line.quantity}`).join(',')}</output>
}

function renderHome() {
  return render(
    <MemoryRouter initialEntries={['/store']}>
      <Toaster>
        <CartProvider>
          <Home />
          <CartProbe />
        </CartProvider>
      </Toaster>
    </MemoryRouter>
  )
}

const REPLICA = findProduct('kestrel-c')!
const KIT_PRODUCT = findProduct(KIT.id)!

/** The hero is the one region named by the page's own h1: the replica's name, then the kit. A
 *  pattern, because the kit label is a block-level span inside the h1 and jsdom joins the two
 *  with no space where a browser puts one. */
function hero() {
  return screen.getByRole('region', { name: new RegExp(`^${REPLICA.name}\\s*${HOME.hero.kitLabel}$`) })
}

afterEach(() => {
  sessionStorage.clear()
})

describe('Home', () => {
  it('renders exactly one h1, inside the hero, naming the replica and the kit from the data', () => {
    renderHome()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    const h1 = within(hero()).getByRole('heading', { level: 1 })
    expect(h1).toHaveTextContent('Kestrel C carbine replica')
    expect(h1).toHaveTextContent('Operator kit')
  })

  // The three figures are computed from the catalogue, never typed into the hero. The literals
  // here are the catalogue document's, so a changed part price fails this as well as
  // catalog.test.ts.
  it('states the kit price, the bought-separately price and the saving', () => {
    renderHome()
    const region = hero()
    expect(region).toHaveTextContent('Price: €189.00')
    expect(region).toHaveTextContent('was €309.80')
    expect(within(region).getByText('39% cheaper')).toBeInTheDocument()
    expect(within(region).getByText('−39%')).toBeInTheDocument()
  })

  // The sentence has one exact form (see `DISCLAIMER` in content.ts), so this compares against a
  // literal rather than the constant alone: a reworded constant has to fail here.
  it('states the disclaimer in the hero, in its one exact form', () => {
    renderHome()
    expect(DISCLAIMER).toBe('Airsoft replicas for sport. Not firearms.')
    expect(within(hero()).getByText(DISCLAIMER)).toBeInTheDocument()
  })

  // Mutation: change `quickAddToCart(add, toast, KIT.id)` in HomeHero.tsx to a no-op -> the cart
  // stays empty and no toast appears.
  it('Buy kit puts the kit in the cart and says so, the way every other add does', async () => {
    renderHome()
    await userEvent.click(within(hero()).getByRole('button', { name: HOME.hero.buy }))
    expect(await screen.findByText(`Added ${KIT_PRODUCT.name}`)).toBeInTheDocument()
    expect(screen.getByTestId('lines')).toHaveTextContent('kestrel-c-kit:-:-:1')
  })

  describe('where the live scene does not run (here: no WebGL)', () => {
    it('marks the hero as showing the still', () => {
      renderHome()
      expect(hero()).toHaveAttribute('data-hero', 'still')
    })

    // The still stands in for a decorative canvas, beside an h1 that names the product, so its
    // alt is empty: one image, no canvas, nothing announced twice.
    it('shows the poster as a decorative image, and draws no canvas', () => {
      const { container } = renderHome()
      expect(container.querySelector('canvas')).toBeNull()
      // The hero's own picture; the sections under it have theirs.
      const images = hero().querySelectorAll('img')
      expect(images).toHaveLength(1)
      expect(images[0]).toHaveAttribute('src', '/media/hero-poster-960.webp')
      expect(images[0]).toHaveAttribute('alt', '')
      expect(container.querySelector('source')).toHaveAttribute('srcset', '/media/hero-poster.webp')
    })

    it('shows no preloader and announces no loading status', () => {
      const { container } = renderHome()
      expect(container.querySelector('[data-loader]')).toBeNull()
      expect(screen.queryByRole('status', { name: HOME.hero.loading })).not.toBeInTheDocument()
      expect(screen.queryByText(HOME.hero.loading)).not.toBeInTheDocument()
    })

    // Mutation: render the Assemble button in both branches of HomeHero.tsx -> a button that
    // can do nothing appears here, and the link does not.
    it('replaces Assemble with a plain link to the kit', () => {
      renderHome()
      expect(screen.queryByRole('button', { name: HOME.hero.assemble })).not.toBeInTheDocument()
      expect(within(hero()).getByRole('link', { name: HOME.hero.seeKit })).toHaveAttribute('href', '/store/shop/kestrel-c-kit')
    })

    it('does not tell anyone to drag a picture', () => {
      renderHome()
      expect(screen.queryByText(HOME.hero.dragHint)).not.toBeInTheDocument()
    })
  })

  // jsdom lays nothing out, so this pins the classes that state the box before anything loads,
  // not the size itself: the stage's 4:3 block when stacked, one screen under the Navbar from
  // `lg`. e2e/hero.spec.ts measures the real thing.
  it('states the hero and stage sizes in CSS, before anything loads', () => {
    const { container } = renderHome()
    expect(hero()).toHaveClass('lg:h-[calc(100dvh-3.5rem)]', 'lg:min-h-[600px]')
    expect(container.querySelector('[data-hero-stage]')).toHaveClass('aspect-[4/3]', 'lg:absolute', 'lg:inset-0')
  })

  // The 3D set is dark in both themes and the copy sits on it, so the hero pins its own theme.
  it('pins the dark theme on the hero', () => {
    renderHome()
    expect(hero()).toHaveAttribute('data-theme', 'dark')
  })

  describe('under the hero', () => {
    it('opens five sections with an h2 each, in the order of the page', () => {
      renderHome()
      const headings = screen.getAllByRole('heading', { level: 2 })
      expect(headings.map(heading => heading.textContent)).toEqual([
        `01${HOME.replicas.title}`,
        `02${HOME.offers.title}`,
        `03${HOME.categories.title}`,
        `04${HOME.accessories.title}`,
        `05${HOME.rules.title}`,
      ])
      // The index is decoration: each heading is named by its title alone.
      expect(screen.getByRole('heading', { level: 2, name: HOME.offers.title })).toBeInTheDocument()
    })

    // One region per name. A slider is already a region named by its title, so the section around
    // it is not a second one. Mutation: make every Section a <section aria-labelledby> -> two
    // regions are named "Offers" and getByRole throws.
    it('names each section once: a region per plain section, the carousel itself for a slider', () => {
      renderHome()
      for (const title of [HOME.replicas.title, HOME.categories.title, HOME.rules.title]) {
        expect(screen.getByRole('region', { name: title }).tagName).toBe('SECTION')
      }
      for (const title of [HOME.offers.title, HOME.accessories.title]) {
        expect(screen.getByRole('region', { name: title })).toHaveAttribute('aria-roledescription', 'carousel')
      }
    })

    it('shows the top-rated replicas as a grid, in the order the rule gives, with a link to the filtered shop', () => {
      renderHome()
      const section = screen.getByRole('region', { name: HOME.replicas.title })
      const names = within(within(section).getByRole('list')).getAllByRole('heading', { level: 3 })
      expect(names.map(name => name.textContent)).toEqual(topRatedReplicas().map(product => product.name))
      expect(within(section).getByRole('link', { name: HOME.replicas.action })).toHaveAttribute(
        'href',
        '/store/shop?category=replicas&sort=rating'
      )
    })

    it('shows the other offers in a carousel, the kit not among them', () => {
      renderHome()
      const carousel = screen.getByRole('region', { name: HOME.offers.title })
      const names = within(carousel).getAllByRole('heading', { level: 3 }).map(name => name.textContent)
      expect(names).toEqual(otherOffers().map(product => product.name))
      expect(names).not.toContain(KIT_PRODUCT.name)
      expect(names.length).toBeGreaterThanOrEqual(5)
    })

    it('shows one tile per category, with its count, linking to the shop filtered to it', () => {
      renderHome()
      const section = screen.getByRole('region', { name: HOME.categories.title })
      const tiles = within(within(section).getByRole('list')).getAllByRole('listitem')
      expect(tiles).toHaveLength(CATEGORIES.length)
      categoryTiles().forEach((tile, index) => {
        expect(within(tiles[index]).getByRole('link', { name: tile.category.label })).toHaveAttribute(
          'href',
          `/store/shop?category=${tile.category.id}`
        )
        expect(tiles[index]).toHaveTextContent(`${tile.count} products`)
      })
      expect(within(section).getByRole('link', { name: HOME.categories.action })).toHaveAttribute('href', '/store/shop')
    })

    it('shows the top-rated accessories in a carousel, under a link to both categories by rating', () => {
      renderHome()
      const carousel = screen.getByRole('region', { name: HOME.accessories.title })
      const names = within(carousel).getAllByRole('heading', { level: 3 }).map(name => name.textContent)
      expect(names).toEqual(topRatedAccessories().map(product => product.name))
      expect(screen.getByRole('link', { name: HOME.accessories.action })).toHaveAttribute(
        'href',
        '/store/shop?category=optics&category=parts&sort=rating'
      )
    })

    it('shows the house rules as four cards, each named by its h3, and the way to the field guides', () => {
      renderHome()
      const section = screen.getByRole('region', { name: HOME.rules.title })
      const cards = within(within(section).getByRole('list', { name: HOME.rules.title })).getAllByRole('article')
      expect(cards).toHaveLength(4)
      expect(HOME.rules.items).toHaveLength(4)
      HOME.rules.items.forEach((rule, index) => {
        expect(cards[index]).toHaveAccessibleName(rule.heading)
        expect(within(cards[index]).getByRole('heading', { level: 3, name: rule.heading })).toBeInTheDocument()
        expect(cards[index]).toHaveTextContent(rule.body)
        // A rule is something to read. Its card is not a click target, so it must not take the
        // interactive treatment. Mutation: pass `interactive` to these cards -> fails.
        expect(cards[index]).not.toHaveClass('card-interactive')
      })
      expect(within(section).getByRole('link', { name: HOME.rules.action.label })).toHaveAttribute('href', '/store/journal')
    })

    // The fourth card says what the store is and links to the case study. The study is not
    // written yet, so two things are held: the link is a real external link that says it opens
    // a new tab, and the sentence beside it says the study is still to come.
    // Mutation: drop `external` from the Link in Home.tsx -> no target, no new-tab warning.
    it('states in the fourth card that the store is a concept, with an external link that is honest about the case study', () => {
      renderHome()
      const cards = within(screen.getByRole('list', { name: HOME.rules.title })).getAllByRole('article')
      const concept = cards[3]
      expect(concept).toHaveTextContent('Nothing here is for sale.')
      expect(concept).toHaveTextContent('Division design system')
      const link = within(concept).getByRole('link', { name: 'Read the case study (opens in a new tab)' })
      expect(link).toHaveAttribute('href', 'https://victor-ilioiu.vercel.app')
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
      expect(concept).toHaveTextContent(/Coming soon/)
      // Only the fourth has a link: the other three hold none.
      for (const card of cards.slice(0, 3)) expect(within(card).queryByRole('link')).toBeNull()
    })

    // Every card that is one click target says so through Card's `interactive`: the product
    // cards (ProductCard does it itself) and the category tiles.
    it('marks every product card and category tile as an interactive card', () => {
      renderHome()
      const replicas = within(screen.getByRole('region', { name: HOME.replicas.title })).getAllByRole('article')
      expect(replicas).toHaveLength(4)
      const tiles = within(screen.getByRole('region', { name: HOME.categories.title })).getAllByRole('article')
      expect(tiles).toHaveLength(CATEGORIES.length)
      for (const card of [...replicas, ...tiles]) expect(card).toHaveClass('card-interactive')
    })

    // Mutation: drop `onAddToCart` from the cards in Home.tsx -> there is no such button.
    it('adds a product to the cart from a card in a section, and says so', async () => {
      renderHome()
      const [product] = topRatedAccessories()
      const carousel = screen.getByRole('region', { name: HOME.accessories.title })
      await userEvent.click(within(carousel).getByRole('button', { name: `Add to cart: ${product.name}` }))
      expect((await screen.findAllByText(new RegExp(`^Added ${product.name}`))).length).toBeGreaterThan(0)
      expect(screen.getByTestId('lines')).toHaveTextContent(`${product.id}:`)
    })

    // Nothing under the hero may load eagerly: on a first visit it is all below the fold.
    it('marks every picture under the hero lazy and decorative', () => {
      const { container } = renderHome()
      const pictures = [...container.querySelectorAll('img')].filter(image => !hero().contains(image))
      expect(pictures.length).toBeGreaterThan(10)
      for (const picture of pictures) {
        expect(picture).toHaveAttribute('loading', 'lazy')
        expect(picture).toHaveAttribute('alt', '')
      }
    })

    // The sign-up was this page's sixth section until 2026-10-02. The Footer carries it now, on
    // every page (DemoLayout.test.tsx holds it there), and a second copy here would be the same
    // form twice on one page.
    it('has no newsletter form of its own', () => {
      renderHome()
      expect(screen.queryByRole('form')).toBeNull()
    })
  })

  it('is axe clean', async () => {
    const { container } = renderHome()
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
